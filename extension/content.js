// TraceMail content script.
//
// MANUAL-ONLY MODE: automatic detection on every opened email has been
// turned off for demo predictability. Analysis now only runs when the
// user clicks "Analyze with TraceMail" (or "Re-check This Email" in the
// popup). Inbox row badges still work (local-only, no network call).

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

  const shortenerHit = links.find((l) => LINK_SHORTENERS.some((s) => l.hrefDomain.includes(s)));
  if (shortenerHit) {
    score += 1;
    reasons.push(`Uses a link shortener (${shortenerHit.hrefDomain})`);
  }

  return { score, reasons };
}

function isRealOpenEmail(hash) {
  return /#[a-z]+\/[A-Za-z0-9]{10,}/.test(hash);
}

function getCurrentEmail() {
  const email = { subject: "", sender: "", senderEmail: "", body: "", url: window.location.href };

  if (!isRealOpenEmail(window.location.hash)) {
    return { email, bodyElement: null };
  }

  const subjectElement = document.querySelector("h2.hP");
  if (subjectElement) email.subject = subjectElement.innerText.trim();

  const senderElement = document.querySelector("h3 span[email]");
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
  lastAnalyzedKey = `${email.senderEmail}|${email.subject}`;

  const result = await sendForAnalysis(email);
  if (!result.success) {
    console.error("TraceMail: analysis failed:", result.error);
    return result;
  }

  const { analysis, caseId } = result;
  showResultCard(analysis, caseId);
  return result;
}

function severityMeta(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critical": return { color: "#a5271c", icon: "⛔", label: "CRITICAL RISK" };
    case "high":      return { color: "#c0522f", icon: "⚠️", label: "HIGH RISK" };
    case "medium":    return { color: "#a9720f", icon: "⚠️", label: "MEDIUM RISK" };
    case "low":       return { color: "#2e7d4f", icon: "✅", label: "LOW RISK" };
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

function injectFloatingButton() {
  if (document.getElementById("tracemail-fab")) return;
  injectBaseStyles();

  const btn = document.createElement("button");
  btn.id = "tracemail-fab";
  btn.innerHTML = `<span style="font-size:14px;">🛡</span> Analyze with TraceMail`;
  btn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 999998;
    display: flex; align-items: center; gap: 8px;
    background: #b96a48; color: #fff; border: none; border-radius: 999px;
    padding: 12px 20px; font-family: Arial, Helvetica, sans-serif; font-size: 13px;
    font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.22);
    transition: transform 0.15s ease, filter 0.15s ease;
  `;
  btn.addEventListener("click", () => manualAnalyze(btn));
  document.body.appendChild(btn);
}

async function manualAnalyze(btn) {
  const { email } = getCurrentEmail();
  if (!email.subject || !email.senderEmail) {
    const original = btn.innerHTML;
    btn.innerHTML = `<span style="font-size:14px;">🛡</span> Open an email first`;
    setTimeout(() => (btn.innerHTML = original), 1800);
    return;
  }

  const original = btn.innerHTML;
  btn.innerHTML = `<span style="font-size:14px;">🛡</span> Analyzing...`;
  btn.disabled = true;

  const result = await runAnalysis(email);

  btn.disabled = false;
  btn.innerHTML = result?.success
    ? original
    : `<span style="font-size:14px;">🛡</span> Failed - try again`;
  if (!result?.success) setTimeout(() => (btn.innerHTML = original), 2000);
}

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
    background:${score >= 3 ? "#c0522f" : "#a9720f"}; color:#fff; font-size:11px;
    font-weight:700; vertical-align:middle;
  `;
  subjectCell.appendChild(badge);
}

// NOTE: automatic hashchange / MutationObserver triggers have been
// removed on purpose - scanInboxRows (badges only, no network call) and
// the floating button are the only things that run now.
setInterval(() => {
  scanInboxRows();
  injectFloatingButton();
}, 2500);

injectFloatingButton();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ANALYZE_CURRENT_EMAIL") {
    const { email } = getCurrentEmail();
    runAnalysis(email);
    sendResponse({ success: true });
  }
  return true;
});