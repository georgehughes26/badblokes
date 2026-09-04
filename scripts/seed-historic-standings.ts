// One-off import of the two pre-app seasons' final standings (played on
// paper/WhatsApp before this app existed — see HistoricStanding in
// schema.prisma). Wins were scored under that era's convention (a joker
// win counted as 2 wins with a loss undone), so `won` here is that
// season's score, not a literal count of games won — losses are simply
// played minus wins.
//   npx tsx scripts/seed-historic-standings.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeasonData {
  label: string;
  order: number;
  played: number;
  wins: Record<string, number>; // username -> wins
}

const SEASONS: SeasonData[] = [
  {
    label: "2024-25",
    order: 1,
    played: 30,
    wins: {
      Chaz: 21,
      Jbrady: 17,
      mattycarroll: 16,
      george: 14,
      MattyP: 14,
      Joshfrontal: 14,
      TICKER: 11,
    },
  },
  {
    label: "2025-26",
    order: 2,
    played: 36,
    wins: {
      TICKER: 24,
      Jbrady: 22,
      george: 22,
      Chaz: 20, // "Charlie" — same player as Chaz
      mattycarroll: 19,
      Joshfrontal: 19,
      MattyP: 17,
    },
  },
];

async function main() {
  for (const season of SEASONS) {
    const historicSeason = await prisma.historicSeason.upsert({
      where: { label: season.label },
      create: { label: season.label, order: season.order },
      update: { order: season.order },
    });

    for (const [username, won] of Object.entries(season.wins)) {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        console.warn(`Skipping unknown username "${username}" for ${season.label}`);
        continue;
      }
      const lost = season.played - won;
      await prisma.historicStanding.upsert({
        where: { historicSeasonId_userId: { historicSeasonId: historicSeason.id, userId: user.id } },
        create: { historicSeasonId: historicSeason.id, userId: user.id, played: season.played, won, lost },
        update: { played: season.played, won, lost },
      });
      console.log(`${season.label}: ${user.name} — P${season.played} W${won} L${lost}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
