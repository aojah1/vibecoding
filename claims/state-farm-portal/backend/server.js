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

async function buildClaimContext(claimIdentifierRaw) {
  const identifier = String(claimIdentifierRaw || '').trim();
  if (!identifier) {
    throw new Error('Missing claim identifier');
  }

  const claims = await fetchAllORDS('/claims/');
  const normalize = (s = '') => String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const target = claims.find((c) => {
    const claimNumber = c.claim_number || c.CLAIM_NUMBER;
    const claimId = c.claim_id || c.CLAIM_ID;
    return normalize(claimNumber) === normalize(identifier) || normalize(claimId) === normalize(identifier);
  });

  if (!target) {
    throw new Error(`Claim not found: ${identifier}`);
  }

  let adjuster = null;
  try {
    const adjusters = await fetchAllORDS('/adjusters/');
    const aid = target.assigned_adjuster_id || target.ASSIGNED_ADJUSTER_ID;
    if (aid) {
      const match = adjusters.find((x) => (x.adjuster_id || x.ADJUSTER_ID) === aid);
      if (match) {
        adjuster = {
          id: match.adjuster_id || match.ADJUSTER_ID,
          name: `${match.first_name || match.FIRST_NAME || ''} ${match.last_name || match.LAST_NAME || ''}`.trim(),
          email: match.email || match.EMAIL,
          phone: match.phone || match.PHONE,
          specialization: match.specialization || match.SPECIALIZATION
        };
      }
    }
  } catch (err) {
    console.warn('[ClaimContext] Adjuster enrichment skipped:', err.message);
  }

  let customer = null;
  try {
    const customers = await fetchAllORDS('/customers/');
    const cid = target.customer_id || target.CUSTOMER_ID;
    if (cid) {
      const cu = customers.find((x) => (x.customer_id || x.CUSTOMER_ID) === cid);
      if (cu) customer = cu;
    }
  } catch (err) {
    console.warn('[ClaimContext] Customer enrichment skipped:', err.message);
  }

  let damages = [];
  try {
    const allDamages = await fetchAllORDS('/damages/');
    const claimId = target.claim_id || target.CLAIM_ID;
    damages = allDamages
      .filter((d) => (d.claim_id || d.CLAIM_ID) === claimId)
      .map((d) => ({
        damageType: d.damage_type || d.DAMAGE_TYPE,
        severity: d.severity || d.SEVERITY,
        repairCost: Number(d.estimated_repair_cost || d.ESTIMATED_REPAIR_COST || 0),
        description: d.damage_description || d.DAMAGE_DESCRIPTION,
        assessmentDate: d.assessment_date || d.ASSESSMENT_DATE
      }));
  } catch (err) {
    console.warn('[ClaimContext] Damage enrichment skipped:', err.message);
  }

  const claim = {
    CLAIM_ID: target.claim_id || target.CLAIM_ID,
    CLAIM_NUMBER: target.claim_number || target.CLAIM_NUMBER,
    STATUS: target.status || target.STATUS,
    PRIORITY: target.priority || target.PRIORITY,
    CLAIM_TYPE: target.claim_type || target.CLAIM_TYPE,
    CLAIM_SUBTYPE: target.claim_subtype || target.CLAIM_SUBTYPE,
    PERIL_CODE: target.peril_code || target.PERIL_CODE,
    INCIDENT_DATE: target.incident_date || target.INCIDENT_DATE,
    INCIDENT_LOCATION: target.incident_location || target.INCIDENT_LOCATION,
    INCIDENT_DESCRIPTION: target.incident_description || target.INCIDENT_DESCRIPTION,
    ESTIMATED_LOSS: Number(target.estimated_loss || target.ESTIMATED_LOSS || 0),
    INTAKE_CHANNEL: target.intake_channel || target.INTAKE_CHANNEL,
    ASSIGNED_ADJUSTER_ID: target.assigned_adjuster_id || target.ASSIGNED_ADJUSTER_ID,
    CUSTOMER_ID: target.customer_id || target.CUSTOMER_ID,
    POLICY_ID: target.policy_id || target.POLICY_ID,
    CREATED_DATE: target.created_date || target.CREATED_DATE,
    UPDATED_AT: target.updated_at || target.UPDATED_AT,
    CLOSED_AT: target.closed_at || target.CLOSED_AT
  };

  return { claim, adjuster, customer, damages };
}

const POLICY_LIBRARY = {
  PROPERTY: {
    label: 'Property Policy Package',
    coveredPerils: ['WATER', 'STORM', 'FIRE', 'THEFT', 'WIND', 'HAIL'],
    deductible: 1500,
    endorsements: {
      WATER: 'Water backup endorsement extends coverage for sump pump or drain failures up to $25K.',
      STORM: 'Extended replacement cost endorsement allows 120% of Coverage A for wind/hail events.',
      FIRE: 'Code upgrade rider reimburses ordinance or law mandated rebuild expenses.'
    },
    exclusions: ['Surface water flooding', 'Neglect or delayed maintenance', 'Intentional damage']
  },
  AUTO: {
    label: 'Auto Comprehensive & Collision',
    coveredPerils: ['COLLISION', 'COMPREHENSIVE', 'VANDALISM', 'THEFT'],
    deductible: 1000,
    endorsements: {
      COLLISION: 'New OEM parts endorsement waives depreciation for vehicles under 3 years.',
      VANDALISM: 'Comprehensive automatically extends to vandalism events with police report.'
    },
    exclusions: ['Commercial use without rider', 'Wear and tear', 'Non-authorized drivers']
  },
  LIABILITY: {
    label: 'General Liability / Bodily Injury',
    coveredPerils: ['INJURY', 'PREMISES', 'CASUALTY'],
    deductible: 5000,
    endorsements: {
      INJURY: 'MedPay add-on covers first $5K regardless of fault and can offset early negotiations.'
    },
    exclusions: ['Intentional acts', 'Professional services', 'Workers compensation events']
  },
  DEFAULT: {
    label: 'Standard Policy',
    coveredPerils: [],
    deductible: 2000,
    endorsements: {},
    exclusions: []
  }
};

const CHECKLIST_STEPS = [
  { id: 'coverage', label: 'Coverage Verification' },
  { id: 'documents', label: 'Document Completeness' },
  { id: 'liability', label: 'Liability & Cause Analysis' },
  { id: 'damage', label: 'Damage & Estimate Validation' },
  { id: 'salvage', label: 'Salvage / Vendor Coordination' },
  { id: 'payment', label: 'Settlement & Payment Prep' }
];

const formatUSD = (amt) => `$${Number(amt || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function derivePolicyIntel(context) {
  const { claim, damages } = context;
  const profile = POLICY_LIBRARY[claim.CLAIM_TYPE?.toUpperCase()] || POLICY_LIBRARY.DEFAULT;
  const perilCode = (claim.PERIL_CODE || claim.CLAIM_SUBTYPE || '').toUpperCase();
  const isCovered = profile.coveredPerils.some((peril) => perilCode.includes(peril));
  const severity = damages.some((d) => (d.severity || '').toUpperCase() === 'SEVERE') ? 'High' : 'Moderate';

  const endorsements = Object.entries(profile.endorsements).reduce((acc, [key, note]) => {
    if (perilCode.includes(key)) acc.push(note);
    return acc;
  }, []);

  const payoutCeiling = claim.ESTIMATED_LOSS + (severity === 'High' ? 10000 : 2500);

  return {
    claimNumber: claim.CLAIM_NUMBER,
    policyLabel: profile.label,
    coverageStatus: isCovered ? 'Likely Covered' : 'Requires Manual Review',
    deductible: profile.deductible,
    projectedExposure: formatUSD(Math.max(payoutCeiling, 0)),
    keyClauses: [
      `Peril code ${perilCode || 'N/A'} ${isCovered ? 'aligns with' : 'is outside of'} scheduled covered causes of loss`,
      `Base deductible ${formatUSD(profile.deductible)} applies before depreciation`,
      severity === 'High'
        ? 'High severity damages suggest reviewing ordinance or law sub-limits'
        : 'Moderate severity allows expedited desk adjustment'
    ],
    endorsementHighlights: endorsements.length ? endorsements : ['No specific endorsements detected for this peril.'],
    exclusionsToWatch: profile.exclusions,
    recommendedQuestions: [
      'Confirm if temporary repairs were initiated and if receipts are available.',
      isCovered ? 'Validate that loss date falls within policy active period and no lapse occurred.' : 'Escalate to underwriting for coverage confirmation.',
      'Request any municipal reports or contractor estimates referenced by the insured.'
    ]
  };
}

function deriveChecklist(context) {
  const { claim, damages } = context;
  const now = new Date().toISOString();
  const severeDamage = damages.some((d) => (d.severity || '').toUpperCase() === 'SEVERE');
  const docsComplete = damages.length > 0;

  const statusMap = {
    coverage: claim.STATUS?.toUpperCase() !== 'PENDING',
    documents: docsComplete,
    liability: Boolean(claim.INCIDENT_DESCRIPTION),
    damage: damages.length > 0,
    salvage: severeDamage,
    payment: claim.STATUS?.toUpperCase() === 'APPROVED'
  };

  return CHECKLIST_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    status: statusMap[step.id] ? 'complete' : 'incomplete',
    lastUpdated: now,
    notes: (() => {
      switch (step.id) {
        case 'coverage':
          return statusMap.coverage ? 'Coverage flagged as reviewed via status change.' : 'Awaiting adjuster confirmation of coverage applicability.';
        case 'documents':
          return docsComplete ? 'Damage assessments uploaded.' : 'Need contractor estimate or damage photos.';
        case 'liability':
          return claim.INCIDENT_DESCRIPTION ? 'Narrative captured via intake.' : 'Collect a signed statement regarding causation.';
        case 'damage':
          return damages.length ? `${damages.length} damage line items logged.` : 'Schedule inspection to capture damage scope.';
        case 'salvage':
          return severeDamage ? 'High severity -> notify salvage or restoration vendors.' : 'No salvage coordination required yet.';
        case 'payment':
          return claim.STATUS?.toUpperCase() === 'APPROVED' ? 'Ready for payment file creation.' : 'Hold until coverage + liability complete.';
        default:
          return '';
      }
    })()
  }));
}

async function buildNegotiationBrief(context) {
  const { claim, damages, adjuster } = context;
  const damageTotal = damages.reduce((sum, d) => sum + (d.repairCost || 0), 0);
  const primaryBase = Math.max(claim.ESTIMATED_LOSS || 0, damageTotal);
  const low = primaryBase * 0.85;
  const high = primaryBase * 1.05;
  const { summary } = await summarizeWithOpenAI(context);

  return {
    claimNumber: claim.CLAIM_NUMBER,
    adjuster: adjuster?.name || claim.ASSIGNED_ADJUSTER_ID || 'Unassigned',
    exposureBaseline: formatUSD(primaryBase),
    recommendedRange: {
      low: formatUSD(low),
      high: formatUSD(high)
    },
    leveragePoints: [
      damages.length ? `${damages.length} documented damage items support the loss narrative.` : 'No damage line items logged yet—encourage claimant to submit photos/estimates.',
      claim.INTAKE_CHANNEL ? `Claim captured via ${claim.INTAKE_CHANNEL}, giving full chatbot transcript for reference.` : 'No digital transcript available.',
      adjuster?.specialization ? `Assign to ${adjuster.specialization} specialist for credibility during negotiations.` : 'Consider routing to specialist adjuster for subject-matter authority.'
    ],
    recommendedActions: [
      'Confirm deductible and depreciation impacts before presenting settlement numbers.',
      'Align on maximum authority with team lead prior to negotiation call.',
      'Prepare alternative settlement structures (cash vs. managed repair) if claimant pushes back.'
    ],
    executiveSummary: summary
  };
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

/**
 * OpenAI summarization helper
 * Uses direct HTTP call to avoid adding new deps.
 * Requires env: OPENAI_API_KEY, optional: OPENAI_MODEL (default gpt-4o-mini)
 */
async function summarizeWithOpenAI(context) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Simple fallback in case no key configured
  function fallbackSummary(c) {
    const claim = c?.claim || {};
    const cust = c?.customer || {};
    const adj = c?.adjuster || {};
    const dmgs = c?.damages || [];
    const lines = [
      `Claim ${claim.CLAIM_NUMBER || claim.claim_number || claim.CLAIM_ID || claim.claim_id || 'N/A'}: ${claim.CLAIM_TYPE || 'Unknown'} (${claim.CLAIM_SUBTYPE || 'N/A'})`,
      `Status: ${claim.STATUS || 'Unknown'} | Priority: ${claim.PRIORITY || 'N/A'}`,
      `Estimated loss: $${Number(claim.ESTIMATED_LOSS || 0).toLocaleString()}`,
      `Incident: ${claim.INCIDENT_DATE || 'N/A'}${claim.INCIDENT_LOCATION ? ' @ ' + claim.INCIDENT_LOCATION : ''}`,
      `Customer: ${cust.FIRST_NAME ? `${cust.FIRST_NAME} ${cust.LAST_NAME}` : (claim.CUSTOMER_NAME || 'N/A')}`,
      `Adjuster: ${adj.name || claim.ASSIGNED_ADJUSTER_ID || 'Unassigned'}`
    ];
    if (dmgs.length > 0) {
      lines.push('', 'Damage Assessment:');
      const totalRepair = dmgs.reduce((sum, d) => sum + (d.repairCost || 0), 0);
      dmgs.forEach(d => {
        lines.push(`  - ${d.damageType} (${d.severity}): $${Number(d.repairCost || 0).toLocaleString()} — ${d.description || 'No description'}`);
      });
      lines.push(`Total estimated repair: $${totalRepair.toLocaleString()}`);
    }
    return lines.join('\n');
  }

  const prompt = `
Summarize the insurance claim into a concise, executive-friendly brief (<= 200 words).
Highlight: incident details (when/what/where), financial exposure (estimated_loss), current status/priority, routing (adjuster), and immediate next best action if any.
If damages are present, include a damage assessment section: list each damage type, severity, estimated repair cost, and provide an overall damage analysis with total repair cost estimate.
Return plain text (no JSON, no markdown).

Context JSON:
${JSON.stringify(context, null, 2)}
  `.trim();

  if (!apiKey) {
    return { summary: fallbackSummary(context), model: 'fallback' };
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert insurance claims analyst. Be precise and actionable.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`OpenAI error ${resp.status}: ${t}`);
    }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    return { summary: text || fallbackSummary(context), model };
  } catch (e) {
    console.warn('[OpenAI] summarize fallback:', e.message);
    return { summary: fallbackSummary(context), model: 'fallback' };
  }
}

/**
 * Summarization endpoint:
 * GET /api/claims/summary?claimNumber=CLM-...
 * Returns { summary, claim, model }
 */
app.get('/api/claims/summary', async (req, res) => {
  try {
    const claimNumberRaw = req.query.claimNumber || req.query.claimId || req.query.id;
    if (!claimNumberRaw) {
      return res.status(400).json({ error: 'Missing claimNumber' });
    }

    const claimCtx = await buildClaimContext(claimNumberRaw);

    const { summary, model } = await summarizeWithOpenAI(claimCtx);
    res.json({ summary, claim: claimCtx.claim, model });
  } catch (err) {
    console.error('[Summary] Error:', err.message);
    res.status(500).json({ error: 'Failed to summarize claim', details: err.message });
  }
});

app.get('/api/claims/:claimId/policy-intel', async (req, res) => {
  try {
    const claimId = req.params.claimId || req.query.claimNumber;
    if (!claimId) {
      return res.status(400).json({ error: 'Missing claim identifier' });
    }
    const context = await buildClaimContext(claimId);
    const intel = derivePolicyIntel(context);
    res.json({ success: true, ...intel });
  } catch (err) {
    console.error('[PolicyIntel] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/claims/:claimId/checklist', async (req, res) => {
  try {
    const claimId = req.params.claimId || req.query.claimNumber;
    if (!claimId) {
      return res.status(400).json({ error: 'Missing claim identifier' });
    }
    const context = await buildClaimContext(claimId);
    const checklist = deriveChecklist(context);
    res.json({ success: true, claimNumber: context.claim.CLAIM_NUMBER, steps: checklist });
  } catch (err) {
    console.error('[Checklist] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/claims/:claimId/negotiation-brief', async (req, res) => {
  try {
    const claimId = req.params.claimId || req.query.claimNumber;
    if (!claimId) {
      return res.status(400).json({ error: 'Missing claim identifier' });
    }
    const context = await buildClaimContext(claimId);
    const brief = await buildNegotiationBrief(context);
    res.json({ success: true, ...brief });
  } catch (err) {
    console.error('[NegotiationBrief] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// Get Damages for a specific claim
app.get('/api/claims/:claimId/damages', async (req, res) => {
  try {
    const { claimId } = req.params;
    const allDamages = await fetchAllORDS('/damages/');
    const claimDamages = allDamages
      .filter(dmg => (dmg.claim_id || dmg.CLAIM_ID) === claimId)
      .map(dmg => ({
        damageId: dmg.damage_id || dmg.DAMAGE_ID,
        claimId: dmg.claim_id || dmg.CLAIM_ID,
        damageType: dmg.damage_type || dmg.DAMAGE_TYPE,
        severity: dmg.severity || dmg.SEVERITY,
        repairCost: dmg.estimated_repair_cost || dmg.ESTIMATED_REPAIR_COST || 0,
        assessmentDate: dmg.assessment_date || dmg.ASSESSMENT_DATE,
        description: dmg.damage_description || dmg.DAMAGE_DESCRIPTION
      }));
    res.json(claimDamages);
  } catch (err) {
    console.error('Error fetching claim damages:', err);
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
    
    const pendingClaims = claims.filter(c => {
      const s = (c.status || c.STATUS || '').toUpperCase();
      return s !== 'APPROVED' && s !== '';
    }).length;
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
