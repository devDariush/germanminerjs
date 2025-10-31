export class Player {
  playerName?: string;
  uuid?: string;

  constructor(playerName?: string, uuid?: string) {
    if (playerName) {
      this.playerName = playerName;
    }

    if (uuid) {
      this.uuid = uuid;
    }
  }
}
