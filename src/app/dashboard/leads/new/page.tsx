"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createLead } from "@/app/actions/leads";

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required && <span className="text-accent-600"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="input mt-1.5"
      />
    </div>
  );
}

export default function NewLeadPage() {
  const [state, action, pending] = useActionState(createLead, undefined);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="section-eyebrow">New lead</p>
        <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">Add a lead</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Manually add a lead that came in outside your tracked channels.
        </p>
      </div>

      <form action={action} className="card-pad space-y-4">
        <Field label="Name" name="name" />
        <Field label="Phone" name="phone" required placeholder="(555) 123-4567" />
        <Field label="Email" name="email" type="email" />
        <Field label="Address" name="address" />

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Add lead"}
          </button>
          <Link href="/dashboard/leads" className="text-sm text-zinc-500 hover:text-zinc-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
