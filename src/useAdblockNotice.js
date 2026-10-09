import { onMounted, ref, readonly } from "vue";
import { detectAdBlock, getBrowserFingerprint } from "./detect.js";

export function useAdblockNotice(options = {}) {
  const detected = ref(false);
  const reason = ref("pending");
  const details = ref({});
  const dismissed = ref(false);
  const checking = ref(false);
  const fingerprint = ref(null);

  async function check() {
    if (checking.value) return { detected: detected.value, reason: reason.value, details: details.value };

    checking.value = true;
    try {
      const result = await detectAdBlock(options);
      detected.value = result.detected;
      reason.value = result.reason;
      details.value = result.details ?? {};
      return result;
    } finally {
      checking.value = false;
    }
  }

  function dismiss() {
    dismissed.value = true;
    if (options.rememberDismiss && typeof localStorage !== "undefined") {
      localStorage.setItem(options.storageKey || "vue-adblock-notice:dismissed", "1");
    }
  }

  onMounted(() => {
    // SSR guard
    if (typeof window === "undefined" || typeof document === "undefined") {
      checking.value = false;
      return;
    }

    if (options.rememberDismiss && typeof localStorage !== "undefined") {
      dismissed.value = localStorage.getItem(options.storageKey || "vue-adblock-notice:dismissed") === "1";
    }

    if (options.collectFingerprint) {
      fingerprint.value = getBrowserFingerprint();
    }

    check();
  });

  return {
    detected: readonly(detected),
    reason: readonly(reason),
    details: readonly(details),
    dismissed: readonly(dismissed),
    checking: readonly(checking),
    fingerprint: readonly(fingerprint),
    check,
    dismiss,
  };
}