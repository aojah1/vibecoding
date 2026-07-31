// ============================================================================
// DEBUG TEST - Shows exactly what's being sent and received
// ============================================================================
// Usage: node test-debug.js
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

let BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
let CLAIMS_ENDPOINT;

if (BACKEND_URL.includes('/api/claims/submit')) {
  CLAIMS_ENDPOINT = BACKEND_URL;
  BACKEND_URL = BACKEND_URL.replace('/api/claims/submit', '');
} else {
  CLAIMS_ENDPOINT = `${BACKEND_URL}/api/claims/submit`;
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║    🔍 DEBUG TEST                      ║');
console.log('╚════════════════════════════════════════╝\n');

const testClaim = {
  claimType: 'Auto',
  claimSubtype: 'Collision',
  incidentDate: '11/24/2024',
  incidentDescription: 'Test claim - debugging',
  location: '123 Test Street, Chicago, IL',
  estimatedLoss: '5000',
  policyNumber: 'POL-TEST-001',
  customerName: 'Test User',
  customerEmail: 'test@example.com',
  customerPhone: '555-0100'
};

async function debugTest() {
  console.log('Backend URL:', BACKEND_URL);
  console.log('Endpoint:', CLAIMS_ENDPOINT);
  console.log('');
  
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testClaim, null, 2));
  console.log('');
  
  try {
    console.log('🚀 Sending request...\n');
    
    // Try with FormData
    console.log('METHOD 1: Using FormData (multipart/form-data)');
    console.log('─────────────────────────────────────────────────');
    
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    Object.keys(testClaim).forEach(key => {
      formData.append(key, testClaim[key]);
      console.log(`   Appending: ${key} = ${testClaim[key]}`);
    });
    
    console.log('\nFormData headers:', formData.getHeaders());
    console.log('');

    const response = await fetch(CLAIMS_ENDPOINT, {
      method: 'POST',
      body: formData
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('');
    
    const responseText = await response.text();
    console.log('Response Body (raw):');
    console.log(responseText);
    console.log('');
    
    try {
      const result = JSON.parse(responseText);
      console.log('Response Body (parsed):');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
    
    if (response.ok) {
      console.log('\n✅ SUCCESS!');
    } else {
      console.log('\n❌ FAILED!');
      
      // Try to get more details
      console.log('\n💡 DEBUGGING INFO:');
      console.log('─────────────────────────────────────────────────');
      console.log('Check backend logs for:');
      console.log('   1. Which fields are actually missing');
      console.log('   2. How the data is being received');
      console.log('   3. Any console.error messages');
      console.log('');
      console.log('The backend should show something like:');
      console.log('   [Chatbot] Receiving new claim submission...');
      console.log('   [Chatbot] ❌ Missing required fields: [...]');
    }
    
  } catch (error) {
    console.log('\n❌ CONNECTION ERROR!');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
  
  // Now try with JSON (to compare)
  console.log('\n\n═══════════════════════════════════════════════════\n');
  console.log('METHOD 2: Using JSON (application/json)');
  console.log('─────────────────────────────────────────────────');
  console.log('(This might also fail, but helps debug)\n');
  
  try {
    const response2 = await fetch(CLAIMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testClaim)
    });
    
    console.log('Response Status:', response2.status, response2.statusText);
    const responseText2 = await response2.text();
    console.log('Response:', responseText2);
    
    if (response2.ok) {
      console.log('✅ JSON method worked!');
    } else {
      console.log('❌ JSON method also failed (expected with multer)');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║    DEBUG COMPLETE                      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nNext steps:');
  console.log('1. Check backend console for specific error messages');
  console.log('2. Look for which fields backend says are missing');
  console.log('3. Share backend output with me for further debugging');
  console.log('');
}

debugTest();
