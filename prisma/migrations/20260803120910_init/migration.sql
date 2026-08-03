-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "avatarUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "jokerSplitDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Gameweek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "picksOpenAt" DATETIME NOT NULL,
    "pickDeadlineAt" DATETIME NOT NULL,
    "slipDeadlineAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gameweek_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "crestUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameweekId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "kickoffAt" DATETIME NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "wentTwoAheadHome" BOOLEAN NOT NULL DEFAULT false,
    "wentTwoAheadAway" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fixture_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Fixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameweekId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "oddsFractional" TEXT NOT NULL,
    "oddsDecimal" REAL NOT NULL,
    "isJoker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overriddenByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    CONSTRAINT "Pick_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pick_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BetSlip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pickId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "storagePath" TEXT,
    "externalUrl" TEXT,
    "mimeType" TEXT,
    "submittedAt" DATETIME,
    "verifiedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BetSlip_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "Pick" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BetSlip_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameweekId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "breachNoPick" BOOLEAN NOT NULL DEFAULT false,
    "breachNoSlip" BOOLEAN NOT NULL DEFAULT false,
    "breachShortOdds" BOOLEAN NOT NULL DEFAULT false,
    "breachTeamLost" BOOLEAN NOT NULL DEFAULT false,
    "breachJokerLost" BOOLEAN NOT NULL DEFAULT false,
    "fineAmount" INTEGER NOT NULL DEFAULT 0,
    "fineRuleId" TEXT NOT NULL,
    "fineReason" TEXT NOT NULL,
    "jokerPlayed" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manuallyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    CONSTRAINT "Result_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FineLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameweekId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FineLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FineLedgerEntry_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FineLedgerEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_InviteRedeemer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InviteRedeemer_A_fkey" FOREIGN KEY ("A") REFERENCES "InviteCode" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InviteRedeemer_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Season_active_idx" ON "Season"("active");

-- CreateIndex
CREATE INDEX "Gameweek_status_idx" ON "Gameweek"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Gameweek_seasonId_weekNumber_key" ON "Gameweek"("seasonId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Fixture_gameweekId_idx" ON "Fixture"("gameweekId");

-- CreateIndex
CREATE INDEX "Pick_userId_idx" ON "Pick"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pick_gameweekId_userId_key" ON "Pick"("gameweekId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pick_gameweekId_teamId_key" ON "Pick"("gameweekId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "BetSlip_pickId_key" ON "BetSlip"("pickId");

-- CreateIndex
CREATE UNIQUE INDEX "BetSlip_token_key" ON "BetSlip"("token");

-- CreateIndex
CREATE INDEX "Result_userId_idx" ON "Result"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_gameweekId_userId_key" ON "Result"("gameweekId", "userId");

-- CreateIndex
CREATE INDEX "FineLedgerEntry_userId_idx" ON "FineLedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "FineLedgerEntry_paid_idx" ON "FineLedgerEntry"("paid");

-- CreateIndex
CREATE UNIQUE INDEX "FineLedgerEntry_gameweekId_userId_key" ON "FineLedgerEntry"("gameweekId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "_InviteRedeemer_AB_unique" ON "_InviteRedeemer"("A", "B");

-- CreateIndex
CREATE INDEX "_InviteRedeemer_B_index" ON "_InviteRedeemer"("B");
