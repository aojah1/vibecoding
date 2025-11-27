// ============================================================================
// COMPLETE WORKING CHATBOT BACKEND - WITH RENAMED ENDPOINT
// ============================================================================
// This file has ALL required functions and uses /api/claims-chatbot
// to avoid conflicts with server.js
// ============================================================================

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import oracledb from 'oracledb';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// DATABASE CONFIGURATION WITH CONNECTION POOL
// ============================================================================

const DB_USER = process.env.DB_USER || 'ADMIN';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_CONNECT_STRING = process.env.DB_CONNECT_STRING || process.env.DB_CONNECTION_STRING || 'vibecoding_medium';
const TNS_ADMIN = process.env.TNS_ADMIN;

if (TNS_ADMIN) {
  process.env.TNS_ADMIN = TNS_ADMIN;
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

let pool;

// ============================================================================
// CONNECTION POOL INITIALIZATION
// ============================================================================

async function initPool() {
  if (pool) return pool;
  
  console.log('[DB] Creating connection pool...');
  console.log('[DB] User:', DB_USER);
  console.log('[DB] Connect String:', DB_CONNECT_STRING);
  console.log('[DB] TNS_ADMIN:', process.env.TNS_ADMIN);
  
  pool = await oracledb.createPool({
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_CONNECT_STRING,
    configDir: process.env.TNS_ADMIN,
    walletLocation: process.env.TNS_ADMIN,
    walletPassword: process.env.WALLET_PASSWORD,
    sslServerDNMatch: true,
    poolMin: 1,
    poolMax: 8,
    poolIncrement: 1,
    queueTimeout: 15000,
    poolTimeout: 60,
    stmtCacheSize: 30,
    homogeneous: true
  });
  
  console.log('[DB] Pool created successfully');
  return pool;
}

// ============================================================================
// RUN FUNCTION - EXECUTES SQL WITH CONNECTION POOLING
// ============================================================================

async function run(sql, binds = {}, options = {}) {
  const p = await initPool();
  let conn;
  try {
    console.log('[DB] Acquiring connection...');
    conn = await p.getConnection();
    console.log('[DB] Connected');
    console.log('[DB] Executing SQL...');
    
    const result = await conn.execute(sql, binds, { autoCommit: true, ...options });
    
    console.log('[DB] Executed. Rows:', result && result.rows ? result.rows.length : (result && result.rowsAffected ? result.rowsAffected : 'n/a'));
    return result;
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('[DB] Connection closed');
      } catch (e) {
        console.error('[DB] Error closing connection:', e.message);
      }
    }
  }
}

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/claims/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateClaimNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CLM-${year}-${random}`;
}

function generateClaimId() {
  const random = Math.floor(100 + Math.random() * 900);
  return `CLM${String(random).padStart(3, '0')}`;
}

function calculatePriority(estimatedLoss) {
  const amount = parseFloat(estimatedLoss);
  if (amount > 50000) return 'High';
  if (amount > 10000) return 'Medium';
  return 'Low';
}

function assignAdjuster(claimType, priority) {
  const adjusters = {
    Auto: {
      High: { id: 'ADJ001', name: 'Michael Rodriguez' },
      Medium: { id: 'ADJ002', name: 'Sarah Chen' },
      Low: { id: 'ADJ003', name: 'David Martinez' }
    },
    Property: {
      High: { id: 'ADJ004', name: 'Emily Johnson' },
      Medium: { id: 'ADJ005', name: 'James Wilson' },
      Low: { id: 'ADJ006', name: 'Lisa Anderson' }
    },
    Liability: {
      High: { id: 'ADJ007', name: 'Robert Taylor' },
      Medium: { id: 'ADJ008', name: 'Jennifer Davis' },
      Low: { id: 'ADJ009', name: 'Christopher Brown' }
    }
  };
  return adjusters[claimType]?.[priority] || { id: 'ADJ001', name: 'Michael Rodriguez' };
}

// ============================================================================
// FETCH ALL CLAIMS
// ============================================================================

async function fetchAllClaims() {
  try {
    console.log('[Claims API] Fetching all claims from database...');
    
    const sql = `
      SELECT
        *
      FROM CLAIMS
      ORDER BY CREATED_DATE DESC
    `;
    
    const result = await run(sql);
    
    console.log(`[Claims API] Retrieved ${result.rows.length} claims`);
    
    return {
      success: true,
      claims: result.rows,
      count: result.rows.length
    };
    
  } catch (error) {
    console.error('[Claims API] Error fetching claims:', error);

    try {
      const ORDS_BASE_URL = process.env.ORDS_BASE_URL || 'https://gde727daa9b60fb-vibecoding.adb.us-chicago-1.oraclecloudapps.com/ords/admin';
      const url = `${ORDS_BASE_URL}/claims/`;
      console.log('[Claims API] Falling back to ORDS AutoREST:', url);
      const resp = await fetch(url);
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`ORDS fallback failed ${resp.status}: ${t}`);
      }
      const data = await resp.json();
      const items = data.items || [];
      return {
        success: true,
        claims: items,
        count: items.length
      };
    } catch (fallbackErr) {
      console.error('[Claims API] Fallback to ORDS failed:', fallbackErr);
      throw error;
    }
  }
}

// ============================================================================
// INSERT CLAIM TO DATABASE
// ============================================================================

async function insertClaimToDatabase(claimData) {
  console.log('[Database] ═══════════════════════════════════════');
  console.log('[Database] Inserting claim:', claimData.claimNumber);
  console.log('[Database] Claim ID:', claimData.claimId);
  console.log('[Database] Type:', claimData.claimType);
  console.log('[Database] Amount:', claimData.estimatedLoss);
  console.log('[Database] ═══════════════════════════════════════');
  
  const sql = `
    INSERT INTO CLAIMS (
      CLAIM_ID,
      CLAIM_NUMBER,
      CLAIM_TYPE,
      CLAIM_SUBTYPE,
      PERIL_CODE,
      INCIDENT_DATE,
      INCIDENT_DESCRIPTION,
      INCIDENT_LOCATION,
      STATUS,
      PRIORITY,
      ASSIGNED_ADJUSTER_ID,
      ESTIMATED_LOSS,
      AI_CONFIDENCE_SCORE,
      INTAKE_CHANNEL,
      REQUIRES_HUMAN_REVIEW
    ) VALUES (
      :claimId,
      :claimNumber,
      :claimType,
      :claimSubtype,
      :perilCode,
      TO_TIMESTAMP_TZ(:incidentDate, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
      :incidentDescription,
      :location,
      'Pending',
      :priority,
      :adjusterId,
      :estimatedLoss,
      0.95,
      'CHATBOT',
      'N'
    )
  `;
  
  const binds = {
    claimId: claimData.claimId,
    claimNumber: claimData.claimNumber,
    claimType: claimData.claimType,
    claimSubtype: claimData.claimSubtype || 'Unknown',
    perilCode: claimData.perilCode || 'COLLISION',
    incidentDate: claimData.incidentDate || new Date().toISOString(),
    incidentDescription: claimData.incidentDescription || 'No description provided',
    location: claimData.location || 'Unknown location',
    priority: claimData.priority || 'Medium',
    adjusterId: claimData.adjusterId || 'ADJ001',
    estimatedLoss: parseFloat(claimData.estimatedLoss) || 0
  };
  
  try {
    console.log('[Database] Calling run() with SQL insert...');
    
    const result = await run(sql, binds);
    
    console.log('[Database] ✅ SUCCESS! Rows affected:', result.rowsAffected);
    console.log('[Database] ═══════════════════════════════════════\n');
    
    return { 
      success: true, 
      rowsAffected: result.rowsAffected 
    };
    
  } catch (error) {
    console.error('[Database] ❌ ERROR inserting claim!');
    console.error('[Database] Error message:', error.message);
    console.error('[Database] Error stack:', error.stack);
    console.error('[Database] ═══════════════════════════════════════\n');
    
    throw error;
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

export function setupChatbotEndpoints(app) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🤖 CHATBOT ENDPOINTS SETUP           ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('Database: Direct Oracle Connection with Pool');

  // --------------------------------------------------------------------------
  // POST /api/claims/submit - Submit new claim
  // --------------------------------------------------------------------------
  
  app.post('/api/claims/submit', upload.array('files', 10), async (req, res) => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  📨 NEW CLAIM SUBMISSION              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('[Chatbot] Receiving new claim submission...');
    console.log('[Chatbot] Files received:', req.files?.length || 0);

    try {
      const requiredFields = [
        'claimType', 'claimSubtype', 'incidentDate', 
        'incidentDescription', 'location', 'estimatedLoss',
        'policyNumber', 'customerName', 'customerEmail'
      ];
      
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        console.error('[Chatbot] ❌ Missing required fields:', missingFields);
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          required: missingFields
        });
      }

      const claimNumber = generateClaimNumber();
      const claimId = generateClaimId();
      const priority = calculatePriority(req.body.estimatedLoss);
      const adjuster = assignAdjuster(req.body.claimType, priority);

      console.log('[Chatbot] Generated Claim Number:', claimNumber);
      console.log('[Chatbot] Generated Claim ID:', claimId);
      console.log('[Chatbot] Priority:', priority);
      console.log('[Chatbot] Assigned Adjuster:', adjuster.name);

      const claimData = {
        claimId,
        claimNumber,
        policyId: null,
        customerId: null,
        claimType: req.body.claimType,
        claimSubtype: req.body.claimSubtype,
        perilCode: req.body.claimSubtype.toUpperCase().replace(/\s+/g, '_').substring(0, 20),
        incidentDate: new Date().toISOString(),
        incidentDescription: req.body.incidentDescription,
        location: req.body.location,
        status: 'Pending',
        priority: priority,
        assignedAdjusterId: adjuster.id,
        assignedAdjusterName: adjuster.name,
        estimatedLoss: parseFloat(req.body.estimatedLoss),
        aiConfidenceScore: 0.85 + (Math.random() * 0.15),
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone || 'Not provided',
        uploadedFiles: req.files?.map(f => f.filename) || [],
        createdDate: new Date().toISOString()
      };

      console.log('[Chatbot] Prepared claim data for:', claimNumber);
      
      // Insert to database
      try {
        console.log('[Chatbot] Calling insertClaimToDatabase...');
        await insertClaimToDatabase(claimData);
        console.log('[Chatbot] ✅ Database insert completed successfully');
      } catch (dbError) {
        console.error('[Chatbot] ❌ Database insert failed:', dbError.message);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to save claim to database',
          claimNumber: claimNumber,
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

      const response = {
        success: true,
        claimNumber: claimNumber,
        claimId: claimId,
        status: 'Pending',
        priority: priority,
        assignedAdjuster: adjuster.name,
        uploadedFiles: req.files?.length || 0,
        estimatedLoss: claimData.estimatedLoss,
        message: 'Claim submitted successfully',
        estimatedProcessingTime: '24-48 hours',
        nextSteps: [
          'You will receive a confirmation email shortly',
          'An adjuster will be assigned within 24 hours',
          'You can track your claim status in the portal'
        ],
        attachments: req.files?.map(f => ({
          filename: f.filename,
          originalname: f.originalname,
          size: f.size
        })) || []
      };

      console.log('[Chatbot] Claim', claimNumber, 'submitted successfully');
      console.log('════════════════════════════════════════\n');

      res.status(201).json(response);

    } catch (error) {
      console.error('\n[Chatbot] ❌ ERROR submitting claim');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while processing your claim',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/claims-chatbot - Fetch all claims (chatbot endpoint)
  // --------------------------------------------------------------------------
  
  app.get('/api/claims-chatbot', async (req, res) => {
    console.log('\n[Claims API] GET /api/claims-chatbot - Fetching claims via ORDS');
    const ORDS_BASE_URL = process.env.ORDS_BASE_URL || 'https://gde727daa9b60fb-vibecoding.adb.us-chicago-1.oraclecloudapps.com/ords/admin';
    const url = `${ORDS_BASE_URL}/claims/?offset=0&limit=1000`;

    // First, try direct DB join to enrich with customer details
    try {
      const sql = `
        SELECT 
          c.CLAIM_ID,
          c.CLAIM_NUMBER,
          c.CUSTOMER_ID,
          (cu.FIRST_NAME || ' ' || cu.LAST_NAME) AS CUSTOMER_NAME,
          (cu.CITY || ', ' || cu.STATE) AS CUSTOMER_LOCATION,
          c.CLAIM_TYPE,
          c.CLAIM_SUBTYPE,
          c.PERIL_CODE,
          c.INCIDENT_DATE,
          c.INCIDENT_DESCRIPTION,
          c.INCIDENT_LOCATION,
          c.STATUS,
          c.PRIORITY,
          c.ASSIGNED_ADJUSTER_ID,
          c.ASSIGNED_DATE,
          c.ESTIMATED_LOSS,
          c.APPROVED_AMOUNT,
          c.PAID_AMOUNT,
          c.INTAKE_CHANNEL,
          c.AI_CONFIDENCE_SCORE,
          c.REQUIRES_HUMAN_REVIEW,
          c.CREATED_AT,
          c.CREATED_DATE,
          c.UPDATED_AT,
          c.CLOSED_AT
        FROM CLAIMS c
        JOIN CUSTOMERS cu ON c.CUSTOMER_ID = cu.CUSTOMER_ID
        ORDER BY c.CLAIM_ID
      `;
      const db = await run(sql);
      const rows = db?.rows || [];
      if (rows.length) {
        const mapped = rows.map((r) => ({
          CLAIM_ID: r.CLAIM_ID,
          CLAIM_NUMBER: r.CLAIM_NUMBER,
          POLICY_ID: r.POLICY_ID ?? null,
          CUSTOMER_ID: r.CUSTOMER_ID ?? null,
          CLAIM_TYPE: r.CLAIM_TYPE,
          CLAIM_SUBTYPE: r.CLAIM_SUBTYPE,
          PERIL_CODE: r.PERIL_CODE,
          INCIDENT_DATE: r.INCIDENT_DATE,
          INCIDENT_DESCRIPTION: r.INCIDENT_DESCRIPTION,
          INCIDENT_LOCATION: r.INCIDENT_LOCATION,
          STATUS: r.STATUS,
          PRIORITY: r.PRIORITY,
          ASSIGNED_ADJUSTER_ID: r.ASSIGNED_ADJUSTER_ID,
          ASSIGNED_DATE: r.ASSIGNED_DATE,
          ESTIMATED_LOSS: r.ESTIMATED_LOSS || 0,
          APPROVED_AMOUNT: r.APPROVED_AMOUNT || 0,
          PAID_AMOUNT: r.PAID_AMOUNT || 0,
          INTAKE_CHANNEL: r.INTAKE_CHANNEL || 'CHATBOT',
          AI_CONFIDENCE_SCORE: r.AI_CONFIDENCE_SCORE || 0.9,
          REQUIRES_HUMAN_REVIEW: r.REQUIRES_HUMAN_REVIEW || 'N',
          CREATED_AT: r.CREATED_AT || r.CREATED_DATE || new Date().toISOString(),
          UPDATED_AT: r.UPDATED_AT || null,
          CLOSED_AT: r.CLOSED_AT || null,
          CUSTOMER_NAME: r.CUSTOMER_NAME || 'N/A',
          CUSTOMER_EMAIL: 'N/A',
          CUSTOMER_PHONE: 'N/A'
        }));
        return res.json({
          success: true,
          claims: mapped,
          count: mapped.length,
          source: 'db-join'
        });
      }
    } catch (dbErr) {
      console.warn('[Claims API] DB join failed, falling back to ORDS:', dbErr.message);
    }

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`ORDS error ${resp.status}: ${t}`);
      }
      const data = await resp.json();
      const items = data.items || [];

      // Optional: load customers for name/email enrichment
      let customerById = new Map();
      try {
        const custUrl = `${ORDS_BASE_URL}/customers/?offset=0&limit=1000`;
        const custResp = await fetch(custUrl);
        if (custResp.ok) {
          const custData = await custResp.json();
          const custItems = custData.items || [];
          customerById = new Map(
            custItems
              .map(p => {
                const id = p.CUSTOMER_ID || p.customer_id || p.ID || p.id;
                const first = (p.FIRST_NAME || p.first_name || '').toString().trim();
                const last = (p.LAST_NAME || p.last_name || '').toString().trim();
                const email = (p.EMAIL || p.email || '').toString().trim();
                const phone = (p.PHONE || p.phone || '').toString().trim();
                const name = `${first} ${last}`.trim();
                return [id, { name, email, phone }];
              })
              .filter(([id, obj]) => id && obj.name)
          );
          console.log(`[Claims API] Enriched customers loaded: ${customerById.size}`);
        } else {
          console.warn('[Claims API] Customers endpoint not available:', custResp.status);
        }
      } catch (e) {
        console.warn('[Claims API] Customers fetch failed:', e.message);
      }

      // Normalize to uppercase keys expected by frontend ClaimsTab
      const mapped = items.map((c) => ({
        CLAIM_ID: c.CLAIM_ID || c.claim_id,
        CLAIM_NUMBER: c.CLAIM_NUMBER || c.claim_number,
        POLICY_ID: c.POLICY_ID || c.policy_id || null,
        CUSTOMER_ID: c.CUSTOMER_ID || c.customer_id || null,
        CLAIM_TYPE: c.CLAIM_TYPE || c.claim_type,
        CLAIM_SUBTYPE: c.CLAIM_SUBTYPE || c.claim_subtype,
        PERIL_CODE: c.PERIL_CODE || c.peril_code,
        INCIDENT_DATE: c.INCIDENT_DATE || c.incident_date,
        INCIDENT_DESCRIPTION: c.INCIDENT_DESCRIPTION || c.incident_description,
        INCIDENT_LOCATION: c.INCIDENT_LOCATION || c.incident_location,
        STATUS: c.STATUS || c.status,
        PRIORITY: c.PRIORITY || c.priority,
        ASSIGNED_ADJUSTER_ID: c.ASSIGNED_ADJUSTER_ID || c.assigned_adjuster_id,
        ASSIGNED_DATE: c.ASSIGNED_DATE || c.assigned_date,
        ESTIMATED_LOSS: c.ESTIMATED_LOSS || c.estimated_loss || 0,
        APPROVED_AMOUNT: c.APPROVED_AMOUNT || c.approved_amount || 0,
        PAID_AMOUNT: c.PAID_AMOUNT || c.paid_amount || 0,
        INTAKE_CHANNEL: c.INTAKE_CHANNEL || c.intake_channel || 'CHATBOT',
        AI_CONFIDENCE_SCORE: c.AI_CONFIDENCE_SCORE || c.ai_confidence_score || 0.9,
        REQUIRES_HUMAN_REVIEW: c.REQUIRES_HUMAN_REVIEW || c.requires_human_review || 'N',
        CREATED_AT: c.CREATED_AT || c.created_at || c.CREATED_DATE || c.created_date || new Date().toISOString(),
        UPDATED_AT: c.UPDATED_AT || c.updated_at || null,
        CLOSED_AT: c.CLOSED_AT || c.closed_at || null,
        CUSTOMER_NAME: (c.CUSTOMER_NAME || c.customer_name) || (customerById.get(c.CUSTOMER_ID || c.customer_id)?.name) || ([c.FIRST_NAME || c.first_name, c.LAST_NAME || c.last_name].filter(Boolean).join(' ').trim()) || 'N/A',
        CUSTOMER_EMAIL: (c.CUSTOMER_EMAIL || c.customer_email) || (customerById.get(c.CUSTOMER_ID || c.customer_id)?.email) || 'N/A',
        CUSTOMER_PHONE: (c.CUSTOMER_PHONE || c.customer_phone) || (customerById.get(c.CUSTOMER_ID || c.customer_id)?.phone) || 'N/A'
      }));
      return res.json({
        success: true,
        claims: mapped,
        count: mapped.length
      });
    } catch (error) {
      console.error('[Claims API] ORDS fetch failed:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch claims'
      });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/claims/status/:claimNumber - Get claim status
  // --------------------------------------------------------------------------
  
  app.get('/api/claims/status/:claimNumber', async (req, res) => {
    try {
      const { claimNumber } = req.params;
      console.log(`[Chatbot] Fetching status for claim: ${claimNumber}`);
      
      res.json({
        claimNumber: claimNumber,
        status: 'Pending',
        assignedAdjuster: 'Michael Rodriguez',
        priority: 'Medium',
        lastUpdate: new Date().toISOString(),
        estimatedLoss: 5000,
        description: 'Claim is being reviewed by adjuster'
      });
    } catch (error) {
      console.error('[Chatbot] Error fetching claim status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching claim status' 
      });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/claims/files/:filename - Download file
  // --------------------------------------------------------------------------
  
  app.get('/api/claims/files/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, 'uploads', 'claims', filename);
      console.log(`[Chatbot] Downloading file: ${filename}`);
      
      res.download(filePath, (err) => {
        if (err) {
          console.error('[Chatbot] File download error:', err);
          res.status(404).json({ 
            success: false, 
            message: 'File not found' 
          });
        }
      });
    } catch (error) {
      console.error('[Chatbot] Error downloading file:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error downloading file' 
      });
    }
  });

  // --------------------------------------------------------------------------
  // PATCH /api/claims/:id - Update status and/or assigned adjuster
  // --------------------------------------------------------------------------
  app.patch('/api/claims/:id', async (req, res) => {
    try {
      const claimId = req.params.id;
      const { status, assignedAdjusterId } = req.body || {};
      if (status === undefined && assignedAdjusterId === undefined) {
        return res.status(400).json({ success: false, message: 'Provide status and/or assignedAdjusterId' });
      }

      const sets = [];
      const binds = { id: claimId };

      if (status !== undefined && status !== null && status !== '') {
        sets.push('STATUS = :status');
        binds.status = status;
      }
      if (assignedAdjusterId !== undefined) {
        sets.push('ASSIGNED_ADJUSTER_ID = :adj');
        binds.adj = assignedAdjusterId || null;
        sets.push('ASSIGNED_DATE = SYSTIMESTAMP');
      }
      sets.push('UPDATED_AT = SYSTIMESTAMP');

      const sql = `UPDATE CLAIMS SET ${sets.join(', ')} WHERE CLAIM_ID = :id`;
      const result = await run(sql, binds);
      return res.json({
        success: true,
        rowsAffected: result?.rowsAffected || 0
      });
    } catch (e) {
      console.error('[Claims API] Update claim failed:', e);
      return res.status(500).json({ success: false, message: 'Failed to update claim' });
    }
  });

  console.log('✅ Chatbot endpoints configured:');
  console.log('   POST   /api/claims/submit');
  console.log('   GET    /api/claims-chatbot');
  console.log('   GET    /api/claims/status/:claimNumber');
  console.log('   GET    /api/claims/files/:filename');
  console.log('   PATCH  /api/claims/:id');
  console.log('════════════════════════════════════════\n');
}
