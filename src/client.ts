import { getApiKey, getDebugFlag } from "./common/environment-handler.ts";
import { GmClientError } from "./common/errors/client-error.ts";
import { LimitReachedError } from "./common/errors/limit-reached-error.ts";
import { fetchData } from "./common/http-handler.ts";
import { ApiInfo as ApiInfo } from "./common/schemas/api-info.ts";
import { BankAccount, BankService } from "./common/schemas/bank.ts";

const MAX_CACHE_LIFETIME = 600_000;

export type TClientOptions = {
  apiKey?: string;
  lazyMode?: boolean;
  debugMode?: boolean;
};
/**
 * This class manages connections to the GermanMiner API.
 */
export class GMClient {
  readonly #apiKey: string;

  public readonly DEBUG: boolean = false;
  public readonly LAZY: boolean = false;

  // Count request limit cache
  #REQ_LIMIT: number = 0;
  #requestCount: number = 0;
  #lastUpdated: number = 0;

  constructor(options?: TClientOptions) {
    const { apiKey, lazyMode, debugMode } = options ?? {};
    // Store API key
    if (apiKey) {
      this.#apiKey = apiKey;
    } else {
      const apiKeyFromEnv = getApiKey();
      if (!apiKeyFromEnv) {
        throw new GmClientError(
          "API key is required but not found in environment nor passed as an argument.",
        );
      }
      this.#apiKey = apiKeyFromEnv;
    }

    // Set lazy mode
    if (lazyMode) {
      this.LAZY = lazyMode;
      console.log("Lazy mode activated for GMClient.");
    }

    // Set debug mode
    if (debugMode) {
      this.DEBUG = debugMode;
    } else {
      this.DEBUG = getDebugFlag();
    }
    if (this.DEBUG) console.log("Debug mode activated for GMClient.");

    console.log("GMClient successfully initialized! ^^'");
  }

  /**
   * @param apiKey Set the API key to be able to communicate to the API. If not set, it will automatically load from environment variables from either Node.js or Deno. If no API key is found, it will throw an error.
   * @param lazyMode If set to true, the client will save on API requests wherever possible. Some data might be missing, so you have to load them manually (see documentation).
   * @param debugMode If set to true, the client will produce more logs for debug purposes. If not set, it will check in environment variables or set to false.
   */
  static async create(options?: TClientOptions): Promise<GMClient> {
    const client = new GMClient(options);

    // Before creating the client,
    const apiInfo = await client.getApiInfo(true);
    client.#REQ_LIMIT = apiInfo.limit;
    client.#requestCount = apiInfo.requests;
    client.#lastUpdated = Date.now();

    return client;
  }

  /**
   * @returns True if API request limit is reached (i.e. requests higher or equal to requests limit).
   */
  isLimitReached(): boolean {
    return this.#requestCount >= this.#REQ_LIMIT;
  }

  /**
   * @returns Gives you the number of requests that are currently remaining.
   */
  getRemainingRequests(): number {
    this.refreshCache();
    return this.#REQ_LIMIT - this.#requestCount;
  }

  private isCacheOutdated(): boolean {
    return Date.now() - this.#lastUpdated > MAX_CACHE_LIFETIME;
  }

  private async handleOperation(ignoreCache?: boolean): Promise<void> {
    this.#requestCount += 1;
    if (!ignoreCache) {
      if (this.isCacheOutdated()) await this.refreshCache();
      if (this.isLimitReached()) {
        throw new LimitReachedError(this.#requestCount, this.#REQ_LIMIT);
      }
      if (this.DEBUG) {
        console.debug(
          `${this.#requestCount} out of ${this.#REQ_LIMIT} requests (+ 1 added).`,
        );
      }
    }
  }

  private getContext(): ApiContext {
    return {
      apiKey: this.#apiKey,
      fetchData: fetchData,
      handleOperation: this.handleOperation.bind(this),
      debug: this.DEBUG,
      lazy: this.LAZY,
    };
  }

  private async refreshCache(): Promise<void> {
    const apiInfo = await this.getApiInfo(true);
    this.#REQ_LIMIT = apiInfo.limit;
    this.#requestCount = apiInfo.requests;
    this.#lastUpdated = Date.now();
  }

  /**
   * @returns Gives you request limit, total requests and outstanding costs.
   */
  async getApiInfo(ignoreCache?: boolean): Promise<ApiInfo> {
    await this.handleOperation(ignoreCache);
    const ctx = this.getContext();

    const data = await ctx.fetchData({ ctx: ctx, endpoint: "api/info" });

    const result = await ApiInfo.parseAsync(data);
    if (this.DEBUG) {
      console.debug(
        `ApiInfo successfully validated: ${JSON.stringify(result)}`,
      );
    }

    return result;
  }

  bank(): BankService;
  bank(accountNumber: string): Promise<BankAccount>;
  bank(accountNumber?: string): BankService | Promise<BankAccount> {
    const ctx = this.getContext();

    if (accountNumber) {
      return BankAccount._create(accountNumber, ctx);
    }

    return new BankService(ctx);
  }
}

export type ApiContext = {
  apiKey: string;
  fetchData: typeof fetchData;
  handleOperation: (ignoreCache?: boolean) => Promise<void>;
  debug: boolean;
  lazy: boolean;
};
