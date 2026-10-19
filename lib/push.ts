import { pushApi } from "@/lib/api";

/** PushManager wants the VAPID public key as a Uint8Array, not the base64url string the backend hands back. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array<ArrayBuffer>(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Subscribes this browser/device for real Web Push (user, 2026-10-18: "humyn notify system banana hai
 * jis sy device me notifiction aye jese sab k baki apps me ati hain") -- unlike the Notification Web
 * API toast in notification-bell.tsx, this reaches the device even with every tab/the browser closed.
 *
 * Called right after Notification permission is granted, and once on every signed-in load in case
 * permission was already granted in an earlier session but a subscription was never created (e.g. this
 * feature shipped after that grant). Always best-effort -- push is a bonus, never something the rest of
 * the app should wait on or break over.
 */
export async function ensurePushSubscription(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { key } = await pushApi.vapidPublicKey();
      if (!key) return; // backend has no VAPID key configured yet
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
    await pushApi.subscribe({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
  } catch {
    // Best effort -- e.g. the backend has no VAPID key yet, or this browser denied/doesn't support it.
  }
}
