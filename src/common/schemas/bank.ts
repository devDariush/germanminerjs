import * as z from "@zod/zod";

import type { ApiContext } from "../../client.ts";
import type { Loadable } from "../loadable.ts";
import type { Player } from "./player.ts";

const accountTypes = ["Privatkonto", "Firmenkonto"] as const;
type BankAccountType = (typeof accountTypes)[number];
type PlayerType = Player | string;

export const BankAccountSchema = z.object({
  accountNumber: z.string(),
  balance: z.number(),
  accountType: z.enum(accountTypes),
  bearer: z.string(),
});
type BankAccountSchema = z.infer<typeof BankAccountSchema>;

export class BankAccount implements Loadable {
  readonly accountNumber: string;
  balance?: number;
  accountType?: BankAccountType;
  bearer?: PlayerType;

  #ctx: ApiContext;

  static async _create(
    accountNumber: string,
    ctx: ApiContext
  ): Promise<BankAccount> {
    const bankAccount = new BankAccount(accountNumber, ctx);

    if (ctx.lazy === false) {
      const bankAccountLoaded = await bankAccount.load();
      return bankAccountLoaded;
    }

    return bankAccount;
  }

  static _fromSchema(schema: BankAccountSchema, ctx: ApiContext): BankAccount {
    return new BankAccount(schema.accountNumber, ctx, schema.balance, schema.accountType, schema.bearer);
  }

  private constructor(
    accountNumber: string,
    ctx: ApiContext,
    balance?: number,
    accountType?: BankAccountType,
    bearer?: PlayerType
  ) {
    this.accountNumber = accountNumber;
    this.#ctx = ctx;

    if(balance) this.balance = balance;
    if(accountType) this.accountType = accountType;
    if(bearer) this.bearer = bearer;
  }

  async load(): Promise<BankAccount> {
    const params = { "accountNumber": this.accountNumber };
    const data = await this.#ctx.fetch({
      ctx: this.#ctx,
      endpoint: "bank/info",
      params: params
    });

    const result = await BankAccountSchema.parseAsync(data["account"]);
    this.balance = result.balance;
    this.accountType = result.accountType;
    this.bearer = result.bearer;

    return this;
  }
}

export class BankService {
  #ctx: ApiContext;

  constructor(ctx: ApiContext) {
    this.#ctx = ctx;
  }


  /**
   * Get a specified bank account.
   * @param accountNumber Specify the account number it should load from.
   * @returns A BankAccount object with loaded data (if lazy mode is disabled - otherwise, they might be incomplete).
   */
  async get(accountNumber: string): Promise<BankAccount> {
    const bankAccountLoaded = await BankAccount._create(accountNumber, this.#ctx);
    return bankAccountLoaded;
  }

  /**
   * 
   * @returns A list of loaded BankAccount objects (if lazy mode is disabled - otherwise, they might be incomplete).
   */
  async listAll(): Promise<BankAccount[]> {
    const data = await this.#ctx.fetch({
      ctx: this.#ctx,
      endpoint: "bank/list"
    });
    const result: BankAccount[] = [];
    for(const item of data) {
      const itemResult = await BankAccountSchema.parseAsync(item);
      result.push(BankAccount._fromSchema(itemResult, this.#ctx));
    }
    return result;
  }

  
}