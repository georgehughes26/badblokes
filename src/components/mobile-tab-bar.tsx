import { getCurrentUser } from "@/lib/auth/current-user";
import { MobileTabBarClient } from "@/components/mobile-tab-bar-client";

export async function MobileTabBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  return <MobileTabBarClient isAdmin={user.role === "ADMIN"} />;
}
