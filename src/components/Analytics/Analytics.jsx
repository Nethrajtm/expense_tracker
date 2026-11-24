import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getCurrentMonthKey,
  calculateMonthlySummary,
  calculateCategoryBreakdown,
  calculateSixMonthTrend,
  getAvailableMonths,
  formatMonthLabel,
} from "../../utils/analyticsUtils";
import { exportExpensesToCsv } from "../../utils/csvExport";
import "./Analytics.css";

function formatCurrency(val) {
  return (
    "₹" +
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/* Custom Tooltip for Category Donut Chart */
function CategoryPieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-recharts-tooltip">
        <div className="tooltip-title">{data.name}</div>
        <div className="tooltip-val">{formatCurrency(data.value)}</div>
        <div className="tooltip-sub">{data.percentage}% of month's spend</div>
      </div>
    );
  }
  return null;
}

/* Custom Tooltip for 6-Month Trend Bar Chart */
function TrendBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-recharts-tooltip">
        <div className="tooltip-title">{data.fullMonth}</div>
        <div className="tooltip-val">{formatCurrency(data.total)}</div>
        <div className="tooltip-sub">
          {data.count} transaction{data.count !== 1 ? "s" : ""}
        </div>
      </div>
    );
  }
  return null;
}

function Analytics({ expenses = [], categories = [] }) {
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [exportNotice, setExportNotice] = useState(null);

  // Available months for filtering
  const availableMonths = useMemo(
    () => getAvailableMonths(expenses, currentMonthKey),
    [expenses, currentMonthKey]
  );

  // 1. Monthly Summary Card Metrics
  const monthlySummary = useMemo(
    () => calculateMonthlySummary(expenses, currentMonthKey),
    [expenses, currentMonthKey]
  );

  // 2. Category Breakdown Chart Data
  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(expenses, categories, selectedMonth),
    [expenses, categories, selectedMonth]
  );

  // 3. Six-Month Trend Data
  const trendData = useMemo(
    () => calculateSixMonthTrend(expenses, currentMonthKey),
    [expenses, currentMonthKey]
  );

  // CSV Export Handler
  const handleExportCsv = () => {
    if (!expenses || expenses.length === 0) {
      setExportNotice({
        type: "warning",
        message: "No expenses to export yet. Add an expense first!",
      });
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const ok = exportExpensesToCsv(expenses, categories);
    if (ok) {
      setExportNotice({
        type: "success",
        message: `Successfully exported ${expenses.length} expense record${expenses.length !== 1 ? "s" : ""} to CSV.`,
      });
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  return (
    <div className="analytics-dashboard">
      {/* Top Toolbar / Export Bar */}
      <div className="analytics-toolbar">
        <div className="analytics-toolbar-info">
          <h3>Spending Analytics</h3>
          <p>
            Insights into your monthly spending patterns, category allocations,
            and 6-month trends.
          </p>
        </div>

        <div className="analytics-toolbar-actions">
          {exportNotice && (
            <div className={`export-toast ${exportNotice.type}`}>
              {exportNotice.message}
            </div>
          )}
          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportCsv}
            title="Download all expenses as a formatted CSV file"
          >
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* 1. Monthly Summary Cards Section */}
      <div className="monthly-summary-container">
        {/* Current Month Card */}
        <div className="summary-metric-card">
          <div className="metric-card-header">
            <span className="metric-label">
              This Month ({monthlySummary.referenceMonthLabel})
            </span>
            {monthlySummary.direction === "increased" && (
              <span className="metric-badge increase">
                ▲ +{monthlySummary.percentageChange.toFixed(1)}%
              </span>
            )}
            {monthlySummary.direction === "decreased" && (
              <span className="metric-badge decrease">
                ▼ -{monthlySummary.percentageChange.toFixed(1)}%
              </span>
            )}
            {monthlySummary.direction === "unchanged" && (
              <span className="metric-badge neutral">● No change</span>
            )}
            {monthlySummary.direction === "new" && (
              <span className="metric-badge decrease">✦ First month</span>
            )}
          </div>
          <div className="metric-value">
            {formatCurrency(monthlySummary.currentTotal)}
          </div>
          <div className="metric-comparison">
            {monthlySummary.direction === "increased" && (
              <span>
                Increased by{" "}
                <strong>
                  {formatCurrency(
                    monthlySummary.currentTotal - monthlySummary.previousTotal
                  )}
                </strong>{" "}
                vs {monthlySummary.prevMonthLabel}
              </span>
            )}
            {monthlySummary.direction === "decreased" && (
              <span>
                Saved{" "}
                <strong>
                  {formatCurrency(
                    monthlySummary.previousTotal - monthlySummary.currentTotal
                  )}
                </strong>{" "}
                compared to {monthlySummary.prevMonthLabel}
              </span>
            )}
            {monthlySummary.direction === "unchanged" && (
              <span>Equal to previous month's spending</span>
            )}
            {monthlySummary.direction === "new" && (
              <span>No prior recorded month to compare against</span>
            )}
          </div>
        </div>

        {/* Previous Month Card */}
        <div className="summary-metric-card">
          <div className="metric-card-header">
            <span className="metric-label">
              Previous Month ({monthlySummary.prevMonthLabel})
            </span>
            <span className="metric-badge neutral">Baseline</span>
          </div>
          <div className="metric-value">
            {formatCurrency(monthlySummary.previousTotal)}
          </div>
          <div className="metric-comparison">
            <span>Prior baseline for month-over-month comparison</span>
          </div>
        </div>

        {/* Month-over-Month Velocity Card */}
        <div className="summary-metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Spending Velocity</span>
            <span className="metric-badge neutral">
              {monthlySummary.currentCount} transactions
            </span>
          </div>
          <div className="metric-value">
            {monthlySummary.currentCount > 0
              ? formatCurrency(
                  monthlySummary.currentTotal / monthlySummary.currentCount
                )
              : "₹0.00"}
          </div>
          <div className="metric-comparison">
            <span>Average transaction size this month</span>
          </div>
        </div>
      </div>

      {/* 2 & 3. Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Category Breakdown Card */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h4>Category Breakdown</h4>
              <p>Expenses distribution by category</p>
            </div>
            {/* Month Filter Selector */}
            <select
              className="month-filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select month for category breakdown"
            >
              <option value="all">All Time</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="category-breakdown-body">
            {categoryBreakdown.items.length === 0 ? (
              <div className="chart-empty-state">
                <div className="chart-empty-icon">📊</div>
                <p>No expenses found for {selectedMonth === "all" ? "this period" : formatMonthLabel(selectedMonth)}.</p>
              </div>
            ) : (
              <>
                <div className="chart-viewport-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown.items}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryBreakdown.items.map((entry) => (
                          <Cell
                            key={`cell-${entry.id}`}
                            fill={entry.color || "#6b7280"}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut Summary */}
                  <div className="donut-center-info">
                    <div className="donut-center-label">Total</div>
                    <div className="donut-center-val">
                      {formatCurrency(categoryBreakdown.totalSpent)}
                    </div>
                  </div>
                </div>

                {/* Detailed Category List with % */}
                <div className="category-breakdown-list">
                  {categoryBreakdown.items.map((item) => (
                    <div key={item.id} className="category-breakdown-item">
                      <div className="cat-item-left">
                        <span
                          className="cat-color-dot"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="cat-item-name">{item.name}</span>
                      </div>
                      <div className="cat-item-right">
                        <span className="cat-item-amount">
                          {formatCurrency(item.value)}
                        </span>
                        <span className="cat-item-pct">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Six-Month Spending Trend Card */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <h4>6-Month Spending Trend</h4>
              <p>Total spend across the last 6 calendar months</p>
            </div>
          </div>

          <div className="chart-viewport-wrap chart-viewport-wrap--tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--clr-border)"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "var(--clr-border)" }}
                  tick={{ fill: "var(--clr-text-muted)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "var(--clr-border)" }}
                  tickFormatter={(val) => (val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
                  tick={{ fill: "var(--clr-text-muted)", fontSize: 12 }}
                />
                <Tooltip content={<TrendBarTooltip />} />
                <Bar
                  dataKey="total"
                  fill="var(--clr-primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
