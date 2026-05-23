import { Counter, getNextSequence } from "../models/schema/index.js";
function employeeIdFromCounter(name, counter) {
  const prefix = name.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2).padEnd(2, "X");
  const num = String(counter).padStart(3, "0");
  return `${prefix}${num}`;
}
async function previewEmployeeId(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "\u2014";
  }
  const counter = await Counter.findById("employee_id_counter");
  const next = (counter?.seq ?? 0) + 1;
  return employeeIdFromCounter(trimmed, next);
}
async function generateEmployeeId(name) {
  const counter = await getNextSequence("employee_id_counter");
  return employeeIdFromCounter(name, counter);
}
export {
  generateEmployeeId,
  previewEmployeeId
};
