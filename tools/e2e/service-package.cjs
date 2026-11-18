// The service package (1.19.6): a paired app sends one over the network and it becomes today's
// service (with a message to the operator); its sermon holds the scriptures expected, and
// loading them puts the first in Next; the same package again updates it; the service goes
// back out as a package; and a package saved as a file is imported on the Services page.
const fs = require('fs');
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');

const PORT = 47188;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

(async () => {
  const { app, win, errors } = await launch('service-package');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.evaluate((port) => {
    localStorage.setItem('voice-verses-guide-voice', 'off');
    localStorage.setItem('voice-verses-network', JSON.stringify({ enabled: false, port }));
    localStorage.setItem('voice-verses-api', JSON.stringify({ enabled: true }));
  }, PORT);
  await win.reload();
  await win.waitForTimeout(3500);
  const base = `http://127.0.0.1:${PORT}/api/v1`;
  const call = async (p, { method = 'GET', key, body } = {}) => {
    const res = await fetch(base + p, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  check('the API turned itself back on at start', (await call('')).status === 200);

  // Pair an app that may send in services
  const code = await win.evaluate(async () => (await window.voiceVerses.api.startPairing(['read', 'write'])).pairing.code);
  const key = (await call('/pair', { method: 'POST', body: { code, name: 'CCCG Dashboard' } })).json?.key;
  check('an app paired to send in services', typeof key === 'string');

  const example = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/api/examples/sunday-package.json'), 'utf8'));
  const pkg = { ...example, id: 'e2e-sunday', service: { ...example.service, name: 'Package Sunday', date: today(), time: '00:01' } };
  const sent = await call('/packages', { method: 'POST', key, body: pkg });
  check('the package becomes a new service', sent.status === 201 && sent.json.created && sent.json.warnings.length === 0, JSON.stringify(sent.json));
  const library = await win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const q = r.result.transaction('media').objectStore('media').getAll();
          q.onsuccess = () => res(q.result.filter((m) => m.type === 'song').map((m) => m.name));
        };
      }),
  );
  check('its songs are in the library once each (the sample hymns aren’t added twice)', ['Amazing Grace', 'Holy, Holy, Holy'].every((t) => library.filter((n) => n === t).length === 1), library.join(', '));
  await win.waitForTimeout(600);
  check('the operator is told it arrived', (await win.getByText('Package Sunday arrived from CCCG Dashboard').count()) === 1);
  await win.screenshot({ path: `${OUT}/service-package-1-arrived.png` });
  const listed = (await call(`/services?date=${today()}`, { key })).json?.services ?? [];
  check('it is one of today’s services', listed.some((s) => s.name === 'Package Sunday' && s.parts.length === 6));

  // On the live screen
  await win.reload();
  await win.waitForTimeout(3500);
  // With other services today, pick it; alone, it is chosen already
  const picker = win.getByRole('radiogroup', { name: "Today's services" });
  if (await picker.count()) await picker.getByRole('radio', { name: /Package Sunday/ }).click();
  await win.waitForTimeout(900);
  check('it is the service on the live screen', /Package Sunday/.test(await win.locator('header').first().innerText()), (await win.locator('header').first().innerText()).slice(0, 80));
  const parts = await win.locator('nav[aria-label="Order of service"] button').allTextContents();
  check('its order is on the live screen', ['Amazing Grace', 'Scripture', 'Youth night'].every((n) => parts.some((p) => p.includes(n))), parts.join(' | ').slice(0, 200));
  await win.locator('nav[aria-label="Order of service"] button[title*="Scripture"]').first().click();
  await win.waitForTimeout(1200);
  const next = await win.evaluate(() => window.__voiceVersesBus.recent().filter((e) => e.name === 'next.changed').at(-1)?.data);
  check('loading the sermon’s scriptures puts the first in Next', next?.title === 'John 3:16' || next?.reference === 'John 3:16', JSON.stringify(next));
  const strip = await win.locator('section[aria-label="Slides"] [role="listitem"]').allTextContents();
  check('…and all five verses are in the strip', strip.length === 5 && /Romans 5:8/.test(strip.join(' ')) && /Titus 2:11/.test(strip.join(' ')), `${strip.length}: ${strip.join(' | ').slice(0, 160)}`);
  await win.screenshot({ path: `${OUT}/service-package-2-sermon.png` });

  // Again: updates it
  const again = await call('/packages', { method: 'POST', key, body: { ...pkg, service: { ...pkg.service, name: 'Package Sunday (new time)', time: '00:02' } } });
  check('the same package again updates that service', again.status === 200 && again.json.created === false && again.json.serviceId === sent.json.serviceId);

  // Back out
  const out = await call(`/services/${sent.json.serviceId}/package`, { key });
  check('the service goes back out as a package', out.status === 200 && out.json.order.some((p) => (p.scriptures ?? []).includes('Romans 5:8')) && out.json.songs.some((s) => s.title === 'Amazing Grace'));

  // From a file, on the Services page
  const file = path.join(OUT, 'midweek.json');
  fs.writeFileSync(file, JSON.stringify({ package: '1.0', service: { name: 'Midweek from a file', date: today(), time: '19:00' }, order: [{ part: 'Worship', songs: ['Amazing Grace'] }, { part: 'Bible study', scriptures: ['Psalm 23:1-3'] }] }));
  await win.evaluate(() => (location.hash = '#/service-planner'));
  await win.waitForTimeout(2000);
  await win.locator('input[type="file"]').first().setInputFiles(file);
  await win.waitForTimeout(1500);
  check('a package file is imported on the Services page', (await win.getByText('Added “Midweek from a file”').count()) === 1);
  check('…and says where each service came from', (await win.locator('[data-service-from]').allTextContents()).some((t) => /From a file/.test(t)) && (await win.locator('[data-service-from]').allTextContents()).some((t) => /From CCCG Dashboard/.test(t)));
  await win.screenshot({ path: `${OUT}/service-package-3-services.png` });

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
