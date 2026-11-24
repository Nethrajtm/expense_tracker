import "./ConfirmDialog.css";

function ConfirmDialog({ expense, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">🗑️</div>
        <h3>Delete Expense?</h3>
        <p>
          This will permanently remove{" "}
          <strong>
            ₹{expense?.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>{" "}
          from your records. This action cannot be undone.
        </p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-delete" onClick={onConfirm}>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
