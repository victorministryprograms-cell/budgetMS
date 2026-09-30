"use client";
import { useState } from "react";
import { saveSettings } from "@/lib/server-actions";
import { Button, Input, Label } from "@/components/ui";

export function SettingsForm({ organizationId, initial }: { organizationId: string | null; initial: { warning: string; critical: string; mode: string } }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="grid grid-cols-3 gap-4 p-5" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const r = await saveSettings([
        { key: "budget.warningThreshold", value: String(fd.get("warning")) },
        { key: "budget.criticalThreshold", value: String(fd.get("critical")) },
        { key: "budget.exceedMode", value: String(fd.get("mode")) },
      ], organizationId);
      setMsg(r.success ? "Saved." : "Failed to save.");
    }}>
      <div><Label>Warning threshold %</Label><Input name="warning" defaultValue={initial.warning} /></div>
      <div><Label>Critical threshold %</Label><Input name="critical" defaultValue={initial.critical} /></div>
      <div><Label>Exceed mode</Label><select name="mode" defaultValue={initial.mode} className="h-9 w-full rounded-lg border px-2 text-sm"><option>BLOCKED</option><option>ALLOWED_WITH_WARNING</option><option>REQUIRES_APPROVAL</option></select></div>
      <div className="col-span-3 flex items-center gap-3"><Button>Save settings</Button>{msg && <span className="text-xs text-zinc-600">{msg}</span>}</div>
    </form>
  );
}
