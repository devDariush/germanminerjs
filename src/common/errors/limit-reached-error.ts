export class LimitReachedError extends Error {
  public readonly currentRequests: number;
  public readonly limit: number;

  public override name = "LimitReachedError";

  constructor(currentRequests: number, limit: number) {
    super(`You have reached the limit of ${limit} requests.`);

    this.currentRequests = currentRequests;
    this.limit = limit;

    // Fix prototype chain for ES5/ES6 compatibility (important for 'instanceof')
    // This line is often necessary when extending built-in classes in TypeScript
    Object.setPrototypeOf(this, LimitReachedError.prototype);
  }
}
