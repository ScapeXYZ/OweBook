export const MAX_ROWS = 10_000;
export type Row = { line: number; cells: string[] };
export function csv(input: string): Row[] {
  const rows: Row[] = [];
  let line = 1, start = 1, field = "";
  let cells: string[] = [];
  let quoted = false, closed = false;
  const endField = () => {
    cells.push(field);
    field = "";
    closed = false;
  };
  const endRow = () => {
    endField();
    if (cells.length > 1 || cells[0].trim()) {
      rows.push({ line: start, cells });
      // The header is part of the file but does not count as a data row.
      if (rows.length > MAX_ROWS + 1) throw new Error("Row " + start + ": exceeds 10,000 data rows");
    }
    cells = [];
  };
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else {
        field += char;
        if (char === "\n") line++;
      }
    } else if (char === ",") {
      endField();
    } else if (char === "\n") {
      endRow();
      start = ++line;
    } else if (char === '"' && !field && !closed) {
      quoted = true;
    } else {
      if (closed || char === '"') throw new Error("Row " + line + ": unexpected CSV character after or inside quotes");
      field += char;
    }
  }
  if (quoted) throw new Error("Row " + start + ": unterminated quote");
  endRow();
  return rows;
}
