/**
 * Sensible local dev seed: 2 admins, 8 players, the full English pyramid
 * (Premier League down to National League, ~113 clubs) as a one-time
 * static import, one season, and three gameweeks — one already settled
 * with a deliberate mix of wins, an EP, short odds, a missing slip, a
 * losing joker, and a total no-show, so every page has real data to
 * render on first run. Gameweek 2's deadlines are relative to "now" so
 * it's always live and pickable right after seeding, regardless of when
 * you run this.
 *
 * There is deliberately no fixture list here — see prisma/schema.prisma's
 * note on why picks aren't tied to a fixture/opponent.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { settlePlayerGameweek, type PlayerGameweekInput } from "../src/lib/rules";

const prisma = new PrismaClient();

const SEED_PASSWORD = "password123";

// One-time static team import — Premier League down to National League for
// the 2026/27 season. Sourced from openfootball's public-domain dataset and
// hand-cleaned (deduped teams promoted/relegated between last season's lower
// leagues and this season's already-published Championship/PL lists,
// stripped decorative "FC"/"AFC" suffixes). Not a live sync — admin can add/
// deactivate teams by hand via /admin/teams as reality drifts from this
// snapshot (promotions, relegations, a team folding, etc).
const TEAMS_BY_DIVISION: Record<string, string[]> = {
  "Premier League": [
    "AFC Bournemouth",
    "Arsenal",
    "Aston Villa",
    "Brentford",
    "Brighton & Hove Albion",
    "Chelsea",
    "Coventry City",
    "Crystal Palace",
    "Everton",
    "Fulham",
    "Hull City",
    "Ipswich Town",
    "Leeds United",
    "Liverpool",
    "Manchester City",
    "Manchester United",
    "Newcastle United",
    "Nottingham Forest",
    "Sunderland",
    "Tottenham Hotspur",
  ],
  Championship: [
    "Birmingham City",
    "Blackburn Rovers",
    "Bolton Wanderers",
    "Bristol City",
    "Burnley",
    "Cardiff City",
    "Charlton Athletic",
    "Derby County",
    "Lincoln City",
    "Middlesbrough",
    "Millwall",
    "Norwich City",
    "Portsmouth",
    "Preston North End",
    "Queens Park Rangers",
    "Sheffield United",
    "Southampton",
    "Stoke City",
    "Swansea City",
    "Watford",
    "West Bromwich Albion",
    "West Ham United",
    "Wolverhampton Wanderers",
    "Wrexham",
  ],
  "League One": [
    "AFC Wimbledon",
    "Barnsley",
    "Blackpool",
    "Bradford City",
    "Burton Albion",
    "Doncaster Rovers",
    "Exeter City",
    "Huddersfield Town",
    "Leyton Orient",
    "Luton Town",
    "Mansfield Town",
    "Northampton Town",
    "Peterborough United",
    "Plymouth Argyle",
    "Port Vale",
    "Reading",
    "Rotherham United",
    "Stevenage",
    "Stockport County",
    "Wigan Athletic",
    "Wycombe Wanderers",
  ],
  "League Two": [
    "Accrington Stanley",
    "Barnet",
    "Barrow",
    "Bristol Rovers",
    "Bromley",
    "Cambridge United",
    "Cheltenham Town",
    "Chesterfield",
    "Colchester United",
    "Crawley Town",
    "Crewe Alexandra",
    "Fleetwood Town",
    "Gillingham",
    "Grimsby Town",
    "Harrogate Town",
    "Milton Keynes Dons",
    "Newport County",
    "Notts County",
    "Oldham Athletic",
    "Salford City",
    "Shrewsbury Town",
    "Swindon Town",
    "Tranmere Rovers",
    "Walsall",
  ],
  "National League": [
    "Aldershot Town",
    "Altrincham",
    "Boreham Wood",
    "Boston United",
    "Brackley Town",
    "Braintree Town",
    "Carlisle United",
    "Eastleigh",
    "Forest Green Rovers",
    "Gateshead",
    "Halifax Town",
    "Hartlepool United",
    "Morecambe",
    "Rochdale",
    "Scunthorpe United",
    "Solihull Moors",
    "Southend United",
    "Sutton United",
    "Tamworth",
    "Truro City",
    "Wealdstone",
    "Woking",
    "Yeovil Town",
    "York City",
  ],
};

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

function shortNameFor(name: string): string {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

async function wipe() {
  await prisma.auditLog.deleteMany();
  await prisma.fineLedgerEntry.deleteMany();
  await prisma.result.deleteMany();
  await prisma.betSlip.deleteMany();
  await prisma.pick.deleteMany();
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

  const teamByName = new Map<string, { id: string; name: string }>();
  let teamCount = 0;
  for (const [division, names] of Object.entries(TEAMS_BY_DIVISION)) {
    for (const name of names) {
      const team = await prisma.team.create({
        data: { name, shortName: shortNameFor(name), division },
      });
      teamByName.set(name, team);
      teamCount += 1;
    }
  }
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

  interface Gw1Scenario {
    user: (typeof players)[number];
    team: string;
    oddsFractional: string;
    oddsDecimal: number;
    isJoker: boolean;
    slipSubmitted: boolean;
    won: boolean;
    wentTwoUp: boolean;
  }

  const scenarios: Gw1Scenario[] = [
    { user: alice, team: "Arsenal", oddsFractional: "4/5", oddsDecimal: 1.8, isJoker: false, slipSubmitted: true, won: true, wentTwoUp: false },
    { user: bob, team: "Chelsea", oddsFractional: "6/4", oddsDecimal: 2.5, isJoker: false, slipSubmitted: true, won: true, wentTwoUp: true },
    { user: carol, team: "Liverpool", oddsFractional: "3/10", oddsDecimal: 1.3, isJoker: false, slipSubmitted: true, won: true, wentTwoUp: false },
    { user: dave, team: "Manchester City", oddsFractional: "3/5", oddsDecimal: 1.6, isJoker: true, slipSubmitted: true, won: false, wentTwoUp: false },
    { user: erin, team: "Newcastle United", oddsFractional: "evens", oddsDecimal: 2.0, isJoker: false, slipSubmitted: false, won: true, wentTwoUp: false },
    { user: frank, team: "Everton", oddsFractional: "6/5", oddsDecimal: 2.2, isJoker: false, slipSubmitted: true, won: false, wentTwoUp: false },
    { user: hank, team: "West Ham United", oddsFractional: "2/5", oddsDecimal: 1.4, isJoker: false, slipSubmitted: false, won: false, wentTwoUp: false },
  ];
  // Grace: no pick at all this gameweek.

  for (const scenario of scenarios) {
    const team = T(scenario.team);
    const pick = await prisma.pick.create({
      data: {
        gameweekId: gw1.id,
        userId: scenario.user.id,
        teamId: team.id,
        oddsFractional: scenario.oddsFractional,
        oddsDecimal: scenario.oddsDecimal,
        isJoker: scenario.isJoker,
        resultWon: scenario.won,
        resultWentTwoUp: scenario.wentTwoUp,
        resultEnteredAt: daysFromNow(-7),
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

  const settlementInputs: Record<string, PlayerGameweekInput> = {};
  for (const scenario of scenarios) {
    settlementInputs[scenario.user.id] = {
      hasPick: true,
      isJoker: scenario.isJoker,
      oddsDecimal: scenario.oddsDecimal,
      slipSubmitted: scenario.slipSubmitted,
      won: scenario.won || scenario.wentTwoUp,
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
  // screen is immediately testable). No picks yet.
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

  // ---------------------------------------------------------------------
  // Gameweek 3 — upcoming, picks not open yet.
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

  console.log("\nSeeded successfully.");
  console.log(`Teams: ${teamCount} across ${Object.keys(TEAMS_BY_DIVISION).length} divisions`);
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
