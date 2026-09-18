"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importLeadsCsv } from "@/app/actions/leads";

export default function ImportLeadsPage() {
  const [state, action, pending] = useActionState(importLeadsCsv, undefined);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="section-eyebrow">Bulk import</p>
        <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">Import leads</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Upload a CSV with columns for name, phone, email, and address. Only phone is required —
          rows without one are skipped.
        </p>
      </div>

      <form action={action} className="card-pad space-y-4">
        <div>
          <label htmlFor="file" className="field-label">
            CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-1.5 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.imported !== undefined && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Imported {state.imported} lead{state.imported === 1 ? "" : "s"}
            {state.skipped ? ` (skipped ${state.skipped} with no phone number)` : ""}.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Importing…" : "Import"}
          </button>
          <Link href="/dashboard/leads" className="text-sm text-zinc-500 hover:text-zinc-900">
            {state?.imported !== undefined ? "Back to leads" : "Cancel"}
          </Link>
        </div>
      </form>
    </div>
  );
}
