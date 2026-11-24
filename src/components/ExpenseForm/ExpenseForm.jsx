import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "./ExpenseForm.css";

// Returns today's date as YYYY-MM-DD
function todayString() {
  return new Date().toISOString().split("T")[0];
}

const INITIAL_VALUES = {
  amount: "",
  category: "",
  date: todayString(),
  note: "",
};

const INITIAL_ERRORS = {
  amount: "",
  category: "",
  date: "",
  note: "",
};

function ExpenseForm({ categories = [], onSave, onClose }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [touched, setTouched] = useState({});

  /* ---- Validation ---- */
  function validate(vals) {
    const errs = {};

    if (!vals.amount || isNaN(Number(vals.amount)) || Number(vals.amount) <= 0) {
      errs.amount = "Amount must be a number greater than zero.";
    }

    if (!vals.category) {
      errs.category = "Please select a category.";
    }

    if (!vals.date) {
      errs.date = "Date is required.";
    }

    if (vals.note.length > 120) {
      errs.note = `Note must not exceed 120 characters (currently ${vals.note.length}).`;
    }

    return errs;
  }

  /* ---- Handlers ---- */
  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));

    // Live-validate touched fields
    if (touched[name]) {
      const errs = validate({ ...values, [name]: value });
      setErrors((prev) => ({ ...prev, [name]: errs[name] || "" }));
    }
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    const errs = validate(values);
    setErrors((prev) => ({ ...prev, [name]: errs[name] || "" }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    // Mark all fields touched
    setTouched({ amount: true, category: true, date: true, note: true });

    const errs = validate(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const newExpense = {
      id: uuidv4(),
      amount: parseFloat(values.amount),
      category: values.category,
      date: values.date,
      note: values.note.trim(),
    };

    onSave(newExpense);
  }

  /* ---- Char-count class ---- */
  function charCountClass(len) {
    if (len >= 120) return "char-count at-limit";
    if (len >= 100) return "char-count near-limit";
    return "char-count";
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Add New Expense</h2>
            <p>Fill in the details below to record an expense.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="expense-form" onSubmit={handleSubmit} noValidate>
          {/* Amount + Category */}
          <div className="form-row">
            {/* Amount */}
            <div className="form-field">
              <label htmlFor="amount">
                Amount <span className="required">*</span>
              </label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">₹</span>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={values.amount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input${errors.amount && touched.amount ? " is-error" : ""}`}
                />
              </div>
              {errors.amount && touched.amount && (
                <span className="field-error">⚠ {errors.amount}</span>
              )}
            </div>

            {/* Category */}
            <div className="form-field">
              <label htmlFor="category">
                Category <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={values.category}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-select${errors.category && touched.category ? " is-error" : ""}`}
              >
                <option value="">— Select category —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && touched.category && (
                <span className="field-error">⚠ {errors.category}</span>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="form-field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              value={values.date}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input${errors.date && touched.date ? " is-error" : ""}`}
            />
            {errors.date && touched.date && (
              <span className="field-error">⚠ {errors.date}</span>
            )}
          </div>

          {/* Note */}
          <div className="form-field">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              name="note"
              rows={3}
              maxLength={120}
              placeholder="Optional — what was this expense for?"
              value={values.note}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-textarea${errors.note && touched.note ? " is-error" : ""}`}
            />
            <span className={charCountClass(values.note.length)}>
              {values.note.length} / 120
            </span>
            {errors.note && touched.note && (
              <span className="field-error">⚠ {errors.note}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              💾 Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpenseForm;
