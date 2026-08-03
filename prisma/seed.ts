/**
 * Sensible local dev seed: 2 admins, 8 players, the full English pyramid
 * (Premier League down to National League, 116 clubs, verified against the
 * confirmed 2026/27 divisions) as a one-time static import, one season, and
 * three gameweeks — one already settled
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
// the confirmed 2026/27 season (cross-checked against Wikipedia's per-division
// "team changes" sections for the actual promotions/relegations at the end of
// 2025/26, not last season's stale lineup). Crest URLs below are sourced from
// Wikipedia and matched by exact team name. Not a live sync — admin can add/
// deactivate teams by hand via /admin/teams as reality drifts from this
// snapshot (a team folding, a rebrand, a badge redesign, etc).
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
    "Bromley",
    "Burton Albion",
    "Cambridge United",
    "Doncaster Rovers",
    "Huddersfield Town",
    "Leicester City",
    "Leyton Orient",
    "Luton Town",
    "Mansfield Town",
    "Milton Keynes Dons",
    "Notts County",
    "Oxford United",
    "Peterborough United",
    "Plymouth Argyle",
    "Reading",
    "Sheffield Wednesday",
    "Stevenage",
    "Stockport County",
    "Wigan Athletic",
    "Wycombe Wanderers",
  ],
  "League Two": [
    "Accrington Stanley",
    "Barnet",
    "Bristol Rovers",
    "Cheltenham Town",
    "Chesterfield",
    "Colchester United",
    "Crawley Town",
    "Crewe Alexandra",
    "Exeter City",
    "Fleetwood Town",
    "Gillingham",
    "Grimsby Town",
    "Newport County",
    "Northampton Town",
    "Oldham Athletic",
    "Port Vale",
    "Rochdale",
    "Rotherham United",
    "Salford City",
    "Shrewsbury Town",
    "Swindon Town",
    "Tranmere Rovers",
    "Walsall",
    "York City",
  ],
  "National League": [
    "AFC Fylde",
    "Aldershot Town",
    "Altrincham",
    "Barrow",
    "Boreham Wood",
    "Boston United",
    "Carlisle United",
    "Eastleigh",
    "Forest Green Rovers",
    "Gateshead",
    "Halifax Town",
    "Harrogate Town",
    "Hartlepool United",
    "Hornchurch",
    "Kidderminster Harriers",
    "Scunthorpe United",
    "Solihull Moors",
    "Southend United",
    "Sutton United",
    "Tamworth",
    "Wealdstone",
    "Woking",
    "Worthing",
    "Yeovil Town",
  ],
};

// Crest images sourced from Wikipedia, matched by exact team name (see comment above).
const CREST_BY_TEAM: Record<string, string> = {
  "AFC Bournemouth": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/AFC_Bournemouth_%282013%29.svg/330px-AFC_Bournemouth_%282013%29.svg.png",
  "AFC Fylde": "https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/AFC_Fylde_%282014%29.svg/330px-AFC_Fylde_%282014%29.svg.png",
  "AFC Wimbledon": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/AFC_Wimbledon_%282020%29_logo.svg/330px-AFC_Wimbledon_%282020%29_logo.svg.png",
  "Accrington Stanley": "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Accrington_Stanley_F.C._logo.svg/330px-Accrington_Stanley_F.C._logo.svg.png",
  "Aldershot Town": "https://upload.wikimedia.org/wikipedia/en/thumb/3/30/Aldershot_Town_FC_crest.svg/330px-Aldershot_Town_FC_crest.svg.png",
  "Altrincham": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Altrincham_FC_crest.svg/330px-Altrincham_FC_crest.svg.png",
  "Arsenal": "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/330px-Arsenal_FC.svg.png",
  "Aston Villa": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Aston_Villa_FC_new_crest.svg/330px-Aston_Villa_FC_new_crest.svg.png",
  "Barnet": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Barnet_FC.svg/330px-Barnet_FC.svg.png",
  "Barnsley": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c9/Barnsley_FC.svg/330px-Barnsley_FC.svg.png",
  "Barrow": "https://upload.wikimedia.org/wikipedia/en/thumb/2/28/Barrow_AFC_logo.svg/330px-Barrow_AFC_logo.svg.png",
  "Birmingham City": "https://upload.wikimedia.org/wikipedia/en/thumb/6/68/Birmingham_City_FC_logo.svg/330px-Birmingham_City_FC_logo.svg.png",
  "Blackburn Rovers": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Blackburn_Rovers.svg/330px-Blackburn_Rovers.svg.png",
  "Blackpool": "https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Blackpool_FC_logo.svg/330px-Blackpool_FC_logo.svg.png",
  "Bolton Wanderers": "https://upload.wikimedia.org/wikipedia/en/thumb/8/82/Bolton_Wanderers_FC_logo.svg/330px-Bolton_Wanderers_FC_logo.svg.png",
  "Boreham Wood": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Boreham_Wood_FC_logo.svg/330px-Boreham_Wood_FC_logo.svg.png",
  "Boston United": "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Boston_United_FC_logo.svg/330px-Boston_United_FC_logo.svg.png",
  "Bradford City": "https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Bradford_City_AFC_crest.svg/330px-Bradford_City_AFC_crest.svg.png",
  "Brentford": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Brentford_FC_crest.svg/330px-Brentford_FC_crest.svg.png",
  "Brighton & Hove Albion": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d0/Brighton_and_Hove_Albion_FC_crest.svg/330px-Brighton_and_Hove_Albion_FC_crest.svg.png",
  "Bristol City": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Bristol_City_crest.svg/330px-Bristol_City_crest.svg.png",
  "Bristol Rovers": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Bristol_Rovers_F.C._logo.svg/330px-Bristol_Rovers_F.C._logo.svg.png",
  "Bromley": "https://upload.wikimedia.org/wikipedia/en/thumb/3/35/Bromley_FC_crest.svg/330px-Bromley_FC_crest.svg.png",
  "Burnley": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6d/Burnley_FC_Logo.svg/330px-Burnley_FC_Logo.svg.png",
  "Burton Albion": "https://upload.wikimedia.org/wikipedia/en/thumb/9/93/Burton_Albion_FC_crest.svg/330px-Burton_Albion_FC_crest.svg.png",
  "Cambridge United": "https://upload.wikimedia.org/wikipedia/en/thumb/5/57/Cambridge_United_FC_crest.svg/330px-Cambridge_United_FC_crest.svg.png",
  "Cardiff City": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/Cardiff_City_crest.svg/330px-Cardiff_City_crest.svg.png",
  "Carlisle United": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/Carlisle_United_FC_crest.svg/330px-Carlisle_United_FC_crest.svg.png",
  "Charlton Athletic": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Charlton_Athletic_FC_crest.svg/330px-Charlton_Athletic_FC_crest.svg.png",
  "Chelsea": "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/330px-Chelsea_FC.svg.png",
  "Cheltenham Town": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Cheltenham_Town_F.C._logo.svg/330px-Cheltenham_Town_F.C._logo.svg.png",
  "Chesterfield": "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Chesterfield_FC_crest.svg/330px-Chesterfield_FC_crest.svg.png",
  "Colchester United": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9c/Colchester_United_FC_crest.svg/330px-Colchester_United_FC_crest.svg.png",
  "Coventry City": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Coventry_City_FC_crest.svg/330px-Coventry_City_FC_crest.svg.png",
  "Crawley Town": "https://upload.wikimedia.org/wikipedia/en/thumb/1/11/Crawley_Town_FC_crest.svg/330px-Crawley_Town_FC_crest.svg.png",
  "Crewe Alexandra": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9d/Crewe_Alexandra.svg/330px-Crewe_Alexandra.svg.png",
  "Crystal Palace": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Crystal_Palace_FC_logo_%282022%29.svg/330px-Crystal_Palace_FC_logo_%282022%29.svg.png",
  "Derby County": "https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Derby_County_crest.svg/330px-Derby_County_crest.svg.png",
  "Doncaster Rovers": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Doncaster_Rovers_F.C._logo.svg/330px-Doncaster_Rovers_F.C._logo.svg.png",
  "Eastleigh": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Eastleigh_FC_crest.svg/330px-Eastleigh_FC_crest.svg.png",
  "Everton": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7c/Everton_FC_logo.svg/330px-Everton_FC_logo.svg.png",
  "Exeter City": "https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Exeter_City_FC.svg/330px-Exeter_City_FC.svg.png",
  "Fleetwood Town": "https://upload.wikimedia.org/wikipedia/en/thumb/e/ed/Fleetwood_Town_F.C._logo.svg/330px-Fleetwood_Town_F.C._logo.svg.png",
  "Forest Green Rovers": "https://upload.wikimedia.org/wikipedia/en/thumb/8/85/Forest_Green_Rovers_crest.svg/330px-Forest_Green_Rovers_crest.svg.png",
  "Fulham": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Fulham_FC_%28shield%29.svg/330px-Fulham_FC_%28shield%29.svg.png",
  "Gateshead": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b3/Gateshead_FC.svg/330px-Gateshead_FC.svg.png",
  "Gillingham": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/FC_Gillingham_Logo.svg/330px-FC_Gillingham_Logo.svg.png",
  "Grimsby Town": "https://upload.wikimedia.org/wikipedia/en/thumb/d/db/Grimsby_Town_F.C._logo.svg/330px-Grimsby_Town_F.C._logo.svg.png",
  "Halifax Town": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/FC_Halifax_Town_crest.svg/330px-FC_Halifax_Town_crest.svg.png",
  "Harrogate Town": "https://upload.wikimedia.org/wikipedia/en/thumb/4/40/Harrogate_Town_AFC.svg/330px-Harrogate_Town_AFC.svg.png",
  "Hartlepool United": "https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Hartlepool_United_FC_crest.svg/330px-Hartlepool_United_FC_crest.svg.png",
  "Hornchurch": "https://upload.wikimedia.org/wikipedia/en/thumb/7/78/Hornchurch_FC_logo.svg/330px-Hornchurch_FC_logo.svg.png",
  "Huddersfield Town": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Huddersfield_Town_AFC_crest.svg/330px-Huddersfield_Town_AFC_crest.svg.png",
  "Hull City": "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Hull_City_A.F.C._logo.svg/330px-Hull_City_A.F.C._logo.svg.png",
  "Ipswich Town": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Ipswich_Town.svg/330px-Ipswich_Town.svg.png",
  "Kidderminster Harriers": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6e/Kidderminster_Harriers_FC_crest.svg/330px-Kidderminster_Harriers_FC_crest.svg.png",
  "Leeds United": "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Leeds_United_F.C._logo.svg/330px-Leeds_United_F.C._logo.svg.png",
  "Leicester City": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2d/Leicester_City_crest.svg/330px-Leicester_City_crest.svg.png",
  "Leyton Orient": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Leyton_Orient_F.C._logo.svg/330px-Leyton_Orient_F.C._logo.svg.png",
  "Lincoln City": "https://upload.wikimedia.org/wikipedia/en/thumb/3/39/Lincoln_City_FC_2024_crest.svg/330px-Lincoln_City_FC_2024_crest.svg.png",
  "Liverpool": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/330px-Liverpool_FC.svg.png",
  "Luton Town": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9d/Luton_Town_logo.svg/330px-Luton_Town_logo.svg.png",
  "Manchester City": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/330px-Manchester_City_FC_badge.svg.png",
  "Manchester United": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/330px-Manchester_United_FC_crest.svg.png",
  "Mansfield Town": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7d/Mansfield_Town_FC.svg/330px-Mansfield_Town_FC.svg.png",
  "Middlesbrough": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/Middlesbrough_FC_crest.svg/330px-Middlesbrough_FC_crest.svg.png",
  "Millwall": "https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Millwall_FC_crest.svg/330px-Millwall_FC_crest.svg.png",
  "Milton Keynes Dons": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/Milton_Keynes_Dons_FC_2025_crest.svg/330px-Milton_Keynes_Dons_FC_2025_crest.svg.png",
  "Newcastle United": "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Newcastle_United_Logo.svg/330px-Newcastle_United_Logo.svg.png",
  "Newport County": "https://upload.wikimedia.org/wikipedia/en/thumb/4/44/Newport_County_AFC_crest.svg/330px-Newport_County_AFC_crest.svg.png",
  "Northampton Town": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2d/Northampton_Town_F.C._logo.svg/330px-Northampton_Town_F.C._logo.svg.png",
  "Norwich City": "https://upload.wikimedia.org/wikipedia/en/thumb/1/17/Norwich_City_FC_logo.svg/330px-Norwich_City_FC_logo.svg.png",
  "Nottingham Forest": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/Nottingham_Forest_F.C._logo.svg/330px-Nottingham_Forest_F.C._logo.svg.png",
  "Notts County": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Notts_County_Logo.svg/330px-Notts_County_Logo.svg.png",
  "Oldham Athletic": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Oldham_Athletic_AFC_%28emblem%29.svg/330px-Oldham_Athletic_AFC_%28emblem%29.svg.png",
  "Oxford United": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Oxford_United_FC_logo.svg/330px-Oxford_United_FC_logo.svg.png",
  "Peterborough United": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Peterborough_United%27s_new_badge.svg/330px-Peterborough_United%27s_new_badge.svg.png",
  "Plymouth Argyle": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Plymouth_Argyle_F.C._logo.svg/330px-Plymouth_Argyle_F.C._logo.svg.png",
  "Port Vale": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5f/Port_Vale_logo.svg/330px-Port_Vale_logo.svg.png",
  "Portsmouth": "https://upload.wikimedia.org/wikipedia/en/thumb/3/38/Portsmouth_FC_logo.svg/330px-Portsmouth_FC_logo.svg.png",
  "Preston North End": "https://upload.wikimedia.org/wikipedia/en/thumb/8/82/Preston_North_End_FC.svg/330px-Preston_North_End_FC.svg.png",
  "Queens Park Rangers": "https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Queens_Park_Rangers_crest.svg/330px-Queens_Park_Rangers_crest.svg.png",
  "Reading": "https://upload.wikimedia.org/wikipedia/en/thumb/1/11/Reading_FC.svg/330px-Reading_FC.svg.png",
  "Rochdale": "https://upload.wikimedia.org/wikipedia/en/thumb/b/bb/Rochdale_AFC_crest.svg/330px-Rochdale_AFC_crest.svg.png",
  "Rotherham United": "https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Rotherham_United_F.C._svg.svg/330px-Rotherham_United_F.C._svg.svg.png",
  "Salford City": "https://upload.wikimedia.org/wikipedia/en/thumb/7/70/Salford_City_F.C._new_logo.svg/330px-Salford_City_F.C._new_logo.svg.png",
  "Scunthorpe United": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b3/Scunthorpe_United_FC_crest.svg/330px-Scunthorpe_United_FC_crest.svg.png",
  "Sheffield United": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9c/Sheffield_United_FC_logo.svg/330px-Sheffield_United_FC_logo.svg.png",
  "Sheffield Wednesday": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b8/Sheffield_Wednesday_FC_2026_crest.svg/330px-Sheffield_Wednesday_FC_2026_crest.svg.png",
  "Shrewsbury Town": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/Shrewsbury_Town_F.C._logo.svg/330px-Shrewsbury_Town_F.C._logo.svg.png",
  "Solihull Moors": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Solihull_Moors_FC_crest.svg/330px-Solihull_Moors_FC_crest.svg.png",
  "Southampton": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c9/FC_Southampton.svg/330px-FC_Southampton.svg.png",
  "Southend United": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Southend_United.svg/330px-Southend_United.svg.png",
  "Stevenage": "https://upload.wikimedia.org/wikipedia/en/thumb/4/49/Stevenage_FC_crest.svg/330px-Stevenage_FC_crest.svg.png",
  "Stockport County": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Stockport_County_FC_logo_2020.svg/330px-Stockport_County_FC_logo_2020.svg.png",
  "Stoke City": "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/Stoke_City_FC_crest_2026.svg/330px-Stoke_City_FC_crest_2026.svg.png",
  "Sunderland": "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Logo_Sunderland.svg/330px-Logo_Sunderland.svg.png",
  "Sutton United": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Sutton_United_FC_crest.svg/330px-Sutton_United_FC_crest.svg.png",
  "Swansea City": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Swansea_City_AFC_logo.svg/330px-Swansea_City_AFC_logo.svg.png",
  "Swindon Town": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/Swindon_Town_FC.svg/330px-Swindon_Town_FC.svg.png",
  "Tamworth": "https://upload.wikimedia.org/wikipedia/en/thumb/d/dd/Tamworth_FC.svg/330px-Tamworth_FC.svg.png",
  "Tottenham Hotspur": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/330px-Tottenham_Hotspur.svg.png",
  "Tranmere Rovers": "https://upload.wikimedia.org/wikipedia/en/thumb/5/55/Tranmere_Rovers_FC_crest.svg/330px-Tranmere_Rovers_FC_crest.svg.png",
  "Walsall": "https://upload.wikimedia.org/wikipedia/en/thumb/e/ef/Walsall_FC.svg/330px-Walsall_FC.svg.png",
  "Watford": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e2/Watford.svg/330px-Watford.svg.png",
  "Wealdstone": "https://upload.wikimedia.org/wikipedia/en/thumb/d/dc/Wealdstone_FC_crest.svg/330px-Wealdstone_FC_crest.svg.png",
  "West Bromwich Albion": "https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/West_Bromwich_Albion.svg/330px-West_Bromwich_Albion.svg.png",
  "West Ham United": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/West_Ham_United_FC_logo.svg/330px-West_Ham_United_FC_logo.svg.png",
  "Wigan Athletic": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Wigan_Athletic.svg/330px-Wigan_Athletic.svg.png",
  "Woking": "https://upload.wikimedia.org/wikipedia/en/thumb/d/de/Woking_FC_logo.svg/330px-Woking_FC_logo.svg.png",
  "Wolverhampton Wanderers": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c9/Wolverhampton_Wanderers_FC_crest.svg/330px-Wolverhampton_Wanderers_FC_crest.svg.png",
  "Worthing": "https://upload.wikimedia.org/wikipedia/en/thumb/8/88/Worthing_FC_crest.svg/330px-Worthing_FC_crest.svg.png",
  "Wrexham": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Wrexham_A.F.C._Logo.svg/330px-Wrexham_A.F.C._Logo.svg.png",
  "Wycombe Wanderers": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fb/Wycombe_Wanderers_FC_logo.svg/330px-Wycombe_Wanderers_FC_logo.svg.png",
  "Yeovil Town": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Yeovil_Town_FC_crest.svg/330px-Yeovil_Town_FC_crest.svg.png",
  "York City": "https://upload.wikimedia.org/wikipedia/en/thumb/7/71/York_City_FC.svg/330px-York_City_FC.svg.png",
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
        data: { name, shortName: shortNameFor(name), division, crestUrl: CREST_BY_TEAM[name] ?? null },
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
