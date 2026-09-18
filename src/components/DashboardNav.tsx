"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HouseIcon,
  DatabaseIcon,
  ChartIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/icons";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: HouseIcon },
  { href: "/dashboard/leads", label: "Leads", icon: DatabaseIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/dashboard/settings", label: "Settings", icon: ShieldIcon },
  { href: "/dashboard/profile", label: "Profile", icon: SparkIcon },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <link.icon
              className={`h-4 w-4 shrink-0 ${isActive ? "text-accent-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
            />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
