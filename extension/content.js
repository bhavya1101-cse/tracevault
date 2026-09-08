// TraceMail content script.
//
// Runs continuously on Gmail. Detects when the user opens a new email and
// sends it for analysis automatically - no button click needed. Also does
// a cheap, fully local pre-screen (no network call) on inbox list rows,
// so "detect every mail" doesn't mean burning a Gemini/VirusTotal call on
// every single email that scrolls past.

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

// Returns a rough 0-7ish local score, purely for instant UI feedback
// (row badges, no network). The backend's real AI analysis is always the
// authoritative verdict for the banner/notification.
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

async function analyzeIfNewEmail() {
  const { email, bodyElement } = getCurrentEmail();
  if (!email.subject && !email.sender && !email.body) return; // no email open

  const key = `${email.senderEmail}|${email.subject}`;
  if (key === lastAnalyzedKey) return; // already handled this one
  lastAnalyzedKey = key;

  const links = extractLinks(bodyElement);
  localHeuristicScore(email, links); // computed for consistency/future use; the banner below uses the backend's real verdict

  const result = await sendForAnalysis(email);
  if (!result.success) {
    console.error("TraceMail: analysis failed:", result.error);
    return;
  }

  const { analysis, caseId } = result;
  const severity = (analysis?.severity || "").toLowerCase();
  if (severity === "high" || severity === "critical") {
    injectEmailBanner(analysis, caseId);
  } else {
    removeEmailBanner();
  }
}

// ---------------------------------------------------------------------
// Inline warning banner on the opened email
// ---------------------------------------------------------------------

function removeEmailBanner() {
  const existing = document.getElementById("tracemail-banner");
  if (existing) existing.remove();
}

function injectEmailBanner(analysis, caseId) {
  const container = document.querySelector(".adn.ads") || document.querySelector('[role="main"]');
  if (!container) return;

  removeEmailBanner();

  const color = analysis.severity === "Critical" ? "#d1685c" : "#e08a7d";

  const banner = document.createElement("div");
  banner.id = "tracemail-banner";
  banner.style.cssText = `
    background:${color}22; border:1px solid ${color}; border-radius:10px;
    padding:12px 16px; margin:12px 0; font-family:Arial,Helvetica,sans-serif;
    font-size:13px; display:flex; justify-content:space-between; align-items:center;
    gap:12px; color:#2b2622;
  `;

  const textWrap = document.createElement("div");
  textWrap.innerHTML = `
    <strong style="color:${color};">TraceMail: ${analysis.severity} risk — ${analysis.attack_type}</strong>
    <div style="margin-top:4px;">${analysis.threat_summary || ""}</div>
  `;
  banner.appendChild(textWrap);

  const btn = document.createElement("button");
  btn.textContent = "Investigate in TraceVault";
  btn.style.cssText = `
    background:${color}; color:#fff; border:none; border-radius:6px;
    padding:8px 14px; font-weight:700; cursor:pointer; white-space:nowrap;
  `;
  btn.addEventListener("click", async () => {
    const stored = await chrome.storage.local.get("tracemail_user_id");
    const uid = stored.tracemail_user_id || "";
    window.open(`https://tracevault-seven.vercel.app/evidence?case=${caseId}&uid=${uid}`, "_blank");
  });
  banner.appendChild(btn);

  container.prepend(banner);
}

// ---------------------------------------------------------------------
// Inbox list-view row badges (best effort, local heuristic only)
// ---------------------------------------------------------------------
// NOTE: Gmail's list-view class names (tr.zA, .bog, etc.) are minified
// and can shift between Gmail releases. If badges stop appearing, open a
// row in DevTools and check whether these selectors still match. This is
// intentionally best-effort - the per-email analysis above (which uses
// the stable h2.hP / span[email] selectors your original code already
// relied on) is the reliable core of the extension, this is a bonus.

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
// Gmail is a single-page app that never does a full page reload, so
// there's no "page loaded" event to hook. Two triggers, used together:
// hashchange (Gmail updates the URL hash when you open a thread - the
// more deterministic signal) and a debounced MutationObserver as a
// fallback for cases where the hash doesn't change (e.g. first load).

window.addEventListener("hashchange", () => {
  setTimeout(analyzeIfNewEmail, 500); // let Gmail finish rendering the thread
});

const observeTarget = document.querySelector('[role="main"]') || document.body;
const observer = new MutationObserver(() => {
  clearTimeout(window.__tracemailDebounce);
  window.__tracemailDebounce = setTimeout(analyzeIfNewEmail, 800);
});
observer.observe(observeTarget, { childList: true, subtree: true });

// Cheap, local-only, runs regardless of whether an email is open.
setInterval(scanInboxRows, 2500);

// On-demand re-check from the popup's "Re-check this email" button.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ANALYZE_CURRENT_EMAIL") {
    lastAnalyzedKey = null; // force re-analysis even if unchanged
    analyzeIfNewEmail();
    sendResponse({ success: true });
  }
  return true;
});