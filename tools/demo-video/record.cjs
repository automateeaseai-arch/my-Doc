// Records the myDoc demo video: drives the live demo page (phone app + smartwatch side by side)
// through the story, with captions. Usage: node record.cjs <base url> <output dir> [stub]
// "stub" replaces the map services with stand-ins (for machines that cannot reach them).
const { chromium } = require('playwright');
const fs = require('fs');
const [base, outDir, stub] = process.argv.slice(2);
const W = 1280, H = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: outDir, size: { width: W, height: H } },
    geolocation: { latitude: 6.5962, longitude: 3.3478 }, permissions: ['geolocation'], locale: 'en-GB', timezoneId: 'Africa/Lagos'
  });
  if (stub) {
    const tile = fs.readFileSync(stub);
    await ctx.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ body: tile, contentType: 'image/png' }));
    await ctx.route(/routing\.openstreetmap\.de|project-osrm/, (r) => { const [a, b, c, d] = r.request().url().match(/(-?[\d.]+),(-?[\d.]+);(-?[\d.]+),(-?[\d.]+)/).slice(1).map(Number); r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ routes: [{ distance: 900, duration: 700, geometry: { coordinates: [[a, b], [a, (b + d) / 2], [(a + c) / 2, (b + d) / 2], [c, d]] } }] }) }); });
    await ctx.route(/nominatim|photon/, (r) => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ address: { road: 'Opebi Road', suburb: 'Ikeja', city: 'Lagos' } }) }));
  }
  const page = await ctx.newPage();
  const t0 = Date.now(), marks = [];
  const mark = (name) => marks.push([name, ((Date.now() - t0) / 1000).toFixed(1)]);
  page.on('pageerror', (e) => console.log('page error:', e.message));

  // ---- stage: captions, title cards, click rings (drawn on the top page) --------------------
  const dress = async (hideDemo) => {
    await page.addStyleTag({ content: `
      ${hideDemo ? `main { max-width: none !important; padding: 8px 40px 0 !important; } .logo, h1, main > p, .links, main > .card, .narrow, .device small { display: none !important; }
      .stage { display: flex !important; margin: 0 !important; gap: 36px !important; } .device h2 { margin: 2px 0 0 !important; font-size: 13px !important; } iframe { height: 596px !important; }
      .device.phone { flex: 0 0 400px !important; }` : ''}
      #cap { position: fixed; left: 0; right: 0; bottom: 0; height: 78px; z-index: 99998; background: #14202B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 60px; font: 600 21px/1.35 Poppins, system-ui, sans-serif; }
      #card { position: fixed; inset: 0; z-index: 99999; background: #0B7A75; color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; padding: 0 120px; font-family: Poppins, system-ui, sans-serif; transition: opacity 0.5s; }
      #card .l { font-family: 'Kaushan Script', cursive; font-size: 84px; line-height: 1; } #card .t { font-size: 30px; font-weight: 700; line-height: 1.3; } #card .s { font-size: 19px; font-weight: 400; opacity: 0.92; line-height: 1.5; }
      .ring { position: fixed; z-index: 99997; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 22px; border: 4px solid #D62839; background: rgba(214,40,57,0.18); pointer-events: none; animation: ring 0.7s ease-out forwards; }
      @keyframes ring { from { transform: scale(0.4); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }` });
    await page.evaluate(() => { if (!document.getElementById('cap')) { const c = document.createElement('div'); c.id = 'cap'; document.body.appendChild(c); } });
  };
  const cap = (text) => page.evaluate((t) => { document.getElementById('cap').textContent = t; }, text);
  const card = async (l, t, s2, ms) => {
    await page.evaluate(([l, t, s2]) => { let c = document.getElementById('card'); if (!c) { c = document.createElement('div'); c.id = 'card'; document.body.appendChild(c); }
      c.style.opacity = 1; c.style.display = 'flex'; c.innerHTML = ''; for (const [cls, txt] of [['l', l], ['t', t], ['s', s2]]) if (txt) { const d = document.createElement('div'); d.className = cls; d.textContent = txt; c.appendChild(d); } }, [l, t, s2]);
    await sleep(ms);
  };
  const uncard = async () => { await page.evaluate(() => { const c = document.getElementById('card'); if (c) c.style.opacity = 0; }); await sleep(550); await page.evaluate(() => { const c = document.getElementById('card'); if (c) c.style.display = 'none'; }); };
  // show where the "finger" presses, then press
  const tap = async (loc, after = 700) => {
    await loc.first().scrollIntoViewIfNeeded(); await sleep(350);
    const b = await loc.first().boundingBox();
    if (b) await page.evaluate(([x, y]) => { const r = document.createElement('div'); r.className = 'ring'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 800); }, [b.x + b.width / 2, b.y + b.height / 2]);
    await sleep(380); await loc.first().click(); await sleep(after);
  };
  const type = async (loc, text) => { await loc.click(); await loc.pressSequentially(text, { delay: 55 }); await sleep(250); };

  await page.goto(base + 'demo.html'); await dress(true);
  const A = page.frameLocator('iframe[title^="myDoc phone"]'), Wt = page.frameLocator('iframe[title^="myDoc smartwatch"]');
  const stamp = Date.now();

  // ---- 0. title -----------------------------------------------------------------------
  mark('title');
  await card('myDoc', 'Caring for them, even from afar', 'Team Nebula · Nigeria · Future Health Digital Innovation Challenge', 4000);
  await card('', 'High blood pressure and diabetes are leading, treatable causes of stroke and dementia.', 'Families often live far away, and find out only when it is an emergency.', 6000);
  await A.locator('text=Get started').waitFor({ timeout: 60000 }); await Wt.locator('[aria-label="myDoc. Tap to start"]').waitFor({ timeout: 60000 });
  await uncard();

  // ---- 1. set-up and consent ------------------------------------------------------------
  mark('setup');
  await cap('myDoc has two parts: a phone app for the family, and a smartwatch for the patient (simulated here).'); await sleep(4200);
  await cap('The patient sets up the watch. A recovery code keeps their history safe if the watch is lost.');
  await tap(Wt.locator('[aria-label="myDoc. Tap to start"]')); await tap(Wt.locator('text=QUICK DEMO'), 300);
  await Wt.locator("text=I'VE WRITTEN IT DOWN").waitFor({ timeout: 40000 }); await sleep(2200); await tap(Wt.locator("text=I'VE WRITTEN IT DOWN"), 1200);
  await cap('A caregiver creates an account on the phone app.');
  await tap(A.locator('text=Get started'));
  await type(A.locator('#su-name'), 'Chinedu'); await type(A.locator('#su-email'), `test+video${stamp}@mydoc-test.dev`); await type(A.locator('#su-pw'), 'secret-' + stamp);
  await tap(A.locator('button[type=submit]'), 300); await A.locator('#ab-phone').waitFor({ timeout: 40000 });
  await type(A.locator('#ab-phone'), '0809 123 4567'); await tap(A.locator('button:has-text("Next")'), 300); await A.locator('#dg0').waitFor({ timeout: 30000 });
  await cap('Consent first: the patient shows a code on their watch…');
  await tap(Wt.locator('[aria-label="Settings"]')); await tap(Wt.locator('text=PAIR WITH A CAREGIVER'), 300);
  await page.waitForFunction(() => true); let code = '';
  for (let i = 0; i < 60 && !/^\d{6}$/.test(code); i++) { code = ((await Wt.locator('[aria-label^="Linking code"]').getAttribute('aria-label')) || '').replace(/\D/g, ''); await sleep(500); }
  await sleep(900);
  for (let k = 0; k < 6; k++) { await A.locator('#dg' + k).fill(code[k]); await sleep(170); }
  await tap(A.locator('text=Send request'), 300);
  await Wt.locator('text=TO SEE YOUR HEALTH?').waitFor({ timeout: 30000 });
  await cap('…and approves each caregiver on the watch. They can remove anyone at any time.'); await sleep(3000);
  await tap(Wt.locator('button:text-is("YES")'), 300);
  await A.locator('text=Go to home').waitFor({ timeout: 40000 }); await sleep(1200); await tap(A.locator('text=Go to home'), 300);
  await A.locator('main >> text=Mama Nkechi').first().waitFor({ timeout: 40000 });

  // ---- 2. live vitals and an alert ---------------------------------------------------------
  mark('vitals');
  await cap('Now the family sees blood sugar, blood pressure, heart rate and oxygen, live.'); await sleep(3200);
  await tap(A.locator('main >> text=Mama Nkechi').first(), 300); await A.locator('text=Health parameters').waitFor({ timeout: 20000 }); await sleep(2600);
  await cap('When a reading is out of range, every caregiver is alerted at once, even if the app is closed.');
  await tap(Wt.locator('button:text-is("BP high")'), 300);
  await A.locator('text=Blood pressure is high').first().waitFor({ timeout: 30000 }); await sleep(4200);

  // ---- 3. AI early warning ------------------------------------------------------------------
  mark('ai');
  await cap('AI early warning: the watch learns each person\'s own normal…');
  await tap(Wt.locator('button:text-is("Sugar creeping up")'), 300);
  await A.locator('text=Sugar rising').first().waitFor({ timeout: 90000 });
  await cap('…and warns the family days early. Here every sugar reading is still normal, but it has risen all week.');
  await A.locator('section[aria-label="Early warning (AI)"]').scrollIntoViewIfNeeded(); await sleep(6500);
  await cap('Each warning explains why, and shows the forecast. Decision support for families and doctors.'); await sleep(5000);

  // ---- 4. wandering -----------------------------------------------------------------------
  mark('wander');
  await cap('For dementia: a safe zone around home. Mama Nkechi starts to wander…');
  await tap(Wt.locator('button:text-is("Start wandering")'), 300);
  await A.locator('text=Outside the safe zone').first().waitFor({ timeout: 120000 });
  await cap('…and the family gets an urgent alert the moment she leaves it.'); await sleep(2600);
  await tap(A.locator('text=Outside the safe zone').first(), 300);
  await A.locator('.md-map-pin').waitFor({ timeout: 40000 });
  await cap('A live map shows where she is, the path she took, and the way to her.'); await sleep(9000);
  await cap('"Navigate" opens turn-by-turn directions to find her.');
  const nav = A.locator('a:has-text("Navigate to")'); await nav.scrollIntoViewIfNeeded(); await sleep(4200);
  await tap(Wt.locator('button:text-is("Stop walking")'), 500).catch(() => {});

  // ---- 5. doctor report -------------------------------------------------------------------
  mark('report');
  await tap(A.locator('[aria-label="Back"]'), 300); await A.locator('text=Health parameters').waitFor({ timeout: 20000 });
  await cap('Before a clinic visit: a two-week report with graphs, shared with the doctor as a PDF.');
  await tap(A.locator('text=Doctor report').first(), 300);
  await A.locator('section[aria-label="Blood sugar"]').waitFor({ timeout: 40000 }); await sleep(3000);
  await A.locator('section[aria-label="Blood pressure"]').scrollIntoViewIfNeeded(); await sleep(2600);
  await A.locator('section[aria-label="Heart rate"]').scrollIntoViewIfNeeded(); await sleep(2400);

  // ---- 6. sensor lab ---------------------------------------------------------------------
  mark('lab');
  await page.goto(base + 'lab.html'); await dress(false);
  await cap('Research track: software for a future optical sensor that estimates blood sugar without a needle.');
  await page.locator('text=≈').first().waitFor({ timeout: 60000 }); await sleep(5200);
  await cap('Experimental, tested on simulated data. It needs hardware and a clinical study: that is our next step.');
  await page.locator('#h-cal').scrollIntoViewIfNeeded(); await sleep(5200);

  // ---- 7. end -----------------------------------------------------------------------------
  mark('end');
  await card('myDoc', 'A working prototype today. Ready for a pilot with real watches and patients.', 'Team Nebula · Dr Nkwor Nkem Victor · Dr Abone Nkejah Kindson', 6000);
  mark('stop');
  const video = page.video();
  await ctx.close(); await browser.close();
  fs.renameSync(await video.path(), outDir + '/raw.webm');
  fs.writeFileSync(outDir + '/marks.json', JSON.stringify(marks));
  console.log(marks.map(([n, t]) => n + ' ' + t + 's').join(' · '));
})().catch((e) => { console.error('RECORDING FAILED:', e.message.split('\n')[0]); process.exit(1); });
