#!/usr/bin/env node

// ============================================================================
// MANUAL PORTAL API TEST
// ============================================================================
// Run this to see exactly what's wrong with GET /api/claims-chatbot
// ============================================================================

const BACKEND_URL = 'http://localhost:3001';
const CLAIMS_ENDPOINT = '/api/claims-chatbot';

async function testPortalAPI() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🔍 PORTAL API MANUAL TEST            ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    console.log(`Testing: GET ${BACKEND_URL}${CLAIMS_ENDPOINT}\n`);
    
    const response = await fetch(`${BACKEND_URL}${CLAIMS_ENDPOINT}`);
    
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
    
    const text = await response.text();
    console.log('Response Body (first 500 chars):');
    console.log(text.substring(0, 500));
    console.log('');
    
    if (text.length > 500) {
      console.log(`... (${text.length} total characters)\n`);
    }
    
    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON:');
      console.log('  success:', data.success);
      console.log('  count:', data.count);
      console.log('  claims:', data.claims ? `${data.claims.length} claims` : 'undefined');
      
      if (data.claims && data.claims.length > 0) {
        console.log('\nFirst claim:');
        console.log(JSON.stringify(data.claims[0], null, 2).substring(0, 300));
      }
      
      if (data.error) {
        console.log('\n❌ API returned error:');
        console.log('  ', data.error);
      }
      
      if (data.message) {
        console.log('\n📝 API message:');
        console.log('  ', data.message);
      }
      
      if (data.success) {
        console.log('\n✅ API is working correctly!');
      } else {
        console.log('\n❌ API returned success: false');
      }
      
    } catch (parseError) {
      console.log('❌ Failed to parse JSON!');
      console.log('Parse error:', parseError.message);
      console.log('\nRaw response:');
      console.log(text);
    }
    
  } catch (error) {
    console.log('❌ Failed to reach backend!');
    console.log('Error:', error.message);
    console.log('\nIs backend running on port 3001?');
    console.log('Run: cd backend && npm start');
  }
  
  console.log('\n════════════════════════════════════════\n');
}

testPortalAPI();
