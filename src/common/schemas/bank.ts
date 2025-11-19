import * as z from "@zod/zod";

import type { ApiContext } from "../../client.ts";
import { Player } from "./player.ts";

const accountTypes = ["Privatkonto", "Firma"] as const;
type BankAccountType = (typeof accountTypes)[number];
type BearerType = Player | string;

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
  bearer?: BearerType;

  readonly #ctx: ApiContext;

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

  static async _fromSchema(
    schema: BankAccountData,
    ctx: ApiContext,
  ): Promise<BankAccount> {
    const bearer = (schema.accountType === "Privatkonto")
      ? await Player._create(ctx, schema.bearer)
      : schema.bearer;

    return new BankAccount(
      schema.accountNumber,
      ctx,
      schema.balance,
      schema.accountType,
      bearer,
    );
  }

  private constructor(
    accountNumber: string,
    ctx: ApiContext,
    balance?: number,
    accountType?: BankAccountType,
    bearer?: BearerType,
  ) {
    this.accountNumber = accountNumber;
    this.#ctx = ctx;

    this.balance = balance;
    this.accountType = accountType;
    this.bearer = bearer;
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
    this.bearer = (this.accountType === "Privatkonto")
      ? await Player._create(this.#ctx, result.bearer)
      : result.bearer;

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
  readonly #ctx: ApiContext;

  constructor(ctx: ApiContext) {
    this.#ctx = ctx;
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
   * @returns A list of bank accounts of API key owner.
   */
  async listAll(): Promise<BankAccount[]> {
    await this.#ctx.handleOperation();

    const data = await this.#ctx.fetchData({
      ctx: this.#ctx,
      endpoint: "bank/list",
    });

    const result: BankAccount[] = [];

    // The endpoint returns an object keyed by account number, e.g.
    // { "ACC1": { accountNumber: "ACC1", ... }, "ACC2": { ... } }
    // Iterate over the values and validate each entry.
    const items = Object.values(data ?? {});

    for (const item of items) {
      const itemResult = await BankAccountSchema.parseAsync(item);
      if (this.#ctx.debug) {
        console.debug(
          `BankAccountSchema successfully validated: ${
            JSON.stringify(itemResult)
          }`,
        );
      }
      result.push(await BankAccount._fromSchema(itemResult, this.#ctx));
    }

    return result;
  }
}
