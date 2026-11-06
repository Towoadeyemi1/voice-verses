// Service templates (1.18.1) in Plan services:
//  - a ready-made order for every type of service, Children's Sunday school included;
//  - "Make it a template" from the ready-made Friday Night Prayers opens it as a template in the editor;
//  - "Use for <day>" plans a service of that type from it;
//  - "New template" for the church's own type, from an existing service, without its slides;
//  - "Save as a template" in the editor keeps the service's slides.
const { OUT, launch, check, done } = require('./lib.cjs');

const all = (win) =>
  win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const q = r.result.transaction('services').objectStore('services').getAll();
          q.onsuccess = () => res(q.result);
        };
      }),
  );
const go = async (win, hash) => {
  await win.evaluate((h) => (location.hash = h), hash);
  await win.waitForTimeout(1800);
};

(async () => {
  const { app, win, errors } = await launch('templates');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.waitForTimeout(4000);
  await go(win, '#/service-planner');

  const types = await win.locator('[data-ready-order]').evaluateAll((els) => els.map((e) => e.dataset.readyOrder));
  check('a ready-made order for every type of service', types.length === 18 && types.includes("Children's Sunday school") && types.includes('Friday Night Prayers') && types.includes('New Year'), types.join(', '));
  await win.locator('[data-ready-orders]').scrollIntoViewIfNeeded();
  await win.screenshot({ path: `${OUT}/templates-1-ready.png` });

  // From the ready-made order for a type
  await win.locator('[data-make-template="Friday Night Prayers"]').click();
  await win.waitForTimeout(600);
  check('the dialog starts from the ready-made order for that type', (await win.locator('[data-template-type]').inputValue()) === 'Friday Night Prayers' && (await win.locator('[data-template-from="ready"][aria-checked="true"]').count()) === 1);
  await win.screenshot({ path: `${OUT}/templates-2-dialog.png` });
  await win.locator('[data-template-name]').fill('Friday Night Prayers (vigil)');
  await win.locator('[data-template-create]').click();
  await win.waitForTimeout(2000);
  const head = (await win.locator('main, body').first().textContent()) || '';
  check('it opens in the editor as a template', /Template for Friday Night Prayers/.test(head) && /#\/service-builder\/template-/.test(await win.evaluate(() => location.hash)), head.slice(0, 120));
  await win.screenshot({ path: `${OUT}/templates-3-editor.png` });

  // Use it for the day chosen
  await go(win, '#/service-planner');
  check('the template is listed', (await win.locator('[data-template="Friday Night Prayers (vigil)"]').count()) === 1);
  await win.locator('[data-templates]').scrollIntoViewIfNeeded();
  await win.screenshot({ path: `${OUT}/templates-4-listed.png` });
  await win.locator('[data-template="Friday Night Prayers (vigil)"] [data-use-template]').click();
  await win.waitForTimeout(2000);
  let svcs = await all(win);
  const planned = svcs.find((s) => !s.isTemplate && s.name === 'Friday Night Prayers (vigil)');
  check('“Use” plans a service of that type from it', !!planned && planned.type === 'Friday Night Prayers' && planned.sections.length > 3, JSON.stringify(planned && { type: planned.type, sections: planned.sections.length }));
  check('…and opens it to fill in', (await win.locator('[data-service-type]').inputValue()) === 'Friday Night Prayers');

  // The church's own type, from a service it already has, without its slides
  await go(win, '#/service-planner');
  await win.locator('[data-new-template]').click();
  await win.waitForTimeout(600);
  await win.locator('[data-template-type]').fill('Harvest Thanksgiving');
  await win.locator('[data-template-from="existing"]').click();
  await win.locator('[data-template-source]').click();
  await win.getByRole('option', { name: /Sunday Celebration/ }).first().click();
  await win.waitForTimeout(300);
  await win.screenshot({ path: `${OUT}/templates-5-from-service.png` });
  await win.locator('[data-template-create]').click();
  await win.waitForTimeout(2000);
  svcs = await all(win);
  const harvest = svcs.find((s) => s.isTemplate && s.type === 'Harvest Thanksgiving');
  const sample = svcs.find((s) => s.name === 'Sample: Sunday Celebration');
  check('a template for the church’s own type, from a service, keeps its order but not its slides', !!harvest && harvest.sections.length === sample.sections.length && harvest.sections.every((sec) => sec.subsections.every((i) => !i.slides.length)), JSON.stringify(harvest && { sections: harvest.sections.length }));
  check('…and never shares the service’s ids', !!harvest && harvest.sections[0].subsections[0].id !== sample.sections[0].subsections[0].id);

  // Save as a template from the editor, slides and all
  await go(win, `#/service-builder/${sample.id}`);
  await win.locator('[data-save-template]').click();
  await win.waitForTimeout(600);
  check('Save as a template suggests the service’s type', (await win.locator('[data-template-type]').inputValue()) === 'Sunday service', await win.locator('[data-template-type]').inputValue());
  await win.locator('[data-template-name]').fill('Sunday with the usual notices');
  await win.locator('[data-template-create]').click();
  await win.waitForTimeout(1500);
  svcs = await all(win);
  const kept = svcs.find((s) => s.isTemplate && s.templateName === 'Sunday with the usual notices');
  check('…and keeps the service’s slides', !!kept && kept.sections.flatMap((x) => x.subsections).some((i) => i.slides.length > 0) && kept.type === 'Sunday service');
  await go(win, '#/service-planner');
  const day = await win.evaluate(() => [...document.querySelectorAll('h2')].find((h) => /^Today/.test(h.textContent || ''))?.closest('section')?.textContent ?? '');
  check('templates are not listed as services on a day', !!day && !/usual notices|vigil\)?\s*Template/.test(day) && !day.includes('Harvest'), day.slice(0, 160));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
