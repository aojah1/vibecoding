// ============================================================================
// CLAIMS TESTING SUITE
// ============================================================================
// Complete test suite for testing claim submissions to your database
// Usage: node test-claims.js
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

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
console.log('║    🧪 CLAIMS TESTING SUITE            ║');
console.log('╚════════════════════════════════════════╝\n');

// ============================================================================
// TEST DATA - Different Claim Scenarios
// ============================================================================

const testClaims = [
  {
    name: 'Auto Collision Claim',
    data: {
      claimType: 'Auto',
      claimSubtype: 'Collision',
      incidentDate: '11/20/2024',
      incidentDescription: 'Rear-ended at traffic light. Significant damage to rear bumper and trunk.',
      location: '123 Main Street, Chicago, IL',
      estimatedLoss: '8500',
      policyNumber: 'POL-2024-001',
      customerName: 'John Smith',
      customerEmail: 'john.smith@example.com',
      customerPhone: '312-555-0100'
    }
  },
  {
    name: 'Property Fire Damage Claim',
    data: {
      claimType: 'Property',
      claimSubtype: 'Fire Damage',
      incidentDate: '11/18/2024',
      incidentDescription: 'Kitchen fire caused by stove. Smoke damage to kitchen and adjacent rooms.',
      location: '456 Oak Avenue, Naperville, IL',
      estimatedLoss: '25000',
      policyNumber: 'POL-2024-002',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.johnson@example.com',
      customerPhone: '630-555-0200'
    }
  },
  {
    name: 'Auto Theft Claim',
    data: {
      claimType: 'Auto',
      claimSubtype: 'Theft',
      incidentDate: '11/22/2024',
      incidentDescription: 'Vehicle stolen from parking lot overnight. Last seen at 10 PM.',
      location: '789 Park Drive, Evanston, IL',
      estimatedLoss: '35000',
      policyNumber: 'POL-2024-003',
      customerName: 'Michael Chen',
      customerEmail: 'michael.chen@example.com',
      customerPhone: '847-555-0300'
    }
  },
  {
    name: 'Property Water Damage Claim',
    data: {
      claimType: 'Property',
      claimSubtype: 'Water Damage',
      incidentDate: '11/23/2024',
      incidentDescription: 'Burst pipe in basement. Extensive water damage to flooring and walls.',
      location: '321 Elm Street, Oak Park, IL',
      estimatedLoss: '15000',
      policyNumber: 'POL-2024-004',
      customerName: 'Emily Rodriguez',
      customerEmail: 'emily.rodriguez@example.com',
      customerPhone: '708-555-0400'
    }
  },
  {
    name: 'Liability Claim',
    data: {
      claimType: 'Liability',
      claimSubtype: 'Personal Injury',
      incidentDate: '11/21/2024',
      incidentDescription: 'Visitor slipped on wet floor at property. Minor injuries reported.',
      location: '654 Maple Lane, Skokie, IL',
      estimatedLoss: '5000',
      policyNumber: 'POL-2024-005',
      customerName: 'David Wilson',
      customerEmail: 'david.wilson@example.com',
      customerPhone: '847-555-0500'
    }
  },
  {
    name: 'High-Value Auto Claim',
    data: {
      claimType: 'Auto',
      claimSubtype: 'Collision',
      incidentDate: '11/24/2024',
      incidentDescription: 'Multi-vehicle accident on highway. Total loss of vehicle.',
      location: 'I-94 at Mile Marker 52, IL',
      estimatedLoss: '65000',
      policyNumber: 'POL-2024-006',
      customerName: 'Jennifer Martinez',
      customerEmail: 'jennifer.martinez@example.com',
      customerPhone: '773-555-0600'
    }
  },
  {
    name: 'Low-Value Property Claim',
    data: {
      claimType: 'Property',
      claimSubtype: 'Vandalism',
      incidentDate: '11/19/2024',
      incidentDescription: 'Broken window from vandalism. Glass needs replacement.',
      location: '987 Cedar Road, Schaumburg, IL',
      estimatedLoss: '800',
      policyNumber: 'POL-2024-007',
      customerName: 'Robert Taylor',
      customerEmail: 'robert.taylor@example.com',
      customerPhone: '847-555-0700'
    }
  }
];

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function submitClaim(claimData) {
  try {
    // Use JSON format (works with your backend!)
    const response = await fetch(CLAIMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(claimData)
    });

    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testClaim(testCase, index) {
  console.log(`\n┌${'─'.repeat(76)}┐`);
  console.log(`│ TEST ${index + 1}: ${testCase.name.padEnd(67)}│`);
  console.log(`└${'─'.repeat(76)}┘`);
  
  console.log(`\n📋 Claim Details:`);
  console.log(`   Type: ${testCase.data.claimType} - ${testCase.data.claimSubtype}`);
  console.log(`   Customer: ${testCase.data.customerName}`);
  console.log(`   Email: ${testCase.data.customerEmail}`);
  console.log(`   Loss: $${testCase.data.estimatedLoss}`);
  console.log(`   Location: ${testCase.data.location}`);
  
  console.log(`\n🚀 Submitting claim...`);
  
  const result = await submitClaim(testCase.data);
  
  if (result.success) {
    console.log(`\n✅ SUCCESS!`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Claim Number: ${result.data.claimNumber || 'N/A'}`);
    console.log(`   Claim ID: ${result.data.claimId || 'N/A'}`);
    console.log(`   Priority: ${result.data.priority || 'N/A'}`);
    console.log(`   Assigned to: ${result.data.assignedAdjuster || 'N/A'}`);
    return { success: true, claimNumber: result.data.claimNumber };
  } else {
    console.log(`\n❌ FAILED!`);
    console.log(`   Status: ${result.status || 'Connection Error'}`);
    console.log(`   Error: ${result.error || result.data?.message || 'Unknown error'}`);
    return { success: false, error: result.error || result.data?.message };
  }
}

async function runAllTests() {
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Claims Endpoint: ${CLAIMS_ENDPOINT}`);
  console.log(`Total Tests: ${testClaims.length}\n`);
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testClaims.length; i++) {
    const result = await testClaim(testClaims[i], i);
    results.push({
      name: testClaims[i].name,
      ...result
    });
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Wait 1 second between tests
    if (i < testClaims.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Print summary
  console.log(`\n\n╔════════════════════════════════════════╗`);
  console.log(`║           TEST SUMMARY                 ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  
  console.log(`Total Tests: ${testClaims.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((successCount / testClaims.length) * 100).toFixed(1)}%\n`);
  
  if (successCount > 0) {
    console.log(`\n📊 Successful Claims:`);
    console.log(`${'─'.repeat(78)}`);
    results.filter(r => r.success).forEach(r => {
      console.log(`   ✅ ${r.name.padEnd(50)} ${r.claimNumber}`);
    });
  }
  
  if (failCount > 0) {
    console.log(`\n\n❌ Failed Claims:`);
    console.log(`${'─'.repeat(78)}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ❌ ${r.name.padEnd(50)}`);
      console.log(`      Error: ${r.error}`);
    });
  }
  
  // Provide SQL verification query
  if (successCount > 0) {
    const claimNumbers = results
      .filter(r => r.success && r.claimNumber)
      .map(r => `'${r.claimNumber}'`)
      .join(', ');
    
    console.log(`\n\n📋 SQL Verification Query:`);
    console.log(`${'─'.repeat(78)}`);
    console.log(`\nSELECT 
  CLAIM_NUMBER,
  CLAIM_TYPE,
  CUSTOMER_NAME,
  CUSTOMER_EMAIL,
  ESTIMATED_LOSS,
  STATUS,
  PRIORITY,
  TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED
FROM CLAIMS
WHERE CLAIM_NUMBER IN (${claimNumbers})
ORDER BY CREATED_AT DESC;\n`);
  }
  
  console.log(`\n${'═'.repeat(78)}\n`);
}

// ============================================================================
// RUN TESTS
// ============================================================================

console.log(`⏳ Starting tests in 2 seconds...`);
console.log(`   (Make sure your backend is running!)\n`);

setTimeout(() => {
  runAllTests().catch(error => {
    console.error('\n❌ Test suite failed:', error);
  });
}, 2000);
