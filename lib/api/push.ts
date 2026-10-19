import { api } from "./client";

export const pushApi = {
  vapidPublicKey: () => api.get<{ key: string }>("/push/vapid-public-key"),
  subscribe: (sub: { endpoint: string; p256dh: string; auth: string }) =>
    api.post<{ ok: boolean }>("/push/subscribe", sub),
  unsubscribe: (endpoint: string) => api.post<{ ok: boolean }>("/push/unsubscribe", { endpoint }),
};
