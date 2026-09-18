import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export default async function AuthErrorPage(props: PageProps<"/auth/error">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <AuthShell>
      <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink lg:mt-0">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-500">
        {error ?? "That link is invalid or has expired."}
      </p>
      <Link href="/login" className="link-quiet mt-6 inline-block">
        Back to login
      </Link>
    </AuthShell>
  );
}
