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
  // Whether each no-pick player got proof of a real bet in — softens their
  // fine from £10/-1 down to £5/0, the same as breach B does for a picked
  // player — see rules.ts.
  noPickSlips: z.array(z.object({ userId: z.string().min(1), slipSubmitted: z.boolean() })).default([]),
});

export type SaveResultsInput = z.infer<typeof saveResultsSchema>;
