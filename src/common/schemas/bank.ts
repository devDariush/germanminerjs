import * as z from "@zod/zod";

import type { ApiContext } from "../../client.ts";
import type { Player } from "./player.ts";

const accountTypes = ["Privatkonto", "Firma"] as const;
type BankAccountType = (typeof accountTypes)[number];
type PlayerType = Player | string;

export type BankAccountData = {
  accountNumber: string;
  balance: number;
  accountType: BankAccountType;
  bearer: string;
};

export const BankAccountSchema: z.ZodType<BankAccountData> = z.object({
  accountNumber: z.string(),
  balance: z.number(),
  accountType: z.enum(accountTypes),
  bearer: z.string(),
});

export class BankAccount {
  readonly accountNumber: string;
  balance?: number;
  accountType?: BankAccountType;
  bearer?: PlayerType;

  #ctx: ApiContext;

  static async _create(
    accountNumber: string,
    ctx: ApiContext,
  ): Promise<BankAccount> {
    const bankAccount = new BankAccount(accountNumber, ctx);

    if (ctx.lazy == false) {
      const bankAccountLoaded = await bankAccount._load();
      return bankAccountLoaded;
    }

    return bankAccount;
  }

  static _fromSchema(schema: BankAccountData, ctx: ApiContext): BankAccount {
    return new BankAccount(
      schema.accountNumber,
      ctx,
      schema.balance,
      schema.accountType,
      schema.bearer,
    );
  }

  private constructor(
    accountNumber: string,
    ctx: ApiContext,
    balance?: number,
    accountType?: BankAccountType,
    bearer?: PlayerType,
  ) {
    this.accountNumber = accountNumber;
    this.#ctx = ctx;

    if (balance) this.balance = balance;
    if (accountType) this.accountType = accountType;
    if (bearer) this.bearer = bearer;
  }

  private async _load(): Promise<BankAccount> {
    await this.#ctx.handleOperation();

    const params = { "accountNumber": this.accountNumber };
    const data = await this.#ctx.fetchData({
      ctx: this.#ctx,
      endpoint: "bank/info",
      params: params,
    });

    const result = await BankAccountSchema.parseAsync(data["account"]);
    this.balance = result.balance;
    this.accountType = result.accountType;
    this.bearer = result.bearer;

    if (this.#ctx.debug) {
      console.debug(
        `BankAccountSchema successfully validated: ${JSON.stringify(result)}`,
      );
    }

    return this;
  }

  async load(): Promise<void> {
    const bankAccountLoaded = await this._load();
    const { balance, accountType, bearer } = bankAccountLoaded;
    this.balance = balance;
    this.accountType = accountType;
    this.bearer = bearer;
  }
}

export class BankService {
  #ctx: ApiContext;

  constructor(ctx: ApiContext) {
    this.#ctx = ctx;
  }

  /**
   * Normalize various API response shapes into a flat array of items.
   * Accepts:
   * - an array directly
   * - an object containing an array under common keys (accounts, list, results, data)
   * - an object map of id -> item (falls back to Object.values)
   */
  private extractItemsFromResponse(data: unknown): unknown[] {
    // The API may return an array directly or an object containing an array under
    // various keys (e.g. `accounts`, `list`, `data`). Be defensive and accept
    // both shapes to avoid runtime "data is not iterable" errors.
    let items: unknown[] = [];
    if (Array.isArray(data)) {
      items = data as unknown[];
    } else if (data && typeof data === "object") {
      const maybe = data as Record<string, unknown>;
      if (Array.isArray(maybe.accounts)) items = maybe.accounts as unknown[];
      else if (Array.isArray(maybe.list)) items = maybe.list as unknown[];
      else if (Array.isArray(maybe.results)) items = maybe.results as unknown[];
      else if (Array.isArray(maybe.data)) items = maybe.data as unknown[];
      else {
        // If no array properties found, some APIs return an object mapping ids
        // to entries (e.g. { id1: {...}, id2: {...} }). In that case, use the
        // object's values as the items list.
        // Otherwise, fallback to the first property that is an array.
        let foundArray = false;
        for (const k of Object.keys(maybe)) {
          if (Array.isArray(maybe[k])) {
            items = maybe[k] as unknown[];
            foundArray = true;
            break;
          }
        }
        if (!foundArray) {
          const vals = Object.values(maybe);
          if (
            vals.length > 0 &&
            vals.every((v) => v && typeof v === "object" && !Array.isArray(v))
          ) {
            items = vals as unknown[];
          }
        }
      }
    }

    return items;
  }

  /**
   * Get a specified bank account.
   * @param accountNumber Specify the account number it should load from.
   * @returns A BankAccount object with loaded data (if lazy mode is disabled - otherwise, they might be incomplete).
   */
  async get(accountNumber: string): Promise<BankAccount> {
    const bankAccountLoaded = await BankAccount._create(
      accountNumber,
      this.#ctx,
    );
    return bankAccountLoaded;
  }

  /**
   * @returns A list of loaded BankAccount objects (if lazy mode is disabled - otherwise, they might be incomplete).
   */
  async listAll(): Promise<BankAccount[]> {
    await this.#ctx.handleOperation();

    const data = await this.#ctx.fetchData({
      ctx: this.#ctx,
      endpoint: "bank/list",
    });
    const items = this.extractItemsFromResponse(data);

    const result: BankAccount[] = [];
    if (!Array.isArray(items)) {
      throw new Error(
        "Unexpected response shape from bank/list: expected an array or an object containing an array.",
      );
    }

    for (const item of items) {
      const itemResult = await BankAccountSchema.parseAsync(item);
      if (this.#ctx.debug) {
        console.debug(
          `BankAccountSchema successfully validated: ${
            JSON.stringify(itemResult)
          }`,
        );
      }
      result.push(BankAccount._fromSchema(itemResult, this.#ctx));
    }
    return result;
  }
}
