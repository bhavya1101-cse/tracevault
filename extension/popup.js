// TraceMail popup.
//
// Detection now happens automatically in content.js/background.js. This
// popup shows the most recent result and a short scan history (both kept
// in chrome.storage.local by background.js), and lets the user manually
// re-check the current email or jump into TraceVault.

const TRACEVAULT_URL = "https://tracevault-seven.vercel.app/";

const analyzeBtn = document.getElementById("analyzeBtn");
const traceVaultBtn = document.getElementById("traceVaultBtn");
const statusEl = document.getElementById("status");
const analysisResult = document.getElementById("analysisResult");
const riskBadge = document.getElementById("riskBadge");
const threatType = document.getElementById("threatType");
const severityEl = document.getElementById("severity");
const confidenceEl = document.getElementById("confidence");
const threatSummaryEl = document.getElementById("threatSummary");
const historyList = document.getElementById("historyList");

let currentCaseId = null;

function severityColor(sev) {
  switch ((sev || "").toLowerCase()) {
    case "critical": return "#d1685c";
    case "high": return "#e08a7d";
    case "medium": return "#e0ad63";
    case "low": return "#8bbf9f";
    default: return "#9c8d80";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function renderAnalysis(analysis, caseId) {
  currentCaseId = caseId;

  if (!analysis) {
    analysisResult.classList.add("hidden");
    statusEl.textContent = "No email analyzed yet. Open an email in Gmail — TraceMail checks it automatically.";
    return;
  }

  analysisResult.classList.remove("hidden");
  threatType.textContent = analysis.attack_type || "Unknown";
  severityEl.textContent = analysis.severity || "Unknown";
  severityEl.style.color = severityColor(analysis.severity);

  const score = Number(analysis.confidence_score);
  confidenceEl.textContent = Number.isFinite(score) ? `${Math.round(score * 100)}%` : "N/A";

  threatSummaryEl.textContent =
    analysis.threat_summary || analysis.root_cause_explanation || "No threat summary available.";

  riskBadge.textContent = (analysis.severity || "UNKNOWN").toUpperCase();
  riskBadge.style.background = severityColor(analysis.severity);

  statusEl.textContent = caseId ? `Case ID: ${caseId}` : "Analyzed (no case ID returned).";
}

function renderHistory(history) {
  historyList.innerHTML = "";
  if (!history || history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No emails scanned yet this session.</li>';
    return;
  }
  history.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <span class="history-dot" style="background:${severityColor(item.severity)}"></span>
      <span class="history-subject">${escapeHtml(item.subject)}</span>
      <span class="history-severity" style="color:${severityColor(item.severity)}">${item.severity}</span>
    `;
    historyList.appendChild(li);
  });
}

function loadState() {
  chrome.storage.local.get(["lastAnalysis", "lastCaseId", "history"], (data) => {
    renderAnalysis(data.lastAnalysis, data.lastCaseId);
    renderHistory(data.history);
  });
}

loadState();

// Opening the popup means the user has seen the alerts - clear the badge.
chrome.storage.local.set({ badgeCount: 0 });
chrome.action.setBadgeText({ text: "" });

chrome.storage.onChanged.addListener((changes) => {
  if (changes.lastAnalysis || changes.lastCaseId || changes.history) loadState();
});

analyzeBtn.addEventListener("click", async () => {
  statusEl.textContent = "Re-checking the current email...";

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab?.url?.startsWith("https://mail.google.com/")) {
    statusEl.textContent = "Please open Gmail first.";
    return;
  }

  chrome.tabs.sendMessage(currentTab.id, { action: "ANALYZE_CURRENT_EMAIL" }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      statusEl.textContent = "Could not reach the Gmail tab. Try refreshing Gmail.";
    }
    // Result arrives via the storage.onChanged listener above once analysis finishes.
  });
});

traceVaultBtn.addEventListener("click", async () => {
  const stored = await chrome.storage.local.get("tracemail_user_id");
  const uid = stored.tracemail_user_id || "";
  const url = currentCaseId
    ? `${TRACEVAULT_URL}evidence?case=${currentCaseId}&uid=${uid}`
    : `${TRACEVAULT_URL}?uid=${uid}`;
  chrome.tabs.create({ url });
});