import { Counter, getNextSequence } from "@/models/schema";

function employeeIdFromCounter(name: string, counter: number): string {
  const prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .padEnd(2, "X");

  const num = String(counter).padStart(3, "0");
  return `${prefix}${num}`;
}

/** Preview next employee ID without consuming the sequence counter. */
export async function previewEmployeeId(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    return "—";
  }
  const counter = await Counter.findById("employee_id_counter");
  const next = (counter?.seq ?? 0) + 1;
  return employeeIdFromCounter(trimmed, next);
}

export async function generateEmployeeId(name: string): Promise<string> {
  // Get next counter using our global MongoDB sequences
  const counter = await getNextSequence("employee_id_counter");
  return employeeIdFromCounter(name, counter);
}
