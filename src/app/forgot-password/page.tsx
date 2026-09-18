"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
    });

    setIsLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <AuthShell>
      {success ? (
        <>
          <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink lg:mt-0">
            Check your email
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            If an account exists for <strong className="text-zinc-900">{email}</strong>,
            we&apos;ve sent a password reset link.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink lg:mt-0">
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">We&apos;ll email you a link to set a new one.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input mt-1.5"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-sm text-zinc-500">
        <Link href="/login" className="link-quiet">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
