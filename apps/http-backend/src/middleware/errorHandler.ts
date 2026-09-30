/**
 * Final Express middleware: turns any thrown error into clean JSON.
 * Controllers throw `HttpError(status, message)` for expected failures
 * (404, 400...); unexpected bugs become 500s (message hidden in prod).
 */
import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("[http] unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
