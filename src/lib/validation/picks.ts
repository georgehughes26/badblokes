import { z } from "zod";

export const submitPickSchema = z.object({
  gameweekId: z.string().min(1),
  teamId: z.string().min(1),
  oddsRaw: z.string().trim().min(1, "Enter the odds you got"),
  isJoker: z.boolean().default(false),
});

export type SubmitPickInput = z.infer<typeof submitPickSchema>;
