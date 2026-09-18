import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "@/components/ProfileForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your account details.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-xs text-slate-500">{user.email}</p>
        <div className="mt-4">
          <ProfileForm name={user.name} companyName={user.companyName} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Session</h2>
        <p className="mt-1 text-sm text-slate-600">Log out of LeadPilot on this device.</p>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
