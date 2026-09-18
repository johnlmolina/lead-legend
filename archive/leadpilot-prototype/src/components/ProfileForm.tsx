"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/integrations";

export function ProfileForm({ name, companyName }: { name: string; companyName: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const newName = data.get("name");
        const newCompanyName = data.get("companyName");
        if (typeof newName !== "string" || typeof newCompanyName !== "string") return;
        startTransition(async () => {
          await updateProfile(newName, newCompanyName);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Your name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium">
          Company name
        </label>
        <input
          id="companyName"
          name="companyName"
          defaultValue={companyName}
          required
          className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          Save changes
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
