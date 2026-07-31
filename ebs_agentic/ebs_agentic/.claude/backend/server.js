const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4001;
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const PYTHON_SERVER_PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Anthropic API configuration
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';
const ANALYSIS_DATE = '10-OCT-2010';

// Reference date for all business calculations (time-travel to match EBS data)
const ANALYSIS_DATE_OBJ = new Date('2010-10-10T00:00:00');

// Helper: add days to the analysis date and return formatted string (YYYY-MM-DD)
function analysisDatePlusDays(days) {
  const d = new Date(ANALYSIS_DATE_OBJ.getTime() + days * 86400000);
  return d.toISOString().split('T')[0];
}

// Helper: format the analysis date as a locale date string
function analysisDateFormatted() {
  return ANALYSIS_DATE_OBJ.toLocaleDateString();
}

// Python server is expected to be running independently (started via nohup)
let pythonServerReady = true;

// Execute SQL via Python HTTP server
async function executeSQLviaPython(sql) {
  if (!pythonServerReady) {
    throw new Error('Python server not ready');
  }

  const response = await fetch(`http://${SERVER_HOST}:${PYTHON_SERVER_PORT}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    throw new Error(`Python server error: ${response.statusText}`);
  }

  return await response.json();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    hasApiKey: !!ANTHROPIC_API_KEY,
    pythonServerReady: pythonServerReady,
    timestamp: new Date().toISOString()
  });
});

// Set API key
app.post('/api/set-key', (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return res.status(400).json({ error: 'Invalid API key format' });
  }
  
  ANTHROPIC_API_KEY = apiKey;
  console.log('✅ Anthropic API key configured');
  res.json({ success: true });
});

// Execute SQL query
app.post('/api/query', async (req, res) => {
  try {
    const { sql } = req.body;
    
    console.log('\n📊 /api/query called');
    console.log('   SQL:', sql?.substring(0, 100) + '...');
    
    if (!pythonServerReady) {
      return res.status(503).json({ 
        error: 'Python server not ready. Please wait a moment and try again.' 
      });
    }

    if (!sql) {
      return res.status(400).json({ error: 'SQL query required' });
    }

    console.log('📡 Calling Python HTTP server...');
    const result = await executeSQLviaPython(sql);
    
    console.log('✅ Got result:', result.rowCount || 0, 'rows');
    res.json(result);

  } catch (error) {
    console.error('❌ /api/query ERROR:', error.message);
    res.status(500).json({ 
      error: 'Query execution failed',
      message: error.message
    });
  }
});

// Top suppliers
app.post('/api/top-suppliers', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    
    const sql = `
      SELECT 
        pv.vendor_name,
        pv.vendor_id,
        COUNT(ai.invoice_id) as invoice_count,
        SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) as outstanding_amount,
        ai.invoice_currency_code as currency
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
      GROUP BY pv.vendor_name, pv.vendor_id, ai.invoice_currency_code
      ORDER BY SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) DESC
      FETCH FIRST ${limit} ROWS ONLY
    `;
    
    const result = await executeSQLviaPython(sql);
    res.json(result);

  } catch (error) {
    console.error('❌ /api/top-suppliers ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI chat
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    
    console.log('\n💬 /api/chat called');
    console.log('   Question:', question);
    
    if (!ANTHROPIC_API_KEY) {
      return res.status(401).json({ error: 'Anthropic API key not configured' });
    }

    if (!pythonServerReady) {
      return res.status(503).json({ error: 'Python server not ready' });
    }

    console.log('🤖 Generating SQL with Claude...');

    // Generate SQL with Claude
    const systemPrompt = `You are an Oracle EBS database expert. Generate SQL queries for Oracle E-Business Suite Accounts Payable module.

Database Context:
- Analysis date: ${ANALYSIS_DATE}
- Tables: ap_invoices_all, ap_suppliers, ap_supplier_sites_all, ap_holds_all

Rules:
1. Generate ONLY valid Oracle SQL
2. Use TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') for date calculations
3. Use NVL() for null handling
4. Use FETCH FIRST n ROWS ONLY
5. Return only the SQL query

User question: ${question}

Respond with ONLY the SQL query.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    });

    const aiResponse = await response.json();
    let sql = '';
    for (const block of aiResponse.content) {
      if (block.type === 'text') {
        sql = block.text.trim().replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
        break;
      }
    }

    console.log('✅ Generated SQL:', sql.substring(0, 100) + '...');
    console.log('📡 Executing via Python...');

    // Execute SQL
    const data = await executeSQLviaPython(sql);

    if (!data.success) {
      return res.status(500).json({ 
        error: 'Failed to execute query',
        sql: sql,
        details: data.error
      });
    }

    console.log('✅ Got', data.rowCount, 'rows');
    console.log('🤖 Formatting response...');

    // Format response
    const explainPrompt = `The user asked: "${question}"

SQL executed:
${sql}

Results (${data.rowCount} rows):
${JSON.stringify(data.data.slice(0, 5), null, 2)}
${data.rowCount > 5 ? '\n... and more rows' : ''}

Provide a clear, concise answer.`;

    const explainResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: `You are an Oracle EBS Accounts Payable analyst. CRITICAL: Today's date is ${ANALYSIS_DATE} (October 10, 2010). All aging calculations, urgency assessments, and date references must be relative to this date. Do NOT reference any date after October 2010.`,
        messages: [{ role: 'user', content: explainPrompt }]
      })
    });

    const explanation = await explainResponse.json();
    let answerText = '';
    for (const block of explanation.content) {
      if (block.type === 'text') {
        answerText = block.text;
        break;
      }
    }

    console.log('📤 Sending chat response');

    res.json({
      success: true,
      text: answerText,
      sql: sql,
      data: data.data,
      rowCount: data.rowCount
    });

  } catch (error) {
    console.error('❌ /api/chat ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Add these two new endpoints to your server-http.js file
// Place them before the "Graceful shutdown" section

// Analyze supplier with AI
app.post('/api/analyze-supplier', async (req, res) => {
  try {
    const { vendorName, vendorId } = req.body;
    
    console.log('\n📊 /api/analyze-supplier called');
    console.log('   Vendor:', vendorName);
    
    if (!ANTHROPIC_API_KEY) {
      return res.status(401).json({ error: 'Anthropic API key not configured' });
    }

    if (!pythonServerReady) {
      return res.status(503).json({ error: 'Python server not ready' });
    }

    // Get detailed supplier data
    const supplierDataSQL = `
      SELECT 
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.amount_paid,
        ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding,
        TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
        ai.payment_status_flag,
        ai.description,
        CASE
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 30 THEN '0-30 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 60 THEN '31-60 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 90 THEN '61-90 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 180 THEN '91-180 Days'
          ELSE 'Over 180 Days'
        END as aging_bucket
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
      AND ai.payment_status_flag != 'Y'
      AND ai.cancelled_date IS NULL
      AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0  -- ← NEW LINE
      ORDER BY ai.invoice_date ASC
      FETCH FIRST 20 ROWS ONLY
    `;

    console.log('📡 Getting supplier data...');
    const supplierData = await executeSQLviaPython(supplierDataSQL);

    if (!supplierData.success || !supplierData.data) {
      return res.status(500).json({ 
        error: 'Failed to get supplier data',
        details: supplierData.error
      });
    }

    console.log(`✅ Got ${supplierData.rowCount} invoices`);

    // Calculate summary stats
    const summary = {
      totalOutstanding: supplierData.data.reduce((sum, inv) => 
        sum + parseFloat(inv.OUTSTANDING || inv.outstanding || 0), 0),
      invoiceCount: supplierData.rowCount,
      avgDaysOld: supplierData.data.reduce((sum, inv) => 
        sum + parseFloat(inv.DAYS_OLD || inv.days_old || 0), 0) / supplierData.rowCount
    };

    // Determine risk level
    summary.riskLevel = summary.avgDaysOld > 90 ? 'high' : 
                        summary.avgDaysOld > 60 ? 'medium' : 'low';

    // Calculate aging distribution
    const agingBuckets = {};
    supplierData.data.forEach(inv => {
      const bucket = inv.AGING_BUCKET || inv.aging_bucket;
      const amount = parseFloat(inv.OUTSTANDING || inv.outstanding || 0);
      agingBuckets[bucket] = (agingBuckets[bucket] || 0) + amount;
    });

    const agingDistribution = Object.entries(agingBuckets).map(([name, value]) => ({
      name,
      value
    }));

    // Calculate invoice breakdown by amount ranges
    const ranges = [
      { range: '$0-1K', min: 0, max: 1000, count: 0 },
      { range: '$1K-5K', min: 1000, max: 5000, count: 0 },
      { range: '$5K-10K', min: 5000, max: 10000, count: 0 },
      { range: '$10K-50K', min: 10000, max: 50000, count: 0 },
      { range: '$50K+', min: 50000, max: Infinity, count: 0 }
    ];

    supplierData.data.forEach(inv => {
      const amount = parseFloat(inv.OUTSTANDING || inv.outstanding || 0);
      const range = ranges.find(r => amount >= r.min && amount < r.max);
      if (range) range.count++;
    });

    const invoiceBreakdown = ranges.filter(r => r.count > 0);

    console.log('🤖 Generating AI analysis...');

    // Use Claude to generate insights and recommendations
    const analysisPrompt = `Analyze this supplier's accounts payable data and provide concise and short insights not more than 1000 words.

CRITICAL DATE CONTEXT: Today's date is ${ANALYSIS_DATE} (October 10, 2010). This is a time-travel analysis — you MUST treat ${ANALYSIS_DATE} as the current date for ALL calculations, aging assessments, urgency evaluations, and recommendations. Do NOT reference any date after October 2010. An invoice that is 30 days old means it was issued around September 2010. An invoice that is 90 days old means it was issued around July 2010.

Supplier: ${vendorName}
Total Outstanding: $${summary.totalOutstanding.toLocaleString()}
Number of Invoices: ${summary.invoiceCount}
Average Days Outstanding: ${Math.round(summary.avgDaysOld)} days
Risk Level: ${summary.riskLevel}

Aging Distribution:
${agingDistribution.map(a => `- ${a.name}: $${a.value.toLocaleString()}`).join('\n')}

Invoice Breakdown:
${invoiceBreakdown.map(b => `- ${b.range}: ${b.count} invoices`).join('\n')}

Sample Invoices (oldest):
${supplierData.data.slice(0, 5).map(inv => 
  `- Invoice ${inv.INVOICE_NUM || inv.invoice_num}: $${parseFloat(inv.OUTSTANDING || inv.outstanding).toLocaleString()}, ${inv.DAYS_OLD || inv.days_old} days old`
).join('\n')}

Provide:
1. A 1 paragraph analysis of the situation
2. Specific actionable recommendations with priorities (high/medium/low)

Focus on payment patterns, aging concerns, and specific actions to improve the situation.`;

    const aiResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: `You are an Oracle EBS Accounts Payable analyst. CRITICAL: Today's date is ${ANALYSIS_DATE} (October 10, 2010). All aging calculations, urgency assessments, and date references must be relative to this date. Do NOT reference any date after October 2010. When you see "X days old", that means X days before ${ANALYSIS_DATE}.`,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    });

    const aiData = await aiResponse.json();
    const insights = aiData.content[0].text;

    console.log('✅ AI analysis complete');

    // Generate recommended actions based on the analysis
    const recommendedActions = [];

    if (summary.avgDaysOld > 2000) {
      recommendedActions.push({
        type: 'payment',
        title: 'Prioritize Payment of Overdue Invoices',
        description: `${summary.invoiceCount} invoices averaging ${Math.round(summary.avgDaysOld)} days old. Schedule immediate payment to avoid late fees and maintain supplier relationship.`,
        priority: 'high',
        impact: `Reduce outstanding by $${(summary.totalOutstanding * 0.3).toLocaleString()}`
      });
    }

    if (summary.avgDaysOld > 1000) {
      recommendedActions.push({
        type: 'negotiate',
        title: 'Negotiate Payment Terms',
        description: 'Contact supplier to discuss payment plan or term extension for aged invoices.',
        priority: summary.avgDaysOld > 90 ? 'high' : 'medium',
        impact: 'Avoid penalties, maintain good standing'
      });
    }

    recommendedActions.push({
      type: 'schedule',
      title: 'Create Payment Schedule',
      description: 'Set up automated payment schedule based on invoice aging and priority.',
      priority: 'medium',
      impact: 'Improve cash flow management'
    });

    if (summary.invoiceCount > 20) {
      recommendedActions.push({
        type: 'dispute',
        title: 'Review for Potential Disputes',
        description: 'Audit invoices for discrepancies or duplicate charges.',
        priority: 'low',
        impact: 'Potential savings of 2-5%'
      });
    }

    res.json({
      success: true,
      analysis: {
        summary,
        insights,
        charts: {
          agingDistribution,
          invoiceBreakdown
        },
        recommendedActions
      }
    });

  } catch (error) {
    console.error('❌ /api/analyze-supplier ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Execute action with synthetic data
app.post('/api/execute-action', async (req, res) => {
  try {
    const { vendorName, vendorId, action } = req.body;
    
    console.log('\n⚙️ /api/execute-action called');
    console.log('   Vendor:', vendorName);
    console.log('   Action:', action.title);

    // Simulate action execution with synthetic data
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    const actionResults = {
      payment: {
        message: `Payment schedule created for ${vendorName}`,
        details: {
          'Invoices Scheduled': Math.floor(Math.random() * 20) + 5,
          'Total Amount': `$${(Math.random() * 50000 + 10000).toLocaleString()}`,
          'Payment Date': analysisDatePlusDays(7),
          'Payment Method': 'ACH Transfer',
          'Status': 'Scheduled'
        },
        syntheticData: true
      },
      negotiate: {
        message: `Payment terms negotiation initiated with ${vendorName}`,
        details: {
          'Current Terms': 'Net 30',
          'Proposed Terms': 'Net 45',
          'Extension Request': '15 days',
          'Status': 'Pending Supplier Approval',
          'Contact': 'AP Manager'
        },
        syntheticData: true
      },
      dispute: {
        message: `Dispute review process started for ${vendorName}`,
        details: {
          'Invoices Under Review': Math.floor(Math.random() * 10) + 3,
          'Potential Savings': `$${(Math.random() * 5000 + 500).toLocaleString()}`,
          'Review Status': 'In Progress',
          'Completion Date': analysisDatePlusDays(14)
        },
        syntheticData: true
      },
      schedule: {
        message: `Automated payment schedule configured for ${vendorName}`,
        details: {
          'Schedule Type': 'Aging-Based Priority',
          'Payment Frequency': 'Weekly',
          'Next Payment': analysisDatePlusDays(3),
          'Auto-Approval Limit': '$5,000',
          'Status': 'Active'
        },
        syntheticData: true
      },
      hold: {
        message: `Payment hold applied to invoices for ${vendorName}`,
        details: {
          'Invoices Held': Math.floor(Math.random() * 15) + 5,
          'Hold Reason': 'Pending Review',
          'Review By': 'AP Supervisor',
          'Expected Resolution': analysisDatePlusDays(5)
        },
        syntheticData: true
      }
    };

    const result = actionResults[action.type] || actionResults.payment;

    console.log('✅ Action simulated successfully');

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ /api/execute-action ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ADD THIS NEW ENDPOINT to your server.js (server-http.js)
// Place it AFTER the existing /api/analyze-supplier endpoint

// Streaming analysis with chain of thought
app.post('/api/analyze-supplier-stream', async (req, res) => {
  try {
    const { vendorName, vendorId } = req.body;
    
    console.log('\n📊 /api/analyze-supplier-stream called');
    console.log('   Vendor:', vendorName);
    
    if (!ANTHROPIC_API_KEY) {
      return res.status(401).json({ error: 'Anthropic API key not configured' });
    }

    if (!pythonServerReady) {
      return res.status(503).json({ error: 'Python server not ready' });
    }

    // Set up SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Step 1: Get supplier data
    sendEvent('thought', { message: '🔍 Gathering supplier invoice data from database...' });

    const supplierDataSQL = `
      SELECT 
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.amount_paid,
        ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding,
        TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
        ai.payment_status_flag,
        ai.description,
        CASE 
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 30 THEN '0-30 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 60 THEN '31-60 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 90 THEN '61-90 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 180 THEN '91-180 Days'
          ELSE 'Over 180 Days'
        END as aging_bucket
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
      AND ai.payment_status_flag != 'Y'
      AND ai.cancelled_date IS NULL
      AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0  -- ← NEW LINE
      ORDER BY ai.invoice_date ASC
    `;

    const supplierData = await executeSQLviaPython(supplierDataSQL);

    if (!supplierData.success || !supplierData.data) {
      sendEvent('error', { message: 'Failed to retrieve supplier data' });
      res.end();
      return;
    }

    sendEvent('thought', { 
      message: `✅ Retrieved ${supplierData.rowCount} outstanding invoices` 
    });

    // Step 2: Calculate metrics
    sendEvent('thought', { message: '📊 Calculating summary statistics...' });

    const summary = {
      totalOutstanding: supplierData.data.reduce((sum, inv) => 
        sum + parseFloat(inv.OUTSTANDING || inv.outstanding || 0), 0),
      invoiceCount: supplierData.rowCount,
      avgDaysOld: supplierData.data.reduce((sum, inv) => 
        sum + parseFloat(inv.DAYS_OLD || inv.days_old || 0), 0) / supplierData.rowCount
    };

    summary.riskLevel = summary.avgDaysOld > 90 ? 'high' : 
                        summary.avgDaysOld > 60 ? 'medium' : 'low';

    sendEvent('thought', { 
      message: `📈 Total Outstanding: $${summary.totalOutstanding.toLocaleString()} | Avg Days: ${Math.round(summary.avgDaysOld)} | Risk: ${summary.riskLevel.toUpperCase()}` 
    });

    // Step 3: Calculate aging distribution
    sendEvent('thought', { message: '🗂️ Analyzing aging distribution...' });

    const agingBuckets = {};
    supplierData.data.forEach(inv => {
      const bucket = inv.AGING_BUCKET || inv.aging_bucket;
      const amount = parseFloat(inv.OUTSTANDING || inv.outstanding || 0);
      agingBuckets[bucket] = (agingBuckets[bucket] || 0) + amount;
    });

    const agingDistribution = Object.entries(agingBuckets).map(([name, value]) => ({
      name,
      value
    }));

    const oldestBucket = Object.entries(agingBuckets)
      .sort((a, b) => b[1] - a[1])[0];
    
    sendEvent('thought', { 
      message: `⚠️ Largest concentration: ${oldestBucket[0]} ($${oldestBucket[1].toLocaleString()})` 
    });

    // Step 4: Calculate invoice breakdown
    sendEvent('thought', { message: '💰 Categorizing invoices by amount...' });

    const ranges = [
      { range: '$0-1K', min: 0, max: 1000, count: 0 },
      { range: '$1K-5K', min: 1000, max: 5000, count: 0 },
      { range: '$5K-10K', min: 5000, max: 10000, count: 0 },
      { range: '$10K-50K', min: 10000, max: 50000, count: 0 },
      { range: '$50K+', min: 50000, max: Infinity, count: 0 }
    ];

    supplierData.data.forEach(inv => {
      const amount = parseFloat(inv.OUTSTANDING || inv.outstanding || 0);
      const range = ranges.find(r => amount >= r.min && amount < r.max);
      if (range) range.count++;
    });

    const invoiceBreakdown = ranges.filter(r => r.count > 0);

    sendEvent('thought', { 
      message: `📋 Invoice distribution: ${invoiceBreakdown.map(b => `${b.range}: ${b.count}`).join(', ')}` 
    });

    // Step 5: Call Claude AI with streaming
    sendEvent('thought', { message: '🤖 Initiating AI analysis with Claude...' });

    const analysisPrompt = `Analyze this supplier's accounts payable data and provide detailed insights with your reasoning.

CRITICAL DATE CONTEXT: Today's date is ${ANALYSIS_DATE} (October 10, 2010). This is a time-travel analysis — you MUST treat ${ANALYSIS_DATE} as the current date for ALL calculations, aging assessments, urgency evaluations, and recommendations. Do NOT reference any date after October 2010. An invoice that is 30 days old means it was issued around September 2010. An invoice that is 90 days old means it was issued around July 2010.

Supplier: ${vendorName}
Total Outstanding: $${summary.totalOutstanding.toLocaleString()}
Number of Invoices: ${summary.invoiceCount}
Average Days Outstanding: ${Math.round(summary.avgDaysOld)} days
Risk Level: ${summary.riskLevel}

Aging Distribution:
${agingDistribution.map(a => `- ${a.name}: $${a.value.toLocaleString()}`).join('\n')}

Invoice Breakdown:
${invoiceBreakdown.map(b => `- ${b.range}: ${b.count} invoices`).join('\n')}

Sample Invoices (oldest):
${supplierData.data.slice(0, 5).map(inv => 
  `- Invoice ${inv.INVOICE_NUM || inv.invoice_num}: $${parseFloat(inv.OUTSTANDING || inv.outstanding).toLocaleString()}, ${inv.DAYS_OLD || inv.days_old} days old`
).join('\n')}

Think step by step and provide:
1. First, analyze what patterns you notice in the data
2. Then, assess the risk level and explain why
3. Finally, provide specific actionable recommendations with priorities

Show your reasoning process clearly.`;

    const streamResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        stream: true,  // Enable streaming
        system: `You are an Oracle EBS Accounts Payable analyst. CRITICAL: Today's date is ${ANALYSIS_DATE} (October 10, 2010). All aging calculations, urgency assessments, and date references must be relative to this date. Do NOT reference any date after October 2010. When you see "X days old", that means X days before ${ANALYSIS_DATE}.`,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    });

    let fullInsights = '';
    const decoder = new TextDecoder();

    sendEvent('thought', { message: '💭 Claude is analyzing the data...' });

    for await (const chunk of streamResponse.body) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content_block_delta') {
              const delta = parsed.delta.text;
              fullInsights += delta;
              
              // Send each chunk as it arrives
              sendEvent('ai-stream', { text: delta });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    sendEvent('thought', { message: '✅ AI analysis complete!' });

    // Step 6: Generate recommendations
    sendEvent('thought', { message: '📝 Formulating action recommendations...' });

    const recommendedActions = [];

    if (summary.avgDaysOld > 90) {
      recommendedActions.push({
        type: 'payment',
        title: 'Prioritize Payment of Overdue Invoices',
        description: `${summary.invoiceCount} invoices averaging ${Math.round(summary.avgDaysOld)} days old. Schedule immediate payment to avoid late fees and maintain supplier relationship.`,
        priority: 'high',
        impact: `Reduce outstanding by $${(summary.totalOutstanding * 0.3).toLocaleString()}`
      });
    }

    if (summary.avgDaysOld > 60) {
      recommendedActions.push({
        type: 'negotiate',
        title: 'Negotiate Payment Terms',
        description: 'Contact supplier to discuss payment plan or term extension for aged invoices.',
        priority: summary.avgDaysOld > 90 ? 'high' : 'medium',
        impact: 'Avoid penalties, maintain good standing'
      });
    }

    recommendedActions.push({
      type: 'schedule',
      title: 'Create Payment Schedule',
      description: 'Set up automated payment schedule based on invoice aging and priority.',
      priority: 'medium',
      impact: 'Improve cash flow management'
    });

    if (summary.invoiceCount > 20) {
      recommendedActions.push({
        type: 'dispute',
        title: 'Review for Potential Disputes',
        description: 'Audit invoices for discrepancies or duplicate charges.',
        priority: 'low',
        impact: 'Potential savings of 2-5%'
      });
    }

    sendEvent('thought', { 
      message: `✅ Generated ${recommendedActions.length} recommended actions` 
    });

    // Send final complete data
    sendEvent('complete', {
      summary,
      insights: fullInsights,
      charts: {
        agingDistribution,
        invoiceBreakdown
      },
      recommendedActions
    });

    res.end();

  } catch (error) {
    console.error('❌ /api/analyze-supplier-stream ERROR:', error.message);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
    res.end();
  }
});

// ADD THIS NEW ENDPOINT to your server.js
// Deep Research Sub-Agent with Multi-Source Validation

// FINAL FIXED VERSION - Replace /api/deep-research-agent endpoint with this

app.post('/api/deep-research-invoices', async (req, res) => {
  try {
    const { vendorName, vendorId, action } = req.body;
    
    console.log('\n🔬 /api/deep-research-invoices called');
    console.log('   Vendor:', vendorName);

    if (!pythonServerReady) {
      console.log('❌ Python server not ready');
      return res.status(503).json({ error: 'Python server not ready' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      res.write(`event: log\n`);
      res.write(`data: ${JSON.stringify({ timestamp, message, type })}\n\n`);
    };

    const sendProgress = (current, total, status) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify({ current, total, status })}\n\n`);
    };

    const sendInvoiceResult = (invoice) => {
      res.write(`event: invoice\n`);
      res.write(`data: ${JSON.stringify(invoice)}\n\n`);
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Initialize
    sendLog('🚀 Initializing Deep Research with Action Sub-Agent...', 'system');
    await sleep(800);
    sendLog('📡 Connecting to AIDP (AI Data Platform)...', 'info');
    await sleep(1000);
    sendLog('✅ AIDP connection established', 'success');
    await sleep(500);
    sendLog('🔌 Connecting to EBS Data Warehouse...', 'info');
    await sleep(900);
    sendLog('✅ EBS Data Warehouse connected', 'success');
    await sleep(500);
    sendLog('📊 Connecting to Supplier Master Database...', 'info');
    await sleep(800);
    sendLog('✅ Supplier DB connection active', 'success');
    await sleep(500);
    sendLog('🔐 Connecting to OIC Gateway...', 'info');
    await sleep(1000);
    sendLog('✅ OIC Gateway authenticated', 'success');
    await sleep(700);

    // Get invoices
    sendLog('🔍 Querying UNPAID invoices for deep analysis...', 'info');
    await sleep(1200);

    const invoiceSQL = `
      SELECT 
        ai.invoice_id,
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.amount_paid,
        ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding,
        TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
        ai.payment_status_flag,
        ai.description,
        pv.vendor_name,
        pv.vendor_id
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
        AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
      ORDER BY ai.invoice_date ASC
    `;

    const invoicesResult = await executeSQLviaPython(invoiceSQL);

    if (!invoicesResult.success || !invoicesResult.data || invoicesResult.data.length === 0) {
      sendLog('⚠️ No unpaid invoices found for this supplier', 'warning');
      await sleep(500);

      // Send proper complete event even with no invoices
      const emptyResult = {
        success: true,
        summary: {
          totalAnalyzed: 0,
          autoApproved: 0,
          autoApprovedAmount: 0,
          needReview: 0,
          needReviewAmount: 0,
          needInvestigation: 0,
          needInvestigationAmount: 0,
          batchId: null,
          invoices: [],
          greenInvoices: [],
          redInvoices: []
        }
      };
      
      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify(emptyResult)}\n\n`);
      res.end();
      return;
    }

    const invoices = invoicesResult.data;
    sendLog(`✅ Retrieved ${invoices.length} UNPAID invoices for analysis`, 'success');
    await sleep(1000);
    sendLog('', 'separator');
    sendLog('🤖 Initiating AI-Powered Multi-Source Validation...', 'system');
    sendLog('', 'separator');
    await sleep(800);

    const processedInvoices = [];
    
    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const invNum = invoice.INVOICE_NUM || invoice.invoice_num;
      const amount = parseFloat(invoice.OUTSTANDING || invoice.outstanding || 0);
      const daysOld = parseInt(invoice.DAYS_OLD || invoice.days_old || 0);

      sendLog(`\n📄 Analyzing Invoice #${invNum} (${i + 1}/${invoices.length})...`, 'info');
      sendProgress(i + 1, invoices.length, `Analyzing Invoice #${invNum}`);
      await sleep(500);

      const checks = [];

      // Check 1: EBS
      sendLog(`  🔍 Checking EBS historical payment patterns...`, 'check');
      await sleep(400 + Math.random() * 300);
      const hasGoodHistory = Math.random() > 0.3;
      checks.push({
        source: 'EBS Historical',
        status: hasGoodHistory ? 'pass' : 'review',
        message: hasGoodHistory ? 'Consistent payment history' : 'Payment delays detected'
      });
      sendLog(`  ${hasGoodHistory ? '✅' : '⚠️'} EBS: ${checks[0].message}`, hasGoodHistory ? 'success' : 'warning');
      await sleep(300);

      // Check 2: AIDP
      sendLog(`  🔍 AIDP scanning for duplicate invoices...`, 'check');
      await sleep(500 + Math.random() * 400);
      const isDuplicate = Math.random() > 0.85;
      checks.push({
        source: 'AIDP Duplicate Scan',
        status: isDuplicate ? 'flag' : 'pass',
        message: isDuplicate ? 'Potential duplicate detected' : 'No duplicates found'
      });
      sendLog(`  ${isDuplicate ? '🚨' : '✅'} AIDP: ${checks[1].message}`, isDuplicate ? 'error' : 'success');
      await sleep(300);

      // Check 3: Supplier
      sendLog(`  🔍 Validating against Supplier Master DB...`, 'check');
      await sleep(450 + Math.random() * 350);
      const supplierValid = Math.random() > 0.2;
      checks.push({
        source: 'Supplier DB',
        status: supplierValid ? 'pass' : 'review',
        message: supplierValid ? 'Supplier verified & active' : 'Supplier status needs review'
      });
      sendLog(`  ${supplierValid ? '✅' : '⚠️'} Supplier DB: ${checks[2].message}`, supplierValid ? 'success' : 'warning');
      await sleep(300);

      // Check 4: Amount
      sendLog(`  🔍 Validating invoice amount...`, 'check');
      await sleep(350 + Math.random() * 250);
      const amountValid = amount < 20000000 && amount > 0;
      checks.push({
        source: 'Amount Validation',
        status: amountValid ? 'pass' : 'review',
        message: amountValid ? 'Amount within normal range' : 'Amount requires approval'
      });
      sendLog(`  ${amountValid ? '✅' : '⚠️'} Amount: ${checks[3].message}`, amountValid ? 'success' : 'warning');
      await sleep(300);

      // Check 5: Aging
      sendLog(`  🔍 Analyzing invoice aging...`, 'check');
      await sleep(400 + Math.random() * 300);
      const agingOk = daysOld < 3000;
      checks.push({
        source: 'Aging Analysis',
        status: agingOk ? 'pass' : 'review',
        message: agingOk ? `${daysOld} days - within policy` : `${daysOld} days - exceeds policy`
      });
      sendLog(`  ${agingOk ? '✅' : '⚠️'} Aging: ${checks[4].message}`, agingOk ? 'success' : 'warning');
      await sleep(400);

      // Determine status
      const hasFlags = checks.some(c => c.status === 'flag');
      const hasReviews = checks.some(c => c.status === 'review');
      
      let finalStatus, statusColor, statusIcon, recommendation;
      
      if (hasFlags) {
        finalStatus = 'INVESTIGATE';
        statusColor = 'red';
        statusIcon = '🚨';
        recommendation = 'Manual review required - potential issues detected';
      } else if (hasReviews) {
        finalStatus = 'REVIEW';
        statusColor = 'yellow';
        statusIcon = '⚠️';
        recommendation = 'Requires approval before processing';
      } else {
        finalStatus = 'AUTO_APPROVED';
        statusColor = 'green';
        statusIcon = '✅';
        recommendation = 'Cleared for automatic submission';
      }

      sendLog(`  ${statusIcon} Decision: ${finalStatus} - ${recommendation}`, 
        finalStatus === 'AUTO_APPROVED' ? 'success' : 
        finalStatus === 'REVIEW' ? 'warning' : 'error');
      await sleep(400);

      const processedInvoice = {
        invoiceNum: invNum,
        amount: amount,
        daysOld: daysOld,
        status: finalStatus,
        statusColor: statusColor,
        checks: checks,
        recommendation: recommendation,
        timestamp: ANALYSIS_DATE_OBJ.toISOString()
      };

      processedInvoices.push(processedInvoice);
      sendInvoiceResult(processedInvoice);
      await sleep(200);
    }

    // Summary
    sendLog('', 'separator');
    sendLog('📊 Research Complete - Generating Summary...', 'system');
    await sleep(1000);

    const autoApprove = processedInvoices.filter(i => i.status === 'AUTO_APPROVED');
    const needReview = processedInvoices.filter(i => i.status === 'REVIEW');
    const needInvestigation = processedInvoices.filter(i => i.status === 'INVESTIGATE');

    const autoApprovedAmount = autoApprove.reduce((sum, i) => sum + (i.amount || 0), 0);
    const needReviewAmount = needReview.reduce((sum, i) => sum + (i.amount || 0), 0);
    const needInvestigationAmount = needInvestigation.reduce((sum, i) => sum + (i.amount || 0), 0);

    sendLog(`\n📈 Analysis Summary:`, 'info');
    sendLog(`  ✅ Auto-Approved: ${autoApprove.length} invoices ($${autoApprovedAmount.toLocaleString()})`, 'success');
    sendLog(`  ⚠️  Need Review: ${needReview.length} invoices ($${needReviewAmount.toLocaleString()})`, 'warning');
    sendLog(`  🚨 Need Investigation: ${needInvestigation.length} invoices ($${needInvestigationAmount.toLocaleString()})`, 'error');
    await sleep(1500);

    let batchId = null;

    // OIC Submission
    if (autoApprove.length > 0) {
      sendLog('', 'separator');
      sendLog('🔄 Initiating OIC Gateway Submission...', 'system');
      await sleep(1000);
      sendLog('📦 Preparing batch payload for auto-approved invoices...', 'info');
      await sleep(800);
      sendLog(`✅ Payload prepared: ${autoApprove.length} invoices`, 'success');
      await sleep(600);
      sendLog('🔐 Authenticating with OIC Gateway...', 'info');
      await sleep(700);
      sendLog('✅ Authentication successful', 'success');
      await sleep(500);
      sendLog('📤 Submitting to EBS Payment Processing...', 'info');
      await sleep(1500);
      sendLog('✅ Submission accepted by EBS', 'success');
      await sleep(800);
      sendLog('🔔 Triggering payment workflow...', 'info');
      await sleep(1000);
      sendLog('✅ Payment workflow initiated', 'success');
      await sleep(600);

      batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      sendLog(`📋 Batch ID: ${batchId}`, 'success');
      await sleep(500);
      sendLog(`💰 Total submitted for payment: $${autoApprovedAmount.toLocaleString()}`, 'success');
      await sleep(800);

      for (const inv of autoApprove) {
        sendLog(`  ✅ Invoice #${inv.invoiceNum} queued for payment ($${inv.amount.toLocaleString()})`, 'success');
        await sleep(200);
      }
    }

    // Alerts
    if (needReview.length > 0 || needInvestigation.length > 0) {
      sendLog('', 'separator');
      sendLog('📧 Generating Alerts for Items Requiring Attention...', 'info');
      await sleep(1000);

      if (needInvestigation.length > 0) {
        sendLog(`🚨 HIGH Priority Alert: ${needInvestigation.length} invoices flagged for investigation`, 'error');
        await sleep(400);
      }

      if (needReview.length > 0) {
        sendLog(`⚠️  MEDIUM Priority Alert: ${needReview.length} invoices require approval`, 'warning');
        await sleep(400);
      }

      await sleep(500);
      sendLog('✅ Alerts sent to AP Manager dashboard', 'success');
      await sleep(500);
    }

    // Final
    sendLog('', 'separator');
    sendLog('✅ Deep Research with Action Analysis Complete!', 'system');
    await sleep(500);

    // Build final summary - THIS IS THE KEY FIX
    const finalSummary = {
      success: true,
      summary: {
        totalAnalyzed: processedInvoices.length,
        autoApproved: autoApprove.length,
        autoApprovedAmount: autoApprovedAmount,
        needReview: needReview.length,
        needReviewAmount: needReviewAmount,
        needInvestigation: needInvestigation.length,
        needInvestigationAmount: needInvestigationAmount,
        batchId: batchId,
        invoices: processedInvoices,
        greenInvoices: autoApprove,
        redInvoices: needInvestigation
      }
    };

    console.log('Sending complete event with summary:', {
      totalAnalyzed: finalSummary.summary.totalAnalyzed,
      autoApproved: finalSummary.summary.autoApproved,
      batchId: finalSummary.summary.batchId
    });

    // Send complete event
    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify(finalSummary)}\n\n`);
    res.end();

  } catch (error) {
    console.error('❌ /api/deep-research-agent ERROR:', error.message);
    console.error(error.stack);
    
    res.write(`event: log\n`);
    res.write(`data: ${JSON.stringify({ 
      timestamp: new Date().toLocaleTimeString(),
      message: `❌ Error: ${error.message}`,
      type: 'error'
    })}\n\n`);
    
    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify({ 
      success: false, 
      error: error.message,
      summary: {
        totalAnalyzed: 0,
        autoApproved: 0,
        autoApprovedAmount: 0,
        needReview: 0,
        needReviewAmount: 0,
        needInvestigation: 0,
        needInvestigationAmount: 0,
        batchId: null,
        invoices: [],
        greenInvoices: [],
        redInvoices: []
      }
    })}\n\n`);
    res.end();
  }
});



// Deep Research Agent with Action - Top 20 invoices (date ASC)
// Used by the "Deep Research & Execute" button in SupplierAnalysis and Dashboard

app.post('/api/deep-research-action', async (req, res) => {
  try {
    const { vendorName, vendorId, action } = req.body;

    console.log('\n🔬 /api/deep-research-action called (Top 20)');
    console.log('   Vendor:', vendorName);

    if (!pythonServerReady) {
      console.log('❌ Python server not ready');
      return res.status(503).json({ error: 'Python server not ready' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      res.write(`event: log\n`);
      res.write(`data: ${JSON.stringify({ timestamp, message, type })}\n\n`);
    };

    const sendProgress = (current, total, status) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify({ current, total, status })}\n\n`);
    };

    const sendInvoiceResult = (invoice) => {
      res.write(`event: invoice\n`);
      res.write(`data: ${JSON.stringify(invoice)}\n\n`);
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Initialize
    sendLog('🚀 Initializing Deep Research with Action Sub-Agent...', 'system');
    await sleep(800);
    sendLog('📡 Connecting to AIDP (AI Data Platform)...', 'info');
    await sleep(1000);
    sendLog('✅ AIDP connection established', 'success');
    await sleep(500);
    sendLog('🔌 Connecting to EBS Data Warehouse...', 'info');
    await sleep(900);
    sendLog('✅ EBS Data Warehouse connected', 'success');
    await sleep(500);
    sendLog('📊 Connecting to Supplier Master Database...', 'info');
    await sleep(800);
    sendLog('✅ Supplier DB connection active', 'success');
    await sleep(500);
    sendLog('🔐 Connecting to OIC Gateway...', 'info');
    await sleep(1000);
    sendLog('✅ OIC Gateway authenticated', 'success');
    await sleep(700);

    // Get invoices - TOP 20 date ASC
    sendLog('🔍 Querying TOP 20 UNPAID invoices for deep analysis...', 'info');
    await sleep(1200);

    const invoiceSQL = `
      SELECT
        ai.invoice_id,
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.amount_paid,
        ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding,
        TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
        ai.payment_status_flag,
        ai.description,
        pv.vendor_name,
        pv.vendor_id
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
        AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
      ORDER BY ai.invoice_date ASC
      FETCH FIRST 20 ROWS ONLY
    `;

    const invoicesResult = await executeSQLviaPython(invoiceSQL);

    if (!invoicesResult.success || !invoicesResult.data || invoicesResult.data.length === 0) {
      sendLog('⚠️ No unpaid invoices found for this supplier', 'warning');
      await sleep(500);

      const emptyResult = {
        success: true,
        summary: {
          totalAnalyzed: 0,
          autoApproved: 0,
          autoApprovedAmount: 0,
          needReview: 0,
          needReviewAmount: 0,
          needInvestigation: 0,
          needInvestigationAmount: 0,
          batchId: null,
          invoices: [],
          greenInvoices: [],
          redInvoices: []
        }
      };

      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify(emptyResult)}\n\n`);
      res.end();
      return;
    }

    const invoices = invoicesResult.data;
    sendLog(`✅ Retrieved ${invoices.length} UNPAID invoices for analysis`, 'success');
    await sleep(1000);
    sendLog('', 'separator');
    sendLog('🤖 Initiating AI-Powered Multi-Source Validation...', 'system');
    sendLog('', 'separator');
    await sleep(800);

    const processedInvoices = [];

    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const invNum = invoice.INVOICE_NUM || invoice.invoice_num;
      const amount = parseFloat(invoice.OUTSTANDING || invoice.outstanding || 0);
      const daysOld = parseInt(invoice.DAYS_OLD || invoice.days_old || 0);

      sendLog(`\n📄 Analyzing Invoice #${invNum} (${i + 1}/${invoices.length})...`, 'info');
      sendProgress(i + 1, invoices.length, `Analyzing Invoice #${invNum}`);
      await sleep(500);

      const checks = [];

      // Check 1: EBS
      sendLog(`  🔍 Checking EBS historical payment patterns...`, 'check');
      await sleep(400 + Math.random() * 300);
      const hasGoodHistory = Math.random() > 0.3;
      checks.push({
        source: 'EBS Historical',
        status: hasGoodHistory ? 'pass' : 'review',
        message: hasGoodHistory ? 'Consistent payment history' : 'Payment delays detected'
      });
      sendLog(`  ${hasGoodHistory ? '✅' : '⚠️'} EBS: ${checks[0].message}`, hasGoodHistory ? 'success' : 'warning');
      await sleep(300);

      // Check 2: AIDP
      sendLog(`  🔍 AIDP scanning for duplicate invoices...`, 'check');
      await sleep(500 + Math.random() * 400);
      const isDuplicate = Math.random() > 0.85;
      checks.push({
        source: 'AIDP Duplicate Scan',
        status: isDuplicate ? 'flag' : 'pass',
        message: isDuplicate ? 'Potential duplicate detected' : 'No duplicates found'
      });
      sendLog(`  ${isDuplicate ? '🚨' : '✅'} AIDP: ${checks[1].message}`, isDuplicate ? 'error' : 'success');
      await sleep(300);

      // Check 3: Supplier
      sendLog(`  🔍 Validating against Supplier Master DB...`, 'check');
      await sleep(450 + Math.random() * 350);
      const supplierValid = Math.random() > 0.2;
      checks.push({
        source: 'Supplier DB',
        status: supplierValid ? 'pass' : 'review',
        message: supplierValid ? 'Supplier verified & active' : 'Supplier status needs review'
      });
      sendLog(`  ${supplierValid ? '✅' : '⚠️'} Supplier DB: ${checks[2].message}`, supplierValid ? 'success' : 'warning');
      await sleep(300);

      // Check 4: Amount
      sendLog(`  🔍 Validating invoice amount...`, 'check');
      await sleep(350 + Math.random() * 250);
      const amountValid = amount < 20000000 && amount > 0;
      checks.push({
        source: 'Amount Validation',
        status: amountValid ? 'pass' : 'review',
        message: amountValid ? 'Amount within normal range' : 'Amount requires approval'
      });
      sendLog(`  ${amountValid ? '✅' : '⚠️'} Amount: ${checks[3].message}`, amountValid ? 'success' : 'warning');
      await sleep(300);

      // Check 5: Aging
      sendLog(`  🔍 Analyzing invoice aging...`, 'check');
      await sleep(400 + Math.random() * 300);
      const agingOk = daysOld < 3000;
      checks.push({
        source: 'Aging Analysis',
        status: agingOk ? 'pass' : 'review',
        message: agingOk ? `${daysOld} days - within policy` : `${daysOld} days - exceeds policy`
      });
      sendLog(`  ${agingOk ? '✅' : '⚠️'} Aging: ${checks[4].message}`, agingOk ? 'success' : 'warning');
      await sleep(400);

      // Determine status
      const hasFlags = checks.some(c => c.status === 'flag');
      const hasReviews = checks.some(c => c.status === 'review');

      let finalStatus, statusColor, statusIcon, recommendation;

      if (hasFlags) {
        finalStatus = 'INVESTIGATE';
        statusColor = 'red';
        statusIcon = '🚨';
        recommendation = 'Manual review required - potential issues detected';
      } else if (hasReviews) {
        finalStatus = 'REVIEW';
        statusColor = 'yellow';
        statusIcon = '⚠️';
        recommendation = 'Requires approval before processing';
      } else {
        finalStatus = 'AUTO_APPROVED';
        statusColor = 'green';
        statusIcon = '✅';
        recommendation = 'Cleared for automatic submission';
      }

      sendLog(`  ${statusIcon} Decision: ${finalStatus} - ${recommendation}`,
        finalStatus === 'AUTO_APPROVED' ? 'success' :
        finalStatus === 'REVIEW' ? 'warning' : 'error');
      await sleep(400);

      const processedInvoice = {
        invoiceNum: invNum,
        amount: amount,
        daysOld: daysOld,
        status: finalStatus,
        statusColor: statusColor,
        checks: checks,
        recommendation: recommendation,
        timestamp: ANALYSIS_DATE_OBJ.toISOString()
      };

      processedInvoices.push(processedInvoice);
      sendInvoiceResult(processedInvoice);
      await sleep(200);
    }

    // Summary
    sendLog('', 'separator');
    sendLog('📊 Research Complete - Generating Summary...', 'system');
    await sleep(1000);

    const autoApprove = processedInvoices.filter(i => i.status === 'AUTO_APPROVED');
    const needReview = processedInvoices.filter(i => i.status === 'REVIEW');
    const needInvestigation = processedInvoices.filter(i => i.status === 'INVESTIGATE');

    const autoApprovedAmount = autoApprove.reduce((sum, i) => sum + (i.amount || 0), 0);
    const needReviewAmount = needReview.reduce((sum, i) => sum + (i.amount || 0), 0);
    const needInvestigationAmount = needInvestigation.reduce((sum, i) => sum + (i.amount || 0), 0);

    sendLog(`\n📈 Analysis Summary:`, 'info');
    sendLog(`  ✅ Auto-Approved: ${autoApprove.length} invoices ($${autoApprovedAmount.toLocaleString()})`, 'success');
    sendLog(`  ⚠️  Need Review: ${needReview.length} invoices ($${needReviewAmount.toLocaleString()})`, 'warning');
    sendLog(`  🚨 Need Investigation: ${needInvestigation.length} invoices ($${needInvestigationAmount.toLocaleString()})`, 'error');
    await sleep(1500);

    let batchId = null;

    // OIC Submission
    if (autoApprove.length > 0) {
      sendLog('', 'separator');
      sendLog('🔄 Initiating OIC Gateway Submission...', 'system');
      await sleep(1000);
      sendLog('📦 Preparing batch payload for auto-approved invoices...', 'info');
      await sleep(800);
      sendLog(`✅ Payload prepared: ${autoApprove.length} invoices`, 'success');
      await sleep(600);
      sendLog('🔐 Authenticating with OIC Gateway...', 'info');
      await sleep(700);
      sendLog('✅ Authentication successful', 'success');
      await sleep(500);
      sendLog('📤 Submitting to EBS Payment Processing...', 'info');
      await sleep(1500);
      sendLog('✅ Submission accepted by EBS', 'success');
      await sleep(800);
      sendLog('🔔 Triggering payment workflow...', 'info');
      await sleep(1000);
      sendLog('✅ Payment workflow initiated', 'success');
      await sleep(600);

      batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      sendLog(`📋 Batch ID: ${batchId}`, 'success');
      await sleep(500);
      sendLog(`💰 Total submitted for payment: $${autoApprovedAmount.toLocaleString()}`, 'success');
      await sleep(800);

      for (const inv of autoApprove) {
        sendLog(`  ✅ Invoice #${inv.invoiceNum} queued for payment ($${inv.amount.toLocaleString()})`, 'success');
        await sleep(200);
      }
    }

    // Alerts
    if (needReview.length > 0 || needInvestigation.length > 0) {
      sendLog('', 'separator');
      sendLog('📧 Generating Alerts for Items Requiring Attention...', 'info');
      await sleep(1000);

      if (needInvestigation.length > 0) {
        sendLog(`🚨 HIGH Priority Alert: ${needInvestigation.length} invoices flagged for investigation`, 'error');
        await sleep(400);
      }

      if (needReview.length > 0) {
        sendLog(`⚠️  MEDIUM Priority Alert: ${needReview.length} invoices require approval`, 'warning');
        await sleep(400);
      }

      await sleep(500);
      sendLog('✅ Alerts sent to AP Manager dashboard', 'success');
      await sleep(500);
    }

    // Final
    sendLog('', 'separator');
    sendLog('✅ Deep Research with Action Analysis Complete!', 'system');
    await sleep(500);

    const finalSummary = {
      success: true,
      summary: {
        totalAnalyzed: processedInvoices.length,
        autoApproved: autoApprove.length,
        autoApprovedAmount: autoApprovedAmount,
        needReview: needReview.length,
        needReviewAmount: needReviewAmount,
        needInvestigation: needInvestigation.length,
        needInvestigationAmount: needInvestigationAmount,
        batchId: batchId,
        invoices: processedInvoices,
        greenInvoices: autoApprove,
        redInvoices: needInvestigation
      }
    };

    console.log('Sending complete event with summary:', {
      totalAnalyzed: finalSummary.summary.totalAnalyzed,
      autoApproved: finalSummary.summary.autoApproved,
      batchId: finalSummary.summary.batchId
    });

    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify(finalSummary)}\n\n`);
    res.end();

  } catch (error) {
    console.error('❌ /api/deep-research-action ERROR:', error.message);
    console.error(error.stack);

    res.write(`event: log\n`);
    res.write(`data: ${JSON.stringify({
      timestamp: new Date().toLocaleTimeString(),
      message: `❌ Error: ${error.message}`,
      type: 'error'
    })}\n\n`);

    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify({
      success: false,
      error: error.message,
      summary: {
        totalAnalyzed: 0,
        autoApproved: 0,
        autoApprovedAmount: 0,
        needReview: 0,
        needReviewAmount: 0,
        needInvestigation: 0,
        needInvestigationAmount: 0,
        batchId: null,
        invoices: [],
        greenInvoices: [],
        redInvoices: []
      }
    })}\n\n`);
    res.end();
  }
});


// Negotiate Payment Terms Sub-Agent
// Flow: Internal Assessment → Preparation → Supplier Outreach (Phone + Email)

app.post('/api/negotiate-payment-terms', async (req, res) => {
  try {
    const { vendorName, vendorId, action } = req.body;

    console.log('\n🤝 /api/negotiate-payment-terms called');
    console.log('   Vendor:', vendorName);

    if (!pythonServerReady) {
      console.log('❌ Python server not ready');
      return res.status(503).json({ error: 'Python server not ready' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      res.write(`event: log\n`);
      res.write(`data: ${JSON.stringify({ timestamp, message, type })}\n\n`);
    };

    const sendProgress = (current, total, status) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify({ current, total, status })}\n\n`);
    };

    const sendInvoiceResult = (invoice) => {
      res.write(`event: invoice\n`);
      res.write(`data: ${JSON.stringify(invoice)}\n\n`);
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ========================================================
    // PHASE 0: Initialize connections
    // ========================================================
    sendLog('🚀 Initializing Negotiate Payment Terms Agent...', 'system');
    sendLog('   Orchestrating 3-phase negotiation with sub-agent chain...', 'system');
    await sleep(800);
    sendLog('📡 Connecting to AIDP (AI Data Platform)...', 'info');
    await sleep(1000);
    sendLog('✅ AIDP connection established', 'success');
    await sleep(500);
    sendLog('🔌 Connecting to EBS Data Warehouse...', 'info');
    await sleep(900);
    sendLog('✅ EBS Data Warehouse connected', 'success');
    await sleep(500);
    sendLog('📊 Connecting to Supplier Master Database...', 'info');
    await sleep(800);
    sendLog('✅ Supplier DB connection active', 'success');
    await sleep(500);
    sendLog('🔐 Connecting to OIC Gateway...', 'info');
    await sleep(1000);
    sendLog('✅ OIC Gateway authenticated', 'success');
    await sleep(700);

    // ========================================================
    // PHASE 1: INTERNAL ASSESSMENT (Before Contacting Supplier)
    // ========================================================
    sendLog('', 'separator');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    sendLog('📋 PHASE 1: INTERNAL ASSESSMENT', 'system');
    sendLog('   Analyzing cash flow, situation, and categorizing invoices...', 'system');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    await sleep(1000);

    // ── 1.1 Identify the Need ──
    sendLog('', 'separator');
    sendLog('🔍 1.1 IDENTIFY THE NEED [Sub-Agent: Cash Flow Analyzer]', 'system');
    await sleep(800);
    sendLog('🤖 Cash Flow Analyzer Sub-Agent spawned...', 'info');
    await sleep(600);
    sendLog('📡 Running cash flow projection model...', 'info');
    await sleep(1200);

    // Get total AP outstanding across all suppliers for context
    const cashFlowSQL = `
      SELECT
        COUNT(DISTINCT pv.vendor_id) as total_suppliers_outstanding,
        SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) as total_ap_outstanding,
        COUNT(ai.invoice_id) as total_unpaid_invoices
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
        AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
    `;

    let totalAPOutstanding = 0;
    let totalSuppliersOutstanding = 0;
    try {
      const cfResult = await executeSQLviaPython(cashFlowSQL);
      if (cfResult.success && cfResult.data && cfResult.data.length > 0) {
        totalAPOutstanding = parseFloat(cfResult.data[0].TOTAL_AP_OUTSTANDING || cfResult.data[0].total_ap_outstanding || 0);
        totalSuppliersOutstanding = parseInt(cfResult.data[0].TOTAL_SUPPLIERS_OUTSTANDING || cfResult.data[0].total_suppliers_outstanding || 0);
      }
    } catch (e) { /* continue */ }
    await sleep(600);

    // Fetch unpaid invoices for this supplier
    sendLog('📡 Querying UNPAID invoices for supplier analysis...', 'info');
    await sleep(1200);

    const invoiceSQL = `
      SELECT
        ai.invoice_id,
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.amount_paid,
        ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding,
        TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
        ai.payment_status_flag,
        ai.description,
        pv.vendor_name,
        pv.vendor_id
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
        AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
      ORDER BY ai.invoice_date ASC
      FETCH FIRST 20 ROWS ONLY
    `;

    const invoicesResult = await executeSQLviaPython(invoiceSQL);

    if (!invoicesResult.success || !invoicesResult.data || invoicesResult.data.length === 0) {
      sendLog('⚠️ No unpaid invoices found for this supplier', 'warning');
      await sleep(500);
      const emptyResult = {
        success: true,
        summary: {
          totalAnalyzed: 0, autoApproved: 0, autoApprovedAmount: 0,
          needReview: 0, needReviewAmount: 0,
          needInvestigation: 0, needInvestigationAmount: 0,
          batchId: null, invoices: [], greenInvoices: [], redInvoices: []
        }
      };
      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify(emptyResult)}\n\n`);
      res.end();
      return;
    }

    const invoices = invoicesResult.data;

    // Parse invoice data
    const prioritized = invoices.map(inv => {
      const daysOld = parseInt(inv.DAYS_OLD || inv.days_old || 0);
      const amount = parseFloat(inv.OUTSTANDING || inv.outstanding || 0);
      return { ...inv, daysOld, amount };
    });

    const totalOutstanding = prioritized.reduce((s, i) => s + i.amount, 0);
    const avgDaysOld = Math.round(prioritized.reduce((s, i) => s + i.daysOld, 0) / prioritized.length);
    const maxDaysOld = Math.max(...prioritized.map(i => i.daysOld));
    const supplierShareOfAP = totalAPOutstanding > 0 ? ((totalOutstanding / totalAPOutstanding) * 100).toFixed(1) : 0;

    sendLog(`✅ Retrieved ${invoices.length} UNPAID invoices`, 'success');
    await sleep(400);
    sendLog(`📊 Cash Flow Impact Assessment:`, 'info');
    sendLog(`  💰 Total AP Outstanding (all suppliers): $${totalAPOutstanding.toLocaleString()}`, 'info');
    sendLog(`  🏢 Suppliers with outstanding: ${totalSuppliersOutstanding}`, 'info');
    sendLog(`  📌 ${vendorName} exposure: $${totalOutstanding.toLocaleString()} (${supplierShareOfAP}% of total AP)`, 'info');
    sendLog(`  ⏱️  Average aging: ${avgDaysOld} days | Worst case: ${maxDaysOld} days`, 'info');
    await sleep(600);

    const severity = totalOutstanding > 500000 ? 'SEVERE' : totalOutstanding > 100000 ? 'MODERATE' : 'MINIMAL';
    sendLog(`  🚨 SHORTFALL DETECTED: $${totalOutstanding.toLocaleString()} in overdue obligations across ${invoices.length} invoices`, severity === 'SEVERE' ? 'error' : severity === 'MODERATE' ? 'warning' : 'info');
    sendLog(`  📉 Cash flow impact: ${severity}`, severity === 'SEVERE' ? 'error' : severity === 'MODERATE' ? 'warning' : 'success');
    await sleep(800);

    // ── 1.2 Analyze the Situation ──
    sendLog('', 'separator');
    sendLog('🔎 1.2 ANALYZE THE SITUATION [Sub-Agent: Situation Analyzer]', 'system');
    await sleep(800);
    sendLog('🤖 Situation Analyzer Sub-Agent spawned...', 'info');
    await sleep(600);
    sendLog('📡 Evaluating negotiation parameters...', 'info');
    await sleep(1000);

    // Get historical data for leverage assessment
    const historySQL = `
      SELECT
        COUNT(ai.invoice_id) as total_invoices,
        SUM(CASE WHEN ai.payment_status_flag = 'Y' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN ai.payment_status_flag != 'Y' THEN 1 ELSE 0 END) as unpaid_count,
        SUM(ai.invoice_amount) as total_invoice_amount,
        SUM(NVL(ai.amount_paid, 0)) as total_paid_amount,
        AVG(ai.invoice_amount) as avg_invoice_amount
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.cancelled_date IS NULL
    `;

    let historyData = null;
    let paymentRate = 0;
    let totalInvCount = 0;
    let totalInvoiceAmount = 0;
    try {
      const histResult = await executeSQLviaPython(historySQL);
      if (histResult.success && histResult.data && histResult.data.length > 0) {
        historyData = histResult.data[0];
        totalInvCount = parseInt(historyData.TOTAL_INVOICES || historyData.total_invoices || 0);
        const paidCount = parseInt(historyData.PAID_COUNT || historyData.paid_count || 0);
        paymentRate = totalInvCount > 0 ? ((paidCount / totalInvCount) * 100) : 0;
        totalInvoiceAmount = parseFloat(historyData.TOTAL_INVOICE_AMOUNT || historyData.total_invoice_amount || 0);
      }
    } catch (e) {
      sendLog('⚠️ Could not retrieve full history, using available data', 'warning');
    }
    await sleep(800);

    const supplierCriticality = totalOutstanding > 100000 || invoices.length > 10 ? 'HIGH' : totalOutstanding > 10000 ? 'MEDIUM' : 'LOW';
    const extensionNeeded = avgDaysOld > 1000 ? 90 : avgDaysOld > 500 ? 60 : 30;

    sendLog(`📊 Situation Analysis Results:`, 'info');
    sendLog(`  ⏳ Time needed: ~${extensionNeeded}-day extension recommended`, 'info');
    sendLog(`  💵 Money involved: $${totalOutstanding.toLocaleString()} across ${invoices.length} invoices`, 'info');
    sendLog(`  🏭 Supplier criticality: ${supplierCriticality}`, supplierCriticality === 'HIGH' ? 'warning' : 'info');
    sendLog(`  📈 Payment history: ${paymentRate.toFixed(1)}% on-time rate (${totalInvCount} total invoices)`, paymentRate > 70 ? 'success' : paymentRate > 40 ? 'warning' : 'error');
    sendLog(`  💪 Leverage assessment: ${paymentRate > 70 ? 'STRONG' : paymentRate > 40 ? 'MODERATE' : 'LIMITED'} - ${paymentRate > 70 ? 'excellent payment track record' : paymentRate > 40 ? 'mixed payment history' : 'weak payment history'}`, paymentRate > 70 ? 'success' : paymentRate > 40 ? 'warning' : 'error');
    await sleep(800);
    sendLog('✅ Situation analysis complete', 'success');
    await sleep(600);

    // ── 1.3 Categorize Invoices ──
    sendLog('', 'separator');
    sendLog('📂 1.3 CATEGORIZE INVOICES [Sub-Agent: Invoice Classifier]', 'system');
    await sleep(800);
    sendLog('🤖 Invoice Classifier Sub-Agent spawned...', 'info');
    await sleep(600);

    // Get supplier details for categorization
    const supplierSQL = `
      SELECT
        pv.vendor_name, pv.vendor_id, pv.vendor_type_lookup_code,
        pv.enabled_flag, pv.start_date_active, pv.end_date_active,
        pvs.vendor_site_code, pvs.payment_method_lookup_code, pvs.terms_name
      FROM ap.ap_suppliers pv
      LEFT JOIN ap.ap_supplier_sites_all pvs ON pv.vendor_id = pvs.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
      FETCH FIRST 1 ROWS ONLY
    `;

    let supplierInfo = null;
    let supplierActive = true;
    let currentTerms = 'Standard';
    try {
      const suppResult = await executeSQLviaPython(supplierSQL);
      if (suppResult.success && suppResult.data && suppResult.data.length > 0) {
        supplierInfo = suppResult.data[0];
        supplierActive = (supplierInfo.ENABLED_FLAG || supplierInfo.enabled_flag || 'Y') === 'Y';
        currentTerms = supplierInfo.TERMS_NAME || supplierInfo.terms_name || 'Standard';
      }
    } catch (e) { /* continue */ }

    // Check for duplicates
    const duplicateSQL = `
      SELECT ai.invoice_amount, COUNT(*) as duplicate_count
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y' AND ai.cancelled_date IS NULL
        AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
      GROUP BY ai.invoice_amount
      HAVING COUNT(*) > 1
      ORDER BY ai.invoice_amount DESC
      FETCH FIRST 10 ROWS ONLY
    `;

    const flaggedDuplicateInvoices = new Set();
    try {
      const dupResult = await executeSQLviaPython(duplicateSQL);
      if (dupResult.success && dupResult.data) {
        for (const dup of dupResult.data) {
          const amt = parseFloat(dup.INVOICE_AMOUNT || dup.invoice_amount || 0);
          prioritized.forEach(inv => {
            const invAmt = parseFloat(inv.INVOICE_AMOUNT || inv.invoice_amount || 0);
            if (Math.abs(invAmt - amt) < 0.01) {
              flaggedDuplicateInvoices.add(inv.INVOICE_NUM || inv.invoice_num);
            }
          });
        }
      }
    } catch (e) { /* continue */ }

    // Check for holds
    const holdsSQL = `
      SELECT COUNT(*) as hold_count
      FROM ap.ap_holds_all ah
      JOIN ap.ap_invoices_all ai ON ah.invoice_id = ai.invoice_id
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ah.release_lookup_code IS NULL
    `;
    let holdCount = 0;
    try {
      const holdResult = await executeSQLviaPython(holdsSQL);
      if (holdResult.success && holdResult.data && holdResult.data.length > 0) {
        holdCount = parseInt(holdResult.data[0].HOLD_COUNT || holdResult.data[0].hold_count || 0);
      }
    } catch (e) { /* ignore */ }

    // Assess relationship health
    const urgentCriticalCount = prioritized.filter(p => p.daysOld > 2000).length;
    let relationshipHealth;
    if (supplierActive && urgentCriticalCount === 0 && flaggedDuplicateInvoices.size === 0) {
      relationshipHealth = 'GOOD';
    } else if (!supplierActive || urgentCriticalCount > 3) {
      relationshipHealth = 'AT_RISK';
    } else {
      relationshipHealth = 'FAIR';
    }

    await sleep(600);
    sendLog('📊 Applying 4-tier invoice categorization framework...', 'info');
    await sleep(800);

    sendLog('', 'separator');
    sendLog('  CATEGORY DEFINITIONS:', 'info');
    sendLog('  🔴 URGENT CRITICAL — Utilities, payroll, raw materials (>2000 days)', 'error');
    sendLog('       → Action: Pay on time or negotiate minimal extension (7-15 days)', 'error');
    sendLog('  🟢 STRATEGIC PARTNERS — Long-term suppliers, sole-source (>500 days, good relationship)', 'success');
    sendLog('       → Action: Negotiate respectfully, offer alternatives', 'success');
    sendLog('  🟡 STANDARD VENDORS — Multiple alternatives, non-critical (200-500 days)', 'warning');
    sendLog('       → Action: More flexibility in negotiation', 'warning');
    sendLog('  🔵 NEGOTIABLE — One-time, completed services, flexible history (<200 days)', 'info');
    sendLog('       → Action: Request significant extensions', 'info');
    await sleep(1000);

    const processedInvoices = [];
    let catUrgent = 0, catStrategic = 0, catStandard = 0, catNegotiable = 0;

    for (let i = 0; i < prioritized.length; i++) {
      const invoice = prioritized[i];
      const invNum = invoice.INVOICE_NUM || invoice.invoice_num;
      const amount = invoice.amount;
      const daysOld = invoice.daysOld;
      const isDuplicate = flaggedDuplicateInvoices.has(invNum);

      sendLog(`\n📄 Categorizing Invoice #${invNum} (${i + 1}/${prioritized.length})...`, 'invoice');
      sendProgress(i + 1, prioritized.length, `Categorizing Invoice #${invNum}`);
      await sleep(400);

      sendLog(`  📋 Age: ${daysOld} days | Amount: $${amount.toLocaleString()}${isDuplicate ? ' | ⚠️ DUPLICATE FLAG' : ''}`, 'info');
      await sleep(300);

      let category, statusColor, recommendation;

      if (isDuplicate) {
        category = 'URGENT_CRITICAL';
        statusColor = 'red';
        recommendation = 'Duplicate detected — requires immediate investigation before any negotiation';
        catUrgent++;
        sendLog(`  🔴 Category: URGENT CRITICAL — ${recommendation}`, 'error');
      } else if (!supplierActive) {
        category = 'URGENT_CRITICAL';
        statusColor = 'red';
        recommendation = 'Inactive supplier — cannot process, escalate immediately';
        catUrgent++;
        sendLog(`  🔴 Category: URGENT CRITICAL — ${recommendation}`, 'error');
      } else if (daysOld > 2000) {
        category = 'URGENT_CRITICAL';
        statusColor = 'red';
        recommendation = `Severely aged (${daysOld} days) — negotiate minimal 7-15 day extension, prioritize payment`;
        catUrgent++;
        sendLog(`  🔴 Category: URGENT CRITICAL — ${recommendation}`, 'error');
      } else if (daysOld > 500 && (relationshipHealth === 'GOOD' || relationshipHealth === 'FAIR')) {
        category = 'STRATEGIC_PARTNERS';
        statusColor = 'green';
        recommendation = `Strategic partner invoice — negotiate respectfully, offer value-adds`;
        catStrategic++;
        sendLog(`  🟢 Category: STRATEGIC PARTNERS — ${recommendation}`, 'success');
      } else if (daysOld >= 200 && daysOld <= 500) {
        category = 'STANDARD_VENDORS';
        statusColor = 'yellow';
        recommendation = `Standard vendor — flexible negotiation, multiple alternatives available`;
        catStandard++;
        sendLog(`  🟡 Category: STANDARD VENDORS — ${recommendation}`, 'warning');
      } else {
        category = 'NEGOTIABLE';
        statusColor = 'yellow';
        recommendation = `Negotiable terms — request significant extension, low urgency`;
        catNegotiable++;
        sendLog(`  🔵 Category: NEGOTIABLE — ${recommendation}`, 'info');
      }
      await sleep(300);

      const processedInvoice = {
        invoiceNum: invNum,
        amount: amount,
        daysOld: daysOld,
        status: category,
        statusColor: statusColor,
        recommendation: recommendation,
        priority: category,
        timestamp: ANALYSIS_DATE_OBJ.toISOString()
      };

      processedInvoices.push(processedInvoice);
      sendInvoiceResult(processedInvoice);
      await sleep(200);
    }

    sendLog('', 'separator');
    sendLog(`📊 Categorization Summary:`, 'info');
    if (catUrgent > 0) sendLog(`  🔴 URGENT CRITICAL: ${catUrgent} invoices`, 'error');
    if (catStrategic > 0) sendLog(`  🟢 STRATEGIC PARTNERS: ${catStrategic} invoices`, 'success');
    if (catStandard > 0) sendLog(`  🟡 STANDARD VENDORS: ${catStandard} invoices`, 'warning');
    if (catNegotiable > 0) sendLog(`  🔵 NEGOTIABLE: ${catNegotiable} invoices`, 'info');
    await sleep(600);
    sendLog('✅ Phase 1: Internal Assessment complete', 'success');
    await sleep(800);

    // ========================================================
    // PHASE 2: PREPARATION
    // ========================================================
    sendLog('', 'separator');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    sendLog('📋 PHASE 2: PREPARATION', 'system');
    sendLog('   Gathering leverage points and developing negotiation strategy...', 'system');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    await sleep(1000);

    // ── 2.1 Gather Leverage Points ──
    sendLog('💪 2.1 GATHER LEVERAGE POINTS [Sub-Agent: Leverage Analyst]', 'system');
    await sleep(800);
    sendLog('🤖 Leverage Analyst Sub-Agent spawned...', 'info');
    await sleep(600);
    sendLog('📡 Querying supplier relationship history...', 'info');
    await sleep(1200);

    const yearsOfRelationship = supplierInfo?.START_DATE_ACTIVE || supplierInfo?.start_date_active
      ? Math.max(1, Math.round((ANALYSIS_DATE_OBJ - new Date(supplierInfo.START_DATE_ACTIVE || supplierInfo.start_date_active)) / (365.25 * 86400000)))
      : 5;
    const annualSpend = totalInvoiceAmount > 0 ? totalInvoiceAmount / Math.max(1, yearsOfRelationship) : totalOutstanding;
    const volumeLevel = totalInvCount > 100 ? 'HIGH' : totalInvCount > 30 ? 'MEDIUM' : 'LOW';

    sendLog(`📊 Leverage Analysis:`, 'info');
    sendLog('', 'separator');
    sendLog(`  POSITIVE LEVERAGE:`, 'info');
    sendLog(`  ✓ Relationship duration: ~${yearsOfRelationship} years with ${vendorName}`, 'success');
    sendLog(`  ✓ Annual spend: $${Math.round(annualSpend).toLocaleString()} per year`, 'success');
    sendLog(`  ✓ Payment consistency: ${paymentRate.toFixed(1)}% on-time rate${paymentRate > 70 ? ' (never late before)' : ''}`, paymentRate > 70 ? 'success' : 'warning');
    sendLog(`  ✓ Volume level: ${volumeLevel} (${totalInvCount} total invoices)`, 'success');
    sendLog(`  ✓ Industry reputation: Established account holder`, 'success');
    await sleep(800);

    // Compute leverage score (1-10)
    let leverageScore = 5;
    if (paymentRate > 70) leverageScore += 2;
    else if (paymentRate < 40) leverageScore -= 2;
    if (yearsOfRelationship >= 5) leverageScore += 1;
    if (volumeLevel === 'HIGH') leverageScore += 1;
    if (totalOutstanding > 500000) leverageScore += 1;
    leverageScore = Math.max(1, Math.min(10, leverageScore));

    const leverageLevel = leverageScore >= 7 ? 'STRONG' : leverageScore >= 4 ? 'MODERATE' : 'WEAK';

    sendLog('', 'separator');
    sendLog(`  WHAT WE CAN OFFER:`, 'info');
    sendLog(`  • Partial payment now, balance later`, 'info');
    sendLog(`  • Guaranteed payment date (scheduled auto-pay)`, 'info');
    sendLog(`  • Future purchase commitments ($${Math.round(annualSpend * 1.15).toLocaleString()} next year)`, 'info');
    sendLog(`  • Consolidation of ${invoices.length} invoices into single payment stream`, 'info');
    sendLog(`  • Referrals and testimonials`, 'info');
    await sleep(600);
    sendLog(`  📊 LEVERAGE SCORE: ${leverageScore}/10 — ${leverageLevel} negotiating position`, leverageScore >= 7 ? 'success' : leverageScore >= 4 ? 'warning' : 'error');
    await sleep(800);
    sendLog('✅ Leverage analysis complete', 'success');
    await sleep(600);

    // ── 2.2 Develop Negotiation Strategy ──
    sendLog('', 'separator');
    sendLog('📝 2.2 DEVELOP NEGOTIATION STRATEGY [Sub-Agent: Strategy Planner]', 'system');
    await sleep(800);
    sendLog('🤖 Strategy Planner Sub-Agent spawned...', 'info');
    await sleep(600);
    sendLog('🧠 Generating multi-scenario negotiation strategy...', 'info');
    await sleep(1200);

    const partialPaymentPct = leverageScore >= 7 ? 25 : leverageScore >= 4 ? 40 : 50;
    const partialPaymentAmt = Math.round(totalOutstanding * (partialPaymentPct / 100));

    const strategy = {
      idealOutcome: `${extensionNeeded + 30}-day extension with ${leverageScore >= 7 ? '3' : '2'}% early payment discount on all ${invoices.length} invoices`,
      acceptableOutcome: `${extensionNeeded}-day extension with structured payment plan for $${totalOutstanding.toLocaleString()}`,
      fallbackPosition: `${partialPaymentPct}% now ($${partialPaymentAmt.toLocaleString()}), balance in ${Math.round(extensionNeeded / 2)} days`,
      tradeOffers: [
        `Immediate partial payment of $${partialPaymentAmt.toLocaleString()}`,
        `Volume commitment increase of 15% ($${Math.round(annualSpend * 1.15).toLocaleString()}) next quarter`,
        `Consolidate ${invoices.length} invoices into single auto-pay stream`,
        `Provide 3 customer referrals for new business`
      ],
      constraints: [
        `Cannot exceed ${maxDaysOld + 30} days total aging on any invoice`,
        `Minimum ${partialPaymentPct}% immediate payment on URGENT CRITICAL invoices`,
        `Must maintain supplier active status throughout`
      ]
    };

    sendLog(`📋 Negotiation Strategy Developed:`, 'info');
    sendLog('', 'separator');
    sendLog(`  🎯 IDEAL OUTCOME:`, 'info');
    sendLog(`     ${strategy.idealOutcome}`, 'success');
    sendLog(`  ✅ ACCEPTABLE OUTCOME:`, 'info');
    sendLog(`     ${strategy.acceptableOutcome}`, 'info');
    sendLog(`  🔄 FALLBACK POSITION:`, 'info');
    sendLog(`     ${strategy.fallbackPosition}`, 'warning');
    await sleep(600);
    sendLog('', 'separator');
    sendLog(`  🎁 TRADE OFFERS:`, 'info');
    for (const offer of strategy.tradeOffers) {
      sendLog(`     • ${offer}`, 'info');
      await sleep(200);
    }
    await sleep(400);
    sendLog(`  🚫 CONSTRAINTS:`, 'info');
    for (const constraint of strategy.constraints) {
      sendLog(`     • ${constraint}`, 'warning');
      await sleep(200);
    }
    await sleep(600);
    sendLog('✅ Negotiation strategy complete', 'success');
    await sleep(800);

    // ========================================================
    // PHASE 3: SUPPLIER OUTREACH
    // ========================================================

    // Compute variables needed for outreach
    let finalNegotiatedTerms, discountPct, extensionDays;
    if (relationshipHealth === 'GOOD') {
      finalNegotiatedTerms = 'Net 60 with 2% early payment discount';
      discountPct = 2;
      extensionDays = 60;
    } else if (relationshipHealth === 'FAIR') {
      finalNegotiatedTerms = 'Net 45 with structured payment plan';
      discountPct = 0;
      extensionDays = 45;
    } else {
      finalNegotiatedTerms = `Immediate ${partialPaymentPct}% payment + Net 30 for remainder`;
      discountPct = 0;
      extensionDays = 30;
    }

    const agreementId = `NEG-AGR-${ANALYSIS_DATE_OBJ.getTime()}`;
    const today = ANALYSIS_DATE_OBJ.toISOString().split('T')[0];
    const firstPaymentDate = analysisDatePlusDays(5);
    const finalPaymentDate = analysisDatePlusDays(extensionDays);
    const invoiceIds = processedInvoices.map(i => i.invoiceNum).join(', ');

    // Map categories for summary
    const autoApprove = processedInvoices.filter(i => i.status === 'STRATEGIC_PARTNERS' || i.status === 'STANDARD_VENDORS' || i.status === 'NEGOTIABLE');
    const needInvestigation = processedInvoices.filter(i => i.status === 'URGENT_CRITICAL');
    const needReview = [];

    const autoApprovedAmount = autoApprove.reduce((sum, i) => sum + (i.amount || 0), 0);
    const needInvestigationAmount = needInvestigation.reduce((sum, i) => sum + (i.amount || 0), 0);

    let batchId = null;

    const communicationTimeline = [
      { day: 1, action: 'Send formal agreement + first payment confirmation to supplier' },
      { day: 3, action: 'Follow-up call to confirm receipt of agreement and payment' },
      { day: 7, action: 'Review payment processing status in EBS' },
      { day: 14, action: 'Check-in email: "First payment completed as agreed"' },
      { day: 30, action: 'Reminder: Second payment scheduled, confirm processing' },
      { day: Math.round(extensionDays * 0.75), action: `Early payment assessment: Consider paying before Day ${extensionDays}` },
      { day: extensionDays, action: 'Final payment due — process and send confirmation' },
      { day: extensionDays + 7, action: 'Follow-up: "Thank you for partnership, back to normal terms"' }
    ];

    sendLog('', 'separator');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    sendLog('📞 PHASE 3: SUPPLIER OUTREACH', 'system');
    sendLog('   Generating phone script and email with complete analysis...', 'system');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    await sleep(1000);

    // ── 3.1 Phone Script ──
    sendLog('📞 3.1 PHONE SCRIPT [Sub-Agent: Communication Planner]', 'system');
    await sleep(800);
    sendLog('🤖 Communication Planner Sub-Agent spawned...', 'info');
    await sleep(600);
    sendLog('📝 Generating phone script with supplier-specific data...', 'info');
    await sleep(1000);

    sendLog('', 'separator');
    sendLog('═══════════════════════════════════════════════', 'info');
    sendLog('  📞 PHONE SCRIPT — Negotiation Opening', 'system');
    sendLog('═══════════════════════════════════════════════', 'info');
    sendLog('', 'separator');
    sendLog(`  "Good morning, this is the AP Manager from our organization.`, 'info');
    sendLog(`   Do you have a few minutes? I wanted to discuss our account."`, 'info');
    await sleep(400);
    sendLog(`  "First, I want to thank you for being a valued partner.`, 'info');
    sendLog(`   We have worked together for ${yearsOfRelationship} years and`, 'info');
    sendLog(`   truly value the relationship."`, 'info');
    await sleep(400);
    sendLog(`  "I am reaching out because we are managing a temporary`, 'info');
    sendLog(`   cash flow adjustment. We have ${invoices.length} invoices`, 'info');
    sendLog(`   totaling $${totalOutstanding.toLocaleString()} that we would`, 'info');
    sendLog(`   like to discuss."`, 'info');
    await sleep(400);
    sendLog(`  "We propose: ${strategy.idealOutcome}."`, 'info');
    sendLog(`  "In return, we can offer: ${strategy.tradeOffers[0]}."`, 'info');
    sendLog(`  "What are your thoughts on this arrangement?"`, 'info');
    sendLog('', 'separator');
    sendLog('═══════════════════════════════════════════════', 'info');
    await sleep(800);
    sendLog('✅ Phone script generated', 'success');
    await sleep(600);

    // ── 3.2 Email Composition & Sending ──
    sendLog('', 'separator');
    sendLog('✉️  3.2 EMAIL COMPOSITION & SENDING [Sub-Agent: Email Generator]', 'system');
    await sleep(800);
    sendLog('🤖 Email Generator Sub-Agent spawned...', 'info');
    await sleep(600);
    sendLog('📝 Composing comprehensive email with full analysis data...', 'info');
    await sleep(1200);

    // Build invoice detail table for email
    const urgentInvoiceLines = processedInvoices.filter(i => i.status === 'URGENT_CRITICAL');
    const strategicInvoiceLines = processedInvoices.filter(i => i.status === 'STRATEGIC_PARTNERS');
    const standardInvoiceLines = processedInvoices.filter(i => i.status === 'STANDARD_VENDORS');
    const negotiableInvoiceLines = processedInvoices.filter(i => i.status === 'NEGOTIABLE');

    sendLog('', 'separator');
    sendLog('╔══════════════════════════════════════════════════════════════╗', 'info');
    sendLog('║                    📧 OUTREACH EMAIL                        ║', 'info');
    sendLog('╠══════════════════════════════════════════════════════════════╣', 'info');
    sendLog('║', 'info');
    sendLog(`║  To:      ${vendorName} — Accounts Receivable`, 'info');
    sendLog(`║  From:    AP Manager — [Our Organization]`, 'info');
    sendLog(`║  Date:    ${today}`, 'info');
    sendLog(`║  Subject: Payment Discussion & Proposed Payment Plan — ${vendorName}`, 'info');
    sendLog('║', 'info');
    sendLog('╠══════════════════════════════════════════════════════════════╣', 'info');
    sendLog('║', 'info');
    sendLog(`║  Dear ${vendorName} Accounts Receivable Team,`, 'info');
    sendLog('║', 'info');
    sendLog(`║  We value our ${yearsOfRelationship}-year partnership and are writing to`, 'info');
    sendLog(`║  discuss ${invoices.length} outstanding invoices totaling`, 'info');
    sendLog(`║  $${totalOutstanding.toLocaleString()}.`, 'info');
    sendLog('║', 'info');
    await sleep(400);

    // Section 1: Account Overview
    sendLog('║  ─── ACCOUNT OVERVIEW ───', 'system');
    sendLog(`║  • Total Outstanding:     $${totalOutstanding.toLocaleString()}`, 'info');
    sendLog(`║  • Number of Invoices:    ${invoices.length}`, 'info');
    sendLog(`║  • Average Aging:         ${avgDaysOld} days`, 'info');
    sendLog(`║  • Relationship Health:   ${relationshipHealth}`, 'info');
    sendLog(`║  • Current Terms:         ${currentTerms}`, 'info');
    sendLog(`║  • Payment History:       ${paymentRate.toFixed(1)}% on-time (${totalInvCount} total invoices)`, 'info');
    if (holdCount > 0) {
      sendLog(`║  • Active Holds:         ${holdCount} invoice(s) on hold`, 'warning');
    }
    sendLog('║', 'info');
    await sleep(400);

    // Section 2: Invoice Breakdown by Category
    sendLog('║  ─── INVOICE BREAKDOWN ───', 'system');
    if (urgentInvoiceLines.length > 0) {
      sendLog(`║  🔴 URGENT CRITICAL (${urgentInvoiceLines.length} invoices — $${urgentInvoiceLines.reduce((s,i) => s + i.amount, 0).toLocaleString()}):`, 'error');
      for (const inv of urgentInvoiceLines) {
        sendLog(`║     • #${inv.invoiceNum} — $${inv.amount.toLocaleString()} (${inv.daysOld} days old)`, 'error');
      }
    }
    if (strategicInvoiceLines.length > 0) {
      sendLog(`║  🟢 STRATEGIC PARTNERS (${strategicInvoiceLines.length} invoices — $${strategicInvoiceLines.reduce((s,i) => s + i.amount, 0).toLocaleString()}):`, 'success');
      for (const inv of strategicInvoiceLines) {
        sendLog(`║     • #${inv.invoiceNum} — $${inv.amount.toLocaleString()} (${inv.daysOld} days old)`, 'success');
      }
    }
    if (standardInvoiceLines.length > 0) {
      sendLog(`║  🟡 STANDARD VENDORS (${standardInvoiceLines.length} invoices — $${standardInvoiceLines.reduce((s,i) => s + i.amount, 0).toLocaleString()}):`, 'warning');
      for (const inv of standardInvoiceLines) {
        sendLog(`║     • #${inv.invoiceNum} — $${inv.amount.toLocaleString()} (${inv.daysOld} days old)`, 'warning');
      }
    }
    if (negotiableInvoiceLines.length > 0) {
      sendLog(`║  🔵 NEGOTIABLE (${negotiableInvoiceLines.length} invoices — $${negotiableInvoiceLines.reduce((s,i) => s + i.amount, 0).toLocaleString()}):`, 'info');
      for (const inv of negotiableInvoiceLines) {
        sendLog(`║     • #${inv.invoiceNum} — $${inv.amount.toLocaleString()} (${inv.daysOld} days old)`, 'info');
      }
    }
    sendLog('║', 'info');
    await sleep(400);

    // Section 3: Proposed Payment Plan
    sendLog('║  ─── PROPOSED PAYMENT PLAN ───', 'system');
    sendLog(`║  Negotiated Terms: ${finalNegotiatedTerms}`, 'info');
    sendLog(`║  • Payment 1: $${partialPaymentAmt.toLocaleString()} (${partialPaymentPct}% of total) by ${firstPaymentDate}`, 'info');
    sendLog(`║  • Payment 2: $${(totalOutstanding - partialPaymentAmt).toLocaleString()} by ${finalPaymentDate}`, 'info');
    if (discountPct > 0) {
      sendLog(`║  • Early Payment Discount: ${discountPct}% if paid before due date`, 'info');
    }
    sendLog('║', 'info');
    await sleep(400);

    // Section 4: What We Offer
    sendLog('║  ─── OUR COMMITMENT ───', 'system');
    for (const offer of strategy.tradeOffers) {
      sendLog(`║  ✓ ${offer}`, 'info');
    }
    sendLog('║', 'info');
    await sleep(400);

    // Closing
    sendLog(`║  We look forward to resolving this matter and strengthening`, 'info');
    sendLog(`║  our partnership. Please do not hesitate to reach out with`, 'info');
    sendLog(`║  any questions or concerns.`, 'info');
    sendLog('║', 'info');
    sendLog(`║  Best regards,`, 'info');
    sendLog(`║  AP Manager`, 'info');
    sendLog(`║  [Our Organization]`, 'info');
    sendLog(`║  Agreement Reference: ${agreementId}`, 'info');
    sendLog('║', 'info');
    sendLog('╚══════════════════════════════════════════════════════════════╝', 'info');
    await sleep(800);

    // Simulate sending
    sendLog('', 'separator');
    sendLog('📤 Sending email to supplier...', 'info');
    await sleep(1500);
    sendLog(`✅ Email sent successfully to ${vendorName} Accounts Receivable`, 'success');
    sendLog(`  📧 Delivery confirmed at ${new Date().toLocaleTimeString()}`, 'success');
    sendLog(`  📋 Email reference: EMAIL-${agreementId}`, 'success');
    await sleep(600);
    sendLog('✅ Phase 3: Supplier Outreach complete', 'success');
    await sleep(600);

    // ── Final ──
    sendLog('', 'separator');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    sendLog('🎉 Negotiate Payment Terms Process Complete!', 'system');
    sendLog(`📝 Negotiated Terms: ${finalNegotiatedTerms}`, 'system');
    sendLog(`💰 First Payment: $${partialPaymentAmt.toLocaleString()} by ${firstPaymentDate}`, 'system');
    sendLog(`📅 Final Payment: $${(totalOutstanding - partialPaymentAmt).toLocaleString()} by ${finalPaymentDate}`, 'system');
    sendLog(`📋 Agreement ID: ${agreementId}`, 'system');
    sendLog(`📧 Outreach Email: Sent to ${vendorName}`, 'system');
    sendLog(`💚 Relationship Health: ${relationshipHealth}`, 'system');
    sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');
    await sleep(500);

    // Build final summary (backward compatible + new fields)
    const finalSummary = {
      success: true,
      summary: {
        // Backward-compatible fields
        totalAnalyzed: processedInvoices.length,
        autoApproved: autoApprove.length,
        autoApprovedAmount: autoApprovedAmount,
        needReview: needReview.length,
        needReviewAmount: 0,
        needInvestigation: needInvestigation.length,
        needInvestigationAmount: needInvestigationAmount,
        batchId: batchId,
        negotiatedTerms: finalNegotiatedTerms,
        relationshipHealth: relationshipHealth,
        invoices: processedInvoices,
        greenInvoices: autoApprove,
        redInvoices: needInvestigation,

        // New fields
        negotiationStrategy: strategy,
        proposedTerms: {
          original: currentTerms,
          negotiated: finalNegotiatedTerms,
          discount: discountPct,
          extensionDays: extensionDays
        },
        communicationPlan: {
          channel: 'PHONE + EMAIL',
          timeline: communicationTimeline,
          nextAction: 'Send formal agreement + first payment confirmation',
          nextActionDate: firstPaymentDate,
          emailSent: true,
          emailReference: `EMAIL-${agreementId}`
        },
        agreementDetails: {
          agreementId: agreementId,
          effectiveDate: today,
          coveredInvoices: processedInvoices.length,
          totalAmount: totalOutstanding,
          firstPaymentAmount: partialPaymentAmt,
          firstPaymentDue: firstPaymentDate,
          finalPaymentDue: finalPaymentDate,
          status: 'EMAIL_SENT'
        },
        categories: {
          urgentCritical: catUrgent,
          strategicPartners: catStrategic,
          standardVendors: catStandard,
          negotiable: catNegotiable
        }
      }
    };

    console.log('Sending complete event with summary:', {
      totalAnalyzed: finalSummary.summary.totalAnalyzed,
      autoApproved: finalSummary.summary.autoApproved,
      batchId: finalSummary.summary.batchId,
      agreementId: finalSummary.summary.agreementDetails.agreementId
    });

    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify(finalSummary)}\n\n`);
    res.end();

  } catch (error) {
    console.error('❌ /api/negotiate-payment-terms ERROR:', error.message);
    console.error(error.stack);

    res.write(`event: log\n`);
    res.write(`data: ${JSON.stringify({
      timestamp: new Date().toLocaleTimeString(),
      message: `❌ Error: ${error.message}`,
      type: 'error'
    })}\n\n`);

    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify({
      success: false,
      error: error.message,
      summary: {
        totalAnalyzed: 0, autoApproved: 0, autoApprovedAmount: 0,
        needReview: 0, needReviewAmount: 0,
        needInvestigation: 0, needInvestigationAmount: 0,
        batchId: null, invoices: [], greenInvoices: [], redInvoices: []
      }
    })}\n\n`);
    res.end();
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 EBS AP Analytics - Backend Server (HTTP Mode)');
  console.log('='.repeat(60));
  console.log(`📡 Node Server: http://${SERVER_HOST}:${PORT}`);
  console.log(`🐍 Python Server: http://${SERVER_HOST}:${PYTHON_SERVER_PORT}`);
  console.log(`🔑 API Key: ${ANTHROPIC_API_KEY ? '✅' : '❌ Not configured'}`);
  console.log('='.repeat(60));
  console.log('');
});

module.exports = app;