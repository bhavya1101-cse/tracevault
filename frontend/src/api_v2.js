// TraceVault API helper.
//
// Gives every browser a persistent, anonymous user ID (a UUID stored in
// localStorage) and attaches it to every backend request as the
// "X-User-Id" header. The backend uses this to keep each user's uploaded
// evidence private to them.
//
// This is NOT full authentication (no login, no password) - it's the
// pragmatic version that fits your remaining timeline: it stops one
// person's uploads from showing up for everyone else, without needing a
// real auth system built and tested before the deadline. Swap this for
// real login later if the project continues past SIH.

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function getUserId() {
  // If the user arrived via the "Investigate in TraceVault" link from the
  // TraceMail extension, it carries ?uid=<extension's id>. Adopt that as
  // this browser's ID too, so cases created by the extension show up in
  // this same user's website History instead of looking like two
  // different people.
  const params = new URLSearchParams(window.location.search);
  const uidFromExtension = params.get("uid");
  if (uidFromExtension) {
    localStorage.setItem("tracevault_user_id", uidFromExtension);
  }

  let id = localStorage.getItem("tracevault_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("tracevault_user_id", id);
  }
  return id;
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "X-User-Id": getUserId(),
  };
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response;
}

export { API_URL, getUserId, apiFetch };