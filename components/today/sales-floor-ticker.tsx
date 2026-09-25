import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TerminalPill } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { currency, num } from "@/lib/format";
import type { WeekStats } from "@/types";
import { Ico } from "@/components/ui/emoji-icon";

/** The green-barred Live Sales Floor strip + jump to the Sales Terminal. */
export function SalesFloorTicker({ total }: { total: WeekStats }) {
  return (
    <div className="mb-4 grid grid-cols-[4fr_1.2fr] items-center gap-4">
      <Card accent="success">
        <TerminalPill variant="green"><Ico e="⚡" /> SALES FLOOR DESK</TerminalPill>
        <p className="mt-2 font-mono text-[1.05rem] font-bold tracking-tight text-text">
          {num(total.attempts)} Dials · {num(total.live_interactions)} Live Calls ·{" "}
          {num(total.meetings_scheduled)} Meetings Booked · {currency(total.pipeline_value)} Pipeline
        </p>
      </Card>
      <Button asChild variant="primary" block>
        <Link href="/terminal"><Ico e="📊" /> Open Sales Terminal</Link>
      </Button>
    </div>
  );
}
