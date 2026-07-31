// SQLcl Service - Direct Oracle DB Connection via Backend
// No MCP - direct database queries

const ANALYSIS_DATE = '10-OCT-2010';
const BACKEND_URL = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';

class SQLclService {
  constructor() {
    this.connection = 'AGENT_ADB_HIGH';
    this.backendAvailable = false;
    this.checkBackend();
  }

  // Check if backend is available
  async checkBackend() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        this.backendAvailable = true;
        console.log('✅ Backend server connected');
        console.log('   API Key:', data.hasApiKey ? 'Configured' : 'Not configured');
        console.log('   Database:', data.hasDbConfig ? 'Configured' : 'Not configured');
      }
    } catch (error) {
      this.backendAvailable = false;
      console.warn('⚠️  Backend server not available. Using mock data.');
      console.warn('   Start backend: cd backend && npm start');
    }
  }

  // Set API key via backend
  async setApiKey(key) {
    if (!this.backendAvailable) {
      await this.checkBackend();
    }

    if (!key) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/set-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set API key');
      }

      console.log('✅ API key configured in backend');
    } catch (error) {
      console.error('❌ Error setting API key:', error);
      throw error;
    }
  }

  // Configure database connection
  async configureDatabase(user, password, connectString) {
    if (!this.backendAvailable) {
      await this.checkBackend();
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/configure-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password, connectString })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to configure database');
      }

      console.log('✅ Database configured in backend');
    } catch (error) {
      console.error('❌ Error configuring database:', error);
      throw error;
    }
  }

  // Execute SQL query via backend
  async executeQuery(sql) {
    if (!this.backendAvailable) {
      console.warn('Backend not available, using mock data');
      return this.getMockData(sql);
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // If database not configured, use mock data
        if (error.error && error.error.includes('not configured')) {
          console.warn('Database not configured, using mock data');
          return this.getMockData(sql);
        }
        
        throw new Error(error.error || error.message || 'Query failed');
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Error executing query:', error);
      
      // If connection error, fallback to mock data
      if (error.message.includes('fetch')) {
        console.warn('Backend not reachable, using mock data');
        this.backendAvailable = false;
        return this.getMockData(sql);
      }
      
      throw error;
    }
  }

  // Execute natural language query via backend
  async executeNaturalLanguageQuery(question) {
    if (!this.backendAvailable) {
      throw new Error('Backend server not available. Please start: cd backend && npm start');
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat request failed');
      }

      const result = await response.json();
      
      return {
        text: result.text || 'Query executed successfully',
        sql: result.sql,
        data: result.data || []
      };

    } catch (error) {
      console.error('Error in chat:', error);
      
      if (error.message.includes('fetch')) {
        throw new Error('Backend server not reachable.\n\nMake sure the server is running:\ncd backend && npm start');
      }
      
      throw error;
    }
  }

  // Mock data for when backend is not available
  getMockData(sql) {
    console.log('📊 Using mock data');
    
    if (sql.includes('ap_suppliers') || sql.includes('vendor_name')) {
      return [
        { 
          VENDOR_NAME: 'Industrial Dressler', 
          VENDOR_ID: 145,
          INVOICE_COUNT: 62,
          OUTSTANDING_AMOUNT: 45127897.50,
          CURRENCY: 'SEK'
        },
        {
          VENDOR_NAME: 'Advantage Corp',
          VENDOR_ID: 11,
          INVOICE_COUNT: 805,
          OUTSTANDING_AMOUNT: 654636631.01,
          CURRENCY: 'USD'
        }
      ];
    } else if (sql.includes('ap_holds_all') || sql.includes('hold_lookup_code')) {
      return [
        { HOLD_LOOKUP_CODE: 'LINE VARIANCE', HOLD_COUNT: 4839, ACTIVE_HOLDS: 407, RELEASED_HOLDS: 4432 },
        { HOLD_LOOKUP_CODE: 'INSUFFICIENT LINE INFO', HOLD_COUNT: 2889, ACTIVE_HOLDS: 19, RELEASED_HOLDS: 2870 }
      ];
    } else if (sql.includes('aging_bucket')) {
      return [
        { AGING_BUCKET: '0-30 Days', INVOICE_CURRENCY_CODE: 'SEK', INVOICE_COUNT: 15, OUTSTANDING_AMOUNT: 5234567 },
        { AGING_BUCKET: '31-60 Days', INVOICE_CURRENCY_CODE: 'SEK', INVOICE_COUNT: 12, OUTSTANDING_AMOUNT: 8456789 },
        { AGING_BUCKET: 'Over 1 Year', INVOICE_CURRENCY_CODE: 'SEK', INVOICE_COUNT: 21, OUTSTANDING_AMOUNT: 25678901 }
      ];
    }
    
    return [];
  }

  // Get top suppliers with outstanding payments
  async getTopSuppliers(limit = 10) {
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
    
    return await this.executeQuery(sql);
  }

  // Get supplier aging analysis
  async getSupplierAging(vendorName) {
    const sql = `
      SELECT 
        CASE 
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 30 THEN '0-30 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 60 THEN '31-60 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 90 THEN '61-90 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 180 THEN '91-180 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 365 THEN '181-365 Days'
          ELSE 'Over 1 Year'
        END as aging_bucket,
        ai.invoice_currency_code,
        COUNT(*) as invoice_count,
        SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) as outstanding_amount
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
      GROUP BY 
        CASE 
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 30 THEN '0-30 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 60 THEN '31-60 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 90 THEN '61-90 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 180 THEN '91-180 Days'
          WHEN TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) <= 365 THEN '181-365 Days'
          ELSE 'Over 1 Year'
        END,
        ai.invoice_currency_code
    `;
    
    return await this.executeQuery(sql);
  }

  // Get supplier invoices
  async getSupplierInvoices(vendorName) {
    const sql = `
      SELECT 
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.invoice_currency_code,
        ai.amount_paid,
        ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding_amount,
        TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
        ai.payment_status_flag,
        ai.description
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
      ORDER BY ai.invoice_date ASC
    `;
    
    return await this.executeQuery(sql);
  }

  // Get hold statistics
  async getHoldStatistics() {
    const sql = `
      SELECT 
        ah.hold_lookup_code,
        COUNT(*) as hold_count,
        SUM(CASE WHEN ah.release_lookup_code IS NULL THEN 1 ELSE 0 END) as active_holds,
        SUM(CASE WHEN ah.release_lookup_code IS NOT NULL THEN 1 ELSE 0 END) as released_holds
      FROM ap.ap_holds_all ah
      GROUP BY ah.hold_lookup_code
      ORDER BY COUNT(*) DESC
    `;
    
    return await this.executeQuery(sql);
  }

  // Get invoice details
  async getInvoiceDetails(invoiceNum) {
    const sql = `
      SELECT 
        ai.invoice_id,
        ai.invoice_num,
        ai.invoice_date,
        ai.invoice_amount,
        ai.invoice_currency_code,
        ai.payment_status_flag,
        ai.amount_paid,
        ai.description,
        ai.invoice_type_lookup_code,
        ai.source,
        pv.vendor_name,
        pv.vendor_id,
        pvs.vendor_site_code
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      LEFT JOIN ap.ap_supplier_sites_all pvs ON ai.vendor_site_id = pvs.vendor_site_id
      WHERE ai.invoice_num = '${invoiceNum}'
    `;
    
    return await this.executeQuery(sql);
  }
}

export default new SQLclService();
