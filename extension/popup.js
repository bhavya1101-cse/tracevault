const TRACEVAULT_URL =
  "https://tracevault-seven.vercel.app/";
const BACKEND_URL = "https://tracevault-54hy.onrender.com";
const analyzeBtn =
  document.getElementById("analyzeBtn");

const traceVaultBtn =
  document.getElementById("traceVaultBtn");

const statusEl =
  document.getElementById("status");


analyzeBtn.addEventListener("click", async () => {

  statusEl.textContent =
    "Reading the email currently open in Gmail...";

  try {

    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    const currentTab = tabs[0];


    if (!currentTab || !currentTab.id) {

      statusEl.textContent =
        "Unable to access the current tab.";

      return;
    }


    console.log("Current tab:", currentTab);


    if (
      !currentTab.url ||
      !currentTab.url.startsWith(
        "https://mail.google.com/"
      )
    ) {

      statusEl.textContent =
        "Please open an email in Gmail first.";

      return;
    }


    console.log(
      "Gmail detected. Injecting TraceMail..."
    );


    const results =
      await chrome.scripting.executeScript({

        target: {
          tabId: currentTab.id
        },

        func: () => {

          const subjectElement =
            document.querySelector("h2.hP") ||
            document.querySelector(
              '[role="main"] h2'
            );


          const senderElement =
            document.querySelector(
              'h3 span[email]'
            ) ||
            document.querySelector(
              'span[email]'
            );


          const bodyElement =
            document.querySelector(".a3s.aiL") ||
            document.querySelector(".a3s");


          return {

            subject:
              subjectElement
                ? subjectElement.innerText.trim()
                : "",

            sender:
              senderElement
                ? senderElement.innerText.trim()
                : "",

            senderEmail:
              senderElement
                ? (
                    senderElement.getAttribute(
                      "email"
                    ) || ""
                  )
                : "",

            body:
              bodyElement
                ? bodyElement.innerText.trim()
                : "",

            url:
              window.location.href
          };

        }

      });


    console.log(
      "Injection result:",
      results
    );


    if (
      !results ||
      results.length === 0 ||
      !results[0].result
    ) {

      statusEl.textContent =
        "Could not read the current email.";

      return;
    }


    const email =
      results[0].result;


    console.log(
      "Selected email:",
      email
    );


    if (
      !email.subject &&
      !email.sender &&
      !email.body
    ) {

      statusEl.textContent =
        "No open email detected. Open an email and try again.";

      return;
    }


    const BACKEND_URL =
  "https://tracevault-54hy.onrender.com";


statusEl.textContent =
  "Sending selected email to TraceVault...";


const response = await fetch(
  `${BACKEND_URL}/api/evidence/extension-preview`,
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      subject: email.subject,
      sender: email.sender,
      sender_email: email.senderEmail,
      body: email.body,
      source_url: email.url
    })
  }
);


if (!response.ok) {

  const errorText =
    await response.text();

  throw new Error(
    `TraceVault returned ${response.status}: ${errorText}`
  );
}


const result =
  await response.json();
console.log("TraceVault analysis:", result);
const analysis = result.analysis;

if (analysis) {
  const analysisResult = document.getElementById("analysisResult");
  const riskBadge = document.getElementById("riskBadge");
  const threatType = document.getElementById("threatType");
  const severity = document.getElementById("severity");
  const confidence = document.getElementById("confidence");
  const threatSummary = document.getElementById("threatSummary");

  analysisResult.classList.remove("hidden");

  threatType.textContent = analysis.attack_type || "Unknown";
  severity.textContent = analysis.severity || "Unknown";

  const score = Number(analysis.confidence_score);

  confidence.textContent = Number.isFinite(score)
    ? `${Math.round(score * 100)}%`
    : "N/A";

  threatSummary.textContent =
    analysis.threat_summary ||
    analysis.root_cause_explanation ||
    "No threat summary available.";

  riskBadge.textContent =
    (analysis.severity || "UNKNOWN").toUpperCase();
}
const caseId = result.case?.evidence_id || null;

await chrome.storage.local.set({
  selectedEmail: email,
  traceVaultResponse: result,
  caseId: caseId
});

if (caseId) {
  statusEl.textContent = "Case created ✓ Investigation ID: " + caseId;
} else {
  statusEl.textContent = "TraceVault connected ✓";
}
console.log(
  "TraceVault response:",
  result
);


await chrome.storage.local.set({
  selectedEmail: email,
  traceVaultResponse: result
});


    statusEl.innerHTML = `
        <strong>TraceVault connected ✓</strong>
        <br>
        Email received successfully.
`       ;


  } catch (error) {

    console.error(
      "TraceMail error:",
      error
    );


    const errorMessage =
      error && error.message
        ? error.message
        : String(error);


    console.error(
      "TraceMail error message:",
      errorMessage
    );


    statusEl.innerHTML = `
      <strong>TraceMail error</strong>
      <br>
      ${errorMessage}
    `;

  }

});


traceVaultBtn.addEventListener(
  "click",
  () => {

    chrome.tabs.create({
      url: TRACEVAULT_URL
    });

  }
);