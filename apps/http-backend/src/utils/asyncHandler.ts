/**
 * Wrap async route handlers so rejected promises reach Express'
 * error middleware instead of crashing / hanging the request.
 */
import type { NextFunction, Request, Response } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
