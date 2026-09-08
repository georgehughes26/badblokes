import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(60),
  shortName: z
    .string()
    .trim()
    .min(2, "Short name must be 2-5 characters")
    .max(5, "Short name must be 2-5 characters")
    .transform((s) => s.toUpperCase()),
  crestUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
});

export const createSeasonSchema = z
  .object({
    name: z.string().trim().min(1, "Season name is required").max(40),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    jokerSplitDate: z.string().min(1, "Joker split date is required"),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const createGameweekSchema = z.object({
  seasonId: z.string().min(1, "Season is required"),
  weekNumber: z.coerce.number().int().min(1, "Week number must be at least 1"),
  kickoffDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date this gameweek's fixtures kick off"),
});

// Only the two manual-override states are settable through this action —
// OPEN/LOCKED-by-time are derived automatically (see lib/gameweek-phase.ts)
// and SETTLED only ever happens via the results flow, which computes real
// points/fines rather than just flipping a label.
export const gameweekStatusSchema = z.object({
  gameweekId: z.string().min(1),
  status: z.enum(["UPCOMING", "LOCKED"]),
});

export const gameweekDeadlinesSchema = z
  .object({
    gameweekId: z.string().min(1),
    picksOpenAt: z.string().min(1),
    pickDeadlineAt: z.string().min(1),
    slipDeadlineAt: z.string().min(1),
  })
  .refine((d) => new Date(d.pickDeadlineAt) > new Date(d.picksOpenAt), {
    message: "The pick deadline must be after picks open",
    path: ["pickDeadlineAt"],
  })
  .refine((d) => new Date(d.slipDeadlineAt) >= new Date(d.pickDeadlineAt), {
    message: "The slip deadline must be on or after the pick deadline",
    path: ["slipDeadlineAt"],
  });

const boolFromForm = z.enum(["true", "false"]).transform((v) => v === "true");

export const gotmStakePaidSchema = z.object({
  seasonId: z.string().min(1),
  batchNumber: z.coerce.number().int().min(1),
  userId: z.string().min(1),
  paid: boolFromForm,
});

export const batchFinesPaidSchema = z.object({
  seasonId: z.string().min(1),
  batchNumber: z.coerce.number().int().min(1),
  userId: z.string().min(1),
  paid: boolFromForm,
});

export const gotmPayoutSchema = z.object({
  seasonId: z.string().min(1),
  batchNumber: z.coerce.number().int().min(1),
  paidOut: boolFromForm,
});
