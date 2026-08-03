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
});

export type SaveResultsInput = z.infer<typeof saveResultsSchema>;
