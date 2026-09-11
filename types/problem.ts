/** Sales problem — mirrors the `sales_problems` table in db.py. */
export interface Problem {
  id: number;
  title: string;
  description: string;
  priority: ProblemPriority;
  reported_by: string;
  status: ProblemStatus;
  /** ISO datetime */
  created_at: string;
  resolved_at: string | null;
  /** Joined in by the API for badge counts; not a DB column. */
  comment_count?: number;
}

/**
 * Stored inconsistently in db.py: seeds write "High Priority" while the UI radio
 * submits "🔴 High Priority". Both forms live in the table, so treat this as a
 * free string and compare with isHighPriority() rather than by equality.
 */
export type ProblemPriority = string;

export const HIGH_PRIORITY = "🔴 High Priority";
export const NORMAL_PRIORITY = "🟡 Normal Priority";

/** Emoji-tolerant priority check. */
export function isHighPriority(priority: string): boolean {
  return priority.replace(/[^\w\s]/g, "").trim().toLowerCase().startsWith("high");
}
export type ProblemStatus = "Open" | "Resolved";

/** Mirrors `problem_comments`. */
export interface ProblemComment {
  id: number;
  problem_id: number;
  author_name: string;
  comment_text: string;
  created_at: string;
}

export type ProblemFilter = "All Open" | "High Priority" | "Normal Priority" | "Resolved";

export interface CreateProblemInput {
  title: string;
  description?: string;
  priority?: ProblemPriority;
  reported_by?: string;
}

export interface CreateCommentInput {
  author_name: string;
  comment_text: string;
}
