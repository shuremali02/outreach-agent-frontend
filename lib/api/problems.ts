import { api } from "./client";
import type { CreateCommentInput, CreateProblemInput, Problem, ProblemComment, ProblemStatus } from "@/types";

export const problemsApi = {
  list: (opts: { priority?: string; status?: string } = {}) =>
    api.get<Problem[]>("/problems", { priority: opts.priority, status: opts.status }),
  create: (input: CreateProblemInput) => api.post<Problem>("/problems", input),
  setStatus: (id: number, status: ProblemStatus) => api.patch<Problem>(`/problems/${id}`, { status }),
  remove: (id: number) => api.delete<void>(`/problems/${id}`),
  comments: (id: number) => api.get<ProblemComment[]>(`/problems/${id}/comments`),
  addComment: (id: number, input: CreateCommentInput) =>
    api.post<ProblemComment>(`/problems/${id}/comments`, input),
};
