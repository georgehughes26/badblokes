import { requireUser } from "@/lib/auth/current-user";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Alright, {user.name.split(" ")[0]}.</h1>
        <p className="text-sm text-muted">Your dashboard will show the current gameweek here shortly.</p>
      </div>
      <div className="card">
        <p className="text-sm text-muted">
          No gameweek admin has set up yet — check back once the season&apos;s live.
        </p>
      </div>
    </div>
  );
}
