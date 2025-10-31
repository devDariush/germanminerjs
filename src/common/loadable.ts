// deno-lint-ignore no-explicit-any
export interface Loadable<T = any> {
  load(): Promise<T>;
}
