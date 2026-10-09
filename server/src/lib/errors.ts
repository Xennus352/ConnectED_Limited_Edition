export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const badRequest = (message: string, errors?: unknown) =>
  new ApiError(400, message, errors);

export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, message);

export const forbidden = (message = "You do not have access to this resource") =>
  new ApiError(403, message);

export const conflict = (message = "That conflicts with an existing record") =>
  new ApiError(409, message);

export const notFound = (message = "Resource not found") =>
  new ApiError(404, message);
