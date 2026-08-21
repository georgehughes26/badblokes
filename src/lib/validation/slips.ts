import { z } from "zod";
import { extractUrl } from "@/lib/extract-url";

export const submitSlipSchema = z.object({
  externalUrl: z
    .string()
    .trim()
    .min(1, "Paste a link to your bet slip")
    // Bookmaker "share slip" text is usually a label plus a link (e.g.
    // "Add To Your Bet Slip - https://…") — pull the URL out rather than
    // requiring the field to be a bare link.
    .transform((val) => extractUrl(val) ?? val)
    .pipe(z.string().max(2000).url("That doesn't look like a valid link")),
});

export type SubmitSlipInput = z.infer<typeof submitSlipSchema>;
