"use client";

import { useState } from "react";
import {
  useProblems,
  useCreateProblem,
  useSetProblemStatus,
  useDeleteProblem,
} from "@/hooks/use-problems";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { CommentThread } from "./comment-thread";
import { isHighPriority, HIGH_PRIORITY, NORMAL_PRIORITY } from "@/types";
import type { ProblemFilter } from "@/types";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EMPTY_STATES, PROBLEM_DESK_HEADER, PROBLEM_FORM } from "@/lib/constants";

const FILTERS: ProblemFilter[] = ["All Open", "High Priority", "Normal Priority", "Resolved"];
const FILTER_LABELS: Record<ProblemFilter, string> = {
  "All Open": "All Open",
  "High Priority": "🔴 High Priority",
  "Normal Priority": "🟡 Normal Priority",
  Resolved: "✅ Resolved Archive",
};

/**
 * render_sales_problems_ui — rendered twice: embedded on Today (collapsed)
 * and full-page on the Problem Desk (expanded).
 */
export function ProblemDesk({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [filter, setFilter] = useState<ProblemFilter>("All Open");
  const [formOpen, setFormOpen] = useState(defaultExpanded);

  const { data: problems = [], isLoading } = useProblems(filter);
  const create = useCreateProblem();
  const setStatus = useSetProblemStatus();
  const remove = useDeleteProblem();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(HIGH_PRIORITY);
  const [reportedBy, setReportedBy] = useState("Sales Rep");

  const highCount = problems.filter((p) => isHighPriority(p.priority)).length;
  const normalCount = problems.length - highCount;

  return (
    <section>
      <Card accent="danger" className="mb-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="date-eyebrow">{PROBLEM_DESK_HEADER.eyebrow}</p>
            <h2 className="serif-title text-[1.5rem] font-bold">
              {PROBLEM_DESK_HEADER.title}
            </h2>
            <p className="mt-1 text-[0.9rem] text-muted">{PROBLEM_DESK_HEADER.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="terminal-pill" style={{ background: "var(--danger-tint)", color: "var(--danger)" }}>
              🔴 {highCount} High Priority
            </span>
            <span className="terminal-pill" style={{ background: "var(--warn-tint)", color: "var(--warn)" }}>
              🟡 {normalCount} Normal Priority
            </span>
          </div>
        </div>
      </Card>

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="cursor-pointer text-[0.85rem] font-semibold text-muted hover:text-accent"
        >
          ➕ Log a Top-Priority Sales Problem
        </button>

        {formOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              create.mutate(
                { title, description, priority, reported_by: reportedBy },
                {
                  onSuccess: () => {
                    setTitle("");
                    setDescription("");
                  },
                },
              );
            }}
            className="mt-2 rounded-[10px] border border-border bg-card p-4"
          >
            <div className="grid grid-cols-[3fr_1.5fr] gap-3">
              <Field label={PROBLEM_FORM.titleLabel}>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} />
              </Field>
              <fieldset>
                <legend className="mb-1 block text-[0.8rem] font-semibold text-muted">Priority</legend>
                <div className="flex gap-3 pt-1.5">
                  {[HIGH_PRIORITY, NORMAL_PRIORITY].map((p) => (
                    <label key={p} className="flex cursor-pointer items-center gap-1.5 text-[0.85rem]">
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={priority === p}
                        onChange={() => setPriority(p)}
                        className="accent-[var(--accent)]"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-3 grid grid-cols-[3fr_1.5fr] gap-3">
              <Field label="Details">
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field label="Reported By">
                <Input value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} maxLength={120} />
              </Field>
            </div>
            <Button type="submit" variant="primary" size="sm" className="mt-3" disabled={create.isPending}>
              🚨 Submit Problem to Desk
            </Button>
          </form>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "cursor-pointer rounded-[8px] border px-3 py-1.5 text-[0.82rem] font-semibold transition-colors",
              filter === f
                ? "border-transparent bg-accent text-white"
                : "border-border bg-card text-muted hover:border-accent hover:text-accent",
            )}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-[0.9rem] text-muted">Loading problems…</p>}
      {!isLoading && problems.length === 0 && (
        <p className="text-[0.9rem] text-muted">{EMPTY_STATES.problems}</p>
      )}

      {problems.map((p) => {
        const high = isHighPriority(p.priority);
        return (
          <Card key={p.id} accent={high ? "danger" : "warn"} className="mb-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="terminal-pill"
                style={{
                  background: high ? "var(--danger-tint)" : "var(--warn-tint)",
                  color: high ? "var(--danger)" : "var(--warn)",
                }}
              >
                {high ? "🔴 High Priority" : "🟡 Normal Priority"}
              </span>
              <span
                className="terminal-pill"
                style={{
                  background: p.status === "Resolved" ? "var(--success-tint)" : "var(--info-tint)",
                  color: p.status === "Resolved" ? "var(--success)" : "var(--info)",
                }}
              >
                {p.status}
              </span>
              <span className="text-[0.78rem] text-muted">
                Reported by <strong className="text-text">{p.reported_by}</strong> ·{" "}
                {shortDate(p.created_at)}
              </span>
            </div>

            <p className="text-[1rem] font-bold">{p.title}</p>
            {p.description && <p className="mt-1 text-[0.88rem] text-muted">{p.description}</p>}

            <div className="mt-3 flex gap-2">
              {p.status === "Open" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStatus.mutate({ id: p.id, status: "Resolved" })}
                >
                  ✅ Mark Resolved
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStatus.mutate({ id: p.id, status: "Open" })}
                >
                  🔄 Reopen
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => remove.mutate(p.id)}>
                🗑️ Delete
              </Button>
            </div>

            <CommentThread problemId={p.id} count={p.comment_count ?? 0} />
          </Card>
        );
      })}
    </section>
  );
}
