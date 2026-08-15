import { z } from "zod";

export const submitPickSchema = z.object({
  gameweekId: z.string().min(1),
  teamId: z.string().min(1),
  isJoker: z.boolean().default(false),
});

export type SubmitPickInput = z.infer<typeof submitPickSchema>;

export const updatePickSchema = z
  .object({
    pickId: z.string().min(1),
    teamId: z.string().min(1).optional(),
    isJoker: z.boolean().optional(),
  })
  .refine((d) => d.teamId !== undefined || d.isJoker !== undefined, {
    message: "Nothing to update",
  });

export type UpdatePickInput = z.infer<typeof updatePickSchema>;
