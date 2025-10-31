import * as z from "@zod/zod";

export const ApiInfo = z.object({
  limit: z.number().int().positive(),
  requests: z.number().int().positive(),
  outstandingCosts: z.number().nonnegative(),
});

export type ApiInfo = z.infer<typeof ApiInfo>;
