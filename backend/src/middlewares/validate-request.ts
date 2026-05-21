import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "@/lib/http-error";
import { formatZodError } from "@/lib/route-errors";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      const field = Object.keys(details)[0];
      next(
        new HttpError(422, message, {
          code: "VALIDATION_ERROR",
          field: field && field !== "_root" ? field : undefined,
          details,
        }),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      next(new HttpError(422, message, { code: "VALIDATION_ERROR", details }));
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
