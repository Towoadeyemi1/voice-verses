// Voice Verses spirit with a spoken sermon (fake microphone):
//  - a taught cue ("as the ushers make their way" → Offering) gets Offering ready in Next; "Not this" →
//    "Wrong part" puts it back and teaches spirit;
//  - a point cue that has earned Hands-free ("point number two") goes live by itself after 3 s;
//  - the operator moving to Prayer just after "let us go to the Lord together" (said before going to
//    Prayer once already) makes spirit notice it, and Settings → Cues offers it.
// Needs `npm run models` and:  python tools/e2e/make-sermon-audio.py <voice.onnx> /tmp/vv-e2e/spirit.wav spirit
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'spirit.wav');

const now = new Date().toISOString();
const SEED = {
  level: 'handsfree',
  cues: [
    { id: 'taught:ushers', phrase: 'as the ushers make their way', part: 'Offering', source: 'taught', level: 'next', record: [], streak: 0, updatedAt: now },
    { id: 'builtin:point:number', phrase: 'point number …', point: true, source: 'builtin', level: 'handsfree', record: Array(10).fill('right'), streak: 10, updatedAt: now },
  ],
  observations: [{ id: 'obs:last-week', at: new Date(Date.now() - 7 * 86400000).toISOString(), part: 'Prayer', sentences: ['Now let us go to the Lord together.'] }],
  dismissed: [],
  events: [],
  heard: [],
  updatedAt: now,
};

(async () => {
  const { app, win, errors } = await launch('spirit', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.evaluate((seed) => {
    localStorage.setItem('voice-verses-spirit', JSON.stringify(seed));
    localStorage.setItem('voice-verses-features', JSON.stringify({ momentAutopilot: true, sermonPoints: true }));
  }, SEED);
  await win.reload();
  await win.waitForTimeout(3000);
  await win.getByRole('button', { name: 'Start listening' }).first().click();
  await win.waitForSelector('text=Using', { timeout: 150000 });

  const spirit = () => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-spirit') || '{}'));
  const nextLabel = () => win.evaluate(() => document.querySelector('[data-label-detail="next"]')?.textContent ?? '');
  const liveTitle = () => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-live') || 'null')?.data?.slide?.title ?? '');

  // 1. The taught cue: Offering ready in Next, then "Not this" → "Wrong part"
  let label = '';
  for (let i = 0; i < 200 && !/Offering/.test(label); i++) {
    await win.waitForTimeout(300);
    label = await nextLabel();
  }
  check('a taught cue gets its part ready in Next', /Offering.*spirit heard “as the ushers make their way”/.test(label), label);
  await win.screenshot({ path: `${OUT}/spirit-1-next.png` });
  await win.locator('[data-not-this]').click();
  await win.waitForTimeout(300);
  await win.screenshot({ path: `${OUT}/spirit-2-not-this.png` });
  await win.getByRole('button', { name: 'Wrong part' }).click();
  await win.waitForTimeout(600);
  let st = await spirit();
  const taught = st.cues.find((c) => c.id === 'taught:ushers');
  check('"Not this" → "Wrong part" is remembered against the cue', taught?.record.join(',') === 'wrong' && taught.note === 'wrong part', JSON.stringify(taught && { record: taught.record, note: taught.note }));
  check('…and Next is put back', !/Offering/.test(await nextLabel()), await nextLabel());

  // 2. A Hands-free cue goes live by itself after the countdown
  let live = '';
  for (let i = 0; i < 60 && live !== 'Point 2'; i++) {
    await win.waitForTimeout(300);
    live = await liveTitle();
  }
  check('a cue that has earned Hands-free goes live by itself', live === 'Point 2', `live: ${live || 'nothing'}`);
  await win.screenshot({ path: `${OUT}/spirit-3-hands-free.png` });
  st = await spirit();
  const point = st.cues.find((c) => c.id === 'builtin:point:number');
  check('…and counts as right', point?.record.slice(-1)[0] === 'right' && point.streak === 11, JSON.stringify(point && { streak: point.streak }));

  // 3. Learning by watching: the operator goes to Prayer just after "let us go to the Lord together"
  for (let i = 0; i < 60; i++) {
    await win.waitForTimeout(300);
    st = await spirit();
    if (st.heard.some((h) => /go to the lord/i.test(h.text))) break;
  }
  await win.locator('nav[aria-label="Order of service"] button[title*="Prayer"]').first().click();
  await win.waitForTimeout(800);
  st = await spirit();
  const obs = st.observations[st.observations.length - 1];
  check('going to a part yourself is learned from, with what was just said', obs?.part === 'Prayer' && obs.sentences.some((t) => /go to the lord/i.test(t)), JSON.stringify(obs));

  // Settings: How spirit runs, and Cues with what spirit noticed
  await win.getByRole('button', { name: 'Settings' }).first().click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="spirit"]').click();
  await win.waitForTimeout(800);
  const page = (await win.locator('[data-spirit-page]').textContent()) || '';
  check('How spirit runs shows the last service', /times spirit got the next thing ready/.test(page) && /you corrected/.test(page), page.slice(0, 160));
  await win.screenshot({ path: `${OUT}/spirit-4-runs.png` });
  await win.locator('[data-pane="cues"]').click();
  await win.waitForTimeout(800);
  const noticedCards = await win.locator('[data-noticed]').evaluateAll((els) => els.map((e) => e.dataset.noticed));
  check('spirit noticed what was said before going to Prayer twice', noticedCards.some((p) => /go to the lord/.test(p)), noticedCards.join(' | '));
  await win.screenshot({ path: `${OUT}/spirit-5-cues.png` });
  await win.locator('[data-noticed]').first().getByRole('button', { name: 'Make it a cue' }).click();
  await win.waitForTimeout(500);
  st = await spirit();
  check('"Make it a cue" teaches it', st.cues.some((c) => c.source === 'noticed' && c.part === 'Prayer'), st.cues.filter((c) => c.source === 'noticed').map((c) => c.phrase).join(', '));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
