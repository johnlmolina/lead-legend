"use client";

import { useState, useTransition } from "react";
import { updateAiSettings } from "@/app/actions/settings";

export function AiSettingsForm({
  initialDisclosureLine,
  initialInstructions,
  initialEscalationTriggers,
}: {
  initialDisclosureLine: string;
  initialInstructions: string;
  initialEscalationTriggers: string;
}) {
  const [disclosureLine, setDisclosureLine] = useState(initialDisclosureLine);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [escalationTriggers, setEscalationTriggers] = useState(initialEscalationTriggers);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateAiSettings({ disclosureLine, instructions, escalationTriggers });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="disclosureLine" className="field-label">
          Disclosure line
        </label>
        <p className="field-hint">
          Shown to the AI as how it should identify itself. Leave blank to use the default
          (identifies as an automated assistant). Whether this wording is sufficient for your
          market is a legal question — see PROGRESS.md.
        </p>
        <input
          id="disclosureLine"
          value={disclosureLine}
          onChange={(e) => setDisclosureLine(e.target.value)}
          placeholder="e.g. This is Rivera Roofing's scheduling assistant."
          className="input mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="instructions" className="field-label">
          Tone &amp; instructions
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          placeholder="e.g. Friendly and casual, mention our 25 years in business when relevant."
          className="input mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="escalationTriggers" className="field-label">
          Escalate to a human when… (one per line)
        </label>
        <textarea
          id="escalationTriggers"
          value={escalationTriggers}
          onChange={(e) => setEscalationTriggers(e.target.value)}
          rows={3}
          placeholder="the lead mentions a competitor by name"
          className="input mt-1.5"
        />
        <p className="field-hint">
          Leave blank to use sensible defaults (upset/urgent leads, out-of-scope questions,
          explicit requests for a person).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary">
          Save AI settings
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
