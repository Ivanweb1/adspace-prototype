const { chromium } = require('/opt/node-tools/node_modules/playwright');
// args: list of t:w:h:out
(async () => {
  const b = await chromium.launch();
  for (const spec of process.argv.slice(2)) {
    const [t,w,h,out] = spec.split(':');
    const p = await b.newPage({ viewport: { width:+w, height:+h } });
    await p.goto(`http://localhost:4300/creative.html?t=${t}`, { waitUntil:'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: out }); await p.close();
  }
  await b.close();
})();
