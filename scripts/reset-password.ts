// One-off admin helper: set a user's password by username.
//   npx tsx scripts/reset-password.ts <username> <newPassword>
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const [username, newPassword] = process.argv.slice(2);
  if (!username || !newPassword) {
    throw new Error("Usage: tsx scripts/reset-password.ts <username> <newPassword>");
  }
  const user = await prisma.user.update({
    where: { username },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  console.log(`Password updated for ${user.username} (${user.name}).`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
