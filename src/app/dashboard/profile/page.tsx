import { requireUser } from "@/lib/dal";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const { claims } = await requireUser();
  const fullName =
    typeof claims.user_metadata === "object" &&
    claims.user_metadata &&
    "full_name" in claims.user_metadata
      ? String((claims.user_metadata as { full_name?: unknown }).full_name ?? "")
      : "";

  return (
    <div className="max-w-xl">
      <p className="section-eyebrow">Account</p>
      <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">Your profile</h1>
      <div className="mt-8">
        <ProfileForm initialFullName={fullName} email={String(claims.email ?? "")} />
      </div>
    </div>
  );
}
