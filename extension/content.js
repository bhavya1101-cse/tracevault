function getCurrentEmail() {
  const email = {
    subject: "",
    sender: "",
    senderEmail: "",
    body: "",
    url: window.location.href
  };

  // Gmail subject
  const subjectElement =
    document.querySelector("h2.hP") ||
    document.querySelector('[role="main"] h2');

  if (subjectElement) {
    email.subject = subjectElement.innerText.trim();
  }

  // Gmail sender
  const senderElement =
    document.querySelector('h3 span[email]') ||
    document.querySelector('span[email]');

  if (senderElement) {
    email.senderEmail =
      senderElement.getAttribute("email") || "";

    email.sender =
      senderElement.innerText.trim();
  }

  // Currently visible email body
  const bodyElement =
    document.querySelector(".a3s.aiL") ||
    document.querySelector(".a3s");

  if (bodyElement) {
    email.body = bodyElement.innerText.trim();
  }

  return email;
}


chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (message.action === "ANALYZE_CURRENT_EMAIL") {

      const email = getCurrentEmail();

      sendResponse({
        success: true,
        email: email
      });

    }

    return true;
  }
);