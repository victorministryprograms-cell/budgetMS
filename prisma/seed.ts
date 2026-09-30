import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { SUPERADMIN_PERMISSIONS, ADMIN_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

async function main() {
  const allKeys = [...new Set([...SUPERADMIN_PERMISSIONS, ...ADMIN_PERMISSIONS])];

  for (const key of allKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });
  }

  const permissionIdByKey = new Map<string, string>(
    (await prisma.permission.findMany({ select: { key: true, id: true } })).map((p) => [p.key, p.id])
  );

  async function upsertRole(name: string, permissionKeys: string[]) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { isSystem: true, organizationId: null },
      create: { name, description: `${name} role`, isSystem: true, organizationId: null },
    });
    for (const key of permissionKeys) {
      const permissionId = permissionIdByKey.get(key)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
    return role;
  }

  await upsertRole("SUPERADMIN", SUPERADMIN_PERMISSIONS);
  await upsertRole("ADMIN", ADMIN_PERMISSIONS);

  const org = await prisma.organization.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      name: "Demo Organization",
      code: "DEMO",
      description: "Seeded demo organization",
      email: "info@demo.com",
      country: "US",
      currency: "USD",
      timezone: "UTC",
      status: "ACTIVE",
    },
  });

  const superEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@example.com";
  const superPass = process.env.SEED_SUPERADMIN_PASSWORD ?? "Superadmin123!";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  await prisma.user.upsert({
    where: { email: superEmail.toLowerCase() },
    update: {},
    create: {
      firstName: "Super",
      lastName: "Admin",
      email: superEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(superPass, 12),
      roleId: (await prisma.role.findFirst({ where: { name: "SUPERADMIN" } }))!.id,
      organizationId: null,
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {},
    create: {
      firstName: "Demo",
      lastName: "Admin",
      email: adminEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(adminPass, 12),
      roleId: (await prisma.role.findFirst({ where: { name: "ADMIN" } }))!.id,
      organizationId: org.id,
      status: "ACTIVE",
    },
  });

  // Master data - using Int (cents) for financial fields
  const ops = await prisma.category.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "OPS" } },
    update: {},
    create: { organizationId: org.id, name: "Operations", code: "OPS" },
  });
  for (const [code, name] of [["OFFICE", "Office Supplies"], ["UTIL", "Utilities"], ["MAINT", "Maintenance"]] as const) {
    await prisma.category.upsert({
      where: { organizationId_code: { organizationId: org.id, code } },
      update: {},
      create: { organizationId: org.id, name, code, parentId: ops.id },
    });
  }
  await prisma.category.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "TRAVEL" } },
    update: {},
    create: { organizationId: org.id, name: "Travel", code: "TRAVEL" },
  });

  for (const [code, name] of [["ENG", "Engineering"], ["FIN", "Finance"], ["HR", "People"]] as const) {
    await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code } },
      update: {},
      create: { organizationId: org.id, name, code },
    });
  }

  for (const [code, name] of [["WEB", "Website Revamp"], ["MOBILE", "Mobile App"]] as const) {
    await prisma.project.upsert({
      where: { organizationId_code: { organizationId: org.id, code } },
      update: {},
      create: { organizationId: org.id, name, code, budgetOwnerId: admin.id },
    });
  }

  const eng = await prisma.department.findUniqueOrThrow({ where: { organizationId_code: { organizationId: org.id, code: "ENG" } } });
  const office = await prisma.category.findUniqueOrThrow({ where: { organizationId_code: { organizationId: org.id, code: "OFFICE" } } });
  const travel = await prisma.category.findUniqueOrThrow({ where: { organizationId_code: { organizationId: org.id, code: "TRAVEL" } } });
  const web = await prisma.project.findUniqueOrThrow({ where: { organizationId_code: { organizationId: org.id, code: "WEB" } } });

  const budget = await prisma.budget.upsert({
    where: { organizationId_budgetCode: { organizationId: org.id, budgetCode: "B-2026-OPS" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "2026 Operating Budget",
      budgetCode: "B-2026-OPS",
      periodType: "YEARLY",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      currency: "USD",
      totalAmount: 150000 * 100, // 150000 dollars in cents
      status: "ACTIVE",
      createdById: admin.id,
    },
  });

  const item1 = await prisma.budgetItem.create({
    data: { budgetId: budget.id, categoryId: office.id, departmentId: eng.id, projectId: web.id, description: "Office & equipment", allocatedAmount: 60000 * 100, spentAmount: 12000 * 100 },
  });
  await prisma.budgetItem.create({
    data: { budgetId: budget.id, categoryId: travel.id, departmentId: eng.id, description: "Travel", allocatedAmount: 40000 * 100, spentAmount: 5000 * 100 },
  });

  await prisma.transaction.create({
    data: {
      organizationId: org.id, budgetId: budget.id, budgetItemId: item1.id,
      categoryId: office.id, departmentId: eng.id, projectId: web.id,
      type: "EXPENSE", amount: 2500 * 100, description: "Laptops",
      reference: "SEED-001", status: "APPROVED", createdById: admin.id, approvedById: admin.id, approvedAt: new Date(),
    },
  });
  await prisma.transaction.create({
    data: {
      organizationId: org.id, budgetId: budget.id,
      type: "INCOME", amount: 50000 * 100, description: "Q1 funding",
      reference: "SEED-INC-001", status: "APPROVED", createdById: admin.id, approvedById: admin.id, approvedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: { userId: admin.id, organizationId: org.id, title: "Welcome", message: "Demo workspace seeded.", type: "INFO", link: "/dashboard" },
  });
  await prisma.auditLog.create({
    data: { organizationId: org.id, userId: admin.id, action: "ORGANIZATION_CREATED", entityType: "Organization", entityId: org.id },
  });

  // Default thresholds
  await prisma.systemSetting.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "budget.warningThreshold" } },
    update: { value: process.env.BUDGET_WARNING_THRESHOLD ?? "80" },
    create: { organizationId: org.id, key: "budget.warningThreshold", value: process.env.BUDGET_WARNING_THRESHOLD ?? "80" },
  });
  await prisma.systemSetting.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "budget.criticalThreshold" } },
    update: { value: process.env.BUDGET_CRITICAL_THRESHOLD ?? "90" },
    create: { organizationId: org.id, key: "budget.criticalThreshold", value: process.env.BUDGET_CRITICAL_THRESHOLD ?? "90" },
  });

  console.log("Seed complete:", { org: org.code });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());