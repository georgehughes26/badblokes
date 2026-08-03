import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const { from } = await searchParams;
  const redirectTo = from && from.startsWith("/") ? from : "/";

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10">
      <div className="mb-8 text-center">
        <LogoMark className="mx-auto mb-3 h-10 w-10 text-accent" />
        <h1 className="font-display text-3xl font-bold">
          Bad Blokes <span className="text-accent">Acca</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Pick a team. Place the bet. Don&apos;t get fined.</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
