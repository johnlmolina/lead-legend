import Link from "next/link";
import { requireOrganization } from "@/lib/dal";
import { DashboardNav } from "@/components/DashboardNav";
import { Logo } from "@/components/Logo";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { membership } = await requireOrganization();
  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  const orgName = organization?.name ?? "";
  const initial = orgName.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      <aside className="hidden w-64 shrink-0 bg-ink sm:flex sm:flex-col">
        <Link href="/dashboard" className="flex items-center px-6 py-6" aria-label="Lead Legend home">
          <Logo wordmarkClassName="text-white" markClassName="shadow-none" />
        </Link>
        <div className="flex-1 px-4">
          <DashboardNav />
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-accent-400 to-accent-600 text-sm font-semibold text-ink">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{orgName}</p>
              <p className="truncate text-xs capitalize text-zinc-400">{membership.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
