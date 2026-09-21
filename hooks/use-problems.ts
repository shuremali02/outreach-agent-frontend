"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { problemsApi } from "@/lib/api";
import type { CreateCommentInput, CreateProblemInput, ProblemFilter, ProblemStatus } from "@/types";

/** Maps the 4 filter buttons onto db.get_sales_problems() arguments. */
export function filterArgs(filter: ProblemFilter) {
  switch (filter) {
    case "High Priority":
      return { priority: "🔴 High Priority", status: "Open" };
    case "Normal Priority":
      return { priority: "🟡 Normal Priority", status: "Open" };
    case "Resolved":
      return { priority: "all", status: "Resolved" };
    default:
      return { priority: "all", status: "Open" };
  }
}

export function useProblems(filter: ProblemFilter) {
  return useQuery({
    queryKey: ["problems", filter],
    queryFn: () => problemsApi.list(filterArgs(filter)),
  });
}

function useInvalidateProblems() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["problems"] });
    qc.invalidateQueries({ queryKey: ["metrics"] });
  };
}

export function useCreateProblem() {
  const invalidate = useInvalidateProblems();
  return useMutation({
    mutationFn: (input: CreateProblemInput) => problemsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useSetProblemStatus() {
  const invalidate = useInvalidateProblems();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProblemStatus }) =>
      problemsApi.setStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteProblem() {
  const invalidate = useInvalidateProblems();
  return useMutation({
    mutationFn: (id: number) => problemsApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useComments(problemId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["comments", problemId],
    queryFn: () => problemsApi.comments(problemId),
    enabled,
  });
}

export function useAddComment(problemId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      problemsApi.addComment(problemId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", problemId] });
      qc.invalidateQueries({ queryKey: ["problems"] });
    },
  });
}
