import { useState } from "react";
import { getCategoryMeta } from "../../data/categories";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./ExpenseList.css";

/* Helpers */
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00"); // force local parse
  return {
    primary: d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    secondary: d.toLocaleDateString("en-IN", { weekday: "long" }),
  };
}

function formatAmount(amount) {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function ExpenseList({ expenses, categories = [], onDelete, onAddExpense }) {
  const [pendingDelete, setPendingDelete] = useState(null); // expense to confirm

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-illustration">📭</div>
        <h2>No expenses yet!</h2>
        <p>
          Your expense list is empty. Start by adding your first expense to keep
          track of where your money is going.
        </p>
        {onAddExpense && (
          <button
            type="button"
            className="btn-add-first"
            onClick={onAddExpense}
          >
            <span>＋</span>
            Add Your First Expense
          </button>
        )}
      </div>
    );
  }

  // Sort descending by date, then by id for stability (client-side sorting)
  const sorted = [...expenses].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return a.id.localeCompare(b.id);
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleDeleteClick = (expense) => setPendingDelete(expense);
  const handleConfirm = () => {
    onDelete(pendingDelete.id);
    setPendingDelete(null);
  };
  const handleCancel = () => setPendingDelete(null);

  return (
    <>
      <div className="expense-list-container">
        {/* Toolbar */}
        <div className="list-toolbar">
          <div className="list-toolbar-left">
            <h3>
              All Expenses
              <span>
                ({expenses.length} record{expenses.length !== 1 ? "s" : ""})
              </span>
            </h3>
          </div>
          <div className="total-badge">Total: {formatAmount(total)}</div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="col-amount">Amount</th>
                <th>Category</th>
                <th>Note</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((expense) => {
                const cat = getCategoryMeta(categories, expense.category);
                const date = formatDate(expense.date);

                return (
                  <tr key={expense.id}>
                    {/* Date */}
                    <td className="td-date">
                      <span className="date-primary">{date.primary}</span>
                      <span className="date-secondary">{date.secondary}</span>
                    </td>

                    {/* Amount */}
                    <td className="td-amount">{formatAmount(expense.amount)}</td>

                    {/* Category */}
                    <td>
                      <span
                        className="category-tag"
                        style={{
                          backgroundColor: cat.color + "1a",
                          color: cat.color,
                          border: `1px solid ${cat.color}40`,
                        }}
                      >
                        <span
                          className="tag-dot"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </td>

                    {/* Note */}
                    <td className="td-note">
                      {expense.note ? (
                        <span className="note-text" title={expense.note}>
                          {expense.note}
                        </span>
                      ) : (
                        <span className="note-empty">No note</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="td-actions">
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteClick(expense)}
                        title="Delete expense"
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm dialog */}
      {pendingDelete && (
        <ConfirmDialog
          expense={pendingDelete}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

export default ExpenseList;
