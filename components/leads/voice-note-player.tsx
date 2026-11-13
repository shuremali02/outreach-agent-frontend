"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Trash2 } from "lucide-react";
import { voiceNotesApi } from "@/lib/api";
import { useDeleteVoiceNote } from "@/hooks/use-leads";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Plays one voice note on the notes timeline (WhatsApp style): play/pause, seek bar, time.
 * The audio sits in a private R2 bucket; this asks the backend for a short-lived signed URL when it mounts.
 * `durationSec` comes from the note's marker line -- a recorded webm blob often reports an unknown length
 * (Infinity), so the marker is the reliable total.
 */
export function VoiceNotePlayer({ id, durationSec }: { id: number; durationSec: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [removed, setRemoved] = useState(false);
  const deleteNote = useDeleteVoiceNote();

  const { data, isError, isPending } = useQuery({
    queryKey: ["voice-note-url", id],
    queryFn: () => voiceNotesApi.url(id),
    staleTime: 50 * 60_000, // the signed link lasts 60 min
    retry: false,
  });

  if (removed || isError) {
    return <p className="text-[0.82rem] italic text-muted">Voice note unavailable (deleted or not set up).</p>;
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this voice note?",
      description: "The audio is removed for everyone. Only the person who recorded it can do this.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    deleteNote.mutate(id, {
      onSuccess: () => {
        setRemoved(true); // the lead's notes were patched too, so this line is gone from the timeline
        qc.removeQueries({ queryKey: ["voice-note-url", id] });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete the voice note."),
    });
  }

  const total = durationSec || (data?.duration_ms ? data.duration_ms / 1000 : 0);

  return (
    <div className="mt-1 flex items-center gap-2 rounded-[10px] border border-border bg-card px-2 py-1.5">
      {data && (
        <audio
          ref={audioRef}
          src={data.url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        />
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white disabled:opacity-50"
      >
        {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      </button>
      <input
        type="range"
        min={0}
        max={total || 1}
        step={0.1}
        value={Math.min(current, total || 1)}
        onChange={(e) => {
          const t = Number(e.target.value);
          setCurrent(t);
          if (audioRef.current) audioRef.current.currentTime = t;
        }}
        aria-label="Seek"
        className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--accent)]"
      />
      <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">
        {mmss(current)} / {mmss(total)}
      </span>
      <button
        type="button"
        onClick={remove}
        aria-label="Delete voice note"
        className="shrink-0 cursor-pointer text-muted hover:text-danger"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
