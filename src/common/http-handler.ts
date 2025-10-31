import type { ApiContext } from "../client.ts";
import { getBaseUrl } from "./environment-handler.ts";
import { ApiError } from "./errors/api-error.ts";

const defaultBaseUrl = getBaseUrl() ?? "https://api.germanminer.de/v2/";

export type TFetchOptions = {
  ctx: ApiContext,
  endpoint: string,
  params?: Record<string, string>,
  baseUrl?: string
}

async function buildQuery(apiKey: string, endpoint: string, params?: Record<string, string>, baseUrl?: string, DEBUG?: boolean) {
  if(!baseUrl) baseUrl = defaultBaseUrl;

  const url = new URL(endpoint, baseUrl)

  // Always add API key as a parameter to every request
  url.searchParams.append("key", apiKey);

  if(params) {
    const keys = Object.keys(params);
    for(const key in keys) {
      url.searchParams.append(key, params[key]);
    }
  }

  if(DEBUG) console.debug(`Query URL built: ${url.toString()}`);

  return await url;
}

export async function fetchData(options: TFetchOptions) {
  const { ctx, endpoint, params, baseUrl } = options;

  const url = await buildQuery(ctx.apiKey, endpoint, params, baseUrl, ctx.debug);

  const response = (await fetch(url));
  const responseJson = await response.json();

  if(!response.ok || responseJson.success !== true) {
    throw new ApiError(responseJson.error, response.status, response.statusText);
  }

  if(ctx.debug) console.debug(`Successfully fetched from ${url.toString()}:\n${JSON.stringify(responseJson.data)}`);

  return responseJson.data;
}