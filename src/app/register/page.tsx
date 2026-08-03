import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">
          ⚽ Bad Blokes <span className="text-accent">Acca</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Get your invite code from whoever&apos;s running the group.</p>
      </div>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
