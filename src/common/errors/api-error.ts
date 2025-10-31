export class ApiError extends Error {
  public override name = "ApiError";

  status?: number;
  statusText?: string;

  constructor(errorMessage: string, status?: number, statusText?: string) {
    super(`Request failed: ${errorMessage}`);

    this.status = status;
    this.statusText = statusText;

    // Fix prototype chain for ES5/ES6 compatibility (important for 'instanceof')
    // This line is often necessary when extending built-in classes in TypeScript
    Object.setPrototypeOf(this, ApiError.prototype); 
  }
}