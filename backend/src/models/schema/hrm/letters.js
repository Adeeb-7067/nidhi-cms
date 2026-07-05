import mongoose, { Schema } from "mongoose";

const letterTypes = ["experience", "relieving", "offer"];

const hrmLetterSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    userId: { type: Number, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    employeeCode: { type: String, default: "" },
    designation: { type: String, default: "" },
    departmentName: { type: String, default: "" },
    joiningDate: { type: Date, default: null },
    relievingDate: { type: Date, required: true },
    letterType: { type: String, enum: letterTypes, required: true },
    offeredCtc: { type: Number, default: null },
    htmlContent: { type: String, required: true },
    pdfUrl: { type: String, default: null },
    emailSentAt: { type: Date, default: null },
    emailSentTo: { type: String, default: null },
    createdBy: { type: Number, default: null },
    createdByName: { type: String, default: "" },
    additionalNotes: { type: String, default: "" },
  },
  { timestamps: true },
);

hrmLetterSchema.index({ createdAt: -1 });
hrmLetterSchema.index({ userId: 1, letterType: 1, relievingDate: -1 });

const HrmLetters = mongoose.models.HrmLetters || mongoose.model("HrmLetters", hrmLetterSchema);
const hrmLettersTable = HrmLetters;

export { HrmLetters, hrmLettersTable, letterTypes };
