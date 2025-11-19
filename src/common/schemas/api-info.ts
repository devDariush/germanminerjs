import * as z from "@zod/zod";

export type ApiInfoData = {
  limit: number;
  requests: number;
  outstandingCosts: number;
};

export const ApiInfo: z.ZodType<ApiInfoData> = z.object({
  limit: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  outstandingCosts: z.number().nonnegative(),
});

export type ApiInfo = z.infer<typeof ApiInfo>;
