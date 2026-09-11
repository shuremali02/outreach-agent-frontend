import { TerminalView } from "@/components/terminal/terminal-view";
import { metricsApi } from "@/lib/api";

export default async function TerminalPage() {
  const team = await metricsApi.team();
  return <TerminalView initialData={team} />;
}
