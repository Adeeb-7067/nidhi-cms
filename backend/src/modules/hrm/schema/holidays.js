import mongoose, { Schema } from "mongoose";
import { holidayScopes, holidayTypes } from "../../../constants/hrm.js";

const companyHolidaySchema = new Schema({
  id: { type: Number, unique: true, required: true },
  date: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: holidayTypes, default: "public", required: true },
  scope: { type: String, enum: holidayScopes, default: "company", required: true },
  departmentIds: { type: [Number], default: [] },
  year: { type: Number, index: true },
}, { timestamps: true });

const CompanyHolidays = mongoose.models.CompanyHolidays || mongoose.model("CompanyHolidays", companyHolidaySchema);
const companyHolidaysTable = CompanyHolidays;

export { CompanyHolidays, companyHolidaysTable };
