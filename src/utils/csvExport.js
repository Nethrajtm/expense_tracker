import { getCategoryMeta } from "../data/categories.js";

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180).
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports expenses to a downloadable CSV file.
 *
 * Headers required:
 * ID, Amount, Category, Date, Note
 *
 * @param {Array} expenses - list of expense objects
 * @param {Array} categories - list of category objects for resolving names
 * @returns {boolean} - true if exported, false if empty
 */
export function exportExpensesToCsv(expenses = [], categories = []) {
  if (!expenses || expenses.length === 0) {
    return false;
  }

  const headers = ["ID", "Amount", "Category", "Date", "Note"];

  const rows = expenses.map((exp) => {
    const catName = getCategoryMeta(categories, exp.category).name;
    const amountStr = typeof exp.amount === "number" ? exp.amount.toFixed(2) : exp.amount;

    return [
      escapeCsvValue(exp.id),
      escapeCsvValue(amountStr),
      escapeCsvValue(catName),
      escapeCsvValue(exp.date),
      escapeCsvValue(exp.note || ""),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n"); // Add UTF-8 BOM for Excel compatibility

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  const today = new Date().toISOString().split("T")[0];
  anchor.href = url;
  anchor.download = `expenses_export_${today}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return true;
}
