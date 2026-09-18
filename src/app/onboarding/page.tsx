"use client";

import { useActionState } from "react";
import { createOrganization } from "@/app/actions/organizations";
import { AuthShell } from "@/components/AuthShell";

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createOrganization, undefined);

  return (
    <AuthShell>
      <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink lg:mt-0">
        Set up your company
      </h1>
      <p className="mt-1.5 text-sm text-zinc-500">
        You&apos;ll be the owner — you can invite your team later.
      </p>

      <form action={action} className="mt-8 space-y-4">
        <div>
          <label htmlFor="name" className="field-label">
            Company name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            className="input mt-1.5"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Creating…" : "Continue"}
        </button>
      </form>
    </AuthShell>
  );
}
