/**
 * Sensible local dev seed: 2 admins, 8 players, 16 teams, one season, and
 * three gameweeks — one already settled with a deliberate mix of wins, an
 * EP, short odds, a missing slip, a losing joker, and a total no-show, so
 * every page has real data to render on first run. Gameweek 2's deadlines
 * are relative to "now" so it's always live and pickable right after
 * seeding, regardless of when you run this.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { didTeamWin, settlePlayerGameweek, type PlayerGameweekInput } from "../src/lib/rules";

const prisma = new PrismaClient();

const SEED_PASSWORD = "password123";

const TEAM_NAMES: Array<[string, string]> = [
  ["Arsenal", "ARS"],
  ["Chelsea", "CHE"],
  ["Liverpool", "LIV"],
  ["Manchester City", "MCI"],
  ["Manchester United", "MUN"],
  ["Tottenham Hotspur", "TOT"],
  ["Newcastle United", "NEW"],
  ["Aston Villa", "AVL"],
  ["Brighton & Hove Albion", "BHA"],
  ["West Ham United", "WHU"],
  ["Everton", "EVE"],
  ["Wolverhampton Wanderers", "WOL"],
  ["Crystal Palace", "CRY"],
  ["Fulham", "FUL"],
  ["Brentford", "BRE"],
  ["Nottingham Forest", "NFO"],
];

const PLAYERS: Array<[string, string]> = [
  ["alice", "Alice Turner"],
  ["bob", "Bob Nichols"],
  ["carol", "Carol Byrne"],
  ["dave", "Dave Okafor"],
  ["erin", "Erin Sadler"],
  ["frank", "Frank Delaney"],
  ["grace", "Grace Whitfield"],
  ["hank", "Hank Osei"],
];

const ADMINS: Array<[string, string]> = [
  ["george", "George Hughes"],
  ["ollie", "Ollie Marsh"],
];

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

function nextChristmas(from: Date): Date {
  const year = from.getUTCMonth() === 11 && from.getUTCDate() > 25 ? from.getUTCFullYear() + 1 : from.getUTCFullYear();
  return new Date(Date.UTC(year, 11, 25));
}

async function wipe() {
  await prisma.auditLog.deleteMany();
  await prisma.fineLedgerEntry.deleteMany();
  await prisma.result.deleteMany();
  await prisma.betSlip.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.gameweek.deleteMany();
  await prisma.season.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await wipe();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const admins = await Promise.all(
    ADMINS.map(([username, name]) =>
      prisma.user.create({ data: { username, name, passwordHash, role: "ADMIN" } }),
    ),
  );

  const players = await Promise.all(
    PLAYERS.map(([username, name]) =>
      prisma.user.create({ data: { username, name, passwordHash, role: "PLAYER" } }),
    ),
  );
  const [alice, bob, carol, dave, erin, frank, grace, hank] = players;

  await prisma.inviteCode.create({
    data: { code: "BADBLOKES", role: "PLAYER", createdById: admins[0].id },
  });
  await prisma.inviteCode.create({
    data: { code: "BOSSMAN", role: "ADMIN", maxUses: 2, createdById: admins[0].id },
  });

  const teams = await Promise.all(
    TEAM_NAMES.map(([name, shortName]) => prisma.team.create({ data: { name, shortName } })),
  );
  const teamByName = new Map(teams.map((t) => [t.name, t]));
  const T = (name: string) => teamByName.get(name)!;

  const now = new Date();
  const season = await prisma.season.create({
    data: {
      name: "2026/27",
      startDate: daysFromNow(-30),
      endDate: daysFromNow(280),
      active: true,
      jokerSplitDate: nextChristmas(now),
    },
  });

  // ---------------------------------------------------------------------
  // Gameweek 1 — settled, with a deliberately mixed bag of outcomes.
  // ---------------------------------------------------------------------
  const gw1 = await prisma.gameweek.create({
    data: {
      seasonId: season.id,
      weekNumber: 1,
      picksOpenAt: daysFromNow(-9),
      pickDeadlineAt: daysFromNow(-8),
      slipDeadlineAt: daysFromNow(-7),
      status: "SETTLED",
      settledAt: daysFromNow(-7),
    },
  });

  const gw1FixtureDefs = [
    { home: "Arsenal", away: "Fulham", homeScore: 2, awayScore: 0, epHome: false, epAway: false },
    { home: "Chelsea", away: "Brentford", homeScore: 2, awayScore: 2, epHome: true, epAway: false },
    { home: "Liverpool", away: "Wolverhampton Wanderers", homeScore: 3, awayScore: 1, epHome: false, epAway: false },
    { home: "Manchester City", away: "Aston Villa", homeScore: 0, awayScore: 1, epHome: false, epAway: false },
    { home: "Newcastle United", away: "Crystal Palace", homeScore: 1, awayScore: 0, epHome: false, epAway: false },
    { home: "Everton", away: "Brighton & Hove Albion", homeScore: 0, awayScore: 2, epHome: false, epAway: false },
    { home: "West Ham United", away: "Nottingham Forest", homeScore: 1, awayScore: 2, epHome: false, epAway: false },
  ];

  const gw1Fixtures = new Map<string, Awaited<ReturnType<typeof prisma.fixture.create>>>();
  for (const def of gw1FixtureDefs) {
    const fixture = await prisma.fixture.create({
      data: {
        gameweekId: gw1.id,
        homeTeamId: T(def.home).id,
        awayTeamId: T(def.away).id,
        kickoffAt: daysFromNow(-7),
        homeScore: def.homeScore,
        awayScore: def.awayScore,
        wentTwoAheadHome: def.epHome,
        wentTwoAheadAway: def.epAway,
        status: "FINISHED",
      },
    });
    gw1Fixtures.set(def.home, fixture);
  }

  interface Gw1Scenario {
    user: (typeof players)[number];
    team: string;
    oddsFractional: string;
    oddsDecimal: number;
    isJoker: boolean;
    slipSubmitted: boolean;
    hasPick: boolean;
  }

  const scenarios: Gw1Scenario[] = [
    { user: alice, team: "Arsenal", oddsFractional: "4/5", oddsDecimal: 1.8, isJoker: false, slipSubmitted: true, hasPick: true },
    { user: bob, team: "Chelsea", oddsFractional: "6/4", oddsDecimal: 2.5, isJoker: false, slipSubmitted: true, hasPick: true },
    { user: carol, team: "Liverpool", oddsFractional: "3/10", oddsDecimal: 1.3, isJoker: false, slipSubmitted: true, hasPick: true },
    { user: dave, team: "Manchester City", oddsFractional: "3/5", oddsDecimal: 1.6, isJoker: true, slipSubmitted: true, hasPick: true },
    { user: erin, team: "Newcastle United", oddsFractional: "evens", oddsDecimal: 2.0, isJoker: false, slipSubmitted: false, hasPick: true },
    { user: frank, team: "Everton", oddsFractional: "6/5", oddsDecimal: 2.2, isJoker: false, slipSubmitted: true, hasPick: true },
    { user: hank, team: "West Ham United", oddsFractional: "2/5", oddsDecimal: 1.4, isJoker: false, slipSubmitted: false, hasPick: true },
  ];

  for (const scenario of scenarios) {
    const fixture = gw1Fixtures.get(scenario.team)!;
    const team = T(scenario.team);
    const pick = await prisma.pick.create({
      data: {
        gameweekId: gw1.id,
        userId: scenario.user.id,
        teamId: team.id,
        fixtureId: fixture.id,
        oddsFractional: scenario.oddsFractional,
        oddsDecimal: scenario.oddsDecimal,
        isJoker: scenario.isJoker,
      },
    });
    await prisma.betSlip.create({
      data: {
        pickId: pick.id,
        token: `seed-${gw1.id}-${scenario.user.username}`,
        submittedAt: scenario.slipSubmitted ? daysFromNow(-8) : null,
      },
    });
  }
  // Grace: no pick at all this gameweek — no Pick, no BetSlip.

  const settlementInputs: Record<string, PlayerGameweekInput> = {};
  for (const scenario of scenarios) {
    const fixture = gw1Fixtures.get(scenario.team)!;
    const won = didTeamWin(
      {
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeScore: fixture.homeScore!,
        awayScore: fixture.awayScore!,
        wentTwoAheadHome: fixture.wentTwoAheadHome,
        wentTwoAheadAway: fixture.wentTwoAheadAway,
      },
      T(scenario.team).id,
    );
    settlementInputs[scenario.user.id] = {
      hasPick: true,
      isJoker: scenario.isJoker,
      oddsDecimal: scenario.oddsDecimal,
      slipSubmitted: scenario.slipSubmitted,
      won,
    };
  }
  settlementInputs[grace.id] = {
    hasPick: false,
    isJoker: false,
    oddsDecimal: null,
    slipSubmitted: false,
    won: false,
  };

  for (const [userId, gwInput] of Object.entries(settlementInputs)) {
    const outcome = settlePlayerGameweek(gwInput);
    await prisma.result.create({
      data: {
        gameweekId: gw1.id,
        userId,
        points: outcome.points,
        breachNoPick: outcome.breaches.noPick,
        breachNoSlip: outcome.breaches.noSlip,
        breachShortOdds: outcome.breaches.shortOdds,
        breachTeamLost: outcome.breaches.teamLost,
        breachJokerLost: outcome.breaches.jokerLost,
        fineAmount: outcome.fine.amount,
        fineRuleId: outcome.fine.ruleId,
        fineReason: outcome.fine.reason,
        jokerPlayed: outcome.jokerPlayed,
      },
    });
    if (outcome.fine.amount > 0) {
      await prisma.fineLedgerEntry.create({
        data: {
          userId,
          gameweekId: gw1.id,
          amount: outcome.fine.amount,
          reason: outcome.fine.reason,
          paid: false,
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Gameweek 2 — open right now (deadlines relative to "now" so the pick
  // screen is immediately testable), fixtures deliberately re-include every
  // team picked in GW1 so the back-to-back cooldown is easy to demo.
  // ---------------------------------------------------------------------
  const gw2 = await prisma.gameweek.create({
    data: {
      seasonId: season.id,
      weekNumber: 2,
      picksOpenAt: daysFromNow(-1),
      pickDeadlineAt: daysFromNow(2),
      slipDeadlineAt: daysFromNow(3),
      status: "OPEN",
    },
  });

  const gw2FixtureDefs: Array<[string, string]> = [
    ["Arsenal", "Tottenham Hotspur"],
    ["Manchester United", "Liverpool"],
    ["Chelsea", "Everton"],
    ["Manchester City", "Newcastle United"],
    ["West Ham United", "Aston Villa"],
    ["Brighton & Hove Albion", "Nottingham Forest"],
  ];
  for (const [home, away] of gw2FixtureDefs) {
    await prisma.fixture.create({
      data: {
        gameweekId: gw2.id,
        homeTeamId: T(home).id,
        awayTeamId: T(away).id,
        kickoffAt: daysFromNow(3),
      },
    });
  }

  // ---------------------------------------------------------------------
  // Gameweek 3 — upcoming, fixtures set, picks not open yet.
  // ---------------------------------------------------------------------
  const gw3 = await prisma.gameweek.create({
    data: {
      seasonId: season.id,
      weekNumber: 3,
      picksOpenAt: daysFromNow(6),
      pickDeadlineAt: daysFromNow(6.5),
      slipDeadlineAt: daysFromNow(7),
      status: "UPCOMING",
    },
  });

  const gw3FixtureDefs: Array<[string, string]> = [
    ["Fulham", "Brentford"],
    ["Wolverhampton Wanderers", "Crystal Palace"],
    ["Aston Villa", "Manchester United"],
    ["Tottenham Hotspur", "Brighton & Hove Albion"],
    ["Nottingham Forest", "Manchester City"],
    ["Liverpool", "West Ham United"],
  ];
  for (const [home, away] of gw3FixtureDefs) {
    await prisma.fixture.create({
      data: {
        gameweekId: gw3.id,
        homeTeamId: T(home).id,
        awayTeamId: T(away).id,
        kickoffAt: daysFromNow(7),
      },
    });
  }

  console.log("\nSeeded successfully.");
  console.log(`Season: ${season.name} (joker split: ${season.jokerSplitDate.toISOString().slice(0, 10)})`);
  console.log(`Gameweeks: #${gw1.weekNumber} settled, #${gw2.weekNumber} open, #${gw3.weekNumber} upcoming`);
  console.log("\nLogins (all share the same password):");
  console.log(`  password: ${SEED_PASSWORD}`);
  console.log(`  admins:   ${ADMINS.map(([u]) => u).join(", ")}`);
  console.log(`  players:  ${PLAYERS.map(([u]) => u).join(", ")}`);
  console.log("\nInvite codes: BADBLOKES (player, unlimited), BOSSMAN (admin, 2 uses)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
