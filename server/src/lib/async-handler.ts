import { Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: (error?: unknown) => void
) => Promise<unknown> | unknown;

/** Wraps an async handler so rejected promises reach the error middleware. */
export const asyncHandler =
  (handler: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export default asyncHandler;
