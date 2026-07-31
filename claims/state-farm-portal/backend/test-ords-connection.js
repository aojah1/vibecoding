// ============================================================================
// ORDS DIAGNOSTIC TEST
// ============================================================================
// Run this to test your ORDS connection
// Usage: node test-ords-connection.js
// ============================================================================
import dotenv from "dotenv";
dotenv.config();

const ORDS_BASE_URL = process.env.ORDS_BASE_URL;

console.log('\n╔════════════════════════════════════════╗');
console.log('║  🔍 ORDS CONNECTION TEST              ║');
console.log('╚════════════════════════════════════════╝\n');

async function testORDS() {
  console.log('Testing ORDS endpoint...');
  console.log('URL:', `${ORDS_BASE_URL}/claims/`);
  console.log('');

  // Test 1: GET request
  console.log('TEST 1: GET /claims/ (should return list of claims)');
  console.log('─────────────────────────────────────────────────');
  try {
    const response = await fetch(`${ORDS_BASE_URL}/claims/`);
    //console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ GET request successful!');
      
    } else {
      console.log('❌ GET request failed');
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Connection failed');
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 2: POST request
  console.log('TEST 2: POST /claims/ (submit test claim)');
  console.log('─────────────────────────────────────────────────');
  
  const testPayload = {
    claim_id: 'TEST123',
    claim_number: 'CLM-TEST-999999',
    policy_id: 'POL-TEST',
    customer_id: 'CUST-TEST',
    claim_type: 'Auto',
    claim_subtype: 'Collision',
    peril_code: 'COLLISION',
    incident_date: '11/23/2024',
    incident_description: 'Test claim',
    location: 'Test City',
    status: 'Pending',
    priority: 'Low',
    assigned_adjuster_id: 'ADJ001',
    estimated_loss: 1000,
    ai_confidence_score: 0.95,
    customer_name: 'Test User',
    customer_email: 'test@example.com',
    customer_phone: '555-0000'
  };

  // console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    const response = await fetch(`${ORDS_BASE_URL}/claims/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    //console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ POST request successful!');
      //console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ POST request failed');
      //const errorText = await response.text();
      console.log('Error:', errorText);
      
      if (response.status === 404) {
        console.log('\n💡 TIP: POST endpoint might not be enabled in ORDS');
        console.log('   Solution: Enable POST method for claims table in ORDS');
      }
    }
  } catch (error) {
    console.log('❌ Connection failed');
    console.log('Error:', error.message);
  }
  console.log('');

  console.log('╔════════════════════════════════════════╗');
  console.log('║  📊 DIAGNOSTIC COMPLETE               ║');
  console.log('╚════════════════════════════════════════╝');
}

testORDS();
