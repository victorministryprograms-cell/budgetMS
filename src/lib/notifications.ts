import { prisma } from "./db";

export async function notify(input: {
  userId: string;
  organizationId?: string | null;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      link: input.link,
    },
  });
}

export async function notifyOrgUsers(
  organizationId: string,
  input: { title: string; message: string; type?: string; link?: string; excludeUserId?: string },
) {
  const users = await prisma.user.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true },
  });
  const targets = users.filter((u) => u.id !== input.excludeUserId);
  if (targets.length === 0) return 0;
  await prisma.notification.createMany({
    data: targets.map((u) => ({
      userId: u.id,
      organizationId,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      link: input.link,
    })),
  });
  return targets.length;
}
