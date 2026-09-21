import { api } from "./client";
import type { AppNotification } from "@/types";

/** Read endpoints return the new unread count, so the bell can update without a second request. */
export const notificationsApi = {
  list: (limit = 20) => api.get<AppNotification[]>("/notifications", { limit }),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: number) => api.post<{ count: number }>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ count: number }>("/notifications/read-all"),
};
