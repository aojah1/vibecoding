// ============================================================================
// CLEAN END-TO-END TEST - API ONLY
// ============================================================================
// This test ONLY calls your backend API endpoints
// NO database code duplication - all DB logic stays in backend
// Uses /api/claims-chatbot to avoid conflict with server.js endpoint
// ============================================================================

import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
// Ensure fetch exists in Node environments without global fetch (Node < 18)
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = fetch;
}

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';
const CLAIMS_LIST_ENDPOINT = '/api/claims-chatbot';  // Chatbot-specific endpoint for listing
const CLAIMS_SUBMIT_ENDPOINT = '/api/claims/submit'; // Submit endpoint defined in backend

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message, details = null) {
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️' };
  console.log(`\n${icons[status]} ${status}: ${name}`);
  console.log(`   ${message}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, status, message, details });
  if (status === 'PASS') testResults.passed++;
  if (status === 'FAIL') testResults.failed++;
  if (status === 'WARN') testResults.warnings++;
}

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                    ║');
console.log('║              🚀 END-TO-END API TEST 🚀                            ║');
console.log('║                                                                    ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// TEST 1: Backend Health Check
// ============================================================================
async function test1_BackendHealth() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Backend Health Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const response = await fetch(`${BACKEND_URL}${CLAIMS_LIST_ENDPOINT}`);
    
    if (response.ok) {
      const data = await response.json();
      logTest(
        'Backend Health',
        'PASS',
        'Backend is running and accessible',
        `API returned ${data.count || 0} claims`
      );
      return data.count || 0;
    } else {
      logTest(
        'Backend Health',
        'FAIL',
        'Backend responded with error',
        `Status: ${response.status}`
      );
      return null;
    }
  } catch (error) {
    logTest(
      'Backend Health',
      'FAIL',
      'Cannot reach backend',
      'Make sure backend is running: npm start'
    );
    return null;
  }
}

// ============================================================================
// TEST 2: Submit Test Claim via API
// ============================================================================
async function test2_SubmitClaim() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Submit Test Claim via Chatbot API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const testClaim = {
    claimType: 'Auto',
    claimSubtype: 'Collision',
    incidentDate: '11/24/2024',
    incidentDescription: 'E2E API Test - Automated system verification claim',
    location: 'API Test City, IL',
    estimatedLoss: '7777',
    policyNumber: 'POL-E2E-API-TEST',
    customerName: 'E2E API Test User',
    customerEmail: 'e2e-api@test.com',
    customerPhone: '555-7777'
  };
  
  try {
    console.log('Submitting test claim via API...');
    const response = await fetch(`${BACKEND_URL}${CLAIMS_SUBMIT_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testClaim)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest(
        'Submit Claim',
        'PASS',
        'Successfully submitted test claim via API',
        `Claim Number: ${data.claimNumber}, Claim ID: ${data.claimId}`
      );
      return { claimNumber: data.claimNumber, claimId: data.claimId };
    } else {
      logTest(
        'Submit Claim',
        'FAIL',
        'Failed to submit claim',
        data.message || 'Unknown error'
      );
      return null;
    }
  } catch (error) {
    logTest(
      'Submit Claim',
      'FAIL',
      'Error submitting claim',
      error.message
    );
    return null;
  }
}

// ============================================================================
// TEST 3: Verify Claim in Portal API
// ============================================================================
async function test3_VerifyInPortalAPI(claimNumber) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Verify Claim in Portal API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!claimNumber) {
    logTest(
      'Verify in Portal API',
      'FAIL',
      'No claim number to verify',
      'Previous test failed'
    );
    return false;
  }
  
  try {
    console.log(`Checking if claim ${claimNumber} appears in portal API...`);
    
    // Wait 2 seconds for database commit
    console.log('Waiting 2 seconds for database commit...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch(`${BACKEND_URL}${CLAIMS_LIST_ENDPOINT}`);
    
    console.log('[DEBUG] Response status:', response.status);
    console.log('[DEBUG] Response ok:', response.ok);
    
    let data;
    try {
      const text = await response.text();
      console.log('[DEBUG] Response body:', text.substring(0, 200));
      data = JSON.parse(text);
    } catch (parseError) {
      logTest(
        'Verify in Portal API',
        'FAIL',
        'Invalid JSON response from API',
        `Parse error: ${parseError.message}`
      );
      return false;
    }
    
    if (response.ok && data.success) {
      const getClaimNumber = (c) => c.CLAIM_NUMBER || c.claim_number || c.claimNumber;
      const found = Array.isArray(data.claims) && data.claims.some(c => getClaimNumber(c) === claimNumber);
      
      if (found) {
        logTest(
          'Verify in Portal API',
          'PASS',
          'Test claim found in portal API!',
          `Total claims: ${data.count}, Test claim is visible`
        );
        return true;
      } else {
        logTest(
          'Verify in Portal API',
          'FAIL',
          'Test claim NOT found in portal API',
          'Backend may not be saving to database correctly'
        );
        return false;
      }
    } else {
      logTest(
        'Verify in Portal API',
        'FAIL',
        'Portal API error',
        `Status: ${response.status}, Message: ${data.message || 'No message'}, Error: ${data.error || 'No error details'}`
      );
      return false;
    }
  } catch (error) {
    logTest(
      'Verify in Portal API',
      'FAIL',
      'Cannot reach portal API',
      `${error.message} - Make sure backend is running`
    );
    return false;
  }
}

// ============================================================================
// TEST 4: Verify Claim Persistence (Second API Call)
// ============================================================================
async function test4_VerifyPersistence(claimNumber) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Verify Claim Persistence');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!claimNumber) {
    logTest(
      'Verify Persistence',
      'FAIL',
      'No claim number to verify',
      'Previous test failed'
    );
    return false;
  }
  
  try {
    console.log('Making second API call to verify claim persists...');
    
    // Wait another 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(`${BACKEND_URL}${CLAIMS_LIST_ENDPOINT}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      const getClaimNumber = (c) => c.CLAIM_NUMBER || c.claim_number || c.claimNumber;
      const claim = Array.isArray(data.claims) ? data.claims.find(c => getClaimNumber(c) === claimNumber) : null;
      
      if (claim) {
        const type = claim.CLAIM_TYPE || claim.claim_type || claim.claimType || 'Unknown';
        const amount = claim.ESTIMATED_LOSS || claim.estimated_loss || claim.claimAmount || '0';
        const status = claim.STATUS || claim.status || 'Unknown';
        logTest(
          'Verify Persistence',
          'PASS',
          'Claim persists in database!',
          `Type: ${type}, Amount: $${amount}, Status: ${status}`
        );
        return true;
      } else {
        logTest(
          'Verify Persistence',
          'FAIL',
          'Claim disappeared from database',
          'This indicates a database transaction/commit issue'
        );
        return false;
      }
    } else {
      logTest(
        'Verify Persistence',
        'FAIL',
        'Portal API error on second call',
        data.message || 'Unknown error'
      );
      return false;
    }
  } catch (error) {
    logTest(
      'Verify Persistence',
      'FAIL',
      'Error verifying persistence',
      error.message
    );
    return false;
  }
}

// ============================================================================
// TEST 5: Frontend Accessibility
// ============================================================================
async function test5_FrontendCheck() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Frontend Accessibility');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const response = await fetch(FRONTEND_URL);
    
    if (response.ok) {
      logTest(
        'Frontend Accessibility',
        'PASS',
        'Frontend is accessible',
        `URL: ${FRONTEND_URL}`
      );
      return true;
    } else {
      logTest(
        'Frontend Accessibility',
        'WARN',
        'Frontend responded with error',
        `Status: ${response.status}`
      );
      return false;
    }
  } catch (error) {
    logTest(
      'Frontend Accessibility',
      'WARN',
      'Frontend not accessible',
      'Make sure frontend is running: npm start'
    );
    return false;
  }
}

// ============================================================================
// TEST 6: Complete Data Flow Verification
// ============================================================================
async function test6_DataFlowVerification(claimNumber) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: End-to-End Data Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!claimNumber) {
    logTest(
      'Data Flow Verification',
      'FAIL',
      'Cannot verify data flow',
      'No claim to track'
    );
    return false;
  }
  
  console.log('Verifying complete data flow...');
  console.log('  API Submit → Backend → Database → Portal API');
  
  const tests = [
    testResults.tests.find(t => t.name === 'Submit Claim')?.status === 'PASS',
    testResults.tests.find(t => t.name === 'Verify in Portal API')?.status === 'PASS',
    testResults.tests.find(t => t.name === 'Verify Persistence')?.status === 'PASS'
  ];
  
  const allPassed = tests.every(t => t === true);
  
  if (allPassed) {
    logTest(
      'Data Flow Verification',
      'PASS',
      'Complete data flow verified!',
      'API → Backend → Database → Portal all working'
    );
    return true;
  } else {
    logTest(
      'Data Flow Verification',
      'WARN',
      'Data flow partially working',
      'Some components may need attention'
    );
    return false;
  }
}

// ============================================================================
// TEST 7: Claim Count Verification
// ============================================================================
async function test7_ClaimCountCheck(initialCount) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Claim Count Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const response = await fetch(`${BACKEND_URL}${CLAIMS_LIST_ENDPOINT}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      const currentCount = data.count;
      const expectedCount = initialCount + 1;
      
      if (currentCount === expectedCount) {
        logTest(
          'Claim Count Verification',
          'PASS',
          'Claim count increased correctly',
          `Was: ${initialCount}, Now: ${currentCount} (+1)`
        );
        return true;
      } else if (currentCount > initialCount) {
        logTest(
          'Claim Count Verification',
          'PASS',
          'Claim count increased',
          `Was: ${initialCount}, Now: ${currentCount} (+${currentCount - initialCount})`
        );
        return true;
      } else {
        logTest(
          'Claim Count Verification',
          'FAIL',
          'Claim count did not increase',
          `Was: ${initialCount}, Still: ${currentCount}`
        );
        return false;
      }
    } else {
      logTest(
        'Claim Count Verification',
        'FAIL',
        'Cannot fetch claim count',
        data.message || 'Unknown error'
      );
      return false;
    }
  } catch (error) {
    logTest(
      'Claim Count Verification',
      'FAIL',
      'Error checking claim count',
      error.message
    );
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  try {
    // Test 1: Check backend health and get initial count
    const initialCount = await test1_BackendHealth();
    
    if (initialCount === null) {
      console.error('\n❌ Backend is not running. Cannot continue tests.');
      console.error('Please start backend: cd backend && npm start\n');
      process.exit(1);
    }
    
    // Test 2: Submit a test claim
    const claimData = await test2_SubmitClaim();
    
    if (claimData) {
      // Test 3: Verify claim in portal API
      await test3_VerifyInPortalAPI(claimData.claimNumber);
      
      // Test 4: Verify claim persists
      await test4_VerifyPersistence(claimData.claimNumber);
      
      // Test 6: Data flow verification
      await test6_DataFlowVerification(claimData.claimNumber);
      
      // Test 7: Claim count verification
      await test7_ClaimCountCheck(initialCount);
    }
    
    // Test 5: Frontend check
    await test5_FrontendCheck();
    
    // Print Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`✅ PASSED:   ${testResults.passed}`);
    console.log(`❌ FAILED:   ${testResults.failed}`);
    console.log(`⚠️  WARNINGS: ${testResults.warnings}`);
    console.log(`\nTotal Tests: ${testResults.tests.length}\n`);
    
    if (testResults.failed === 0 && testResults.passed > 0) {
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║                                                                    ║');
      console.log('║              ✅ SYSTEM IS FULLY OPERATIONAL ✅                    ║');
      console.log('║                                                                    ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');
      
      if (claimData) {
        console.log('🎯 VERIFICATION STEPS:');
        console.log(`1. Open browser: ${FRONTEND_URL}`);
        console.log('2. Click on "Claims" tab');
        console.log(`3. Search for: ${claimData.claimNumber}`);
        console.log('4. Verify claim appears with correct details');
        console.log('5. Click claim card to see full details modal\n');
        
        console.log('📊 YOUR TEST CLAIM:');
        console.log(`   Claim Number: ${claimData.claimNumber}`);
        console.log(`   Claim ID: ${claimData.claimId}`);
        console.log(`   Type: Auto - Collision`);
        console.log(`   Amount: $7,777`);
        console.log(`   Location: API Test City, IL\n`);
      }
      
      process.exit(0);
    } else {
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║                                                                    ║');
      console.log('║              ⚠️  SYSTEM HAS ISSUES ⚠️                            ║');
      console.log('║                                                                    ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');
      
      console.log('📋 FAILED TESTS:');
      testResults.tests
        .filter(t => t.status === 'FAIL')
        .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
      
      if (testResults.failed > 0) {
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('   1. Check backend logs for errors');
        console.log('   2. Verify database connection in backend');
        console.log('   3. Ensure insertClaimToDatabase() is being called');
        console.log('   4. Check that initPool() and run() functions exist');
      }
      
      console.log('');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
