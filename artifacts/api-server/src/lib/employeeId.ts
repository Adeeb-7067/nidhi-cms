import { db } from "./db";
import { employeeCounterTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

export async function generateEmployeeId(name: string): Promise<string> {
  // Get next counter
  const rows = await db
    .update(employeeCounterTable)
    .set({ counter: sql`${employeeCounterTable.counter} + 1` })
    .returning({ counter: employeeCounterTable.counter });

  let counter: number;
  if (!rows.length) {
    // Initialize counter
    const inserted = await db
      .insert(employeeCounterTable)
      .values({ counter: 1 })
      .returning({ counter: employeeCounterTable.counter });
    counter = inserted[0].counter;
  } else {
    counter = rows[0].counter;
  }

  // Take first 2 chars from first name, uppercase
  const prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .padEnd(2, "X");

  const num = String(counter).padStart(3, "0");
  return `${prefix}${num}`;
}
