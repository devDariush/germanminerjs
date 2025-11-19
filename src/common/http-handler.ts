import type { ApiContext } from "../client.ts";
import { ApiError } from "./errors/api-error.ts";

const defaultBaseUrl = "https://api.germanminer.de/v2/";

export type TFetchOptions = {
  ctx: ApiContext;
  endpoint: string;
  params?: Record<string, string>;
  baseUrl?: string;
};

function buildQuery(
  apiKey: string,
  endpoint: string,
  params?: Record<string, string>,
  baseUrl?: string,
) {
  if (!baseUrl) baseUrl = defaultBaseUrl;

  const url = new URL(endpoint, baseUrl);

  // Always add API key as a parameter to every request
  url.searchParams.append("key", apiKey);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }

  return url;
}

// deno-lint-ignore no-explicit-any
export async function fetchData(options: TFetchOptions): Promise<any> {
  const { ctx, endpoint, params, baseUrl } = options;

  const url = buildQuery(
    ctx.apiKey,
    endpoint,
    params,
    baseUrl,
  );

  const response = await fetch(url);
  const responseJson = await response.json();

  if (!response.ok || responseJson.success !== true) {
    throw new ApiError(
      responseJson.error,
      response.status,
      response.statusText,
    );
  }

  if (ctx.debug) {
    console.debug(
      `Successfully fetched from ${url.toString()}:\n${
        JSON.stringify(responseJson.data)
      }`,
    );
  }

  return responseJson.data;
}
