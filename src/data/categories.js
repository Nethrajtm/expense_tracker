// categories.js — Default predefined categories for the Expense Tracker

export const DEFAULT_CATEGORIES = [
  { id: "food",          name: "Food",          color: "#f59e0b" },
  { id: "transport",     name: "Transport",     color: "#3b82f6" },
  { id: "bills",         name: "Bills",         color: "#1d4ed8" },
  { id: "shopping",      name: "Shopping",      color: "#8b5cf6" },
  { id: "entertainment", name: "Entertainment", color: "#ec4899" },
  { id: "other",         name: "Other",         color: "#64748b" },
];

/**
 * Resolves a category by ID from the active categories list.
 * Fallback to a neutral tag if not found.
 */
export function getCategoryMeta(categories = [], id) {
  const match = categories.find((c) => c.id === id);
  if (match) {
    return {
      id: match.id,
      name: match.name || match.label || "Unnamed",
      color: match.color || "#6b7280",
    };
  }
  return { id, name: id || "Unknown", color: "#6b7280" };
}

export default DEFAULT_CATEGORIES;
