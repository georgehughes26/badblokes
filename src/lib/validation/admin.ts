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
  saturdayDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the Saturday this gameweek's fixtures kick off"),
});

export const gameweekStatusSchema = z.object({
  gameweekId: z.string().min(1),
  status: z.enum(["UPCOMING", "OPEN", "LOCKED", "SETTLED"]),
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

export const createFixtureSchema = z
  .object({
    gameweekId: z.string().min(1),
    homeTeamId: z.string().min(1, "Pick a home team"),
    awayTeamId: z.string().min(1, "Pick an away team"),
  })
  .refine((d) => d.homeTeamId !== d.awayTeamId, {
    message: "Home and away teams must be different",
    path: ["awayTeamId"],
  });

export const deleteFixtureSchema = z.object({
  fixtureId: z.string().min(1),
  gameweekId: z.string().min(1),
});
