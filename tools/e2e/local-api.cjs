// The local API (1.19.5): Settings → Other apps and devices turns it on and shows its address;
// a pairing code pairs a device from outside the app; the paired device shows a verse, puts
// one in Next and takes it, goes forward, clears and shows the logo; events stream out; a
// read-only device can't control; Remove ends a device's key; Bonjour answers for
// _voiceverses._tcp; turning it off stops the API but leaves the network screens alone.
const dgram = require('dgram');
const { OUT, launch, check, done } = require('./lib.cjs');

const PORT = 47187;

(async () => {
  const { app, win, errors } = await launch('local-api');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate((port) => {
    localStorage.setItem('voice-verses-guide-voice', 'off');
    localStorage.setItem('voice-verses-network', JSON.stringify({ enabled: false, port }));
  }, PORT);
  await win.waitForTimeout(1500);
  const base = `http://127.0.0.1:${PORT}/api/v1`;
  const call = async (path, { method = 'GET', key, body } = {}) => {
    const res = await fetch(base + path, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const lastLive = () => win.evaluate(() => window.__voiceVersesBus.recent().filter((e) => e.name === 'live.changed').at(-1)?.data);

  check('off by default: nothing answers', await call('').then(() => false, () => true));

  // Turn it on in Settings
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="devices"]').click();
  await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/local-api-1-off.png` });
  await win.locator('#api-switch').click();
  await win.waitForTimeout(1200);
  const address = (await win.locator('[data-api-address]').innerText()).trim();
  check('turned on, it shows its address on the church network', new RegExp(`^http://[\\d.]+:${PORT}/api/v1$`).test(address), address);
  const about = await call('');
  check('the API answers', about.status === 200 && about.json.name === 'Voice Verses' && about.json.api === '1');
  check('…and its description', (await call('/openapi.json')).json?.openapi === '3.1.0');
  check('without pairing, nothing else', (await call('/live')).status === 401);
  check('the network screens stay off', (await fetch(`http://127.0.0.1:${PORT}/live`)).status === 404);

  // Pair a device that may control
  await win.locator('[data-api-pair-start]').click();
  await win.waitForTimeout(600);
  const code = (await win.locator('[data-api-code] .code').innerText()).replace(/\D/g, '');
  check('a six-digit pairing code shows', /^\d{6}$/.test(code), code);
  await win.screenshot({ path: `${OUT}/local-api-2-code.png` });
  const paired = await call('/pair', { method: 'POST', body: { code, name: 'Stream Deck' } });
  check('the device pairs with it', paired.status === 201 && paired.json.device.scopes.join() === 'read,control', JSON.stringify(paired.json));
  const key = paired.json.key;
  await win.waitForTimeout(800);
  check('Settings lists it, and the code is gone', (await win.locator('[data-api-device="Stream Deck"]').count()) === 1 && (await win.locator('[data-api-code]').count()) === 0);
  await win.screenshot({ path: `${OUT}/local-api-3-paired.png` });
  check('the modules are there', (await call('/modules', { key })).json?.modules?.some((m) => m.id === 'api'));

  // Follow events while controlling
  const stream = await fetch(`${base}/events?types=live.*&key=${encodeURIComponent(key)}`);
  const reader = stream.body.getReader();
  let streamed = '';
  (async () => {
    for (;;) {
      const { value, done: end } = await reader.read().catch(() => ({ done: true }));
      if (end) break;
      streamed += Buffer.from(value).toString();
    }
  })();

  // Control the live screen from outside (close Settings first, as an operator would)
  await win.keyboard.press('Escape');
  await win.waitForTimeout(600);
  const shown = await call('/live/show', { method: 'POST', key, body: { reference: 'John 3:16' } });
  await win.waitForTimeout(500);
  check('show puts a verse on the screens', shown.status === 200 && (await lastLive())?.reference === 'John 3:16', JSON.stringify(shown.json));
  const unknown = await call('/live/show', { method: 'POST', key, body: { reference: 'Hezekiah 9:9' } });
  check('a reference that doesn’t exist is refused in plain words', unknown.status === 404 && /Couldn’t find/.test(unknown.json.error.message), JSON.stringify(unknown.json));
  const next = await call('/live/next', { method: 'POST', key, body: { reference: 'Romans 8:28' } });
  await win.waitForTimeout(600);
  const nextEvent = await win.evaluate(() => window.__voiceVersesBus.recent().filter((e) => e.name === 'next.changed').at(-1)?.data);
  check('next puts a verse in Next, not on the screens', next.status === 200 && nextEvent?.reference === 'Romans 8:28' && (await lastLive())?.reference === 'John 3:16');
  const take = await call('/live/take', { method: 'POST', key });
  await win.waitForTimeout(500);
  check('take takes it live', take.status === 200 && (await lastLive())?.reference === 'Romans 8:28', JSON.stringify(take.json));
  await call('/live/advance', { method: 'POST', key });
  await win.waitForTimeout(500);
  check('advance goes to the next verse', (await lastLive())?.reference === 'Romans 8:29');
  await call('/live/clear', { method: 'POST', key });
  await win.waitForTimeout(400);
  check('clear clears', (await lastLive())?.kind === 'clear');
  await call('/live/logo', { method: 'POST', key });
  await win.waitForTimeout(400);
  check('logo shows the logo', (await lastLive())?.kind === 'logo');
  check('GET /live agrees', (await call('/live', { key })).json?.live?.kind === 'logo');
  await win.waitForTimeout(300);
  check('the event stream carried every change', ['John 3:16', 'Romans 8:28', 'Romans 8:29'].every((r) => streamed.includes(`"reference":"${r}"`)) && streamed.includes('"kind":"logo"') && !streamed.includes('next.changed'));
  check('services are listed', Array.isArray((await call('/services', { key })).json?.services));

  // A read-only device
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="devices"]').click();
  await win.waitForTimeout(600);
  await win.locator('[role="switch"][aria-label="Allow it to control the screens"]').click();
  await win.locator('[data-api-pair-start]').click();
  await win.waitForTimeout(500);
  const code2 = (await win.locator('[data-api-code] .code').innerText()).replace(/\D/g, '');
  const phone = await call('/pair', { method: 'POST', body: { code: code2, name: 'Phone' } });
  check('a device paired without control can only see', phone.json?.device?.scopes.join() === 'read');
  check('…so it can’t take', (await call('/live/take', { method: 'POST', key: phone.json.key })).status === 403);

  // Bonjour
  const found = await new Promise((resolve) => {
    const s = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const q = Buffer.concat([Buffer.alloc(12), Buffer.from([12]), Buffer.from('_voiceverses'), Buffer.from([4]), Buffer.from('_tcp'), Buffer.from([5]), Buffer.from('local'), Buffer.from([0, 0, 12, 0, 1])]);
    q.writeUInt16BE(1, 4);
    s.on('message', (m) => {
      // An answer (records > 0) naming our service and carrying this port in its SRV record
      const port = Buffer.alloc(2);
      port.writeUInt16BE(PORT);
      if (m.includes(Buffer.from('_voiceverses')) && m.readUInt16BE(6) > 0 && m.includes(port)) {
        s.close();
        resolve(true);
      }
    });
    s.bind(0, () => s.send(q, 5353, '224.0.0.251'));
    setTimeout(() => {
      try {
        s.close();
      } catch {}
      resolve(false);
    }, 2500);
  });
  check('Bonjour answers for _voiceverses._tcp', found);

  // Remove the first device
  await win.locator('[data-api-device="Stream Deck"] button:has-text("Remove")').click();
  await win.waitForTimeout(600);
  check('Remove ends its key', (await call('/me', { key })).status === 401);
  check('…and its event stream', await Promise.race([reader.closed.then(() => true, () => true), new Promise((r) => setTimeout(() => r(streamed.length > 0), 1500))]));
  check('the phone still works', (await call('/me', { key: phone.json.key })).status === 200);

  // Off
  await win.locator('#api-switch').click();
  await win.waitForTimeout(800);
  check('turned off, nothing answers', await call('').then(() => false, () => true));
  await win.screenshot({ path: `${OUT}/local-api-4-off-again.png` });
  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})();
