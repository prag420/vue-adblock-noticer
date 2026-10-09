/**
 * Detection ported from The-3Labs-Team/js-anti-adblock (MIT) and extended.
 * Original: fetch adsbygoogle.js, treat missing content-length, uBlock rewrite,
 * or network failure as a block. Added: bait element, so a filter that only
 * blocks the Google URL still trips.
 */

const BAIT_CLASSES = [
  "adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad ad-banner",
  "ad-slot ad-placeholder advertisement sponsor",
  "google-auto-placed adsbygoogle",
  "adtop ad-bottom ad-left ad-right",
  "banner-ad leaderboard-ad skyscraper-ad",
];

const AD_SCRIPT_URLS = [
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
  "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
  "https://adservice.google.com/adsid/integrator.js",
  "https://cdn.adnxs.com/ib/static/ib.v1.2.js",
  "https://acdn.adnxs.com/prebid/not-for-prod/prebid.js",
];

export function createBaitElement(className) {
  const bait = document.createElement("div");
  bait.className = className;
  bait.setAttribute("aria-hidden", "true");
  bait.style.cssText = "position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;";
  bait.innerHTML = "&nbsp;";
  return bait;
}

export function baitWasBlocked(bait) {
  if (!bait || !bait.parentNode) return true;
  const style = window.getComputedStyle(bait);
  return (
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    parseFloat(style.width) === 0 ||
    parseFloat(style.height) === 0
  );
}

export async function probeAdScript(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const response = await fetch(new Request(url), { signal: controller.signal, cache: "no-store" });
    const elapsed = performance.now() - start;

    if (!response.headers.get("content-length")) return { blocked: true, reason: "no-content-length", elapsed };

    const text = await response.text();
    const keywords = ["uBlock", "height:1px!important", "display:none", "adsbox", "adblock"];
    const blocked = keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));

    return { blocked, reason: blocked ? "keyword-match" : "ok", elapsed };
  } catch (e) {
    return { blocked: true, reason: "fetch-error", elapsed: performance.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

export async function detectAdBlock(options = {}) {
  const scriptUrls = options.scriptUrls ?? AD_SCRIPT_URLS;
  const useBait = options.bait !== false;
  const useScript = options.script !== false;
  const baitClasses = options.baitClasses ?? BAIT_CLASSES;

  if (typeof document === "undefined") return { detected: false, reason: "no-document", details: {} };

  // Bait element checks
  let baitDetected = false;
  let baitReason = "none";
  if (useBait) {
    for (const className of baitClasses) {
      const el = createBaitElement(className);
      document.body.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (baitWasBlocked(el)) {
        baitDetected = true;
        baitReason = className;
        el.remove();
        break;
      }
      el.remove();
    }
  }

  // Script probe checks
  let scriptDetected = false;
  let scriptReason = "none";
  let scriptDetails = [];
  if (useScript && scriptUrls.length > 0) {
    const results = await Promise.all(
      scriptUrls.map((url) => probeAdScript(url, options.timeoutMs))
    );
    scriptDetails = results.map((r, i) => ({ url: scriptUrls[i], ...r }));
    const blockedResult = results.find((r) => r.blocked);
    if (blockedResult) {
      scriptDetected = true;
      scriptReason = blockedResult.reason;
    }
  }

  // Additional heuristic: timing anomaly
  let timingAnomaly = false;
  if (useScript && scriptDetails.length > 0) {
    const avgElapsed = scriptDetails.reduce((sum, d) => sum + d.elapsed, 0) / scriptDetails.length;
    // If all requests complete suspiciously fast (<50ms), likely cached or blocked locally
    if (avgElapsed < 50 && scriptDetails.every((d) => d.elapsed < 100)) {
      timingAnomaly = true;
    }
  }

  const detected = baitDetected || scriptDetected || timingAnomaly;
  const reasons = [];
  if (baitDetected) reasons.push(`bait:${baitReason}`);
  if (scriptDetected) reasons.push(`script:${scriptReason}`);
  if (timingAnomaly) reasons.push("timing");

  return {
    detected,
    reason: reasons.join("+") || "none",
    details: { baitDetected, scriptDetected, timingAnomaly, scriptDetails },
  };
}

export function randomOverlayStyle() {
  const styles = [
    ["width", "100%"],
    ["height", "100vh"],
    ["padding", "10px"],
    ["background-color", "rgba(0,0,0,0.68)"],
    ["position", "fixed"],
    ["top", "0"],
    ["left", "0"],
    ["z-index", "999999"],
    ["display", "flex"],
    ["align-items", "center"],
    ["justify-content", "center"],
    ["font-family", "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"],
    ["backdrop-filter", "blur(5px) grayscale(100%)"],
  ];
  const order = styles.map((_, index) => index).sort(() => Math.random() - 0.5);
  return order.map((index) => `${styles[index][0]}:${styles[index][1]}`).join(";");
}

/**
 * Browser fingerprinting helpers - useful for detecting headless browsers,
 * privacy tools, or correlating detection results.
 */
export function getBrowserFingerprint() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;

  const fp = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(",") ?? "",
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
    vendor: navigator.vendor,
    vendorSub: navigator.vendorSub,
    product: navigator.product,
    productSub: navigator.productSub,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    doNotTrack: navigator.doNotTrack,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
    } : null,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
  };

  // WebGL fingerprint
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        fp.webgl = {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
        };
      }
    }
  } catch { }

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Fingerprint 🦊", 2, 2);
    fp.canvas = canvas.toDataURL().slice(0, 100);
  } catch { }

  // Check for common automation indicators
  fp.automation = {
    webdriver: navigator.webdriver,
    phantom: !!window.callPhantom || !!window._phantom,
    nightmare: !!window.__nightmare,
    selenium: !!window.document.__selenium_unwrapped || !!window.document.__webdriver_evaluate,
    chromedriver: !!window.chrome?.runtime?.id && !!window.document.querySelector('[data-chrome-extension]'),
  };

  return fp;
}