import { describe, expect, it } from "vitest";
import { parseLeadsCsv } from "@/lib/csv";

describe("parseLeadsCsv", () => {
  it("parses a basic CSV with all columns", () => {
    const csv = "name,phone,email,address\nJamie Rivera,5551234567,jamie@example.com,123 Main St";
    const { rows, skipped } = parseLeadsCsv(csv);
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        name: "Jamie Rivera",
        phone: "5551234567",
        email: "jamie@example.com",
        address: "123 Main St",
      },
    ]);
  });

  it("skips rows with no phone number", () => {
    const csv = "name,phone,email\nHas Phone,5551234567,a@example.com\nNo Phone,,b@example.com";
    const { rows, skipped } = parseLeadsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'name,phone,address\n"Smith, John",5559876543,"123 Main St, Apt 4"';
    const { rows } = parseLeadsCsv(csv);
    expect(rows[0].name).toBe("Smith, John");
    expect(rows[0].address).toBe("123 Main St, Apt 4");
  });

  it("recognizes alternate column headers", () => {
    const csv = "Full Name,Phone Number\nJamie Rivera,5551234567";
    const { rows } = parseLeadsCsv(csv);
    expect(rows[0].name).toBe("Jamie Rivera");
    expect(rows[0].phone).toBe("5551234567");
  });

  it("returns nothing for an empty file", () => {
    expect(parseLeadsCsv("")).toEqual({ rows: [], skipped: 0 });
  });

  it("returns nothing when there's only a header row", () => {
    expect(parseLeadsCsv("name,phone")).toEqual({ rows: [], skipped: 0 });
  });
});
