import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function submitTestClaim() {
  const testClaim = {
    claimType: 'Auto',
    claimSubtype: 'Collision',
    incidentDate: '11/24/2024',
    incidentDescription: 'UI Verify Test - Automated search verification claim',
    location: 'UI Test City, IL',
    estimatedLoss: '7777',
    policyNumber: 'POL-UI-SEARCH-TEST',
    customerName: 'UI Verify Test User',
    customerEmail: 'ui-verify@test.com',
    customerPhone: '555-9999'
  };

  const resp = await fetch(`${BACKEND_URL}/api/claims/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testClaim)
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(`Submit failed: ${data.message || 'unknown error'}`);
  }
  return { claimNumber: data.claimNumber, claimId: data.claimId };
}

async function pollApiForClaim(claimNumber, maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/claims-chatbot`);
      if (resp.ok) {
        const data = await resp.json();
        const claims = Array.isArray(data.claims) ? data.claims : [];
        const found = claims.some(c => (c.CLAIM_NUMBER || c.claim_number || c.claimNumber) === claimNumber);
        if (found) {
          console.log(`[Precheck] Claim ${claimNumber} is visible in /api/claims-chatbot`);
          return true;
        }
      } else {
        console.log(`[Precheck] API responded ${resp.status}, retrying...`);
      }
    } catch (e) {
      console.log(`[Precheck] Error calling API: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`[Precheck] Claim ${claimNumber} not visible in API within timeout`);
  return false;
}

async function verifyClaimsTabSearch(claimNumber) {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    console.log(`Navigating to ${FRONTEND_URL}...`);
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });

    // Click the "Claims" tab (button label contains "Claims")
    console.log('Switching to Claims tab...');
    await page.waitForSelector('nav.portal-nav', { timeout: 15000 });
    await page.$$eval('nav.portal-nav button', (buttons) => {
      const btn = buttons.find(b => (b.textContent || '').includes('Claims'));
      if (btn) btn.click();
      else throw new Error('Claims tab button not found');
    });

    // Wait for search-enabled ClaimsTab (components/ClaimsTab.jsx) to load
    // Look for the search input placeholder
    console.log('Waiting for search input...');
    await page.waitForSelector('input[placeholder^="Search by claim number"]', { timeout: 20000 });

    // Click Refresh button first to ensure we have most recent data
    try {
      await page.$$eval('button', (buttons) => {
        const btn = buttons.find(b => (b.textContent || '').trim() === 'Refresh');
        if (btn) btn.click();
      });
    } catch {}

    // Poll: type claim number, check results, refresh and retry if not found yet
    const maxAttempts = 15;
    let found = false;
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`Typing claim number into search (attempt ${i + 1}/${maxAttempts}): ${claimNumber}`);
      // Clear input
      await page.$eval('input[placeholder^="Search by claim number"]', el => { el.focus(); el.value = ''; });
      // Type query
      await page.type('input[placeholder^="Search by claim number"]', claimNumber);

      // Check if any card header contains the claim number
      found = await page.evaluate((text) => {
        const headers = Array.from(document.querySelectorAll('h3'));
        return headers.some((h) => (h.textContent || '').includes(text));
      }, claimNumber);

      if (found) {
        break;
      }

      console.log('Not found yet, clicking Refresh and retrying...');
      try {
        await page.$$eval('button', (buttons) => {
          const btn = buttons.find(b => (b.textContent || '').trim() === 'Refresh');
          if (btn) btn.click();
        });
      } catch {}
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (!found) {
      throw new Error('Claim not visible after retries');
    }

    // Optional: ensure exactly one card is visible after filter (best effort)
    const visibleCount = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div.bg-white.rounded-lg.shadow-sm.border'));
      return cards.length;
    });

    console.log('✅ UI VERIFY PASS: Claim found in Claims tab search');
    console.log(`   Claim Number: ${claimNumber}`);
    console.log(`   Visible cards (post-filter): ${visibleCount}`);

    await browser.close();
    return true;
  } catch (err) {
    console.error('❌ UI VERIFY FAIL:', err.message);
    try {
      await page.screenshot({ path: 'ui-verify-claims-tab-error.png', fullPage: true });
      console.log('Saved failure screenshot: ui-verify-claims-tab-error.png');
    } catch {}
    await browser.close();
    return false;
  }
}

(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('UI VERIFY: ClaimsTab Search Shows Saved Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1) Submit a test claim via API
    console.log('Submitting test claim via backend...');
    const { claimNumber, claimId } = await submitTestClaim();
    console.log('Submit success:', { claimNumber, claimId });

    // 2) Give backend/ORDS a brief moment
    console.log('Waiting 2 seconds for commit/visibility...');
    await new Promise((r) => setTimeout(r, 2000));

    // 2a) Poll API until the claim appears in /api/claims-chatbot before driving the UI
    const apiVisible = await pollApiForClaim(claimNumber, 60000);
    if (!apiVisible) {
      throw new Error(`Claim ${claimNumber} not visible in API within 60s`);
    }

    // 3) Verify UI search can find the claim
    const ok = await verifyClaimsTabSearch(claimNumber);
    if (!ok) process.exit(1);

    console.log('\n🎉 COMPLETE: UI ClaimsTab search successfully found the newly saved claim.');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    process.exit(1);
  }
})();
