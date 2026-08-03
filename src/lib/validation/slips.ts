import { z } from "zod";

export const submitSlipSchema = z.object({
  externalUrl: z
    .string()
    .trim()
    .min(1, "Paste a link to your bet slip")
    .max(2000)
    .url("That doesn't look like a valid link"),
});

export type SubmitSlipInput = z.infer<typeof submitSlipSchema>;
