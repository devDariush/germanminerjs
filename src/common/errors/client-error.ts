export class GmClientError extends Error {
  public override name = "GmClientError";

  constructor(message: string) {
    super(`Client failed: ${message}`);

    // Fix prototype chain for ES5/ES6 compatibility (important for 'instanceof')
    // This line is often necessary when extending built-in classes in TypeScript
    Object.setPrototypeOf(this, GmClientError.prototype);
  }
}
