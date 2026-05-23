import { HttpError } from "../lib/http-error.js";
import { formatZodError } from "../utils/route-errors.js";
function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      const field = Object.keys(details)[0];
      next(
        new HttpError(422, message, {
          code: "VALIDATION_ERROR",
          field: field && field !== "_root" ? field : void 0,
          details
        })
      );
      return;
    }
    req.body = result.data;
    next();
  };
}
function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      next(new HttpError(422, message, { code: "VALIDATION_ERROR", details }));
      return;
    }
    req.query = result.data;
    next();
  };
}
export {
  validateBody,
  validateQuery
};
