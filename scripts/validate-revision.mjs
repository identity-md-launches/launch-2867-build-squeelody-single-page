// Browser regressions for the reopened findings. No test package ships to the app.
// Usage: node scripts/validate-revision.mjs /absolute/path/to/playwright/index.mjs [--hold]
// Playwright and its browsers may be installed outside this repository.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const modulePath = process.argv[2];
const { chromium, webkit } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : "playwright");
const report = { testedAt: new Date().toISOString(), browser: "Chromium", viewport: "390x844", fixtures: "Controlled synthetic test inputs derived from the review, never shown as live data in the shipped app.", checks: [], live: null, limitations: [] };
const check = (name, passed, detail = null) => report.checks.push({ name, passed: Boolean(passed), ...(detail == null ? {} : { detail }) });
await mkdir("artifacts", { recursive: true });
await mkdir("test/scratch/revision", { recursive: true });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://preview.invalid").pathname;
  const name = path === "/preview/" || path === "/preview/index.html" ? "index.html" : path === "/preview/og.png" ? "og.png" : null;
  if (!name) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": name.endsWith("html") ? "text/html; charset=utf-8" : "image/png" }).end(await readFile("dist/" + name));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
const pageErrors = [];
const status = (distanceMm = 7887952, work = "76007", rpm = 300000, coreStatus = "SPINNING", block = "6808") => ({ measurement: { rpmMilli: String(rpm), speedMmPerSecond: "1200", distanceMm, cumulativeWorkUnits: work, coreStatus, observedAt: "2026-11-02T07:51:21.035Z" }, builder: { anchor: { blockHeight: block, blockProgress: "250000000" } } });
const economy = round => ({ lifecycle: { currentRound: String(round) }, supply: { totalMintedBaseUnits: "123456789000000000000" }, identities: {} });
const settlements = count => ({ summary: { settlementCount: String(count), workAdded: "400", completedBlockCount: "12" } });
async function mockPage({ fail = [], cache = null } = {}) {
  const state = { status: status(), economy: economy(972), settlements: settlements(143), fail: new Set(fail), version: 0 };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", e => pageErrors.push(e.message));
  if (cache) await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value)); }, { key: "squeelody:last-good:v1", value: cache });
  await page.route("https://api.squeekchain.com/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const key = path.endsWith("/status") ? "status" : path.endsWith("/state") ? "economy" : "settlements";
    if (state.fail.has(key)) await route.abort();
    else await route.fulfill({ json: state[key] });
  });
  await page.goto(url);
  await page.waitForFunction(() => ["live", "reconnecting"].includes(document.querySelector("#api-pill").dataset.state));
  return { page, state };
}
async function read(page) {
  return page.evaluate(() => {
    const app = window.__squeelody;
    return { snap: app.snap, pattern: app.pattern, enginePattern: app.engine.pattern, pending: app.engine.pending, playing: app.engine.playing, context: app.engine.ctx?.state ?? null, now: document.querySelector("#now").textContent, updated: document.querySelector("#updated").textContent, disabled: document.querySelector("#btn-listen").getAttribute("aria-disabled"), pressed: document.querySelector("#btn-listen").getAttribute("aria-pressed") };
  });
}
async function poll(page) {
  // Exercise the production poll path without a 15-second wall-clock delay per case.
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(150);
}
async function download(page) {
  const event = page.waitForEvent("download");
  await page.locator("#btn-press").click();
  const d = await event;
  const stream = await d.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { name: d.suggestedFilename(), svg: Buffer.concat(chunks).toString("utf8") };
}

try {
  browser = await chromium.launch({ headless: true });
  let { page, state } = await mockPage();
  let initial = await read(page);
  check("Round 972 starts with the review's seed and melody", initial.pattern.seed === 2296294905 && JSON.stringify(initial.pattern.melody) === JSON.stringify([57,null,60,null,60,null,64,null,64,null,null,62,67,69,69,null]));
  state.status = status(7888952, "76008"); await poll(page);
  let current = await read(page);
  check("Advancing counters within round 972 retains all 16 notes", JSON.stringify(initial.pattern.melody) === JSON.stringify(current.pattern.melody) && initial.pattern.seed === current.pattern.seed);
  state.status = status(7889952, "76009", 350000, "SPINNING", "6809"); state.settlements = settlements(30); await poll(page);
  current = await read(page);
  check("Same-round melody survives live tempo and block changes", JSON.stringify(initial.pattern.melody) === JSON.stringify(current.pattern.melody));
  check("Tempo and bass still update from live telemetry", current.pattern.bpm > initial.pattern.bpm && current.pattern.bassMidi !== initial.pattern.bassMidi);
  check("Percussion density still follows live settlements", JSON.stringify(current.pattern.hats) !== JSON.stringify(initial.pattern.hats));
  await page.reload(); await page.waitForFunction(() => window.__squeelody?.snap.status);
  current = await read(page);
  check("Reload restores the initial round seed despite later counters", current.pattern.seed === initial.pattern.seed && JSON.stringify(current.pattern.melody) === JSON.stringify(initial.pattern.melody));
  state.economy = economy(973); await poll(page); current = await read(page);
  check("A new round captures its own first-reading seed", current.pattern.seed === 2495461189);
  const roundSeed = current.pattern.seed;
  state.status = status(7890952, "76010", 600000); await poll(page); current = await read(page);
  check("Zoomies changes major voicing without reseeding the round", current.pattern.seed === roundSeed && current.pattern.mood === "ZOOMIES" && current.pattern.bpm === 168 && current.pattern.kicks[10] && current.pattern.kicks[14] && current.pattern.melody.filter(n => n != null).every(n => [0,2,4,5,7,9,11].includes((n - 57) % 12)));
  state.status = status(7891952, "76011", 300000, "IDLE"); await poll(page); current = await read(page);
  check("IDLE is always a 40 BPM lullaby with silent drums", current.pattern.seed === roundSeed && current.pattern.mood === "NAPPING" && current.pattern.bpm === 40 && !current.pattern.kicks.some(Boolean) && !current.pattern.hats.some(Boolean));
  state.status = status(7892952, "76012", 300000); await poll(page);
  await page.locator("#btn-poke").click(); current = await read(page);
  check("POKE before LISTEN remains visual and explains opt-in", current.context === null && !current.playing && /Press LISTEN to enable sound/.test(current.now));
  await page.locator("#btn-listen").click(); current = await read(page);
  check("LISTEN initializes Web Audio and starts the sequencer", current.context === "running" && current.playing && current.pressed === "true");
  check("Running sequencer schedules synthesized kicks", await page.evaluate(() => window.__squeelody.engine.pulses.length > 0));
  state.status = status(7893952, "76013"); state.economy = economy(974); await poll(page); current = await read(page);
  check("Active playback queues new patterns at bar boundaries", current.pending?.seed === current.pattern.seed && current.enginePattern.seed !== current.pattern.seed);
  await page.locator("#btn-listen").click();
  state.status = status(7894952, "76014"); state.economy = economy(975); await poll(page); current = await read(page);
  check("Applying a pattern while paused clears the obsolete queue", !current.playing && current.pending === null && current.enginePattern.seed === current.pattern.seed);
  await page.locator("#btn-listen").click(); current = await read(page);
  check("Resume uses current notes and seed, never the old queued round", current.playing && current.enginePattern.seed === current.pattern.seed && JSON.stringify(current.enginePattern.melody) === JSON.stringify(current.pattern.melody));
  await page.locator("#btn-listen").click();
  await page.locator("#btn-poke").click(); current = await read(page);
  check("POKE after opt-in can squeak while the sequencer is paused", !current.playing && current.context === "running" && /^Squeak\./.test(current.now));

  const pressed = await download(page), pressedAgain = await download(page);
  check("PRESS downloads a named SVG with block and round", pressed.name === "squeelody-round-975-block-6808.svg" && /BLOCK 6808/.test(pressed.svg) && /ROUND 975/.test(pressed.svg));
  check("The SVG is 400x400 and contains mood, km and UTC caption", /width="400" height="400"/.test(pressed.svg) && /JOGGING/.test(pressed.svg) && /km · block 6808 · 2026-11-02 07:51 UTC/.test(pressed.svg));
  check("Repeated presses of one reading are byte-identical", pressed.svg === pressedAgain.svg);
  check("The downloaded SVG parses without XML errors", await page.evaluate(svg => !new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror"), pressed.svg));
  state.economy = economy(976); await poll(page);
  check("The next round produces a different vinyl", pressed.svg !== (await download(page)).svg);

  const fresh = await read(page); state.fail.add("status"); await page.waitForTimeout(1100); await poll(page);
  const stale = await read(page); await poll(page); const staleAgain = await read(page);
  check("Status failure retains the actual last-good wheel data", JSON.stringify(fresh.snap.status) === JSON.stringify(staleAgain.snap.status));
  check("Other endpoints cannot advance the wheel fetch timestamp", staleAgain.snap.fetchedAt.status === fresh.snap.fetchedAt.status && staleAgain.snap.fetchedAt.economy !== fresh.snap.fetchedAt.economy);
  check("Cached label includes the original date and time and stays fixed", /^Cached wheel reading/.test(stale.updated) && /2026/.test(stale.updated) && stale.updated === staleAgain.updated, staleAgain.updated);
  await page.waitForTimeout(5100); // Let the previous download's 5-second message expire.
  await page.screenshot({ path: "artifacts/revision-cached-390.png" });
  state.fail = new Set(["status", "settlements", "economy"]); await page.reload();
  await page.waitForFunction(() => document.querySelector("#api-pill-text").textContent === "reconnecting"); current = await read(page);
  check("Offline reload clearly identifies cached data and keeps LISTEN available", current.snap.status && current.disabled === "false" && /^Cached/.test(current.updated));
  await page.locator("#btn-listen").click(); current = await read(page);
  check("Explicitly identified cached wheel telemetry remains playable", current.playing && current.context === "running");
  await page.close();

  ({ page, state } = await mockPage({ fail: ["status", "settlements", "economy"] }));
  current = await read(page);
  check("First-load failure shows no invented numeric readouts", current.snap.status === null && await page.locator('[data-field="rpm"]').textContent() === "…" && current.disabled === "true");
  await page.locator("#btn-listen").focus(); await page.keyboard.press("Space"); current = await read(page);
  check("LISTEN cannot start audio without live or cached wheel telemetry", !current.playing && current.context === null && current.enginePattern === null && current.pressed === "false");
  check("No-data message explains recovery without a false instruction", current.now === "No wheel reading yet. Reconnecting; LISTEN will be available when data arrives.");
  await page.screenshot({ path: "artifacts/revision-empty-390.png" });
  await page.locator("#btn-poke").click(); current = await read(page);
  check("POKE also leaves AudioContext uninitialized without data", current.context === null && /Press LISTEN/.test(current.now));
  state.fail = new Set(["status"]); await poll(page); current = await read(page);
  check("Economy-only recovery cannot enable the wheel's audio", current.snap.economy && current.snap.status === null && current.disabled === "true" && !current.playing);
  state.fail.clear(); await poll(page); current = await read(page);
  check("Successful recovery enables LISTEN without automatically playing", current.snap.status && current.disabled === "false" && current.context === null && !current.playing);
  await page.locator("#btn-listen").focus(); await page.keyboard.press("Space"); current = await read(page);
  check("Keyboard Space starts LISTEN after data recovery", current.playing && current.pressed === "true");
  await page.keyboard.press("Space");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    check(`No horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  check("Product, wheel and all three actions fit on the first 390px screen", await page.evaluate(() => ["h1", "#wheel", "#btn-listen", "#btn-poke", "#btn-press"].every(s => { const b = document.querySelector(s).getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })));
  await page.locator("#btn-listen").focus();
  check("LISTEN has a visible keyboard focus outline", await page.locator("#btn-listen").evaluate(el => getComputedStyle(el).outlineStyle === "solid" && parseFloat(getComputedStyle(el).outlineWidth) >= 2));
  await page.screenshot({ path: "artifacts/revision-focus-390.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  check("Reduced motion stops the live status animation", await page.locator("#api-pill .dot").evaluate(el => getComputedStyle(el).animationName === "none"));
  await page.close();

  // Legacy caches must use the wheel's own observation date, never aggregate savedAt.
  const legacyStatus = { rpm: 300, speedMmPerSecond: 1200, distanceMm: 7887952, cumulativeWorkUnits: "76007", coreStatus: "SPINNING", observedAt: "2026-10-29T07:51:21.035Z", blockHeight: 6808, blockProgress: 0.25 };
  ({ page } = await mockPage({ fail: ["status", "settlements", "economy"], cache: { status: legacyStatus, settlements: null, economy: null, savedAt: "2026-11-02T07:53:01.511Z" } }));
  current = await read(page);
  check("Legacy cache migration retains the wheel observation date", current.snap.fetchedAt.status === legacyStatus.observedAt && /^Cached/.test(current.updated) && /Oct|10\//.test(current.updated), current.updated);
  await page.close();

  // Compare the DOM with the exact responses this page received, avoiding a second
  // fetch whose counters could advance between the API and the assertion.
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", e => pageErrors.push(e.message));
  const received = {};
  const bodies = [];
  page.on("response", response => {
    const u = response.url();
    if (!u.startsWith("https://api.squeekchain.com/v1/")) return;
    const key = u.endsWith("/status") ? "status" : u.includes("/settlements?") ? "settlements" : u.endsWith("/economy/state") ? "economy" : null;
    if (key) bodies.push(response.json().then(data => { received[key] = { statusCode: response.status(), data }; }));
  });
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector("#api-pill-text").textContent === "API live", { timeout: 25000 });
  await Promise.all(bodies); current = await read(page);
  const m = received.status.data.measurement, a = received.status.data.builder.anchor;
  const se = received.settlements.data.summary, ec = received.economy.data;
  const field = name => page.locator(`[data-field="${name}"]`).first().textContent();
  check("All three live endpoints answered HTTP 200", Object.values(received).length === 3 && Object.values(received).every(r => r.statusCode === 200));
  check("Live RPM and km exactly match the received status", await field("rpm") === (Number(m.rpmMilli) / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) && await field("km") === (Number(m.distanceMm) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
  check("Live block, work and settlements match the received endpoints", await field("block") === Number(a.blockHeight).toLocaleString("en-US") && await field("work") === BigInt(m.cumulativeWorkUnits).toLocaleString("en-US") && await field("settlements") === Number(se.settlementCount).toLocaleString("en-US"));
  const minted = BigInt(ec.supply.totalMintedBaseUnits), unit = 10n ** 18n;
  const sqk = (minted / unit).toLocaleString("en-US") + "." + (((minted % unit) * 100n) / unit).toString().padStart(2, "0");
  check("Live SQK and round match economy data without float loss", await field("sqk") === sqk && await field("round") === Number(ec.lifecycle.currentRound).toLocaleString("en-US"));
  const mood = m.coreStatus === "IDLE" || Number(m.rpmMilli) === 0 ? "NAPPING" : Number(m.rpmMilli) >= 500000 ? "ZOOMIES" : "JOGGING";
  const bpm = mood === "NAPPING" ? 40 : Math.min(168, 40 + (Number(m.rpmMilli) / 600000) ** 0.9 * 128);
  check("Live mood and tempo follow the actual wheel state", await field("mood") === mood && await field("bpm") === String(Math.round(bpm)));
  report.live = { checkedAt: new Date().toISOString(), endpoints: { status: "https://api.squeekchain.com/v1/status", settlements: "https://api.squeekchain.com/v1/settlements?range=24h", economy: "https://api.squeekchain.com/v1/economy/state" }, rpmMilli: m.rpmMilli, distanceMm: m.distanceMm, cumulativeWorkUnits: m.cumulativeWorkUnits, observedAt: m.observedAt, blockHeight: a.blockHeight, currentRound: ec.lifecycle.currentRound, totalMintedBaseUnits: ec.supply.totalMintedBaseUnits, settlementCount: se.settlementCount, displayed: { rpm: await field("rpm"), km: await field("km"), sqk: await field("sqk"), mood: await field("mood"), bpm: await field("bpm") } };
  await page.screenshot({ path: "artifacts/revision-live-390.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "artifacts/revision-live-1440.png" });
  await page.close();
  check("No JavaScript page errors across tested states", pageErrors.length === 0, pageErrors);

  try {
    const safari = await webkit.launch({ headless: true });
    const safariPage = await safari.newPage({ viewport: { width: 390, height: 844 } });
    await safariPage.goto(url);
    await safariPage.waitForFunction(() => window.__squeelody?.snap.status);
    await safariPage.locator("#btn-poke").click();
    check("WebKit POKE preserves the LISTEN opt-in", await safariPage.evaluate(() => window.__squeelody.engine.ctx === null));
    await safariPage.locator("#btn-listen").click();
    check("WebKit LISTEN starts live music", await safariPage.evaluate(() => window.__squeelody.engine.playing));
    await safari.close();
  } catch (error) {
    report.limitations.push("WebKit browser checks were not performed: the optional browser could not launch. See validation.md for the attempted command; no Safari compatibility claim is made.");
  }
  report.limitations.push("No real audio listening, screen-reader session, physical-device check, native browser 200% zoom, or animation-panel slow-motion inspection.");
  report.summary = { passed: report.checks.filter(c => c.passed).length, total: report.checks.length };
  await writeFile("artifacts/revision-validation.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (report.checks.some(c => !c.passed)) process.exitCode = 1;
  if (process.argv.includes("--hold")) {
    console.log(`Inspection preview: ${url}\nSend a newline to finish; the bounded preview closes automatically after 8 minutes.`);
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 8 * 60 * 1000);
      process.stdin.once("data", () => { clearTimeout(timer); process.stdin.pause(); resolve(); });
      process.stdin.resume();
    });
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
