export type LeadCsvRow = {
  name?: string;
  phone: string;
  email?: string;
  address?: string;
};

/**
 * Minimal RFC 4180-ish CSV parser: handles quoted fields (with embedded
 * commas/newlines) and "" as an escaped quote. Deliberately dependency-free
 * — this project has repeatedly hit fast-moving/breaking npm packages this
 * session, and lead CSV exports from a CRM are simple enough not to need one.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

const COLUMN_ALIASES: Record<string, keyof LeadCsvRow> = {
  name: "name",
  "full name": "name",
  phone: "phone",
  "phone number": "phone",
  email: "email",
  address: "address",
};

export function parseLeadsCsv(text: string): { rows: LeadCsvRow[]; skipped: number } {
  const csvRows = parseCsvRows(text);
  if (csvRows.length === 0) return { rows: [], skipped: 0 };

  const header = csvRows[0].map((h) => h.trim().toLowerCase());
  const columnIndex: Partial<Record<keyof LeadCsvRow, number>> = {};
  header.forEach((h, i) => {
    const mapped = COLUMN_ALIASES[h];
    if (mapped) columnIndex[mapped] = i;
  });

  const rows: LeadCsvRow[] = [];
  let skipped = 0;

  for (const csvRow of csvRows.slice(1)) {
    const phone = columnIndex.phone !== undefined ? csvRow[columnIndex.phone]?.trim() : undefined;
    if (!phone) {
      skipped++;
      continue;
    }

    const name = columnIndex.name !== undefined ? csvRow[columnIndex.name]?.trim() : undefined;
    const email = columnIndex.email !== undefined ? csvRow[columnIndex.email]?.trim() : undefined;
    const address =
      columnIndex.address !== undefined ? csvRow[columnIndex.address]?.trim() : undefined;

    rows.push({
      phone,
      name: name || undefined,
      email: email || undefined,
      address: address || undefined,
    });
  }

  return { rows, skipped };
}
