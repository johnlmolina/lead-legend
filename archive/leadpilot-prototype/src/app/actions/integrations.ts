"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function toggleIntegration(provider: string, connected: boolean) {
  const session = await verifySession();

  await prisma.integration.upsert({
    where: { userId_provider: { userId: session.userId, provider: provider as never } },
    update: { connected },
    create: { userId: session.userId, provider: provider as never, connected },
  });

  revalidatePath("/dashboard/integrations");
}

export async function setIntegrationPhoneNumber(provider: string, phoneNumber: string) {
  const session = await verifySession();

  await prisma.integration.upsert({
    where: { userId_provider: { userId: session.userId, provider: provider as never } },
    update: { phoneNumber: phoneNumber || null },
    create: { userId: session.userId, provider: provider as never, phoneNumber: phoneNumber || null },
  });

  revalidatePath("/dashboard/integrations");
}

export async function updateProfile(name: string, companyName: string) {
  const session = await verifySession();
  await prisma.user.update({
    where: { id: session.userId },
    data: { name, companyName },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
