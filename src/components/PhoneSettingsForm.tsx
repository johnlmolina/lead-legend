"use client";

import { useState, useTransition } from "react";
import { updatePhoneSettings } from "@/app/actions/settings";

export function PhoneSettingsForm({
  initialPhoneNumber,
  initialForwardingPhoneNumber,
}: {
  initialPhoneNumber: string;
  initialForwardingPhoneNumber: string;
}) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [forwardingPhoneNumber, setForwardingPhoneNumber] = useState(initialForwardingPhoneNumber);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await updatePhoneSettings({ phoneNumber, forwardingPhoneNumber });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save.");
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="phoneNumber" className="field-label">
          Your Twilio number
        </label>
        <p className="field-hint">The number leads text and call. Format: +15551234567.</p>
        <input
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+15551234567"
          className="input mt-1.5 max-w-xs"
        />
      </div>

      <div>
        <label htmlFor="forwardingPhoneNumber" className="field-label">
          Forward calls to
        </label>
        <p className="field-hint">
          Incoming calls ring this number first. Only a true no-answer counts as missed. Leave
          blank to treat every call as immediately missed.
        </p>
        <input
          id="forwardingPhoneNumber"
          value={forwardingPhoneNumber}
          onChange={(e) => setForwardingPhoneNumber(e.target.value)}
          placeholder="+15559876543"
          className="input mt-1.5 max-w-xs"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary">
          Save phone settings
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
