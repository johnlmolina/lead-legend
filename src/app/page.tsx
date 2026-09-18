import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  PhoneIcon,
  MessageIcon,
  CalendarIcon,
  SparkIcon,
  ShieldIcon,
  ArrowRightIcon,
  DatabaseIcon,
  CheckIcon,
} from "@/components/icons";

const FLOW_STEPS = [
  {
    icon: PhoneIcon,
    title: "A call comes in",
    detail: "Missed, busy, or after hours — every call is caught the moment it happens.",
  },
  {
    icon: DatabaseIcon,
    title: "A lead is created",
    detail: "Logged instantly to your lead database, tagged with source and status.",
  },
  {
    icon: MessageIcon,
    title: "AI texts them back",
    detail: "A drafted reply goes out in seconds, kept on-script by your approved FAQs.",
  },
  {
    icon: CalendarIcon,
    title: "An estimate gets booked",
    detail: "Straight onto your real Google Calendar — conflicts are checked automatically.",
  },
];

const FEATURES = [
  {
    icon: PhoneIcon,
    title: "Missed-call recovery",
    detail:
      "Every no-answer, busy signal, or after-hours call becomes a tracked lead automatically — nothing falls through the cracks between the ring and the callback.",
  },
  {
    icon: SparkIcon,
    title: "AI-assisted conversations",
    detail:
      "Draft replies grounded only in your approved FAQs, with a deterministic safety filter that blocks pricing promises and legal claims before a human ever sees them.",
  },
  {
    icon: CalendarIcon,
    title: "Real calendar booking",
    detail:
      "Book estimates directly against your connected Google Calendar. Conflicts are checked live — double-booking isn't possible, it's rejected before it happens.",
  },
  {
    icon: ShieldIcon,
    title: "Compliance built in",
    detail:
      "Opt-out and Do Not Contact status is enforced at the send path, every time — not a policy you have to remember to follow.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 bg-background">
      <header className="sticky top-0 z-20 border-b border-zinc-900/5 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Lead Legend home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Get started
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 h-[560px]"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 20%, rgba(240,169,30,0.16), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="section-eyebrow animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-accent-600/20 bg-accent-50 px-3 py-1">
            Built for residential roofing companies
          </span>
          <h1
            className="animate-fade-up mt-6 text-balance font-display text-5xl font-medium leading-[1.08] tracking-tight text-ink sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Every missed call is a{" "}
            <em className="font-display italic text-accent-600">roof</em> you
            haven&apos;t booked yet.
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-zinc-600"
            style={{ animationDelay: "120ms" }}
          >
            Lead Legend answers, texts, and follows up on every missed call and
            web lead — then books the estimate straight onto your calendar,
            before your competitor calls back.
          </p>
          <div
            className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/signup" className="btn-primary w-full sm:w-auto">
              Get started free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary w-full sm:w-auto">
              Log in
            </Link>
          </div>
          <p
            className="animate-fade-up mt-5 text-sm text-zinc-400"
            style={{ animationDelay: "220ms" }}
          >
            No setup fee. Connect your number and calendar in minutes.
          </p>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="border-y border-zinc-900/5 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="section-eyebrow">How it works</span>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              From a missed call to a booked estimate
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="card-pad h-full">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-accent-400">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl text-zinc-200">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{step.detail}</p>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="absolute -right-3.5 top-1/2 hidden -translate-y-1/2 lg:block">
                    <ArrowRightIcon className="h-4 w-4 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="section-eyebrow">What you get</span>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              One system, from first ring to signed estimate
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card-pad flex gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                  <feature.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-zinc-900">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{feature.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden bg-ink py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 80% at 85% 0%, rgba(240,169,30,0.18), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-white sm:text-4xl">
            Stop losing roofs to voicemail.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-balance text-zinc-400">
            Set up your number and calendar today, and start recovering leads
            you&apos;re already paying to generate.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-400">
            {["Tenant-isolated by design", "Real Google Calendar sync", "Opt-out compliant"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-accent-400" />
                  {item}
                </span>
              )
            )}
          </div>
          <Link href="/signup" className="btn-primary mt-9 inline-flex">
            Get started free
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-900/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 sm:flex-row">
          <Logo wordmarkClassName="text-zinc-500" />
          <p>&copy; {new Date().getFullYear()} Lead Legend. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
