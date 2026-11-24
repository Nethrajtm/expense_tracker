import { getCategoryMeta } from "../data/categories.js";

/**
 * Returns current local year and month as "YYYY-MM"
 */
export function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Given a "YYYY-MM" string, returns the previous month "YYYY-MM"
 */
export function getPreviousMonthKey(monthKey) {
  const [yearStr, monthStr] = monthKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Formats a "YYYY-MM" string into human readable title e.g. "November 2026"
 */
export function formatMonthLabel(monthKey) {
  if (!monthKey) return "";
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Formats a "YYYY-MM" string into short label e.g. "Nov '26"
 */
export function formatShortMonth(monthKey) {
  if (!monthKey) return "";
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

/**
 * 1. Computes monthly summary statistics comparing current month vs previous month.
 */
export function calculateMonthlySummary(expenses = [], referenceMonth = getCurrentMonthKey()) {
  const prevMonth = getPreviousMonthKey(referenceMonth);

  let currentTotal = 0;
  let previousTotal = 0;
  let currentCount = 0;

  expenses.forEach((exp) => {
    if (exp.date && exp.date.startsWith(referenceMonth)) {
      currentTotal += exp.amount;
      currentCount += 1;
    } else if (exp.date && exp.date.startsWith(prevMonth)) {
      previousTotal += exp.amount;
    }
  });

  let percentageChange = 0;
  let direction = "unchanged"; // "increased" | "decreased" | "unchanged" | "new"

  if (previousTotal === 0) {
    if (currentTotal > 0) {
      percentageChange = 100;
      direction = "new";
    } else {
      percentageChange = 0;
      direction = "unchanged";
    }
  } else {
    const diff = currentTotal - previousTotal;
    percentageChange = ((diff / previousTotal) * 100);
    if (diff > 0) direction = "increased";
    else if (diff < 0) direction = "decreased";
    else direction = "unchanged";
  }

  return {
    referenceMonth,
    referenceMonthLabel: formatMonthLabel(referenceMonth),
    prevMonth,
    prevMonthLabel: formatMonthLabel(prevMonth),
    currentTotal,
    previousTotal,
    currentCount,
    percentageChange: Math.abs(percentageChange),
    rawPercentageChange: percentageChange,
    direction,
  };
}

/**
 * 2. Computes Category Breakdown for a given month.
 * Returns data formatted for Recharts Pie/Donut and detailed legend list.
 */
export function calculateCategoryBreakdown(expenses = [], categories = [], selectedMonth = getCurrentMonthKey()) {
  const filtered = selectedMonth === "all"
    ? expenses
    : expenses.filter((exp) => exp.date && exp.date.startsWith(selectedMonth));

  const totalSpent = filtered.reduce((sum, e) => sum + e.amount, 0);

  const catMap = {};
  filtered.forEach((exp) => {
    catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
  });

  const breakdown = Object.entries(catMap).map(([catId, amount]) => {
    const meta = getCategoryMeta(categories, catId);
    const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
    return {
      id: catId,
      name: meta.name,
      color: meta.color,
      value: amount, // for Recharts Pie
      percentage: Number(percentage.toFixed(1)),
    };
  });

  // Sort descending by value
  breakdown.sort((a, b) => b.value - a.value);

  return {
    totalSpent,
    expenseCount: filtered.length,
    items: breakdown,
  };
}

/**
 * 3. Computes Six-Month Spending Trend ending at referenceMonth.
 * Guaranteed to return exactly 6 consecutive months in chronological order,
 * including months with zero expenses.
 */
export function calculateSixMonthTrend(expenses = [], referenceMonth = getCurrentMonthKey()) {
  // Generate list of 6 months backwards from referenceMonth
  const months = [];
  let curr = referenceMonth;

  for (let i = 0; i < 6; i++) {
    months.unshift(curr); // place earliest at start
    curr = getPreviousMonthKey(curr);
  }

  // Pre-initialize totals
  const monthlyTotals = {};
  months.forEach((m) => {
    monthlyTotals[m] = { total: 0, count: 0 };
  });

  expenses.forEach((exp) => {
    if (exp.date) {
      const expMonth = exp.date.slice(0, 7);
      if (monthlyTotals[expMonth]) {
        monthlyTotals[expMonth].total += exp.amount;
        monthlyTotals[expMonth].count += 1;
      }
    }
  });

  return months.map((m) => {
    const data = monthlyTotals[m];
    return {
      monthKey: m,
      month: formatShortMonth(m),
      fullMonth: formatMonthLabel(m),
      total: data.total,
      count: data.count,
    };
  });
}

/**
 * Returns all distinct months present in the expenses, plus current month, sorted descending.
 */
export function getAvailableMonths(expenses = [], currentMonth = getCurrentMonthKey()) {
  const set = new Set();
  set.add(currentMonth);

  expenses.forEach((e) => {
    if (e.date && e.date.length >= 7) {
      set.add(e.date.slice(0, 7));
    }
  });

  return Array.from(set).sort((a, b) => b.localeCompare(a));
}
