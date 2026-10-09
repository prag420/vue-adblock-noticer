# vue-adblock-notice

A Vue 3 ad-blocker detection library with a dismissible notice component. Originally inspired by [The-3Labs-Team/js-anti-adblock](https://github.com/The-3Labs-Team/js-anti-adblock) (MIT), but now a standalone implementation with significantly expanded detection capabilities.

The browser file you ship is `dist/antiAdBlocker.min.ob.js` — minified and obfuscated (string array + base64). Source stays readable in `src/`.

## Detection Methods

- **Multi-network script probes** — Checks 5 ad-serving endpoints (Google Ads, DoubleClick, Google AdService, AppNexus, Prebid) for blocking, missing `content-length`, uBlock rewrites, or fetch failures
- **Multi-pattern bait elements** — Tests 5 common ad CSS class patterns against cosmetic filters (`display:none`, `visibility:hidden`, `opacity:0`, zero dimensions)
- **Timing anomaly detection** — Flags suspiciously fast fetches (<50ms avg) that suggest local/cached blocking
- **Optional browser fingerprinting** — WebGL vendor/renderer, canvas hash, automation flags (webdriver, PhantomJS, Selenium, ChromeDriver), hardware concurrency, device memory, connection info

## Vue Component

```vue
<script setup>
import { AdblockNotice } from "vue-adblock-notice";

function onDetected({ reason, details, fingerprint }) {
  console.log("Adblock detected:", reason);
  console.log("Details:", details);
  console.log("Fingerprint:", fingerprint);
}
</script>

<template>
  <AdblockNotice
    @detected="onDetected"
    :collect-fingerprint="true"
    :script-urls="[
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
    ]"
    :bait-classes="['adsbox', 'ad-slot', 'google-auto-placed']"
    :timeout-ms="3000"
    :blocking="false"
    :remember-dismiss="true"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `locale` | String | `navigator.language` | `"en"` or `"it"` (auto-detected) |
| `blocking` | Boolean | `false` | Cover entire page with overlay |
| `scriptUrls` | Array | 5 built-in URLs | Custom ad script endpoints to probe |
| `bait` | Boolean | `true` | Enable bait element checks |
| `baitClasses` | Array | 5 built-in patterns | Custom bait CSS classes |
| `rememberDismiss` | Boolean | `false` | Persist dismissal in `localStorage` |
| `collectFingerprint` | Boolean | `false` | Include browser fingerprint in `@detected` |
| `timeoutMs` | Number | `2500` | Per-request fetch timeout |

### Events

- `@detected` — Emits `{ reason, details, fingerprint }` when ad blocker is found
- `@dismiss` — Emits when user dismisses the notice

## Script Tag (No Vue)

```html
<script src="/antiAdBlocker.min.ob.js"></script>
```

Host the file yourself. Do not load it from a CDN.

```js
window.__ADBLOCK_NOTICE__ = {
  allowDismiss: true,      // close instead of reload
  locale: "en",            // "en" or "it"
  scriptUrls: [...],       // custom probe URLs
  baitClasses: [...],      // custom bait classes
  timeoutMs: 3000
};
```

## Composables (Vue 3)

```js
import { useAdblockNotice } from "vue-adblock-notice";

const { detected, reason, details, fingerprint, checking, check, dismiss } = useAdblockNotice({
  scriptUrls: [...],
  baitClasses: [...],
  rememberDismiss: true,
  collectFingerprint: true,
  timeoutMs: 3000,
});

// Manually trigger a check
await check();
```

## Browser Fingerprinting

When `collectFingerprint: true`, the `@detected` event (or `details` in composable) includes:

```js
{
  userAgent: "...",
  language: "en-US",
  platform: "Win32",
  hardwareConcurrency: 8,
  deviceMemory: 8,
  maxTouchPoints: 0,
  vendor: "Google Inc.",
  webgl: { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, ...)" },
  canvas: "data:image/png;base64,iVBORw0K...",
  automation: {
    webdriver: false,
    phantom: false,
    nightmare: false,
    selenium: false,
    chromedriver: false
  },
  connection: { effectiveType: "4g", downlink: 10, rtt: 50 },
  screen: { width: 1920, height: 1080, colorDepth: 24 },
  timezone: "America/New_York",
  timezoneOffset: -240
}
```

Use this to correlate detections, identify headless browsers, or flag privacy tools.

## Build

```bash
npm run build
# Outputs:
# dist/antiAdBlocker.min.js       (minified, readable)
# dist/antiAdBlocker.min.ob.js    (obfuscated, string-array + base64)
```

## Testing

```bash
npm test
# Runs JSDOM-based tests for bait element creation and blocked detection
```

## License

MIT