import type { ApiContext } from "../../client.ts";
import { ApiError } from "../errors/api-error.ts";
import { GmClientError } from "../errors/client-error.ts";

export class Player {
  playerName?: string;
  uuid?: string;

  #ctx: ApiContext;

  private constructor(ctx: ApiContext, playerName?: string, uuid?: string) {
    this.#ctx = ctx;

    this.playerName = playerName;
    this.uuid = uuid;
  }

  static async _create(
    ctx: ApiContext,
    playerName?: string,
    uuid?: string,
  ): Promise<Player> {
    const player = new Player(ctx, playerName, uuid);

    if (ctx.lazy == false) {
      await player._load();
      return player;
    }

    return player;
  }

  private async _load(): Promise<void> {
    if (this.playerName && !this.uuid) {
      const uuid = await this._getUuidFromPlayername(this.playerName);
      this.uuid = uuid;
    } else if (!this.playerName && this.uuid) {
      const playerName = await this._getPlayernameFromUuid(this.uuid);
      this.playerName = playerName;
    } else {
      throw new GmClientError(
        "You have not specified a uuid or playerName for the Player object to load.",
      );
    }
  }

  async load(): Promise<void> {
    await this._load();
  }

  private async _getUuidFromPlayername(playerName: string): Promise<string> {
    this.#ctx.handleOperation();

    const params = { "playername": playerName };
    const data = await this.#ctx.fetchData({
      ctx: this.#ctx,
      endpoint: "util/uuid",
      params: params,
    });

    const uuid = String(data["uuid"]);
    if (!uuid) {
      throw new ApiError(
        `Couldn't fetch UUID from API for player name "${playerName}".`,
      );
    }

    return uuid;
  }

  private async _getPlayernameFromUuid(uuid: string): Promise<string> {
    this.#ctx.handleOperation();

    const params = { "uuid": uuid };
    const data = await this.#ctx.fetchData({
      ctx: this.#ctx,
      endpoint: "util/playername",
      params: params,
    });

    const playerName = String(data["playername"]);
    if (!playerName) {
      throw new ApiError(
        `Couldn't fetch player name from API for UUID "${uuid}".`,
      );
    }

    return playerName;
  }
}

export class PlayerService {
  #ctx: ApiContext;

  constructor(ctx: ApiContext) {
    this.#ctx = ctx;
  }

  async fromPlayername(playerName: string): Promise<Player> {
    const ctx = Object.assign({}, this.#ctx, { lazy: false });
    const player = await Player._create(ctx, playerName);
    return player;
  }

  async fromUuid(uuid: string): Promise<Player> {
    const ctx = Object.assign({}, this.#ctx, { lazy: false });
    const player = await Player._create(ctx, undefined, uuid);
    return player;
  }
}
