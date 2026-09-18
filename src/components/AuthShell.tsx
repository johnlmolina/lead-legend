import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CheckIcon } from "@/components/icons";

const PITCH_POINTS = [
  "Every missed call becomes a tracked lead",
  "AI-drafted replies, kept on-script by your FAQs",
  "Estimates booked straight to your real calendar",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 0%, rgba(240,169,30,0.22), transparent 65%)",
          }}
        />
        <Link href="/" className="relative z-10" aria-label="Lead Legend home">
          <Logo wordmarkClassName="text-white" />
        </Link>
        <div className="relative z-10 max-w-sm">
          <p className="font-display text-3xl italic leading-snug text-white">
            &ldquo;The estimate is booked before the ladder&apos;s off the
            truck.&rdquo;
          </p>
          <ul className="mt-8 space-y-3">
            {PITCH_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-400/15 text-accent-400">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} Lead Legend
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden" aria-label="Lead Legend home">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
