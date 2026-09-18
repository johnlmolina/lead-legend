"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({
  initialFullName,
  email,
}: {
  initialFullName: string;
  email: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });

    setIsLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="card-pad space-y-4">
        <div>
          <label className="field-label">Email</label>
          <p className="mt-1 text-sm text-zinc-500">{email}</p>
        </div>
        <div>
          <label htmlFor="fullName" className="field-label">
            Full name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="input mt-1.5 max-w-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isLoading} className="btn-primary">
            Save changes
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">Saved</span>}
        </div>
      </form>

      <div>
        <button type="button" onClick={handleLogout} className="btn-secondary">
          Log out
        </button>
      </div>
    </div>
  );
}
