import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Forwards async rejections to Express error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => void | Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
