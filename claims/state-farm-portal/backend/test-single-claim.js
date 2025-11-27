// ============================================================================
// SINGLE CLAIM TEST
// ============================================================================
// Quick test to submit ONE claim and verify it works
// Usage: node test-single-claim.js
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

// If BACKEND_URL already includes /api/claims/submit, use it directly
// Otherwise, append /api/claims/submit to the base URL
let BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
let CLAIMS_ENDPOINT;

if (BACKEND_URL.includes('/api/claims/submit')) {
  CLAIMS_ENDPOINT = BACKEND_URL;
  BACKEND_URL = BACKEND_URL.replace('/api/claims/submit', '');
} else {
  CLAIMS_ENDPOINT = `${BACKEND_URL}/api/claims/submit`;
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║    🧪 SINGLE CLAIM TEST               ║');
console.log('╚════════════════════════════════════════╝\n');

// ============================================================================
// TEST CLAIM DATA - Modify this as needed
// ============================================================================

const testClaim = {
  claimType: 'Auto',
  claimSubtype: 'Collision',
  incidentDate: '11/24/2024',
  incidentDescription: 'Test claim - Rear-ended at intersection. Moderate damage to rear bumper.',
  location: '123 Test Street, Chicago, IL',
  estimatedLoss: '5000',
  policyNumber: 'POL-TEST-001',
  customerName: 'Test User',
  customerEmail: 'test@example.com',
  customerPhone: '555-0100'
};

// ============================================================================
// SUBMIT CLAIM
// ============================================================================

async function submitTestClaim() {
  console.log('Backend URL:', BACKEND_URL);
  console.log('Endpoint:', CLAIMS_ENDPOINT);
  console.log('');
  
  console.log('📋 Claim Data:');
  console.log('─────────────────────────────────────────');
  Object.entries(testClaim).forEach(([key, value]) => {
    console.log(`   ${key.padEnd(25)}: ${value}`);
  });
  console.log('');
  
  try {
    console.log('🚀 Submitting claim...\n');
    
    // Use JSON format (works with your backend!)
    const response = await fetch(CLAIMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testClaim)
    });

    console.log('Response Status:', response.status, response.statusText);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Claim submitted successfully!\n');
      console.log('Response Details:');
      console.log('─────────────────────────────────────────');
      console.log('   Claim Number:', result.claimNumber);
      console.log('   Claim ID:', result.claimId);
      console.log('   Status:', result.status);
      console.log('   Priority:', result.priority);
      console.log('   Assigned Adjuster:', result.assignedAdjuster);
      console.log('   Estimated Loss: $' + result.estimatedLoss);
      console.log('   Files Uploaded:', result.uploadedFiles || 0);
      console.log('   Message:', result.message);
      
      // Provide verification query
      console.log('\n\n📋 Verify in Database:');
      console.log('─────────────────────────────────────────');
      console.log(`\nSELECT 
  CLAIM_NUMBER,
  CLAIM_TYPE,
  CLAIM_SUBTYPE,
  CUSTOMER_NAME,
  CUSTOMER_EMAIL,
  INCIDENT_LOCATION,
  ESTIMATED_LOSS,
  STATUS,
  PRIORITY,
  ASSIGNED_ADJUSTER_ID,
  TO_CHAR(INCIDENT_DATE, 'YYYY-MM-DD HH24:MI:SS') AS INCIDENT_DATE,
  TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
FROM CLAIMS
WHERE CLAIM_NUMBER = '${result.claimNumber}';`);
      
      console.log('\n\n✅ Test completed successfully!');
      
    } else {
      console.log('\n❌ FAILED! Claim submission failed.\n');
      console.log('Error Details:');
      console.log('─────────────────────────────────────────');
      console.log('   Status:', response.status);
      console.log('   Message:', result.message || 'No message');
      console.log('   Error:', result.error || 'No error details');
      
      if (response.status === 500) {
        console.log('\n💡 Backend error - check backend logs for details');
      } else if (response.status === 400) {
        console.log('\n💡 Bad request - check if all required fields are provided');
      } else if (response.status === 404) {
        console.log('\n💡 Endpoint not found - check if backend is running');
      }
    }
    
  } catch (error) {
    console.log('\n❌ CONNECTION ERROR!\n');
    console.log('Error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   1. Backend is not running (start with: npm start)');
    console.log('   2. Wrong port (check if backend is on port 5000)');
    console.log('   3. CORS issue (backend not allowing requests)');
    console.log('\n   Make sure backend is running and try again.');
  }
  
  console.log('\n═══════════════════════════════════════════\n');
}

// Run the test
submitTestClaim();
