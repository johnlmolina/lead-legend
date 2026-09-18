import Link from "next/link";
import { requireOrganization } from "@/lib/dal";
import { LeadStatusBadge } from "@/components/LeadStatusBadge";

export default async function LeadsPage() {
  const { supabase, membership } = await requireOrganization();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, phone, email, source, status, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load leads: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-eyebrow">Pipeline</p>
          <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">Leads</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Every lead for your organization.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/leads/import" className="btn-secondary">
            Import CSV
          </Link>
          <Link href="/dashboard/leads/new" className="btn-primary">
            Add a lead
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-100">
          <thead className="bg-zinc-50/80">
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Source</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {leads?.map((lead) => (
              <tr key={lead.id} className="group transition-colors hover:bg-accent-50/40">
                <td className="px-4 py-3.5 text-sm">
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="font-medium text-zinc-900 group-hover:text-accent-700"
                  >
                    {lead.name || "(no name)"}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-sm text-zinc-500">{lead.phone}</td>
                <td className="px-4 py-3.5 text-sm capitalize text-zinc-500">{lead.source ?? "—"}</td>
                <td className="px-4 py-3.5">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!leads || leads.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No leads yet.{" "}
                  <Link href="/dashboard/leads/new" className="link-quiet">
                    Add your first lead
                  </Link>{" "}
                  or{" "}
                  <Link href="/dashboard/leads/import" className="link-quiet">
                    import a CSV
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </th>
  );
}
