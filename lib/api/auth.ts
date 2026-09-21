import { api } from "./client";
import type { AuthConfig, AuthUser, LoginResult } from "@/types";

export const authApi = {
  /** Public: what the login page needs (Google client id, allowed domain, dev-login flag). */
  config: () => api.get<AuthConfig>("/auth/config"),
  google: (credential: string) => api.post<LoginResult>("/auth/google", { credential }),
  /** Create an account (name + approved email + password) and sign in. */
  signup: (input: { name: string; email: string; password: string; code?: string }) =>
    api.post<LoginResult>("/auth/signup", input),
  login: (email: string, password: string) => api.post<LoginResult>("/auth/login", { email, password }),
  /** Local testing only -- 404 unless the backend has AUTH_DEV_LOGIN=true. */
  devLogin: (email: string) => api.post<LoginResult>("/auth/dev-login", { email }),
  me: () => api.get<AuthUser>("/auth/me"),
  users: () => api.get<AuthUser[]>("/users"),
};
