import { ApiContext } from "../client.ts";

export interface Loadable {
  load(): Promise<any>;
}
