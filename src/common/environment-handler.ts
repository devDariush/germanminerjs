// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
declare const process: any;

const isNode = () =>
  typeof process !== "undefined" &&
  typeof process.versions !== "undefined" &&
  typeof process.versions.node !== "undefined";

const isDeno = () =>
  typeof Deno !== "undefined" &&
  typeof Deno.version !== "undefined" &&
  typeof Deno.version.deno !== "undefined";

export function getApiKey(): string | undefined {
  let apiKey: string | undefined;
  if (isNode()) {
    apiKey = process.env.GM_API_KEY ?? process.env.API_KEY;
  } else if (isDeno()) {
    apiKey = Deno.env.get("GM_API_KEY") ?? Deno.env.get("API_KEY");
  }

  return apiKey;
}

export function getDebugFlag(): boolean {
  if (isNode()) {
    return process.env.NODE_ENV === "development";
  } else if (isDeno()) {
    return Deno.env.get("DENO_ENV") === "development";
  } else {
    return false;
  }
}
