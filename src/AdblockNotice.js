import { defineComponent, h } from "vue";
import { useAdblockNotice } from "./useAdblockNotice.js";
import { randomOverlayStyle } from "./detect.js";

const copy = {
  en: {
    title: "Ad blocker detected",
    body: "We have limited advertising on our sites. Disable the ad blocker to continue, or dismiss this and keep browsing.",
    how: "How to disable",
    done: "Ok, done",
    back: "Back",
    steps: [
      "Click the ad-blocker icon. It is usually in the top right of the browser.",
      "Turn the blocker off for this site.",
      "Click Ok, done to reload.",
    ],
  },
  it: {
    title: "Adblock rilevato",
    body: "Abbiamo limitato la pubblicità sui nostri siti. Disattiva l'AdBlock per continuare, oppure chiudi questo avviso.",
    how: "Come lo disattivo?",
    done: "Ok, fatto!",
    back: "Indietro",
    steps: [
      "Clicca sull'icona dell'estensione per il blocco annunci, di solito in alto a destra.",
      "Disattiva il blocco annunci per questo sito.",
      "Aggiorna la pagina cliccando su Ok, fatto.",
    ],
  },
};

export const AdblockNotice = defineComponent({
  name: "AdblockNotice",
  props: {
    locale: { type: String, default: "" },
    blocking: { type: Boolean, default: false },
    scriptUrls: { type: Array, default: () => [] },
    bait: { type: Boolean, default: true },
    baitClasses: { type: Array, default: () => [] },
    rememberDismiss: { type: Boolean, default: false },
    collectFingerprint: { type: Boolean, default: false },
    timeoutMs: { type: Number, default: 2500 },
  },
  emits: ["detected", "dismiss"],
  setup(props, { emit }) {
    const notice = useAdblockNotice({
      scriptUrls: props.scriptUrls.length > 0 ? props.scriptUrls : undefined,
      bait: props.bait,
      baitClasses: props.baitClasses.length > 0 ? props.baitClasses : undefined,
      rememberDismiss: props.rememberDismiss,
      collectFingerprint: props.collectFingerprint,
      timeoutMs: props.timeoutMs,
    });
    const page = { value: 1 };

    function text() {
      const lang = props.locale || (typeof navigator !== "undefined" ? navigator.language : "en");
      return lang.toLowerCase().startsWith("it") ? copy.it : copy.en;
    }

    return () => {
      if (notice.checking.value || !notice.detected.value || notice.dismissed.value) return null;
      emit("detected", { reason: notice.reason.value, details: notice.details.value, fingerprint: notice.fingerprint.value });
      const t = text();
      const card = h("div", {
        style: "width:100%;max-width:500px;margin:auto;background:#fff;color:#111;border-radius:1rem;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
        role: "dialog",
      }, [
        h("section", { style: "padding:30px 20px 10px;min-height:220px" }, page.value === 1
          ? [h("h2", { style: "margin:0 0 12px;font-size:2rem;text-transform:uppercase" }, t.title), h("p", { style: "color:#6b7280;line-height:1.5" }, t.body)]
          : [h("h2", { style: "margin:0 0 12px" }, t.how), h("ol", { style: "color:#6b7280;padding-left:20px" }, t.steps.map((step) => h("li", { style: "margin:12px 0" }, step)))]),
        h("div", { style: "display:flex;border-top:1px solid #e5e7eb" }, [
          h("button", {
            type: "button",
            style: "width:50%;height:60px;border:0;background:#fff;cursor:pointer",
            onClick: () => { page.value = page.value === 1 ? 2 : 1; },
          }, page.value === 1 ? t.how : t.back),
          h("button", {
            type: "button",
            style: "width:50%;height:60px;border:0;background:#111;color:#fff;font-weight:700;cursor:pointer",
            onClick: () => {
              if (props.blocking) window.location.reload();
              else {
                notice.dismiss();
                emit("dismiss");
              }
            },
          }, t.done),
        ]),
      ]);

      if (!props.blocking) return card;
      return h("div", { style: randomOverlayStyle() }, [card]);
    };
  },
});