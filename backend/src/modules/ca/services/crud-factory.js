/**
 * CA soft-CRUD — thin re-export of shared factory (calendar hooks stay in controllers).
 */
export {
  makeSoftCrud,
  requireEnum,
  requireDate,
  requireNumber,
  requireText,
  requireBool,
  optionalString,
  badRequest,
  softDeleteFields,
} from "../../../utils/soft-crud-factory.js";

export { dateOnly } from "./helpers.js";
