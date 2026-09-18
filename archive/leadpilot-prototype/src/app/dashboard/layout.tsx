import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { NavLinks } from "./nav-links";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 sm:flex sm:flex-col">
        <Link href="/dashboard" className="px-3 text-lg font-semibold tracking-tight">
          LeadPilot
        </Link>
        <div className="mt-6 flex-1">
          <NavLinks />
        </div>
        <div className="border-t border-slate-200 pt-4">
          <p className="truncate px-3 text-sm font-medium">{user.companyName}</p>
          <p className="truncate px-3 text-xs text-slate-500">{user.email}</p>
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 sm:hidden">
          <span className="font-semibold">LeadPilot</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-slate-600">
              Log out
            </button>
          </form>
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
