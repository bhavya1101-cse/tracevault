// TraceMail content script.
//
// Runs continuously on Gmail. Detects when the user opens a new email and
// sends it for analysis automatically (silent unless High/Critical), AND
// provides an in-page "Analyze with TraceMail" button for on-demand manual
// checks - clicking it always shows a result, regardless of severity.
//
// The result card and the analyze button are both FIXED, FLOATING overlays
// stacked together in the bottom-right corner - not injected into Gmail's
// own message DOM, which is fragile across Gmail's different layout modes
// (classic vs split reading-pane vs dense list).

function injectBaseStyles() {
  if (document.getElementById("tracemail-base-styles")) return;
  const style = document.createElement("style");
  style.id = "tracemail-base-styles";
  style.textContent = `
    @keyframes tracemail-slide-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #tracemail-banner button:hover { filter: brightness(0.92); }
    #tracemail-fab:hover { filter: brightness(0.94); transform: translateY(-1px); }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------
// Tier 1: local heuristic (instant, free, client-side only)
// ---------------------------------------------------------------------

const URGENCY_KEYWORDS = [
  "verify your account", "verify now", "act now", "immediately", "suspended",
  "unusual activity", "confirm your identity", "click here", "limited time",
  "your account will be", "unauthorized", "security alert", "password expire",
  "update your payment", "failed to deliver", "claim your", "final notice",
];

const BRAND_NAMES = [
  "paypal", "amazon", "microsoft", "apple", "netflix", "bank", "google",
  "facebook", "instagram", "hdfc", "sbi", "icici",
];

const LINK_SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];

function extractLinks(bodyElement) {
  if (!bodyElement) return [];
  const anchors = Array.from(bodyElement.querySelectorAll("a[href]")).slice(0, 20);
  return anchors.map((a) => {
    const href = a.getAttribute("href") || "";
    let hrefDomain = "";
    try {
      hrefDomain = new URL(href, window.location.href).hostname;
    } catch {
      hrefDomain = "";
    }
    const text = (a.innerText || "").trim();
    const textLooksLikeDomain = /\.[a-z]{2,}/i.test(text) && !text.includes(" ");
    const mismatch = textLooksLikeDomain && hrefDomain && !text.toLowerCase().includes(hrefDomain.toLowerCase());
    return { href, hrefDomain, text, mismatch };
  });
}

function localHeuristicScore(email, links) {
  const reasons = [];
  let score = 0;

  const subjectLower = (email.subject || "").toLowerCase();
  const bodyLower = (email.body || "").toLowerCase();
  const senderName = (email.sender || "").toLowerCase();
  const senderDomain = (email.senderEmail.split("@")[1] || "").toLowerCase();

  const urgencyHits = URGENCY_KEYWORDS.filter((kw) => subjectLower.includes(kw) || bodyLower.includes(kw));
  if (urgencyHits.length > 0) {
    score += Math.min(urgencyHits.length, 2);
    reasons.push(`Urgency language: "${urgencyHits[0]}"`);
  }

  const impersonatedBrand = BRAND_NAMES.find((b) => senderName.includes(b));
  if (impersonatedBrand && senderDomain && !senderDomain.includes(impersonatedBrand)) {
    score += 2;
    reasons.push(`Display name mentions "${impersonatedBrand}" but sender domain is "${senderDomain}"`);
  }

  const mismatchedLink = links.find((l) => l.mismatch);
  if (mismatchedLink) {
    score += 2;
    reasons.push(`Link text says "${mismatchedLink.text}" but points to ${mismatchedLink.hrefDomain}`);
  }

  const shortenerHit = links.find((l) => LINK_SHORTENERS.some((s) => l.hrefDomain.includes(s)));
  if (shortenerHit) {
    score += 1;
    reasons.push(`Uses a link shortener (${shortenerHit.hrefDomain})`);
  }

  return { score, reasons };
}

// ---------------------------------------------------------------------
// Reading the currently opened email
// ---------------------------------------------------------------------

function getCurrentEmail() {
  const email = { subject: "", sender: "", senderEmail: "", body: "", url: window.location.href };

  const subjectElement = document.querySelector("h2.hP") || document.querySelector('[role="main"] h2');
  if (subjectElement) email.subject = subjectElement.innerText.trim();

  const senderElement = document.querySelector("h3 span[email]") || document.querySelector("span[email]");
  if (senderElement) {
    email.senderEmail = senderElement.getAttribute("email") || "";
    email.sender = senderElement.innerText.trim();
  }

  const bodyElement = document.querySelector(".a3s.aiL") || document.querySelector(".a3s");
  if (bodyElement) email.body = bodyElement.innerText.trim();

  return { email, bodyElement };
}

function sendForAnalysis(email) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "ANALYZE_EMAIL", payload: email }, (response) => {
      resolve(response || { success: false, error: "No response from background" });
    });
  });
}

let lastAnalyzedKey = null;

async function runAnalysis(email, opts = {}) {
  const key = `${email.senderEmail}|${email.subject}`;
  if (!opts.forceShowBanner && key === lastAnalyzedKey) {
    return { success: true, skipped: true };
  }
  lastAnalyzedKey = key;

  const result = await sendForAnalysis(email);
  if (!result.success) {
    console.error("TraceMail: analysis failed:", result.error);
    return result;
  }

  const { analysis, caseId } = result;
  const severity = (analysis?.severity || "").toLowerCase();
  if (opts.forceShowBanner || severity === "high" || severity === "critical") {
    showResultCard(analysis, caseId);
  } else {
    removeResultCard();
  }
  return result;
}

async function analyzeIfNewEmail() {
  const { email } = getCurrentEmail();
  if (!email.subject && !email.sender && !email.body) return;
  await runAnalysis(email);
}

// ---------------------------------------------------------------------
// Floating result card - sits directly above the Analyze button, same
// corner, same width, reads as one compact widget instead of two
// unrelated floating elements.
// ---------------------------------------------------------------------

function severityMeta(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critical": return { color: "#b23b2e", icon: "⛔", label: "CRITICAL RISK" };
    case "high":      return { color: "#d1685c", icon: "⚠️", label: "HIGH RISK" };
    case "medium":    return { color: "#e0ad63", icon: "⚠️", label: "MEDIUM RISK" };
    case "low":       return { color: "#4a9b6e", icon: "✅", label: "LOW RISK" };
    default:          return { color: "#6b6b6b", icon: "ℹ️", label: "UNKNOWN" };
  }
}

function removeResultCard() {
  const existing = document.getElementById("tracemail-banner");
  if (existing) existing.remove();
}

function showResultCard(analysis, caseId) {
  removeResultCard();
  injectBaseStyles();

  const meta = severityMeta(analysis.severity);

  const card = document.createElement("div");
  card.id = "tracemail-banner";
  card.style.cssText = `
    position: fixed; bottom: 86px; right: 24px; z-index: 999999;
    width: 300px; max-width: calc(100vw - 48px); box-sizing: border-box;
    background: #ffffff; border-radius: 12px; border-left: 5px solid ${meta.color};
    box-shadow: 0 8px 26px rgba(0,0,0,0.18);
    font-family: Arial, Helvetica, sans-serif; color: #2b2622;
    animation: tracemail-slide-in 0.2s ease-out;
    padding: 12px 14px 14px;
  `;

  const header = document.createElement("div");
  header.style.cssText = `display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;`;
  header.innerHTML = `
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:14px;">${meta.icon}</span>
      <span style="font-size:10.5px; font-weight:800; letter-spacing:0.03em; color:${meta.color};">
        ${meta.label}
      </span>
    </div>
  `;
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    background:none; border:none; cursor:pointer; font-size:12px; color:#9a9a9a;
    padding:2px 4px; line-height:1;
  `;
  closeBtn.addEventListener("click", removeResultCard);
  header.appendChild(closeBtn);
  card.appendChild(header);

  const title = document.createElement("div");
  title.style.cssText = `font-size:13px; font-weight:700; margin-bottom:3px;`;
  title.textContent = analysis.attack_type || "Unknown";
  card.appendChild(title);

  const summary = document.createElement("div");
  summary.style.cssText = `
    font-size:11.5px; line-height:1.45; color:#5a534c; margin-bottom:10px;
    max-height: 66px; overflow-y: auto;
  `;
  summary.textContent = analysis.threat_summary || "No summary available.";
  card.appendChild(summary);

  const investigateBtn = document.createElement("button");
  investigateBtn.textContent = "Investigate in TraceVault";
  investigateBtn.style.cssText = `
    width:100%; background:${meta.color}; color:#fff; border:none; border-radius:7px;
    padding:8px 10px; font-size:12px; font-weight:700; cursor:pointer;
  `;
  investigateBtn.addEventListener("click", async () => {
    const stored = await chrome.storage.local.get("tracemail_user_id");
    const uid = stored.tracemail_user_id || "";
    window.open(`https://tracevault-seven.vercel.app/evidence?case=${caseId}&uid=${uid}`, "_blank");
  });
  card.appendChild(investigateBtn);

  document.body.appendChild(card);
}

// ---------------------------------------------------------------------
// Floating "Analyze with TraceMail" button (manual trigger, in-page)
// ---------------------------------------------------------------------

function injectFloatingButton() {
  if (document.getElementById("tracemail-fab")) return;
  injectBaseStyles();

  const btn = document.createElement("button");
  btn.id = "tracemail-fab";
  btn.innerHTML = `<span style="font-size:14px;">🛡</span> Analyze with TraceMail`;
  btn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 999998;
    display: flex; align-items: center; gap: 8px;
    background: #c17a5a; color: #fff; border: none; border-radius: 999px;
    padding: 12px 20px; font-family: Arial, Helvetica, sans-serif; font-size: 13px;
    font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.22);
    transition: transform 0.15s ease, filter 0.15s ease;
  `;
  btn.addEventListener("click", () => manualAnalyze(btn));
  document.body.appendChild(btn);
}

async function manualAnalyze(btn) {
  const { email } = getCurrentEmail();
  if (!email.subject && !email.sender && !email.body) {
    const original = btn.innerHTML;
    btn.innerHTML = `<span style="font-size:14px;">🛡</span> Open an email first`;
    setTimeout(() => (btn.innerHTML = original), 1800);
    return;
  }

  const original = btn.innerHTML;
  btn.innerHTML = `<span style="font-size:14px;">🛡</span> Analyzing...`;
  btn.disabled = true;

  lastAnalyzedKey = null;
  const result = await runAnalysis(email, { forceShowBanner: true });

  btn.disabled = false;
  btn.innerHTML = result?.success
    ? original
    : `<span style="font-size:14px;">🛡</span> Failed - try again`;
  if (!result?.success) setTimeout(() => (btn.innerHTML = original), 2000);
}

// ---------------------------------------------------------------------
// Inbox list-view row badges (best effort, local heuristic only)
// ---------------------------------------------------------------------

function scanInboxRows() {
  const rows = document.querySelectorAll("tr.zA");
  rows.forEach((row) => {
    if (row.dataset.tracemailScanned) return;
    row.dataset.tracemailScanned = "1";

    const senderEl = row.querySelector("span[email]");
    const subjectEl = row.querySelector(".bog");
    if (!senderEl && !subjectEl) return;

    const rowEmail = {
      subject: subjectEl ? subjectEl.innerText.trim() : "",
      sender: senderEl ? senderEl.innerText.trim() : "",
      senderEmail: senderEl ? senderEl.getAttribute("email") || "" : "",
      body: "",
    };

    const { score, reasons } = localHeuristicScore(rowEmail, []);
    if (score >= 2) injectRowBadge(row, score, reasons);
  });
}

function injectRowBadge(row, score, reasons) {
  const subjectCell = row.querySelector(".bog") || row.querySelector(".y6");
  if (!subjectCell || subjectCell.querySelector(".tracemail-row-badge")) return;

  const badge = document.createElement("span");
  badge.className = "tracemail-row-badge";
  badge.title = reasons.join("; ");
  badge.textContent = "⚠";
  badge.style.cssText = `
    display:inline-block; margin-left:6px; padding:1px 6px; border-radius:999px;
    background:${score >= 3 ? "#d1685c" : "#e0ad63"}; color:#fff; font-size:11px;
    font-weight:700; vertical-align:middle;
  `;
  subjectCell.appendChild(badge);
}

// ---------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------

window.addEventListener("hashchange", () => {
  setTimeout(analyzeIfNewEmail, 500);
});

const observeTarget = document.querySelector('[role="main"]') || document.body;
const observer = new MutationObserver(() => {
  clearTimeout(window.__tracemailDebounce);
  window.__tracemailDebounce = setTimeout(analyzeIfNewEmail, 800);
});
observer.observe(observeTarget, { childList: true, subtree: true });

setInterval(() => {
  scanInboxRows();
  injectFloatingButton();
}, 2500);

injectFloatingButton();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ANALYZE_CURRENT_EMAIL") {
    const { email } = getCurrentEmail();
    lastAnalyzedKey = null;
    runAnalysis(email, { forceShowBanner: true });
    sendResponse({ success: true });
  }
  return true;
});