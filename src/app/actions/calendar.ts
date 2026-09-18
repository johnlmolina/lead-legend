"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dal";
import { getGoogleAuthUrl } from "@/lib/google/oauth";
import { getOrgCalendarAccess } from "@/lib/google/connection";
import { hasConflict, createCalendarEvent } from "@/lib/google/calendar";
import { advanceLeadStatus } from "@/app/actions/leads";
import { validateAppointmentTime } from "@/lib/appointment-validation";

const STATE_COOKIE = "google_oauth_state";

export async function connectGoogleCalendar() {
  await requireOrganization();

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  redirect(getGoogleAuthUrl(state));
}

export async function disconnectGoogleCalendar() {
  const { supabase, membership } = await requireOrganization();

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("organization_id", membership.organization_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
}

export type BookAppointmentResult = { ok: true } | { ok: false; error: string };

export async function bookAppointment(
  leadId: string,
  title: string,
  scheduledAtIso: string,
  durationMinutes = 60
): Promise<BookAppointmentResult> {
  const { supabase, membership } = await requireOrganization();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, name")
    .eq("id", leadId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (leadError) return { ok: false, error: leadError.message };
  if (!lead) return { ok: false, error: "Lead not found." };

  const timeCheck = validateAppointmentTime(scheduledAtIso, durationMinutes);
  if (!timeCheck.valid) return { ok: false, error: timeCheck.error };
  const { start, end } = timeCheck;

  const access = await getOrgCalendarAccess(supabase, membership.organization_id);
  if (!access) {
    return { ok: false, error: "Connect Google Calendar in Settings before booking estimates." };
  }

  const conflict = await hasConflict(access.accessToken, access.calendarId, start, end);
  if (conflict) {
    return { ok: false, error: "That time conflicts with something already on the calendar. Pick another." };
  }

  const event = await createCalendarEvent(access.accessToken, access.calendarId, {
    summary: title,
    description: `Booked via Lead Legend for lead: ${lead.name ?? lead.id}`,
    start,
    end,
  });

  const { error: insertError } = await supabase.from("appointments").insert({
    lead_id: leadId,
    organization_id: membership.organization_id,
    google_event_id: event.id,
    title,
    scheduled_at: start.toISOString(),
    status: "scheduled",
  });
  if (insertError) return { ok: false, error: insertError.message };

  try {
    await advanceLeadStatus(leadId, "appointment_booked");
  } catch {
    // Not forward-reachable (e.g. already past this stage, or lost/DNC) —
    // the appointment is still real and booked either way; the status
    // dropdown remains the source of truth for anything more nuanced.
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard");

  return { ok: true };
}
