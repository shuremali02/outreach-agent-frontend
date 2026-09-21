import { LoginView } from "@/components/auth/login-view";

// Rendered on demand (it reads the backend's public /auth/config in the browser).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginView />;
}
