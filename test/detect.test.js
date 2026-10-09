import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const detectSrc = readFileSync(new URL("../src/detect.js", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("keeps the original adsbygoogle probe", () => {
  assert.match(detectSrc, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  assert.match(detectSrc, /content-length/i);
  assert.match(detectSrc, /uBlock/i);
});

test("package has no install hooks", () => {
  assert.equal(pkg.scripts.preinstall, undefined);
  assert.equal(pkg.scripts.postinstall, undefined);
  assert.equal(pkg.scripts.build.includes("build.mjs"), true);
});

test("has multiple ad script URLs", () => {
  assert.match(detectSrc, /AD_SCRIPT_URLS/);
  assert.match(detectSrc, /doubleclick\.net/);
  assert.match(detectSrc, /adservice\.google\.com/);
  assert.match(detectSrc, /adnxs\.com/);
});

test("has multiple bait classes", () => {
  assert.match(detectSrc, /BAIT_CLASSES/);
  assert.match(detectSrc, /ad-slot/);
  assert.match(detectSrc, /google-auto-placed/);
  assert.match(detectSrc, /banner-ad/);
});

test("has fingerprinting function", () => {
  assert.match(detectSrc, /getBrowserFingerprint/);
  assert.match(detectSrc, /webgl/i);
  assert.match(detectSrc, /canvas/i);
  assert.match(detectSrc, /automation/);
});

test("bait element creation works in JSDOM", () => {
  const dom = new JSDOM(`<!DOCTYPE html><body></body>`, { url: "https://example.com" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.performance = dom.window.performance;

  // Use eval to run the source in the JSDOM context
  const moduleExports = {};
  eval(detectSrc.replace(/export /g, "") + "; Object.assign(moduleExports, { createBaitElement, baitWasBlocked });");

  const bait = moduleExports.createBaitElement("test-class");
  assert.equal(bait.className, "test-class");
  assert.equal(bait.getAttribute("aria-hidden"), "true");
  assert.ok(bait.style.cssText.includes("position:absolute"));
});

test("baitWasBlocked detects hidden element", () => {
  const dom = new JSDOM(`<!DOCTYPE html><body></body>`, { url: "https://example.com" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.performance = dom.window.performance;

  const moduleExports = {};
  eval(detectSrc.replace(/export /g, "") + "; Object.assign(moduleExports, { createBaitElement, baitWasBlocked });");

  const bait = moduleExports.createBaitElement("test");
  document.body.appendChild(bait);

  // Initially not blocked
  assert.equal(moduleExports.baitWasBlocked(bait), false);

  // Hide it
  bait.style.display = "none";
  assert.equal(moduleExports.baitWasBlocked(bait), true);

  bait.remove();
});