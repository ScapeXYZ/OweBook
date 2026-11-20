export const MAX_AMOUNT = 9_999_999_999;
export const MAX_CUSTOMER = 99_999_999_999;
export const MAX_SHOP = 9_999_999_999_999;
export function parseAmount(value: string, units: number): number {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match || (match[2]?.length ?? 0) > units) throw new Error("Invalid amount precision or syntax");
  const minor = BigInt(match[1] + (match[2] ?? "").padEnd(units, "0"));
  if (minor <= 0n || minor > BigInt(MAX_AMOUNT)) throw new Error("Amount must be between 1 and " + MAX_AMOUNT + " minor units");
  return Number(minor);
}
export function sum(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new Error("Total exceeds safe integer range");
  return result;
}
const DAY = 86_400_000;
export function day(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Expected YYYY-MM-DD");
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error("Impossible date");
  return date.valueOf() / DAY;
}
export function formatDate(value: number): string {
  const date = new Date(value * DAY);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return date.getUTCDate() + " " + months[date.getUTCMonth()] + " " + date.getUTCFullYear();
}
export type Currency = { code: string; symbol: string; minorUnits: number };
export function money(value: number, currency: Currency): string {
  const units = currency.minorUnits;
  const digits = String(Math.abs(value)).padStart(units + 1, "0");
  const whole = units ? digits.slice(0, -units) : digits;
  return currency.symbol + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (units ? "." + digits.slice(-units) : "") + (value < 0 ? " CR" : "");
}
