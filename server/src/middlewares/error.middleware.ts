import { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";

import { ApiError } from "../lib/errors";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

const humanizePrisma = (error: any): ApiError | null => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return new ApiError(404, "Resource not found");
      case "P2023":
        return new ApiError(400, "Invalid identifier supplied");
      case "P2002":
        return new ApiError(409, "A record with that value already exists");
      case "P2014":
        return new ApiError(400, "The supplied relation does not exist");
      default:
        return new ApiError(400, error.message);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ApiError(
      400,
      process.env.NODE_ENV !== "production" && error.message
        ? `The supplied payload is not valid — ${error.message}`
        : "The supplied payload is not valid"
    );
  }

  return null;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.errors !== undefined ? { errors: error.errors } : {}),
    });
    return;
  }

  const prismaError = humanizePrisma(error);
  if (prismaError) {
    res.status(prismaError.statusCode).json({
      success: false,
      message: prismaError.message,
    });
    return;
  }

  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Malformed JSON body" });
    return;
  }

  if (error?.name === "MulterError") {
    res.status(400).json({
      success: false,
      message: "The uploaded file is too large",
    });
    return;
  }

  console.error("[connect-ed] unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server",
    ...(process.env.NODE_ENV !== "production" && error?.message
      ? { errors: error.message }
      : {}),
  });
};

export default errorHandler;
