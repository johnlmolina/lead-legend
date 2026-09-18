import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CalendarPage() {
  const session = await verifySession();

  const appointments = await prisma.appointment.findMany({
    where: { userId: session.userId },
    orderBy: { scheduledAt: "asc" },
    include: { lead: true },
  });

  const groups = new Map<string, typeof appointments>();
  for (const appt of appointments) {
    const key = appt.scheduledAt.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(appt);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-slate-600">Booked estimates and follow-ups.</p>
      </div>

      <div className="space-y-6">
        {[...groups.entries()].map(([day, items]) => (
          <div key={day} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">{day}</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {items.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link
                      href={`/dashboard/leads/${appt.leadId}`}
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      {appt.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {appt.lead.name} · {appt.lead.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {appt.scheduledAt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{appt.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {appointments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nothing on the calendar yet. Estimates booked from your leads will show up here.
          </div>
        )}
      </div>
    </div>
  );
}
