"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
      },
    });
    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthShell>
        <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink lg:mt-0">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          We sent a confirmation link to <strong className="text-zinc-900">{email}</strong>. Click
          it to activate your account and set up your organization.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink lg:mt-0">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-zinc-500">Set up a login for your roofing company.</p>

      <form onSubmit={handleSignUp} className="mt-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="field-label">
            Your name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="input mt-1.5"
          />
        </div>

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

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input mt-1.5"
          />
        </div>

        <div>
          <label htmlFor="repeatPassword" className="field-label">
            Repeat password
          </label>
          <input
            id="repeatPassword"
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
            minLength={8}
            className="input mt-1.5"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="link-quiet">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
