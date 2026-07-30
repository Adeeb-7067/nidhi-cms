import { softDeleteFields as sharedSoftDelete } from "../../../utils/soft-crud-factory.js";

export {
  makeSoftCrud,
  requireEnum,
  requireDate,
  requireNumber,
  requireText,
  requireBool,
  optionalString,
  badRequest,
} from "../../../utils/soft-crud-factory.js";

export { dateOnly } from "./helpers.js";

/** @deprecated Prefer softDeleteFields from soft-crud-factory; kept for CA helpers. */
export function softDeleteFields() {
  return sharedSoftDelete();
}
