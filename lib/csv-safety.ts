/**
 * Spreadsheet apps run a cell as a formula when it starts with = + - @ (or a
 * tab/carriage return), so text from a bank file like `-2+3+cmd|' /C calc'!A0`
 * must not be written to a CSV as-is (CSV injection). Prefixing an apostrophe
 * makes Excel and Sheets show it as text.
 *
 * Plain numbers ("-12.50", "+3", "-$1,234.56") are left alone so amounts stay
 * readable and re-importable.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?[$€£]?\d[\d.,\s ']*$/;

export function escapeCsvCell(value: string): string {
  return FORMULA_START.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}
