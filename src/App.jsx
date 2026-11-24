import { useState, useEffect } from "react";
import Navbar from "./components/Navbar/Navbar";
import Dashboard from "./components/Dashboard/Dashboard";
import ExpenseForm from "./components/ExpenseForm/ExpenseForm";
import ExpenseList from "./components/ExpenseList/ExpenseList";
import CategoryManager from "./components/CategoryManager/CategoryManager";
import Analytics from "./components/Analytics/Analytics";
import { useLocalStorage } from "./hooks/useLocalStorage";
import DEFAULT_CATEGORIES from "./data/categories";
import SEED_EXPENSES from "./data/seedData";
import "./App.css";

const STORAGE_KEY_CATEGORIES = "expense_tracker_categories";
const STORAGE_KEY_EXPENSES = "expense_tracker_expenses";
const STORAGE_KEY_THEME = "expense_tracker_theme";

function App() {
  /* ---- Persistent State via useLocalStorage ---- */
  const [categories, setCategories] = useLocalStorage(
    STORAGE_KEY_CATEGORIES,
    DEFAULT_CATEGORIES
  );
  const [expenses, setExpenses] = useLocalStorage(
    STORAGE_KEY_EXPENSES,
    SEED_EXPENSES
  );
  const [theme, setTheme] = useLocalStorage(STORAGE_KEY_THEME, "light");

  const [activePage, setActivePage] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);

  /* ---- Sync theme attribute to <html> ---- */
  useEffect(() => {
    const resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  /* ---- Expense Handlers ---- */
  const handleAddExpense = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    setShowForm(false);
  };

  const handleDeleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  /* ---- Category Handlers ---- */
  const handleAddCategory = (newCat) => {
    setCategories((prev) => [...prev, newCat]);
  };

  const handleUpdateCategory = (updatedCat) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCat.id ? { ...c, ...updatedCat } : c))
    );
  };

  const handleDeleteCategory = (catId) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  /**
   * Reassigns all expenses belonging to deletedCatId to targetCatId,
   * then removes the category so no expense is left with an invalid reference.
   */
  const handleReassignAndDeleteCategory = (deletedCatId, targetCatId) => {
    // 1. Reassign affected expenses
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.category === deletedCatId ? { ...exp, category: targetCatId } : exp
      )
    );
    // 2. Remove category
    setCategories((prev) => prev.filter((c) => c.id !== deletedCatId));
  };

  /* ---- Page content ---- */
  function renderPageContent() {
    switch (activePage) {
      case "dashboard":
        return (
          <Dashboard
            expenses={expenses}
            categories={categories}
            onAddExpense={() => setShowForm(true)}
            onNavigate={setActivePage}
          />
        );

      case "expenses":
        return (
          <ExpenseList
            expenses={expenses}
            categories={categories}
            onDelete={handleDeleteExpense}
            onAddExpense={() => setShowForm(true)}
          />
        );

      case "categories":
        return (
          <CategoryManager
            categories={categories}
            expenses={expenses}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onReassignAndDeleteCategory={handleReassignAndDeleteCategory}
          />
        );

      case "analytics":
        return (
          <Analytics
            expenses={expenses}
            categories={categories}
          />
        );

      default:
        return null;
    }
  }

  /* ---- Page heading metadata ---- */
  const PAGE_META = {
    dashboard: {
      title: "Dashboard",
      desc: "An overview of your spending at a glance.",
    },
    expenses: {
      title: "Expenses",
      desc: "Browse, add, and manage all your expense records.",
    },
    categories: {
      title: "Categories",
      desc: "Manage custom categories, colours, and assignments.",
    },
    analytics: {
      title: "Analytics",
      desc: "Visual insights into your monthly spending and trends.",
    },
  };

  const { title, desc } = PAGE_META[activePage] || {};

  return (
    <div className="app-layout">
      {/* Top navigation */}
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main area */}
      <main className="main-content">
        <div className="page-header page-header-row">
          <div>
            <h1>{title}</h1>
            <p>{desc}</p>
          </div>
          {(activePage === "dashboard" || activePage === "expenses") && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => setShowForm(true)}
            >
              <span>＋</span>
              Add Expense
            </button>
          )}
        </div>

        {renderPageContent()}
      </main>

      {/* Add Expense modal */}
      {showForm && (
        <ExpenseForm
          categories={categories}
          onSave={handleAddExpense}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default App;
