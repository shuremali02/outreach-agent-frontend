"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Loader2, Mic, RotateCw, Send, Square, Trash2, X } from "lucide-react";
import { useUploadVoiceNote } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** One note's cap -- the backend enforces the same (settings.voice_note_max_seconds). */
const MAX_MS = 180_000;

/** Prefer mp4/AAC: Safari records only that, and it plays on every browser/phone. webm/ogg are fallbacks. */
const MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Phase = "idle" | "recording" | "preview";

/** A voice note on its way to the server (or that failed to get there), shown as a chip under the recorder. */
interface Outgoing {
  id: number;
  blob: Blob;
  durationMs: number;
  status: "sending" | "failed";
}

/**
 * Record a voice note with the browser's own MediaRecorder (no library): Record -> Stop -> listen back ->
 * Send or Discard. Max 3 minutes (auto-stops). Sent as the raw audio to POST /leads/{id}/voice-notes; the
 * notes timeline then shows it as a player (components/leads/voice-note-player.tsx).
 */
export function VoiceRecorder({ leadId }: { leadId: number }) {
  const upload = useUploadVoiceNote();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; durationMs: number } | null>(null);
  // Sends run in the background (2026-11-13, user: sending took 4-5 s): Send hands the recording to this list and the
  // recorder is free at once; each entry shows "sending..." until the server confirms, and can be retried if it fails.
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const nextId = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  function releaseMic() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Leaving the page mid-recording must free the microphone.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      releaseMic();
    };
  }, []);

  // Free the preview's object URL when it is replaced or the component goes away.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function start() {
    const mime = pickMime();
    if (!navigator.mediaDevices?.getUserMedia || mime === undefined) {
      toast.error("Voice notes are not supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      // Plain audio:true turns on the browser's call-style processing (echo cancellation + noise
      // suppression). On Windows that makes a voice sound thin and far away even with the mic right at the
      // mouth (user, 2026-11-13: "awaz ese arhi hai k bhout dur sy bola ja rha ho"). A voice note wants the
      // natural sound: processing off, mono, level evening (auto gain) kept on so it is not too quiet.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch {
      toast.error("Microphone access was blocked. Allow the microphone for this site and try again.");
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    cancelledRef.current = false;
    // 128 kbps: the default bitrate for speech is low enough to sound muffled.
    const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const durationMs = Math.min(Date.now() - startedRef.current, MAX_MS);
      releaseMic();
      if (cancelledRef.current) return;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime });
      setPreview({ blob, url: URL.createObjectURL(blob), durationMs });
      setPhase("preview");
    };
    startedRef.current = Date.now();
    setElapsed(0);
    recorder.start();
    setPhase("recording");
    tickRef.current = setInterval(() => {
      const ms = Date.now() - startedRef.current;
      setElapsed(ms);
      if (ms >= MAX_MS && recorder.state !== "inactive") recorder.stop();
    }, 250);
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    releaseMic();
    setPhase("idle");
  }

  function discard() {
    setPreview(null);
    setPhase("idle");
  }

  function submit(item: Outgoing) {
    setOutbox((list) => list.map((o) => (o.id === item.id ? { ...o, status: "sending" } : o)));
    // mutateAsync, one promise per send: overlapping sends each report their own result.
    upload
      .mutateAsync({ id: leadId, blob: item.blob, durationMs: item.durationMs })
      .then(() => {
        setOutbox((list) => list.filter((o) => o.id !== item.id));
        toast.success("Voice note added");
      })
      .catch((e: unknown) => {
        setOutbox((list) => list.map((o) => (o.id === item.id ? { ...o, status: "failed" } : o)));
        toast.error(e instanceof Error ? e.message : "Could not send the voice note.");
      });
  }

  function send() {
    if (!preview) return;
    const item: Outgoing = { id: ++nextId.current, blob: preview.blob, durationMs: preview.durationMs, status: "sending" };
    setOutbox((list) => [...list, item]);
    setPreview(null);
    setPhase("idle");
    submit(item);
  }

  let main: ReactNode;
  if (phase === "recording") {
    main = (
      <div className="flex w-full flex-wrap items-center gap-2 rounded-[8px] border border-danger bg-input px-3 py-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden />
        <span className="text-[0.85rem] font-semibold tabular-nums">
          {mmss(elapsed)} / {mmss(MAX_MS)}
        </span>
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={cancelRecording}>
          <Trash2 className="h-4 w-4" aria-hidden /> Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={stop}>
          <Square className="h-4 w-4" aria-hidden /> Stop
        </Button>
      </div>
    );
  } else if (phase === "preview" && preview) {
    main = (
      <div className="flex w-full flex-col gap-2 rounded-[8px] border border-border bg-input px-3 py-2">
        <p className="text-[0.8rem] font-semibold">Voice note ({mmss(preview.durationMs)}) -- listen, then send</p>
        <audio controls src={preview.url} className="h-9 w-full" />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={discard}>
            <Trash2 className="h-4 w-4" aria-hidden /> Discard
          </Button>
          <Button variant="primary" size="sm" onClick={send}>
            <Send className="h-4 w-4" aria-hidden /> Send
          </Button>
        </div>
      </div>
    );
  } else {
    main = (
      <Button variant="secondary" size="sm" onClick={start} className="self-start">
        <Mic className="h-4 w-4" aria-hidden /> Record voice note
      </Button>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", (phase !== "idle" || outbox.length > 0) && "w-full")}>
      {main}
      {outbox.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {outbox.map((o) => (
            <li
              key={o.id}
              className={cn(
                "flex items-center gap-2 rounded-[8px] border bg-input px-3 py-1.5 text-[0.82rem]",
                o.status === "failed" ? "border-danger text-danger" : "border-border text-muted",
              )}
            >
              {o.status === "sending" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">
                Voice note ({mmss(o.durationMs)}) · {o.status === "sending" ? "sending…" : "not sent"}
              </span>
              {o.status === "failed" && (
                <>
                  <button
                    type="button"
                    onClick={() => submit(o)}
                    className="inline-flex cursor-pointer items-center gap-1 font-semibold text-accent hover:underline"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutbox((list) => list.filter((x) => x.id !== o.id))}
                    aria-label="Dismiss"
                    className="cursor-pointer text-muted hover:text-text"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
