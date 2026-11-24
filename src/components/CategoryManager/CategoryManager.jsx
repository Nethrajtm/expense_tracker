import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "./CategoryManager.css";

const PRESET_COLORS = [
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#1d4ed8", // Deep blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b", // Slate
  "#ef4444", // Red
];

function CategoryManager({
  categories,
  expenses,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReassignAndDeleteCategory,
}) {
  // Add form state
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [addError, setAddError] = useState("");

  // Edit category state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Delete modal state
  const [pendingDeleteCat, setPendingDeleteCat] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState("");

  /* ---- Compute stats per category ---- */
  const categoryStats = {};
  categories.forEach((cat) => {
    categoryStats[cat.id] = { count: 0, total: 0 };
  });

  expenses.forEach((exp) => {
    if (!categoryStats[exp.category]) {
      categoryStats[exp.category] = { count: 0, total: 0 };
    }
    categoryStats[exp.category].count += 1;
    categoryStats[exp.category].total += exp.amount;
  });

  /* ---- Add Category handler ---- */
  const handleAddSubmit = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();

    if (!trimmed) {
      setAddError("Please enter a category name.");
      return;
    }

    if (trimmed.length > 30) {
      setAddError("Category name cannot exceed 30 characters.");
      return;
    }

    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setAddError(`A category named "${trimmed}" already exists.`);
      return;
    }

    const newCategory = {
      id: uuidv4(),
      name: trimmed,
      color: newColor,
    };

    onAddCategory(newCategory);
    setNewName("");
    setNewColor("#3b82f6");
    setAddError("");
  };

  /* ---- Start Edit ---- */
  const startEditing = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEditing = (id) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    onUpdateCategory({
      id,
      name: trimmed,
      color: editColor,
    });

    cancelEditing();
  };

  /* ---- Delete trigger ---- */
  const handleDeleteClick = (cat) => {
    const usage = categoryStats[cat.id]?.count || 0;
    setPendingDeleteCat(cat);

    // Pick first available other category as default reassign target
    const otherCats = categories.filter((c) => c.id !== cat.id);
    setReassignTargetId(otherCats.length > 0 ? otherCats[0].id : "");
  };

  const confirmDelete = () => {
    if (!pendingDeleteCat) return;

    const count = categoryStats[pendingDeleteCat.id]?.count || 0;

    if (count > 0) {
      // Reassign affected expenses first, then delete
      if (!reassignTargetId) {
        alert("Please select a target category to reassign expenses to.");
        return;
      }
      onReassignAndDeleteCategory(pendingDeleteCat.id, reassignTargetId);
    } else {
      // Direct delete when unused
      onDeleteCategory(pendingDeleteCat.id);
    }

    setPendingDeleteCat(null);
  };

  return (
    <div className="category-manager">
      {/* 1. Add Category Form Card */}
      <div className="category-card-form">
        <h3>Add New Category</h3>
        <p>Create a custom category with a distinct colour for tagging your expenses.</p>

        <form onSubmit={handleAddSubmit}>
          <div className="add-category-row">
            {/* Name */}
            <div className="form-field-group">
              <label htmlFor="cat-name">Category Name</label>
              <input
                id="cat-name"
                type="text"
                className={`category-name-input${addError ? " is-error" : ""}`}
                placeholder="e.g. Groceries, Subscriptions..."
                maxLength={30}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (addError) setAddError("");
                }}
              />
              {addError && <span className="input-error-msg">⚠ {addError}</span>}
            </div>

            {/* Color picker */}
            <div className="color-field-group">
              <label>Colour</label>
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  className="native-color-input"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  title="Pick a custom color"
                />
              </div>
            </div>

            {/* Submit button */}
            <button type="submit" className="btn-add-category">
              <span>＋</span> Add Category
            </button>
          </div>

          {/* Quick presets */}
          <div className="color-presets-row">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-chip${newColor.toLowerCase() === preset.toLowerCase() ? " active" : ""}`}
                style={{ backgroundColor: preset }}
                onClick={() => setNewColor(preset)}
                title={preset}
              />
            ))}
          </div>
        </form>
      </div>

      {/* 2. Categories List Section */}
      <div className="categories-list-section">
        <div className="categories-list-header">
          <h3>Active Categories</h3>
          <span>{categories.length} categories defined</span>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const stats = categoryStats[cat.id] || { count: 0, total: 0 };

            return (
              <div key={cat.id} className="category-item-card">
                {isEditing ? (
                  /* Edit Form */
                  <div className="category-edit-form">
                    <div className="edit-inputs-row">
                      <input
                        type="text"
                        className="edit-name-input"
                        value={editName}
                        maxLength={30}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Category name"
                        autoFocus
                      />
                      <input
                        type="color"
                        className="native-color-input"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        title="Change colour"
                      />
                    </div>
                    <div className="edit-actions-row">
                      <button
                        type="button"
                        className="btn-edit-cancel"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-edit-save"
                        onClick={() => saveEditing(cat.id)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal View */
                  <>
                    <div className="category-card-top">
                      <span
                        className="category-tag-preview"
                        style={{
                          backgroundColor: cat.color + "1a",
                          color: cat.color,
                          border: `1.5px solid ${cat.color}40`,
                        }}
                      >
                        <span
                          className="tag-dot"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                      <span className="category-card-meta">{cat.color.toUpperCase()}</span>
                    </div>

                    <div className="category-stats">
                      <span className="category-stats-count">
                        {stats.count} expense{stats.count !== 1 ? "s" : ""}
                      </span>
                      <span className="category-stats-spend">
                        ₹{stats.total.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="category-card-actions">
                      <button
                        type="button"
                        className="btn-cat-action"
                        onClick={() => startEditing(cat)}
                      >
                        ✏ Edit
                      </button>
                      <button
                        type="button"
                        className="btn-cat-action btn-cat-delete"
                        onClick={() => handleDeleteClick(cat)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Delete / Reassign Modal */}
      {pendingDeleteCat && (
        <div
          className="confirm-overlay"
          onClick={() => setPendingDeleteCat(null)}
        >
          <div
            className="reassign-dialog-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reassign-dialog-header">
              <span className="reassign-icon">
                {(categoryStats[pendingDeleteCat.id]?.count || 0) > 0 ? "⚠️" : "🗑️"}
              </span>
              <h3>
                {(categoryStats[pendingDeleteCat.id]?.count || 0) > 0
                  ? "Category In Use"
                  : "Delete Category"}
              </h3>
            </div>

            <div className="reassign-dialog-body">
              {(categoryStats[pendingDeleteCat.id]?.count || 0) > 0 ? (
                <>
                  <p>
                    <strong>"{pendingDeleteCat.name}"</strong> is currently
                    assigned to{" "}
                    <strong>
                      {categoryStats[pendingDeleteCat.id]?.count} expense(s)
                    </strong>{" "}
                    totalling{" "}
                    <strong>
                      ₹
                      {categoryStats[pendingDeleteCat.id]?.total.toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 }
                      )}
                    </strong>
                    .
                  </p>
                  <p className="reassign-hint-text">
                    To ensure no expenses are left with broken category references,
                    please reassign them to another category:
                  </p>
                </>
              ) : (
                <p>
                  Are you sure you want to permanently delete the category{" "}
                  <strong>"{pendingDeleteCat.name}"</strong>?
                </p>
              )}
            </div>

            {/* Reassign selector if in use */}
            {(categoryStats[pendingDeleteCat.id]?.count || 0) > 0 && (
              <div className="reassign-select-wrap">
                <label htmlFor="reassign-target">Reassign affected expenses to:</label>
                <select
                  id="reassign-target"
                  className="reassign-select"
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                >
                  {categories
                    .filter((c) => c.id !== pendingDeleteCat.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.color})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="reassign-actions">
              <button
                type="button"
                className="btn-reassign-cancel"
                onClick={() => setPendingDeleteCat(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-reassign-confirm"
                onClick={confirmDelete}
              >
                {(categoryStats[pendingDeleteCat.id]?.count || 0) > 0
                  ? "Reassign & Delete"
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryManager;
