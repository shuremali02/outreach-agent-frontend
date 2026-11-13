import { api } from "./client";
import type { Lead } from "@/types";

/** Voice notes on a lead (2026-11-12). Audio lives in Cloudflare R2; see app/api/voice_notes.py. */
export const voiceNotesApi = {
  /** Sends the recorded Blob as the raw request body; answers the updated lead (its notes now carry the marker). */
  upload: (leadId: number, blob: Blob, durationMs: number) =>
    api.upload<Lead>(
      `/leads/${leadId}/voice-notes?duration_ms=${Math.round(durationMs)}`,
      blob,
      blob.type.split(";")[0] || "audio/mp4",
    ),
  /** A short-lived signed link the <audio> element plays (the bucket is private). */
  url: (id: number) => api.get<{ url: string; expires_in: number; duration_ms: number }>(`/voice-notes/${id}/url`),
  /** Answers the updated lead (the note's marker line is gone from its notes). */
  remove: (id: number) => api.delete<Lead>(`/voice-notes/${id}`),
};
