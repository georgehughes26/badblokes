import { z } from "zod";

export const saveResultsSchema = z.object({
  gameweekId: z.string().min(1),
  picks: z.array(
    z.object({
      pickId: z.string().min(1),
      won: z.boolean(),
      wentTwoUp: z.boolean(),
      slipSubmitted: z.boolean(),
      shortOdds: z.boolean(),
    }),
  ),
  // Which no-pick players get their penalty voided (proof of a real bet
  // submitted outside the app) instead of the usual -1/fine — see rules.ts.
  noPickVoids: z.array(z.object({ userId: z.string().min(1), voided: z.boolean() })).default([]),
});

export type SaveResultsInput = z.infer<typeof saveResultsSchema>;
