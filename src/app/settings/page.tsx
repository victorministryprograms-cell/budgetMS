import { prisma } from "@/lib/db";
import { requirePermission, requireOrganizationAccess } from "@/lib/permissions";
import { Card, CardHeader } from "@/components/ui";
import { SettingsForm } from "./form";

export default async function SettingsPage() {
  await requirePermission("settings:read");
  const { organizationId } = await requireOrganizationAccess().catch(() => ({ organizationId: null as string | null, session: null as never }));
  const settings = await prisma.systemSetting.findMany({ where: { organizationId } }).catch(() => []);
  const map = new Map(settings.map((s) => [s.key, s.value]));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <Card><CardHeader title="Budget controls" subtitle="Thresholds are configurable per organization" />
        <SettingsForm
          organizationId={organizationId}
          initial={{
            warning: map.get("budget.warningThreshold") ?? "80",
            critical: map.get("budget.criticalThreshold") ?? "90",
            mode: map.get("budget.exceedMode") ?? "REQUIRES_APPROVAL",
          }}
        />
      </Card>
    </div>
  );
}
