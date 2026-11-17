// Takes the screenshots for the user guide (docs/user-guide/), with numbered markers on the
// controls each step talks about. Run after a desktop build, under Xvfb on Linux:
//   ELECTRON_BUILD=true npx vite build
//   xvfb-run -a -s "-screen 0 3840x1600x24" node tools/guide/capture.cjs
// Pictures go to docs/user-guide/img/. Only sample services, KJV and public-domain hymns appear.
const fs = require('fs');
const path = require('path');
const { OUT, launch, plugInSecondDisplay } = require('../e2e/lib.cjs');

const IMG = path.resolve(__dirname, '../../docs/user-guide/img');
fs.mkdirSync(IMG, { recursive: true });
const audio = process.argv[2] || path.join(OUT, 'moments.wav');
const only = process.env.SHOTS ? new Set(process.env.SHOTS.split(',')) : null;
const missing = [];

/** A marker: a locator, its number, and which corner the number sits on. */
const m = (loc, n, pos = 'tl', outline = true) => ({ loc, n, pos, outline });

async function shot(win, name, marks = []) {
  if (only && !only.has(name)) return;
  const boxes = [];
  for (const k of marks) {
    const b = await k.loc
      .first()
      .boundingBox({ timeout: 2500 })
      .catch(() => null);
    if (!b) {
      missing.push(`${name} #${k.n}`);
      continue;
    }
    boxes.push({ ...b, n: k.n, pos: k.pos, outline: k.outline });
  }
  await win.evaluate((boxes) => {
    const root = document.createElement('div');
    root.id = 'vv-marks';
    root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    for (const b of boxes) {
      if (b.outline) {
        const o = document.createElement('div');
        o.style.cssText = `position:fixed;left:${b.x - 4}px;top:${b.y - 4}px;width:${b.width + 8}px;height:${b.height + 8}px;border:2.5px solid #ffb020;border-radius:10px;box-shadow:0 0 0 2px rgba(0,0,0,.35)`;
        root.append(o);
      }
      const r = 15;
      let cx = b.x - 2;
      let cy = b.y - 2;
      if (b.pos.includes('r')) cx = b.x + b.width + 2;
      if (b.pos.includes('b')) cy = b.y + b.height + 2;
      if (b.pos === 'l') [cx, cy] = [b.x - 2, b.y + b.height / 2];
      if (b.pos === 'r') [cx, cy] = [b.x + b.width + 2, b.y + b.height / 2];
      if (b.pos === 'c') [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
      cx = Math.min(Math.max(cx, r + 3), innerWidth - r - 3);
      cy = Math.min(Math.max(cy, r + 3), innerHeight - r - 3);
      const d = document.createElement('div');
      d.textContent = b.n;
      d.style.cssText = `position:fixed;left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:#ffb020;color:#1a1204;font:800 16px/30px -apple-system,Figtree,sans-serif;text-align:center;box-shadow:0 0 0 3px #fff,0 4px 10px rgba(0,0,0,.55)`;
      root.append(d);
    }
    document.body.append(root);
  }, boxes);
  await win.screenshot({ path: path.join(IMG, `${name}.jpg`), type: 'jpeg', quality: 82 });
  await win.evaluate(() => document.getElementById('vv-marks')?.remove());
  console.log('shot', name, boxes.length, 'marks');
}

const btn = (win, name) => win.getByRole('button', { name }).first();
const go = async (win, hash, ms = 1600) => {
  await win.evaluate((h) => (location.hash = h), hash);
  await win.waitForTimeout(ms);
};
const until = async (win, test, ms = 15000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await test().catch(() => false)) return true;
    await win.waitForTimeout(250);
  }
  return false;
};
const esc = async (win) => {
  await win.keyboard.press('Escape');
  await win.waitForTimeout(500);
};

(async () => {
  const { app, win } = await launch('guide', { audio, firstRun: true });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1440, height: 900 }));
  await plugInSecondDisplay(app);
  await win.evaluate(() => localStorage.setItem('voice-verses-guide-voice', 'off'));
  await win.waitForTimeout(1500);

  // ---- 1. Set up your booth ----
  const part = (p) => win.locator(`[data-setup-part="${p}"]`);
  await until(win, async () => (await part('sound').locator('[data-sound-found]').count()) > 0, 20000);
  await until(win, async () => (await part('propresenter').locator('[data-propresenter-found]').count()) > 0, 30000);
  await win.waitForTimeout(3500);
  await shot(win, 'setup-1-found', [
    m(part('sound'), 1),
    m(part('sound').locator('[data-setup-confirm]'), 2, 'tr'),
    m(part('screens'), 3),
    m(part('propresenter'), 4),
    m(part('services'), 5),
    m(win.locator('[data-setup-demo]'), 6, 'tr'),
    m(win.locator('[data-setup-later]'), 7, 'tr'),
  ]);
  await part('sound').locator('[data-setup-confirm]').click();
  await win.waitForTimeout(400);
  await part('screens').locator('[data-setup-confirm]').click();
  await win.waitForTimeout(1200);
  await part('propresenter').locator('[data-setup-no-propresenter]').click();
  await win.waitForTimeout(300);
  await part('services').locator('[data-church-type="Friday Night Prayers"]').click();
  await part('services').locator('[data-setup-confirm]').click();
  await win.waitForTimeout(500);
  await shot(win, 'setup-2-confirmed', [m(win.locator('[data-setup-demo]'), 1, 'tl'), m(win.locator('[data-setup-done]'), 2, 'tr')]);
  await win.locator('[data-setup-done]').click();
  await win.waitForTimeout(1500);

  // ---- 2. The live screen ----
  await shot(win, 'live-1-tour', [
    m(win.locator('header button').filter({ hasText: /Sunday Celebration/ }), 1, 'bl'),
    m(win.locator('[data-guide="listen"]'), 2, 'bl'),
    m(win.getByRole('group', { name: 'How verses go on screen' }), 3, 'bl'),
    m(win.locator('[data-booth-check]'), 4, 'br'),
    m(win.locator('[data-guide="search"]'), 5, 'br'),
    m(win.locator('[data-guide="settings"]'), 6, 'br'),
    m(win.locator('nav[aria-label="Order of service"] button[title*="Welcome"]').first(), 7, 'bl'),
    m(win.locator('[data-spirit-strip] > *').first(), 8, 'l'),
    m(win.getByRole('radiogroup').filter({ hasText: 'Waits in Next' }), 9, 'tl'),
    m(win.locator('[data-guide="live"]'), 10, 'tl'),
    m(win.locator('[data-guide="take"]'), 11, 'l'),
    m(win.locator('[data-guide="next"]'), 12, 'tl'),
  ]);
  await shot(win, 'live-2-welcome', [
    m(btn(win, /^Start listening$/).last(), 1, 'tl'),
    m(btn(win, /Watch the demo/), 2, 'tl'),
    m(btn(win, /Find a verse, song or item/), 3, 'tl'),
    m(win.locator('[data-open-training]'), 4, 'tr'),
    m(win.locator('[data-welcome] button[title^="Load"]').first(), 5, 'tl'),
    m(win.locator('[data-welcome]').getByRole('button', { name: 'John 3:16' }), 6, 'tl'),
  ]);

  // ---- 3. The narrated demo ----
  await btn(win, /Watch the demo/).click();
  await until(win, async () => /What Voice Verses hears/.test(await win.locator('[data-guide-narration]').innerText()), 15000);
  await win.waitForTimeout(1200);
  await shot(win, 'demo-1-heard', [m(win.locator('[data-guide-narration]'), 1, 'tr'), m(win.locator('[data-demo]'), 2, 'tl')]);
  await until(win, async () => /words light up/.test(await win.locator('[data-guide-narration]').innerText()), 30000);
  await win.waitForTimeout(2500);
  await shot(win, 'demo-2-reading', [
    m(win.locator('[data-guide="now"]'), 1, 'tl'),
    m(win.locator('[data-guide="heard"]'), 2, 'l'),
    m(win.locator('[data-guide="live"]'), 3, 'tl'),
    m(win.locator('[data-guide="next"]'), 4, 'tl'),
  ]);
  await until(win, async () => (await win.locator('[data-suggestion]').count()) > 0, 60000);
  await win.waitForTimeout(1500);
  await win.evaluate(() => window.dispatchEvent(new CustomEvent('voice-verses-narrate', { detail: null })));
  await win.waitForTimeout(300);
  await shot(win, 'demo-3-suggestion', [
    m(win.locator('[data-suggestion] [aria-label$="match"]'), 1, 'tl'),
    m(win.locator('[data-suggestion] [data-reason]'), 2, 'bl'),
    m(win.locator('[data-suggestion]').getByRole('button', { name: /Show now/ }), 3, 'tr'),
    m(win.locator('[data-suggestion]').getByRole('button', { name: /^Use/ }), 4, 'tr'),
  ]);
  await btn(win, /Stop the demo/).click().catch(() => {});
  await win.waitForTimeout(800);
  await esc(win);
  await win.reload();
  await win.waitForTimeout(3500);

  // ---- 4. A verse by hand ----
  await win.locator('[data-guide="search"]').click();
  await win.waitForTimeout(400);
  await win.locator('[cmdk-input]').fill('John 3:16');
  await win.waitForTimeout(600);
  await shot(win, 'verse-1-search', [m(win.locator('[cmdk-input]'), 1, 'tl'), m(win.getByRole('option', { name: /Show John 3:16/ }), 2, 'tl')]);
  await win.keyboard.press('Enter');
  await win.waitForTimeout(1500);
  await shot(win, 'verse-2-next', [
    m(win.locator('[data-guide="next"]'), 1, 'tl'),
    m(win.locator('[data-guide="take"]'), 2, 'l'),
    m(win.getByRole('radiogroup').filter({ hasText: 'Waits in Next' }), 3, 'tl'),
    m(win.locator('section[aria-label="Slides"], [data-guide="now"]').first(), 4, 'tl'),
  ]);
  await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(1500);
  await shot(win, 'verse-3-live', [
    m(win.locator('[data-guide="live"]'), 1, 'tl'),
    m(win.locator('[data-guide="clear"]'), 2, 'tr'),
    m(win.locator('[data-guide="logo"]'), 3, 'tl'),
    m(win.getByRole('button', { name: /KJV/ }).first(), 4, 'tr'),
  ]);
  await win.locator('[data-guide="clear"]').click();
  await win.waitForTimeout(600);

  // ---- 5. A song from the order of service ----
  await win.locator('nav[aria-label="Order of service"] button[title*="Holy, Holy, Holy"]').first().click();
  await win.waitForTimeout(1800);
  const tiles = win.locator('section[aria-label="Slides"] [role="listitem"]');
  await shot(win, 'song-1-strip', [
    m(win.locator('nav[aria-label="Order of service"] button[title*="Holy, Holy, Holy"]').first(), 1, 'bl'),
    m(tiles.nth(0), 2, 'tl'),
    m(win.locator('[data-guide="next"]'), 3, 'tl'),
    m(win.locator('[data-guide="take"]'), 4, 'l'),
    m(btn(win, /See all slides/), 5, 'tr'),
  ]);
  await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(1200);
  await tiles.nth(1).hover();
  await win.waitForTimeout(400);
  await shot(win, 'song-2-live', [
    m(tiles.nth(0), 1, 'tl'),
    m(tiles.nth(1), 2, 'tl'),
    m(tiles.nth(1).locator('button[title^="Quick edit"], button[aria-label^="Edit"]'), 3, 'tr'),
    m(btn(win, /^♪? ?Song$/), 4, 'bl'),
  ]);
  await tiles.nth(1).locator('button[title^="Quick edit"], button[aria-label^="Edit"]').first().click().catch(() => {});
  await win.waitForTimeout(900);
  await shot(win, 'song-3-quick-edit', [m(win.getByRole('dialog'), 1, 'tl')]);
  await esc(win);
  await btn(win, /See all slides/).click().catch(() => {});
  await win.waitForTimeout(900);
  await shot(win, 'song-4-grid', [m(btn(win, /Show the words large/), 1, 'tr')]);
  await btn(win, /Show the words large/).click().catch(() => {});
  await win.waitForTimeout(500);
  await win.locator('[data-guide="clear"]').click();

  // ---- 5b. The library drawer, Move on by time, and spirit's Not this ----
  await shot(win, 'live-3-more', [
    m(win.getByRole('button', { name: 'Library' }), 1, 'br'),
    m(win.getByRole('switch').filter({ hasText: 'Move on by time' }).first(), 2, 'bl'),
    m(win.locator('[data-spirit-pause]'), 3, 'bl'),
  ]);
  await win.getByRole('button', { name: 'Library' }).click();
  await win.waitForTimeout(900);
  await shot(win, 'live-4-library', [m(win.getByRole('tablist').first(), 1, 'bl')]);
  await esc(win);
  await win.locator('nav[aria-label="Order of service"] button[title*="Holy, Holy, Holy"]').first().click();
  await win.waitForTimeout(1200);
  const n = await tiles.count();
  // The last slide of a song going on screen gets the next song ready (spirit)
  await tiles.nth(n - 1).locator('button').first().click();
  await win.waitForTimeout(600);
  await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(1500);
  if (await win.locator('[data-not-this]').count()) {
    await win.locator('[data-not-this]').click();
    await win.waitForTimeout(500);
    await shot(win, 'live-5-not-this', [m(win.locator('[data-label-detail="next"]'), 1, 'tl'), m(win.locator('[data-not-this]'), 2, 'tr'), m(win.getByRole('button', { name: 'Wrong part' }), 3, 'bl')]);
    await esc(win);
  } else missing.push('live-5-not-this (no Not this)');

  // ---- 6. Countdown, alerts, booth check light ----
  await btn(win, /^Countdown$/).click();
  await win.waitForTimeout(800);
  const dlg = () => win.locator('[role="dialog"]').last();
  await shot(win, 'tools-1-countdown', [
    m(dlg().getByRole('button', { name: 'Before the service' }), 1, 'tl'),
    m(dlg().getByRole('button', { name: 'Length of time' }), 2, 'tl'),
    m(dlg().getByRole('textbox').first(), 3, 'tl'),
    m(dlg().getByText('All screens', { exact: true }), 4, 'tl'),
    m(dlg().getByRole('button', { name: '1 min left' }), 5, 'tl'),
    m(dlg().getByRole('button', { name: /^Start/ }), 6, 'tl'),
  ]);
  await esc(win);
  await btn(win, /^Alert$/).click();
  await win.waitForTimeout(800);
  await shot(win, 'tools-2-alert', [
    m(dlg().getByRole('button', { name: 'Nursery' }), 1, 'tl'),
    m(dlg().getByRole('button', { name: 'Five minutes' }), 2, 'tl'),
    m(dlg().locator('input').first(), 3, 'tl'),
    m(dlg().getByText('All screens', { exact: true }), 4, 'tl'),
    m(dlg().getByRole('button', { name: 'Until I clear it' }), 5, 'tl'),
    m(dlg().getByText('Amber', { exact: true }), 6, 'tl'),
  ]);
  await esc(win);
  await win.locator('[data-booth-check]').click();
  await win.waitForTimeout(900);
  await shot(win, 'tools-3-booth-check', [m(win.locator('[data-booth-check]'), 1, 'bl'), m(win.locator('[data-booth-check-list]'), 2, 'tl')]);
  await esc(win);

  // ---- 7. Settings ----
  /** A Settings page: its sidebar item is 1, then its first sections (or the marks given) */
  const pane = async (id, name, marks) => {
    await win.locator(`[data-pane="${id}"]`).click();
    await win.waitForTimeout(1300);
    const outline = await win.evaluate(() => ({
      sections: [...document.querySelectorAll('[data-settings] .st-main .st-section > header h3')].map((t) => t.textContent.trim()),
      rows: [...document.querySelectorAll('[data-settings] .st-main .st-row .t')].map((t) => t.textContent.trim()).slice(0, 24),
    }));
    console.log('OUTLINE', name, JSON.stringify(outline));
    const h3 = win.locator('[data-settings] .st-main .st-section > header h3');
    const auto = [];
    for (let i = 0; i < Math.min(3, outline.sections.length); i++) {
      const b = await h3.nth(i).boundingBox().catch(() => null);
      if (b && b.y > 80 && b.y < 820) auto.push(m(h3.nth(i), auto.length + 2, 'l', false));
    }
    await shot(win, name, [m(win.locator(`[data-pane="${id}"]`), 1, 'l'), ...(marks ?? auto)]);
  };
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(1200);
  await win.locator('[data-settings-booth]').click();
  await win.waitForTimeout(1500);
  await shot(win, 'settings-1-booth', [m(win.locator('[data-settings-booth]'), 1, 'l'), m(win.locator('[data-open-booth-setup]'), 2, 'tr')]);
  await pane('features', 'settings-2-features', [
    m(win.locator('[data-settings] .st-main').getByText('Recommended', { exact: true }).first(), 2, 'tl'),
    m(win.locator('[data-settings] .st-main [role="switch"]').first(), 3, 'tr'),
  ]);
  await pane('listening', 'settings-3-listening', [m(win.getByLabel('Input to listen to'), 2, 'tl'), m(win.getByLabel('Sound level'), 3, 'tl')]);
  const main = () => win.locator('[data-settings] .st-main');
  await main().getByText('How speech is heard', { exact: true }).scrollIntoViewIfNeeded();
  await main().evaluate((el) => el.scrollBy(0, 120));
  await win.waitForTimeout(500);
  await shot(win, 'settings-3b-engine', [m(main().getByText('How speech is heard', { exact: true }), 1, 'l')]);
  await main().evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await win.waitForTimeout(500);
  await shot(win, 'settings-3c-ai');
  await win.locator('[data-pane="screens"]').click();
  await win.waitForTimeout(1200);
  for (const [label, name] of [['On the network', 'settings-4b-network'], ['NDI on the network', 'settings-4c-ndi']]) {
    await main().getByText(label, { exact: true }).first().click();
    await win.waitForTimeout(800);
    await main().evaluate((el) => el.scrollBy(0, 330));
    await win.waitForTimeout(400);
    await shot(win, name, [m(main().getByText(label, { exact: true }).last(), 1, 'tl')]);
    await main().evaluate((el) => el.scrollTo(0, 0));
  }
  await main().getByText('Each output, and where it goes', { exact: true }).scrollIntoViewIfNeeded();
  await win.waitForTimeout(500);
  await shot(win, 'settings-4d-outputs', [m(main().getByText('Each output, and where it goes', { exact: true }), 1, 'l')]);
  await main().getByText('Ways to connect a screen', { exact: true }).scrollIntoViewIfNeeded();
  await win.waitForTimeout(500);
  await shot(win, 'settings-4e-ways', [m(main().getByText('Ways to connect a screen', { exact: true }), 1, 'l')]);
  await main().evaluate((el) => el.scrollTo(0, 0));
  await main().getByText('HDMI-SDI', { exact: true }).first().click();
  await win.waitForTimeout(500);
  await pane('screens', 'settings-4-screens', [
    m(win.locator('[data-settings] .st-main').getByText('HDMI-SDI', { exact: true }).first(), 2, 'tl'),
    m(win.locator('[data-settings] .st-main').getByRole('radio', { name: 'Projector' }).first(), 3, 'tl'),
    m(btn(win, /Identify screens/), 4, 'tr'),
  ]);
  const route = async (id, name, marks) => {
    await win.locator(`[data-pp-route="${id}"]`).click();
    await win.waitForTimeout(900);
    await shot(win, name, marks);
  };
  await win.locator('[data-pane="propresenter"]').click();
  await win.waitForTimeout(1300);
  await route('linked', 'pp-1-linked', [
    m(win.locator('[data-pp-route="linked"]'), 1, 'tl'),
    m(win.locator('#pp-linked-on'), 2, 'tr'),
    m(win.locator('#pp-linked-songs'), 3, 'tr'),
    m(win.locator('[data-pp-folder]'), 4, 'tl'),
    m(win.locator('[data-pp-linked-test]'), 5, 'tr'),
  ]);
  await win.locator('[data-settings] .st-main').evaluate((el) => el.scrollBy(0, 640));
  await win.waitForTimeout(500);
  await shot(win, 'pp-2-linked-steps', [m(win.locator('[data-settings] .st-steps li').first(), 1, 'tl')]);
  await win.locator('[data-settings] .st-main').evaluate((el) => el.scrollTo(0, 0));
  await route('ndi', 'pp-3-ndi', [m(win.locator('[data-pp-route="ndi"]'), 1, 'tl'), m(win.locator('#pp-ndi-on'), 2, 'tr'), m(win.locator('[data-settings] .st-steps').first(), 3, 'tl')]);
  await route('message', 'pp-4-message', [m(win.locator('[data-pp-route="message"]'), 1, 'tl'), m(win.getByRole('switch', { name: 'Send verses to ProPresenter' }), 2, 'tr')]);
  await win.locator('[data-settings] .st-main').evaluate((el) => el.scrollBy(0, 560));
  await win.waitForTimeout(500);
  await shot(win, 'pp-5-message-more', [
    m(win.locator('[data-settings] .st-main').getByText('Also on ProPresenter’s stage screens', { exact: true }), 1, 'l'),
    m(win.locator('[data-settings] .st-main').getByRole('button', { name: 'Send a test verse' }).last(), 2, 'tl'),
    m(win.locator('[data-pp-why]'), 3, 'tr'),
  ]);
  await win.locator('[data-settings] .st-main').evaluate((el) => el.scrollTo(0, 0));
  // Other apps and devices (1.19.5): on, a pairing code, then a device paired from outside
  await win.locator('[data-pane="devices"]').click();
  await win.waitForTimeout(900);
  await win.locator('#api-switch').click();
  await win.waitForTimeout(1500);
  await shot(win, 'devices-1-on', [
    m(win.locator('#api-switch'), 1, 'tr'),
    m(win.locator('[data-api-address]'), 2, 'tl'),
    m(win.getByRole('switch', { name: 'Allow it to control the screens' }), 3, 'tr'),
    m(win.locator('[data-api-pair-start]'), 4, 'tr'),
  ]);
  await win.locator('[data-api-pair-start]').click();
  await win.waitForTimeout(700);
  await shot(win, 'devices-2-code', [m(win.locator('[data-api-code] .code'), 1, 'tl'), m(win.locator('[data-api-code] button'), 2, 'tr')]);
  const apiAddress = (await win.locator('[data-api-address]').innerText().catch(() => '')).trim().replace(/^http:\/\/[^/:]+/, 'http://127.0.0.1');
  const code = (await win.locator('[data-api-code] .code').innerText().catch(() => '')).replace(/\D/g, '');
  await fetch(`${apiAddress}/pair`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, name: 'Stream Deck in the booth' }) }).catch(() => {});
  await win.waitForTimeout(900);
  await shot(win, 'devices-3-paired', [m(win.locator('[data-api-device="Stream Deck in the booth"]'), 1, 'tl'), m(win.locator('[data-api-device="Stream Deck in the booth"] button'), 2, 'tr')]);
  await win.locator('#api-switch').click();
  await win.waitForTimeout(600);
  await pane('bible', 'settings-6-bible');
  await pane('songs', 'settings-7-songs', [m(win.locator('#ccli-license'), 2, 'tl')]);
  await pane('logo', 'settings-8-logo');
  await pane('library', 'settings-9-library');
  await pane('app', 'settings-9b-desktop');
  await pane('spirit', 'settings-10-spirit');
  await pane('moves', 'settings-11-moves');
  await pane('cues', 'settings-12-cues');
  await esc(win);

  // ---- 8. The other pages ----
  const pageOutline = async (name) =>
    console.log('OUTLINE', name, JSON.stringify(await win.evaluate(() => [...document.querySelectorAll('main h2, main h3, [role="tab"]')].map((t) => t.textContent.trim()).filter(Boolean).slice(0, 30))));
  await go(win, '#/service-planner', 2200);
  await pageOutline('pages-1-services');
  await shot(win, 'pages-1-services', [
    m(win.locator('nav[aria-label="Pages"]'), 1, 'bl'),
    m(btn(win, /New service/), 2, 'br'),
    m(win.locator('label').filter({ hasText: /^Import$/ }).first(), 3, 'bl'),
    m(win.locator('button[title="Copy for next Sunday"]').first(), 4, 'tl'),
    m(win.locator('button[title="Save to a file"]').first(), 5, 'tr'),
    m(btn(win, /^Present$/), 6, 'tr'),
  ]);
  await win.locator('[data-templates]').scrollIntoViewIfNeeded().catch(() => {});
  await win.waitForTimeout(500);
  await shot(win, 'pages-2-templates', [m(win.locator('[data-new-template]'), 1, 'tr'), m(win.locator('[data-ready-order="Sunday service"]'), 2, 'tl')]);
  const sample = await win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const q = r.result.transaction('services').objectStore('services').getAll();
          q.onsuccess = () => res(q.result.find((s) => s.name === 'Sample: Sunday Celebration')?.id);
        };
      }),
  );
  await go(win, `#/service-builder/${sample}`, 2500);
  await shot(win, 'pages-3-builder', [
    m(win.locator('[data-service-type]'), 1, 'tl'),
    m(win.locator('[data-save-template]'), 2, 'tr'),
    m(btn(win, /^Present$/), 3, 'tr'),
    m(btn(win, /^Save$/), 4, 'tr'),
  ]);
  const more = win.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
  await more.first().click().catch(() => {});
  await win.waitForTimeout(500);
  await shot(win, 'pages-3b-slide-menu', [m(win.getByRole('menuitem').filter({ hasText: /design|look/i }).first(), 1, 'tl')]);
  await win.getByRole('menuitem').filter({ hasText: /design|look/i }).first().click().catch(() => {});
  await win.waitForTimeout(1500);
  await shot(win, 'pages-3c-slide-design', [m(win.getByRole('dialog').last(), 1, 'tl')]);
  await esc(win);
  await win.locator('main').getByText('Welcome', { exact: true }).first().click().catch(() => {});
  await win.waitForTimeout(500);
  await btn(win, /Make with AI/).scrollIntoViewIfNeeded().catch(() => {});
  await win.waitForTimeout(400);
  await shot(win, 'pages-3d-add', [m(win.locator('main').getByText(/^Add to “/).first(), 1, 'tl'), m(btn(win, /Make with AI/), 2, 'tr')]);
  await btn(win, /Make with AI/).click().catch(() => {});
  await win.waitForTimeout(800);
  await shot(win, 'pages-3e-ai-slides', [m(win.getByRole('dialog').last(), 1, 'tl')]);
  await esc(win);
  await pageOutline('pages-3-builder');
  await go(win, '#/media-library', 2000);
  await pageOutline('pages-4-media');
  await shot(win, 'pages-4-media', [m(win.getByText('Add files', { exact: true }).first(), 1, 'tr'), m(win.getByRole('group', { name: 'Show' }), 2, 'bl'), m(btn(win, /^Lyrics$/), 3, 'tl')]);
  await btn(win, /^Lyrics$/).click().catch(() => {});
  await win.waitForTimeout(900);
  await shot(win, 'pages-4b-lyrics', [m(win.getByRole('dialog').last(), 1, 'tl')]);
  await esc(win);
  await go(win, '#/templates', 2200);
  await pageOutline('pages-5-looks');
  await shot(win, 'pages-5-looks', [
    m(win.getByRole('tablist'), 1, 'bl'),
    m(btn(win, /^Backgrounds$/), 2, 'bl'),
    m(btn(win, /^Starter looks$/), 3, 'bl'),
    m(btn(win, /^New look$/), 4, 'br'),
  ]);
  await win.locator('main').getByText('Main text', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
  await win.evaluate(() => window.scrollBy(0, 120));
  await win.waitForTimeout(700);
  await shot(win, 'looks-1-designer', [
    m(win.locator('main').getByText('Main text', { exact: true }).first(), 1, 'l'),
    m(win.locator('main').getByText('Short verse', { exact: true }).first(), 2, 'tl'),
    m(win.locator('main button[title^="Undo"]').first(), 3, 'tr'),
    m(btn(win, /^Duplicate$/), 4, 'tl'),
  ]);
  await win.locator('main').getByText('Background', { exact: true }).first().click().catch(() => {});
  await win.waitForTimeout(700);
  await shot(win, 'looks-2-background', [m(win.locator('main').getByText('Background', { exact: true }).first(), 1, 'l'), m(win.getByRole('radiogroup', { name: 'Kind of background' }), 2, 'tl')]);
  await win.evaluate(() => window.scrollTo(0, 0));
  await btn(win, /^Backgrounds$/).click();
  await win.waitForTimeout(1500);
  await shot(win, 'looks-3-backgrounds', [m(win.getByRole('dialog').last(), 1, 'tl')]);
  await esc(win);
  await btn(win, /^Starter looks$/).click();
  await win.waitForTimeout(1500);
  await shot(win, 'looks-4-starters', [m(win.getByRole('dialog').last(), 1, 'tl')]);
  await esc(win);
  await win.getByRole('tab', { name: /Which screen uses what/ }).click();
  await win.waitForTimeout(1200);
  await shot(win, 'looks-5-assign', [m(win.getByRole('tab', { name: /Which screen uses what/ }), 1, 'bl')]);
  await win.getByRole('tab', { name: /Colour teams and themes/ }).click();
  await win.waitForTimeout(1200);
  await shot(win, 'looks-6-teams', [m(win.getByRole('tab', { name: /Colour teams and themes/ }), 1, 'bl')]);
  await go(win, '#/display-manager', 2200);
  await pageOutline('pages-6-screens');
  await shot(win, 'pages-6-screens');
  await go(win, '#/presenter', 2200);
  await pageOutline('pages-7-presenter');
  await shot(win, 'pages-7-presenter');

  // ---- 9. Training ----
  await go(win, '#/training', 1600);
  await shot(win, 'training-1-page', [
    m(win.locator('nav[aria-label="Pages"] [aria-current="page"]'), 1, 'bl'),
    m(win.locator('[data-lesson="first-sunday"] [data-lesson-show]'), 2, 'tl'),
    m(win.locator('[data-lesson="first-sunday"] [data-lesson-try]'), 3, 'tr'),
    m(win.locator('[data-lesson="demo"] [data-lesson-show]'), 4, 'tl'),
  ]);
  await win.locator('[data-lesson="first-sunday"] [data-lesson-show]').click();
  await until(win, async () => /Red is Live/.test(await win.locator('[data-guide-say]').innerText()), 15000);
  await win.waitForTimeout(1200);
  await shot(win, 'training-2-show-me', [
    m(win.locator('[data-guide-card]'), 1, 'tl'),
    m(win.locator('[data-guide-card] button[aria-label^="Turn the voice"]'), 2, 'tr'),
    m(win.locator('[data-practice-band] button'), 3, 'tr'),
  ]);
  await win.locator('[data-guide-leave]').click();
  await win.waitForTimeout(800);
  await go(win, '#/training', 1200);
  await win.locator('[data-lesson="first-sunday"] [data-lesson-try]').click();
  await until(win, async () => /click Search/.test(await win.locator('[data-guide-say]').innerText()), 30000);
  const s = await win.locator('[data-guide="settings"]').boundingBox();
  await win.mouse.click(s.x + s.width / 2, s.y + s.height / 2);
  await win.waitForTimeout(600);
  await shot(win, 'training-3-let-me-try', [m(win.locator('[data-guide="search"]'), 1, 'bl'), m(win.locator('[data-guide-hint]'), 2, 'tl')]);
  await win.locator('[data-guide-leave]').click();
  await win.waitForTimeout(800);

  // ---- 10. What the room sees ----
  await win.evaluate(() =>
    localStorage.setItem('voice-verses-live', JSON.stringify({ type: 'VERSE_UPDATE', data: { verse: { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', version: 'KJV' } } })),
  );
  await go(win, '#/projection', 2500);
  await shot(win, 'outputs-1-projector');
  await go(win, '#/confidence', 2500);
  await shot(win, 'outputs-2-stage');
  await win.mouse.move(700, 400);
  await win.mouse.move(720, 420);
  await win.waitForTimeout(400);
  await win.locator('button:has(svg.lucide-settings)').first().click().catch(() => {});
  await win.waitForTimeout(900);
  await shot(win, 'outputs-2b-stage-settings', [m(win.locator('.settings-panel'), 1, 'tl')]);
  await esc(win);
  await go(win, '#/lower-third', 2500);
  await shot(win, 'outputs-3-lower-third');

  console.log(missing.length ? `MISSING MARKS: ${missing.join(', ')}` : 'all marks found');
  await app.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
