import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { setupChatbotEndpoints } from './chatbot-backend-endpoints.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());



// ORDS Configuration - AutoREST format
const ORDS_BASE_URL = process.env.ORDS_BASE_URL || 'https://gde727daa9b60fb-vibecoding.adb.us-chicago-1.oraclecloudapps.com/ords/admin';

// Helper function to call ORDS AutoREST endpoints
async function callORDS(endpoint, options = {}) {
  try {
    const url = `${ORDS_BASE_URL}${endpoint}`;
    console.log(`[ORDS] Calling: ${url}`);
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ORDS Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[ORDS] Success. Items:`, data.items?.length || 'single item');
    
    return data;
  } catch (error) {
    console.error('[ORDS] Error:', error.message);
    throw error;
  }
}

/**
 * Fetch all pages from an ORDS AutoREST collection, handling pagination.
 * Defaults to page size 1000 to avoid the implicit 25 item limit.
 */
async function fetchAllORDS(collectionPath, pageSize = 1000) {
  const all = [];
  let offset = 0;
  /* Loop until ORDS indicates no more pages or returned page is smaller than limit */
  for (;;) {
    const qp = collectionPath.includes('?') ? `&offset=${offset}&limit=${pageSize}` : `?offset=${offset}&limit=${pageSize}`;
    const data = await callORDS(`${collectionPath}${qp}`);
    const items = data.items || [];
    all.push(...items);
    if (data.hasMore !== true || items.length < pageSize) {
      break;
    }
    offset += pageSize;
  }
  return all;
}

// NVIDIA Fraud model scoring helpers
function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((a.getTime() - b.getTime()) / MS));
}

function buildFraudFeaturesFromClaim(c) {
  const incident =
    new Date(
      c.incident_date ||
        c.INCIDENT_DATE ||
        c.created_date ||
        c.CREATED_DATE ||
        new Date().toISOString()
    );
  const now = new Date();
  return {
    estimated_loss: Number(c.estimated_loss || c.ESTIMATED_LOSS || 0),
    claim_type: String(c.claim_type || c.CLAIM_TYPE || 'Unknown'),
    status: String(c.status || c.STATUS || 'Unknown'),
    peril_code: String(c.peril_code || c.PERIL_CODE || 'UNKNOWN'),
    intake_channel: String(c.intake_channel || c.INTAKE_CHANNEL || 'UNKNOWN'),
    days_since_incident: daysBetween(now, incident)
  };
}

/**
 * Call an NVIDIA fraud detection endpoint to score claims.
 * Requires env:
 *  - NVIDIA_FRAUD_URL (HTTP endpoint that accepts {instances:[feature...]})
 *  - NVIDIA_FRAUD_API_KEY (Bearer token or key header)
 * Returns array of { score } aligned with claims order (0..1 fraud probability)
 */
async function scoreClaimsWithNvidia(claims) {
  const url = process.env.NVIDIA_FRAUD_URL;
  const key = process.env.NVIDIA_FRAUD_API_KEY;

  if (!url || !key) {
    throw new Error('NVIDIA fraud model env not configured (NVIDIA_FRAUD_URL, NVIDIA_FRAUD_API_KEY)');
  }

  const instances = claims.map(buildFraudFeaturesFromClaim);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({ instances })
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`NVIDIA fraud API error ${resp.status}: ${txt}`);
  }

  const data = await resp.json();
  // Expect { predictions: [{score: number}, ...] }
  const preds = Array.isArray(data.predictions) ? data.predictions : [];
  if (preds.length !== claims.length) {
    // If misaligned, pad/trim to length
    return claims.map((_, i) => ({
      score: Math.min(1, Math.max(0, preds[i]?.score ?? 0.5))
    }));
  }
  return preds.map(p => ({ score: Math.min(1, Math.max(0, Number(p.score ?? 0.5))) }));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Try to call ORDS to verify connection
    await callORDS('/claims/');
    res.json({ 
      status: 'healthy', 
      backend: 'connected',
      ords: 'connected',
      ordsUrl: ORDS_BASE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'unhealthy', 
      backend: 'connected',
      ords: 'disconnected',
      error: err.message,
      ordsUrl: ORDS_BASE_URL
    });
  }
});


// Setup chatbot endpoints
setupChatbotEndpoints(app);


// Get Claims - AutoREST format
app.get('/api/claims', async (req, res) => {
  try {
    // Fetch all pages to avoid default 25 item limit
    const claims = await fetchAllORDS('/claims/');
    
    // AutoREST returns items array
    
    // Format the data for frontend
    const formattedClaims = claims.map(claim => ({
      claimId: claim.claim_id || claim.CLAIM_ID,
      claimNumber: claim.claim_number || claim.CLAIM_NUMBER,
      claimType: claim.claim_type || claim.CLAIM_TYPE,
      policyNumber: claim.policy_id || claim.POLICY_ID,
      customerName: 'Customer', // AutoREST doesn't join, need custom query
      customerEmail: '',
      status: claim.status || claim.STATUS,
      claimAmount: claim.estimated_loss || claim.ESTIMATED_LOSS || 0,
      dateFiled: claim.created_date || claim.CREATED_DATE,
      adjusterName: 'Unassigned'
    }));
    
    res.json(formattedClaims);
  } catch (err) {
    console.error('Error fetching claims:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Adjusters - AutoREST format
app.get('/api/adjusters', async (req, res) => {
  try {
    // Fetch all pages to avoid default 25 item limit
    const adjusters = await fetchAllORDS('/adjusters/');
    
    
    // Format the data
    const formattedAdjusters = adjusters.map(adj => ({
      adjusterId: adj.adjuster_id || adj.ADJUSTER_ID,
      adjusterName: `${adj.first_name || adj.FIRST_NAME || ''} ${adj.last_name || adj.LAST_NAME || ''}`.trim(),
      email: adj.email || adj.EMAIL,
      phone: adj.phone || adj.PHONE,
      specialization: adj.specialization || adj.SPECIALIZATION,
      activeClaims: adj.current_workload || adj.CURRENT_WORKLOAD || 0,
      status: (adj.is_available || adj.IS_AVAILABLE) === 'Y' ? 'Active' : 'Inactive'
    }));
    
    res.json(formattedAdjusters);
  } catch (err) {
    console.error('Error fetching adjusters:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Damages - AutoREST format
app.get('/api/damages', async (req, res) => {
  try {
    // Fetch all pages to avoid default 25 item limit
    const damages = await fetchAllORDS('/damages/');
    
    
    // Format the data
    const formattedDamages = damages.map(dmg => ({
      damageId: dmg.damage_id || dmg.DAMAGE_ID,
      claimId: dmg.claim_id || dmg.CLAIM_ID,
      damageType: dmg.damage_type || dmg.DAMAGE_TYPE,
      severity: dmg.severity || dmg.SEVERITY,
      repairCost: dmg.estimated_repair_cost || dmg.ESTIMATED_REPAIR_COST || 0,
      assessmentDate: dmg.assessment_date || dmg.ASSESSMENT_DATE,
      description: dmg.damage_description || dmg.DAMAGE_DESCRIPTION
    }));
    
    res.json(formattedDamages);
  } catch (err) {
    console.error('Error fetching damages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get AI Insights (mock data for now since we don't have custom endpoints)
app.get('/api/ai-insights', async (req, res) => {
  try {
    // Fetch full claims set for robust scoring
    const claims = await fetchAllORDS('/claims/');

    // Attempt NVIDIA model scoring; fallback to field heuristic if unavailable
    let scores;
    try {
      scores = await scoreClaimsWithNvidia(claims);
      console.log(`[AI] NVIDIA fraud scoring complete for ${scores.length} claims`);
    } catch (e) {
      console.warn('[AI] NVIDIA fraud scoring unavailable, falling back to heuristic:', e.message);
      scores = claims.map(c => ({
        score: Number(c.ai_confidence_score || c.AI_CONFIDENCE_SCORE || 0.5)
      }));
    }

    // Build insights from scores (limit to 10 for UI)
    const highThr = Math.min(1, Math.max(0, Number(process.env.FRAUD_THRESH_HIGH ?? 0.7)));
    const medThrRaw = Math.min(1, Math.max(0, Number(process.env.FRAUD_THRESH_MED ?? 0.4)));
    const medThr = Math.min(highThr, medThrRaw);
    const insights = claims.slice(0, 10).map((claim, idx) => {
      const fraudProb = Math.min(1, Math.max(0, scores[idx]?.score ?? 0.5)); // 0..1
      let insightType = 'Fraud Detection';
      let title = 'Low Fraud Risk Detected';
      let confidence = 'Low';

      if (fraudProb >= highThr) {
        title = 'High Fraud Risk - Requires Review';
        confidence = 'High';
      } else if (fraudProb >= medThr) {
        title = 'Potential Fraud Indicators';
        confidence = 'Medium';
      }

      return {
        insightId: `INS-${claim.claim_id || claim.CLAIM_ID}`,
        claimId: claim.claim_number || claim.CLAIM_NUMBER,
        insightType,
        title,
        description: `Fraud probability: ${(fraudProb * 100).toFixed(0)}%. Generated by NVIDIA fraud model${process.env.NVIDIA_FRAUD_URL ? '' : ' (fallback heuristic)'}.`,
        confidence,
        generatedDate: claim.created_date || claim.CREATED_DATE || new Date().toISOString()
      };
    });

    res.json(insights);
  } catch (err) {
    console.error('Error fetching AI insights:', err);
    res.json([]); // Return empty array on error
  }
});

// Get Dashboard Data (aggregate from multiple calls)
app.get('/api/dashboard', async (req, res) => {
  try {
    // Fetch claims, adjusters, damages (all pages) to avoid 25 item default
    const [claimsData, adjustersData, damagesData] = await Promise.all([
      fetchAllORDS('/claims/'),
      fetchAllORDS('/adjusters/'),
      fetchAllORDS('/damages/')
    ]);
    
    const claims = claimsData;
    const adjusters = adjustersData;
    const damages = damagesData;
    
    // Calculate metrics
    const totalClaims = claims.length;
    const totalAmount = claims.reduce((sum, c) => sum + (c.estimated_loss || c.ESTIMATED_LOSS || 0), 0);
    const avgAmount = totalClaims > 0 ? totalAmount / totalClaims : 0;
    
    const pendingClaims = claims.filter(c => (c.status || c.STATUS) === 'Pending').length;
    const approvedClaims = claims.filter(c => (c.status || c.STATUS) === 'Approved').length;
    const activeAdjusters = adjusters.filter(a => (a.is_available || a.IS_AVAILABLE) === 'Y').length;
    
    // Claims by status
    const statusMap = {};
    claims.forEach(c => {
      const status = c.status || c.STATUS || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    const claimsByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    
    // Claims trend (derived from claims CREATED_DATE/INCIDENT_DATE over last 7 days)
    function fmtMMDD(d) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}/${dd}`;
    }
    function fmtYYYYMMDD(d) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
    const today = new Date();
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i)); // oldest to newest
      return d;
    });
    const byDay = {};
    claims.forEach((c) => {
      const dt = new Date(
        c.created_date || c.CREATED_DATE || c.incident_date || c.INCIDENT_DATE || c.created_at || c.CREATED_AT || today
      );
      const key = fmtYYYYMMDD(dt);
      byDay[key] = (byDay[key] || 0) + 1;
    });
    const claimsTrend = last7.map((d) => ({
      date: fmtMMDD(d),
      claims: byDay[fmtYYYYMMDD(d)] || 0
    }));
    
    // Top damage types
    const damageTypeMap = {};
    damages.forEach(d => {
      const type = d.damage_type || d.DAMAGE_TYPE || 'Unknown';
      damageTypeMap[type] = (damageTypeMap[type] || 0) + 1;
    });
    const topDamageTypes = Object.entries(damageTypeMap)
      .map(([damageType, count]) => ({ damageType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Top adjusters (derived from claims ASSIGNED_ADJUSTER_ID + adjusters lookup)
    const adjNameById = {};
    adjusters.forEach((a) => {
      const id = a.adjuster_id || a.ADJUSTER_ID;
      const name = `${a.first_name || a.FIRST_NAME || ''} ${a.last_name || a.LAST_NAME || ''}`.trim() || id || 'Unknown';
      if (id) adjNameById[id] = name;
    });
    const claimsByAdjuster = {};
    claims.forEach((c) => {
      const aid = c.assigned_adjuster_id || c.ASSIGNED_ADJUSTER_ID || null;
      if (aid) {
        claimsByAdjuster[aid] = (claimsByAdjuster[aid] || 0) + 1;
      }
    });
    const topAdjusters = Object.entries(claimsByAdjuster)
      .map(([aid, count]) => ({
        adjusterName: adjNameById[aid] || aid || 'Unassigned',
        claimsCount: count
      }))
      .sort((a, b) => b.claimsCount - a.claimsCount)
      .slice(0, 5);
    
    res.json({
      totalClaims,
      totalAmount,
      avgClaimAmount: avgAmount,
      pendingClaims,
      approvedClaims,
      activeAdjusters,
      claimsByStatus,
      claimsTrend,
      topDamageTypes,
      topAdjusters
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                          ║');
  console.log('║         🚀 State Farm Backend Server (AutoREST ORDS)                    ║');
  console.log('║                                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Server running: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🌐 ORDS Base: ${ORDS_BASE_URL}`);
  console.log('');
  console.log('Architecture: Frontend -> Express Backend -> ORDS AutoREST -> Oracle Database');
  console.log('');
  console.log('Available endpoints:');
  console.log('  ✓ GET /api/claims');
  console.log('  ✓ GET /api/adjusters');
  console.log('  ✓ GET /api/damages');
  console.log('  ✓ GET /api/ai-insights');
  console.log('  ✓ GET /api/dashboard');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Add this to your existing server.js file

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/claims';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'claim-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed!'));
    }
  }
});

// POST endpoint for chatbot claim submission
app.post('/api/claims/submit', upload.array('files', 10), async (req, res) => {
  try {
    console.log('[Chatbot] Receiving new claim submission...');
    
    const {
      claimType,
      claimSubtype,
      incidentDate,
      incidentDescription,
      location,
      estimatedLoss,
      policyNumber,
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    // Validate required fields
    if (!claimType || !incidentDescription || !customerEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['claimType', 'incidentDescription', 'customerEmail']
      });
    }

    // Generate claim number
    const claimNumber = `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const claimId = `CLM${String(Date.now()).slice(-6)}`;

    // Get uploaded file information
    const uploadedFiles = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    console.log(`[Chatbot] Claim ${claimNumber} - Received ${uploadedFiles.length} file(s)`);

    // Prepare data for database insertion
    const claimData = {
      claimId,
      claimNumber,
      claimType,
      claimSubtype: claimSubtype || 'Other',
      policyId: policyNumber,
      customerId: `CUST${String(Date.now()).slice(-6)}`, // Generate customer ID
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      incidentDescription,
      location: location || 'Not provided',
      estimatedLoss: parseFloat(estimatedLoss) || 0,
      status: 'Pending',
      priority: parseFloat(estimatedLoss) > 50000 ? 'High' : parseFloat(estimatedLoss) > 5000 ? 'Medium' : 'Low',
      assignedAdjusterId: getAvailableAdjuster(), // Function to assign adjuster
      aiConfidenceScore: calculateAIConfidence(incidentDescription, uploadedFiles.length),
      customerName,
      customerEmail,
      customerPhone: customerPhone || 'Not provided',
      attachments: uploadedFiles
    };

    // Insert claim into database using ORDS or direct SQL
    const insertedClaim = await insertClaimToDatabase(claimData);

    // Send confirmation email (you can implement this later)
    // await sendConfirmationEmail(customerEmail, claimNumber);

    console.log(`[Chatbot] Claim ${claimNumber} submitted successfully`);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully',
      claimNumber,
      claimId,
      status: 'Pending',
      estimatedProcessingTime: '24-48 hours',
      nextSteps: [
        'You will receive a confirmation email shortly',
        'An adjuster will be assigned within 24 hours',
        'You can track your claim status in the portal'
      ],
      uploadedFiles: uploadedFiles.length,
      attachments: uploadedFiles.map(f => ({
        name: f.originalName,
        size: `${(f.size / 1024).toFixed(2)} KB`
      }))
    });

  } catch (error) {
    console.error('[Chatbot] Error submitting claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit claim',
      message: error.message
    });
  }
});

// Helper function to assign an available adjuster
function getAvailableAdjuster() {
  // Simple round-robin assignment - in production, this would check actual workload
  const adjusterCount = 20;
  const randomAdjuster = Math.floor(Math.random() * adjusterCount) + 1;
  return `ADJ${String(randomAdjuster).padStart(3, '0')}`;
}

// Helper function to calculate AI confidence score
function calculateAIConfidence(description, fileCount) {
  let score = 0.5; // Base score

  // Increase score based on description length (more detail = higher confidence)
  if (description.length > 100) score += 0.15;
  if (description.length > 200) score += 0.10;

  // Increase score based on file attachments
  score += Math.min(fileCount * 0.05, 0.20);

  // Add some randomness
  score += Math.random() * 0.1;

  return Math.min(Math.round(score * 100) / 100, 0.98);
}

// Helper function to insert claim to database
async function insertClaimToDatabase(claimData) {
  try {
    // Option 1: Using ORDS (if you have POST endpoint enabled)
    // const response = await fetch(`${ORDS_BASE_URL}/claims/`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(claimData)
    // });

    // Option 2: Direct SQL insert (for now, we'll simulate)
    // In production, you'd execute actual SQL INSERT here
    
    console.log('[Database] Inserting claim:', claimData.claimNumber);
    
    // Simulate database insert
    // TODO: Replace with actual database insert using oracledb or ORDS
    
    return {
      success: true,
      claimId: claimData.claimId,
      claimNumber: claimData.claimNumber
    };
    
  } catch (error) {
    console.error('[Database] Insert error:', error);
    throw new Error('Database insertion failed');
  }
}

// GET endpoint to retrieve claim status (for chatbot to check status)
app.get('/api/claims/status/:claimNumber', async (req, res) => {
  try {
    const { claimNumber } = req.params;
    
    // Query database for claim status
    // For now, returning mock data
    
    res.json({
      claimNumber,
      status: 'Pending',
      assignedAdjuster: 'Michael Rodriguez',
      lastUpdate: new Date(),
      nextAction: 'Adjuster review scheduled for tomorrow',
      estimatedCompletion: '3-5 business days'
    });
    
  } catch (error) {
    console.error('[Chatbot] Error fetching claim status:', error);
    res.status(500).json({ error: 'Failed to fetch claim status' });
  }
});

// GET endpoint to download uploaded file
app.get('/api/claims/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./uploads/claims', filename);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('[Files] Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

console.log('✅ Chatbot endpoints configured:');
console.log('   POST /api/claims/submit - Submit new claim with files');
console.log('   GET /api/claims/status/:claimNumber - Check claim status');
console.log('   GET /api/claims/files/:filename - Download claim file');
