import { detectAdBlock, randomOverlayStyle } from "./detect.js";

const messages = {
  it: {
    kicker: "Alt! Mi è sembrato di vedere un...",
    title: "Adblock!",
    body: "Abbiamo limitato la pubblicità sui nostri siti, ti chiediamo la cortesia di disabilitare l'AdBlock per continuare a navigare. Grazie!",
    how: "Come lo disattivo?",
    done: "Ok, fatto!",
    back: "Indietro",
    helpTitle: "Come disattivare l'Ad Blocker",
    steps: [
      "Clicca sull'icona dell'estensione per il blocco annunci. Di solito si trova nell'angolo in alto a destra dello schermo.",
      "Segui le istruzioni per disattivare il blocco annunci.",
      "Aggiorna la pagina cliccando su Ok, fatto!",
    ],
  },
  en: {
    kicker: "Alt! I thought I saw an...",
    title: "Adblock!",
    body: "We have limited advertising on our sites, we ask you to disable AdBlock to continue browsing. Thank you!",
    how: "How to disable?",
    done: "Ok, done!",
    back: "Back",
    helpTitle: "How to disable Ad Blocker",
    steps: [
      "Click on the extension icon for the ad blocker. It is usually located in the top right corner of the screen.",
      "Follow the instructions to disable ad blocking.",
      "Refresh the page by clicking on Ok, done!",
    ],
  },
};

function mountBanner(options = {}) {
  const lang = (options.locale || (typeof navigator !== "undefined" ? navigator.language : "en") || "en").toLowerCase().startsWith("it") ? "it" : "en";
  const t = messages[lang];
  const body = document.body;
  body.style.overflow = "hidden";
  const root = document.createElement("div");
  root.setAttribute("style", randomOverlayStyle());
  let showHelp = false;

  function render() {
    root.replaceChildren();
    const card = document.createElement("div");
    card.setAttribute("style", "width:100%;max-width:500px;margin:auto;background:#fff;border-radius:1rem;overflow:hidden;position:relative");
    const section = document.createElement("section");
    section.setAttribute("style", "padding:30px 16px 10px;min-height:305px");
    if (!showHelp) {
      section.innerHTML = `<p style="text-transform:uppercase">${t.kicker}</p><p style="font-size:3rem;font-weight:700;text-transform:uppercase;margin:8px 0">${t.title}</p><p style="color:#6b7280;line-height:28px">${t.body}</p>`;
    } else {
      section.innerHTML = `<p style="font-weight:700;font-size:1.5rem">${t.helpTitle}</p><ol style="color:#6b7280">${t.steps.map((step) => `<li style="margin:16px 20px">${step}</li>`).join("")}</ol>`;
    }
    const bar = document.createElement("div");
    bar.setAttribute("style", "display:flex;border-top:1px solid #e5e7eb");
    const how = document.createElement("button");
    how.type = "button";
    how.textContent = showHelp ? t.back : t.how;
    how.setAttribute("style", "width:50%;height:60px;border:0;background:#fff;cursor:pointer");
    how.addEventListener("click", () => { showHelp = !showHelp; render(); });
    const done = document.createElement("button");
    done.type = "button";
    done.textContent = t.done;
    done.setAttribute("style", "width:50%;height:60px;border:0;background:#111;color:#fff;font-weight:700;cursor:pointer");
    done.addEventListener("click", () => {
      if (options.allowDismiss) {
        root.remove();
        body.style.overflow = "";
      } else {
        location.reload();
      }
    });
    bar.append(how, done);
    card.append(section, bar);
    root.append(card);
  }

  render();
  body.append(root);
}

window.addEventListener("load", async () => {
  const config = window.__ADBLOCK_NOTICE__ || {};
  const result = await detectAdBlock(config);
  if (result.detected) mountBanner(config);
});