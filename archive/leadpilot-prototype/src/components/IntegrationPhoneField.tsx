"use client";

import { useState, useTransition } from "react";
import { setIntegrationPhoneNumber } from "@/app/actions/integrations";

export function IntegrationPhoneField({
  provider,
  initialValue,
}: {
  provider: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await setIntegrationPhoneNumber(provider, value.trim());
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        });
      }}
      className="mt-3 flex items-center gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+15551234567"
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
      >
        {saved ? "Saved" : "Save"}
      </button>
    </form>
  );
}
