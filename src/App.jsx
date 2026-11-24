import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar/Navbar";
import Dashboard from "./components/Dashboard/Dashboard";
import ExpenseForm from "./components/ExpenseForm/ExpenseForm";
import ExpenseList from "./components/ExpenseList/ExpenseList";
import CategoryManager from "./components/CategoryManager/CategoryManager";
import Analytics from "./components/Analytics/Analytics";
import Database from "./components/Database/Database";
import { useLocalStorage } from "./hooks/useLocalStorage";
import DEFAULT_CATEGORIES from "./data/categories";
import SEED_EXPENSES from "./data/seedData";
import {
  initDatabase,
  dbSaveExpense,
  dbDeleteExpense,
  dbSaveCategory,
  dbDeleteCategory,
  dbReassignAndDeleteCategory,
  getAllExpenses,
  getAllCategories,
  clearDB,
  subscribeToDBSync,
} from "./services/db";
import "./App.css";

const STORAGE_KEY_CATEGORIES = "expense_tracker_categories";
const STORAGE_KEY_EXPENSES = "expense_tracker_expenses";
const STORAGE_KEY_THEME = "expense_tracker_theme";

function App() {
  /* ---- Persistent State via useLocalStorage (Fast fallback + cache) ---- */
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

  /* ---- Initialize & Connect to IndexedDB Database ---- */
  useEffect(() => {
    let mounted = true;

    async function setupDB() {
      try {
        const dbData = await initDatabase(expenses, categories);
        if (mounted && dbData) {
          if (dbData.expenses && dbData.expenses.length > 0) {
            setExpenses(dbData.expenses);
          }
          if (dbData.categories && dbData.categories.length > 0) {
            setCategories(dbData.categories);
          }
        }
      } catch (err) {
        console.warn("Database initialization fallback to localStorage:", err);
      }
    }

    setupDB();

    // Multi-tab real-time sync via BroadcastChannel
    const unsubscribe = subscribeToDBSync(async (event) => {
      if (!mounted) return;
      try {
        if (event.type === "SYNC_EXPENSES" || event.type === "SYNC_ALL") {
          const freshExpenses = await getAllExpenses();
          setExpenses(freshExpenses);
        }
        if (event.type === "SYNC_CATEGORIES" || event.type === "SYNC_ALL") {
          const freshCategories = await getAllCategories();
          setCategories(freshCategories);
        }
      } catch (err) {
        console.warn("Sync failed:", err);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /* ---- Expense Handlers (Database Integrated) ---- */
  const handleAddExpense = async (newExpense) => {
    // 1. Update React state & localStorage
    setExpenses((prev) => [newExpense, ...prev]);
    setShowForm(false);
    // 2. Commit transaction to IndexedDB
    try {
      await dbSaveExpense(newExpense);
    } catch (e) {
      console.warn("DB save error:", e);
    }
  };

  const handleDeleteExpense = async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await dbDeleteExpense(id);
    } catch (e) {
      console.warn("DB delete error:", e);
    }
  };

  /* ---- Category Handlers (Database Integrated) ---- */
  const handleAddCategory = async (newCat) => {
    setCategories((prev) => [...prev, newCat]);
    try {
      await dbSaveCategory(newCat);
    } catch (e) {
      console.warn("DB category save error:", e);
    }
  };

  const handleUpdateCategory = async (updatedCat) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCat.id ? { ...c, ...updatedCat } : c))
    );
    try {
      await dbSaveCategory(updatedCat);
    } catch (e) {
      console.warn("DB category update error:", e);
    }
  };

  const handleDeleteCategory = async (catId) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    try {
      await dbDeleteCategory(catId);
    } catch (e) {
      console.warn("DB category delete error:", e);
    }
  };

  const handleReassignAndDeleteCategory = async (deletedCatId, targetCatId) => {
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.category === deletedCatId ? { ...exp, category: targetCatId } : exp
      )
    );
    setCategories((prev) => prev.filter((c) => c.id !== deletedCatId));

    try {
      await dbReassignAndDeleteCategory(deletedCatId, targetCatId);
    } catch (e) {
      console.warn("DB reassign error:", e);
    }
  };

  /* ---- Live Simulation (Automated periodic / on-demand incoming expense) ---- */
  const handleSimulateIncomingExpense = useCallback(async () => {
    const sampleItems = [
      { note: "Cloud Subscription", amount: 499, category: "cat-bills" },
      { note: "Metro Commute Pass", amount: 150, category: "cat-transport" },
      { note: "Coffee & Pastry", amount: 240, category: "cat-food" },
      { note: "Online Book Purchase", amount: 620, category: "cat-shopping" },
      { note: "Weekend Movie Ticket", amount: 350, category: "cat-entertainment" },
      { note: "Grocery Pantry Refill", amount: 890, category: "cat-food" },
    ];

    const pick = sampleItems[Math.floor(Math.random() * sampleItems.length)];
    const chosenCat =
      categories.find((c) => c.id === pick.category) || categories[0];

    const todayStr = new Date().toISOString().slice(0, 10);
    const newSimulatedExpense = {
      id: "sim-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      amount: pick.amount,
      category: chosenCat ? chosenCat.id : "cat-other",
      date: todayStr,
      note: `${pick.note} (Auto-sync)`,
    };

    await handleAddExpense(newSimulatedExpense);
  }, [categories]);

  /* ---- Reset Database ---- */
  const handleResetDatabase = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the database? This restores default seed categories and sample expenses."
      )
    ) {
      try {
        await clearDB();
        await initDatabase(SEED_EXPENSES, DEFAULT_CATEGORIES);
        setExpenses(SEED_EXPENSES);
        setCategories(DEFAULT_CATEGORIES);
      } catch (err) {
        console.error("Reset error:", err);
      }
    }
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
        return <Analytics expenses={expenses} categories={categories} />;

      case "database":
        return (
          <Database
            expenses={expenses}
            categories={categories}
            onSimulateIncomingExpense={handleSimulateIncomingExpense}
            onResetDatabase={handleResetDatabase}
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
    database: {
      title: "Database Center",
      desc: "Real-time IndexedDB storage with live transaction tracking and auto-sync.",
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

          <div className="header-actions">
            <button
              type="button"
              className="db-badge-btn"
              onClick={() => setActivePage("database")}
              title="Click to view live database and audit log"
            >
              <span className="db-badge-dot" />
              <span>DB: Connected ({expenses.length} records)</span>
            </button>

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
