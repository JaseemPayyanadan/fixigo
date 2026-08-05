// Reading date fields off raw Firestore documents.
//
// Lives on its own rather than inside `serviceMapper` because both the mapper
// and `serviceStatusHistory` need it, and having them import from each other
// made the two modules circular.

/** Firestore `Timestamp`, which is what date fields arrive as before mapping. */
interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return typeof (value as TimestampLike | null)?.toDate === "function";
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Reads a date field, or `undefined` when the document does not carry one.
 *
 * Absent stays absent. An optional date that is missing means "we do not know",
 * and the analytics helpers are built to say so; substituting the current time
 * would instead assert something false about when the work happened.
 */
export function readOptionalDate(value: unknown): Date | undefined {
  if (isTimestampLike(value)) {
    const date = value.toDate();
    return isValidDate(date) ? date : undefined;
  }
  if (isValidDate(value)) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Midnight local time on the same calendar day. Never mutates the input. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Midnight local time on the first of the same month. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
