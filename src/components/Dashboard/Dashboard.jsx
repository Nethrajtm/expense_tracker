import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getCategoryMeta } from "../../data/categories";
import {
  getCurrentMonthKey,
  formatMonthLabel,
  calculateMonthlySummary,
  calculateCategoryBreakdown,
  calculateSixMonthTrend,
} from "../../utils/analyticsUtils";
import "./Dashboard.css";

function formatAmount(amount) {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DashboardTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="dashboard-chart-tooltip">
      <div className="tooltip-label">{item.fullMonth}</div>
      <div className="tooltip-amount">{formatAmount(item.total)}</div>
    </div>
  );
}

function Dashboard({
  expenses = [],
  categories = [],
  onAddExpense,
  onNavigate,
}) {
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = formatMonthLabel(currentMonthKey);

  const {
    monthSummary,
    categoryBreakdown,
    trendData,
    recentTransactions,
  } = useMemo(() => {
    const summary = calculateMonthlySummary(expenses, currentMonthKey);
    const breakdown = calculateCategoryBreakdown(
      expenses,
      categories,
      currentMonthKey
    );
    const trend = calculateSixMonthTrend(expenses);
    const recent = [...expenses]
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return a.id.localeCompare(b.id);
      })
      .slice(0, 5);

    return {
      monthSummary: summary,
      categoryBreakdown: breakdown.items || [],
      trendData: trend,
      recentTransactions: recent,
    };
  }, [expenses, categories, currentMonthKey]);

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-illustration">📭</div>
        <h2>No expenses yet!</h2>
        <p>
          Your expense list is empty. Add your first expense to see your monthly
          spending, category overview, and recent transactions.
        </p>
        <button
          type="button"
          className="btn-add-first"
          onClick={onAddExpense}
        >
          <span>＋</span>
          Add Your First Expense
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 1. Three Essential KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Expenses ({currentMonthLabel})</div>
          <div className="kpi-value">
            {formatAmount(monthSummary.currentTotal)}
          </div>
          <div className="kpi-sub">
            {monthSummary.direction === "increased" &&
              `▲ ${monthSummary.percentageChange.toFixed(1)}% vs last month`}
            {monthSummary.direction === "decreased" &&
              `▼ ${monthSummary.percentageChange.toFixed(1)}% vs last month`}
            {monthSummary.direction === "new" && "First spending recorded this month"}
            {monthSummary.direction === "unchanged" && "Same as last month"}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Transactions</div>
          <div className="kpi-value">{monthSummary.currentCount}</div>
          <div className="kpi-sub">
            {monthSummary.currentCount === 1
              ? "expense this month"
              : "expenses this month"}{" "}
            ({expenses.length} total)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Highest Spending Category</div>
          {topCategory ? (
            <>
              <div className="kpi-value kpi-category-row">
                <span
                  className="kpi-cat-dot"
                  style={{ backgroundColor: topCategory.color }}
                />
                <span>{topCategory.name}</span>
              </div>
              <div className="kpi-sub">
                {formatAmount(topCategory.value)} (
                {topCategory.percentage.toFixed(0)}% of month)
              </div>
            </>
          ) : (
            <>
              <div className="kpi-value">—</div>
              <div className="kpi-sub">No spending this month</div>
            </>
          )}
        </div>
      </div>

      {/* 2. Monthly Spending Overview + Category Overview */}
      <div className="dashboard-mid-grid">
        {/* Monthly Spending Chart */}
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Monthly Spending</h2>
              <p>Last 6 months overview</p>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate("analytics")}
            >
              Analytics →
            </button>
          </div>

          <div className="dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
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
                  axisLine={false}
                  tickFormatter={(val) =>
                    val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`
                  }
                  tick={{ fill: "var(--clr-text-muted)", fontSize: 12 }}
                />
                <Tooltip
                  content={<DashboardTooltip />}
                  cursor={{ fill: "var(--clr-primary-lt)" }}
                />
                <Bar
                  dataKey="total"
                  fill="var(--clr-primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Category Overview */}
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Category Overview</h2>
              <p>{currentMonthLabel}</p>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate("categories")}
            >
              Manage →
            </button>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="dashboard-card-empty">
              No expenses recorded for {currentMonthLabel}.
            </div>
          ) : (
            <div className="cat-overview-list">
              {categoryBreakdown.slice(0, 5).map((cat) => (
                <div key={cat.id} className="cat-overview-item">
                  <div className="cat-overview-top">
                    <span className="cat-overview-name">
                      <span
                        className="cat-overview-dot"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                    <span className="cat-overview-amount">
                      {formatAmount(cat.value)}
                      <span className="cat-overview-pct">
                        {cat.percentage.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="cat-overview-track">
                    <div
                      className="cat-overview-fill"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 3. Recent Transactions (latest 5) */}
      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>Recent Transactions</h2>
            <p>Latest {recentTransactions.length} expenses</p>
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={() => onNavigate("expenses")}
          >
            View all →
          </button>
        </div>

        <div className="recent-table-wrap">
          <table className="recent-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th className="col-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((exp) => {
                const cat = getCategoryMeta(categories, exp.category);
                return (
                  <tr key={exp.id}>
                    <td className="recent-date">{formatShortDate(exp.date)}</td>
                    <td>
                      <span
                        className="recent-cat-tag"
                        style={{
                          backgroundColor: `${cat.color}1a`,
                          color: cat.color,
                          border: `1px solid ${cat.color}40`,
                        }}
                      >
                        <span
                          className="recent-cat-dot"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </td>
                    <td className="recent-note">
                      {exp.note ? (
                        exp.note
                      ) : (
                        <span className="recent-note-empty">No note</span>
                      )}
                    </td>
                    <td className="col-right recent-amount">
                      {formatAmount(exp.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
