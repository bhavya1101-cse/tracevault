// TraceMail background service worker.
//
// All network calls to the TraceVault backend happen HERE, not in
// content.js. Content scripts run in the visited page's context (Gmail's
// origin) - fetch() from there isn't reliably covered by this extension's
// host_permissions CORS exemption the way a background-script fetch is,
// and the backend's CORS policy doesn't allow mail.google.com as an
// origin anyway. Routing every backend call through here sidesteps that
// entirely, and centralizes shared state (badge count, scan history).

const BACKEND_URL = "https://tracevault-54hy.onrender.com";
const TRACEVAULT_URL = "https://tracevault-seven.vercel.app/";
const MAX_HISTORY = 20;

async function getExtensionUserId() {
  const stored = await chrome.storage.local.get("tracemail_user_id");
  if (stored.tracemail_user_id) return stored.tracemail_user_id;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ tracemail_user_id: id });
  return id;
}

async function analyzeEmail(email) {
  const userId = await getExtensionUserId();
  const response = await fetch(`${BACKEND_URL}/api/evidence/extension-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({
      subject: email.subject,
      sender: email.sender,
      sender_email: email.senderEmail,
      body: email.body,
      source_url: email.url,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  const result = await response.json();
  const caseId = result.case?.evidence_id || null;
  const analysis = result.analysis || null;

  await recordResult(analysis, caseId, email.subject);
  return { analysis, caseId };
}

async function recordResult(analysis, caseId, subject) {
  const severity = (analysis?.severity || "").toLowerCase();

  if (severity === "high" || severity === "critical") {
    chrome.notifications.create(caseId || `case-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: `TraceMail: ${(analysis.severity || "").toUpperCase()} risk email detected`,
      message: analysis.threat_summary || subject || "Open TraceMail to investigate.",
      priority: 2,
    });

    const stored = await chrome.storage.local.get("badgeCount");
    const count = (stored.badgeCount || 0) + 1;
    await chrome.storage.local.set({ badgeCount: count });
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: "#d1685c" });
  }

  const stored = await chrome.storage.local.get("history");
  const history = stored.history || [];
  history.unshift({
    caseId,
    subject: subject || "(no subject)",
    severity: analysis?.severity || "Unknown",
    attackType: analysis?.attack_type || "Unknown",
    analyzedAt: Date.now(),
  });

  await chrome.storage.local.set({
    lastAnalysis: analysis,
    lastCaseId: caseId,
    lastAnalyzedAt: Date.now(),
    history: history.slice(0, MAX_HISTORY),
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ANALYZE_EMAIL") {
    analyzeEmail(message.payload)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => {
        console.error("TraceMail analysis failed:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // keep the message channel open for the async response
  }
  return false;
});

// Clicking a notification opens that case directly in TraceVault.
chrome.notifications.onClicked.addListener((notificationId) => {
  const isFallback = notificationId.startsWith("case-");
  const url = isFallback ? TRACEVAULT_URL : `${TRACEVAULT_URL}evidence?case=${notificationId}`;
  chrome.tabs.create({ url });
});