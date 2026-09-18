import Link from "next/link";
import { FunnelDiagram } from "@/components/FunnelDiagram";

const FEATURES = [
  {
    title: "Unify every lead source",
    body: "CRM, AI chat, and SMS all feed the same lead database, so nothing falls through the cracks between tools.",
  },
  {
    title: "AI responds in seconds",
    body: "New leads get an instant, on-brand reply and a real phone follow-up — while the trail is still warm.",
  },
  {
    title: "Estimates land on the calendar",
    body: "Once a lead is qualified, LeadPilot books the estimate directly onto your calendar. No manual scheduling.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">LeadPilot</span>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-slate-950">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium tracking-wide text-slate-400 uppercase">
                For home services & contractors
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                From lead to booked estimate, on autopilot.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-300">
                LeadPilot pulls leads in from your CRM, AI chat, and SMS, follows up automatically
                by phone, and books the estimate straight onto your calendar — so your pipeline
                never goes cold.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  Get started free
                </Link>
                <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
                  Log in →
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
              <FunnelDiagram />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            One pipeline. Every channel. Zero manual follow-up.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              See it work with a live demo pipeline.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Sign up and simulate a lead moving through the full flow — AI reply, phone call,
              booked estimate — in one click.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-slate-500">
          © {new Date().getFullYear()} LeadPilot. Prototype build.
        </div>
      </footer>
    </div>
  );
}
