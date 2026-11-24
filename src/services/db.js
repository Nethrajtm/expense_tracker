/**
 * IndexedDB Database Service for Expense Tracker
 * Real-time, persistent client database with transaction logging and multi-tab broadcast.
 */

const DB_NAME = "ExpenseTrackerDB";
const DB_VERSION = 1;

const STORES = {
  EXPENSES: "expenses",
  CATEGORIES: "categories",
  AUDIT_LOGS: "audit_logs",
  METADATA: "metadata",
};

let dbPromise = null;

// Real-time broadcast channel across browser tabs
let broadcastChannel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("expense_tracker_db_channel");
  } catch (e) {
    console.warn("BroadcastChannel not supported", e);
  }
}

/**
 * Open or initialize the IndexedDB database
 */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Expenses table
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: "id" });
        expenseStore.createIndex("date", "date", { unique: false });
        expenseStore.createIndex("category", "category", { unique: false });
      }

      // Categories table
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const catStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: "id" });
        catStore.createIndex("name", "name", { unique: false });
      }

      // Audit logs table (records every insert, update, delete)
      if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
        const logStore = db.createObjectStore(STORES.AUDIT_LOGS, {
          keyPath: "id",
          autoIncrement: true,
        });
        logStore.createIndex("timestamp", "timestamp", { unique: false });
        logStore.createIndex("action", "action", { unique: false });
      }

      // Metadata table
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Perform a database transaction
 */
async function tx(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = callback(store, transaction);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Log an audit action into the database
 */
export async function logDBAction(action, details = {}) {
  try {
    const entry = {
      action,
      details,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString(),
    };
    await tx(STORES.AUDIT_LOGS, "readwrite", (store) => {
      store.add(entry);
    });

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "AUDIT_LOG", entry });
    }
  } catch (err) {
    console.warn("Failed to write to audit log:", err);
  }
}

/**
 * Get all audit logs
 */
export async function getDBAuditLogs(limit = 30) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.AUDIT_LOGS, "readonly");
      const store = transaction.objectStore(STORES.AUDIT_LOGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const logs = request.result || [];
        logs.reverse(); // newest first
        resolve(logs.slice(0, limit));
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return [];
  }
}

/**
 * Initialize Database with default data if empty
 */
export async function initDatabase(seedExpenses = [], seedCategories = []) {
  try {
    const db = await openDB();

    // Check categories
    const categoriesCount = await new Promise((res, rej) => {
      const t = db.transaction(STORES.CATEGORIES, "readonly");
      const req = t.objectStore(STORES.CATEGORIES).count();
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(e.target.error);
    });

    if (categoriesCount === 0 && seedCategories.length > 0) {
      await tx(STORES.CATEGORIES, "readwrite", (store) => {
        seedCategories.forEach((cat) => store.put(cat));
      });
      await logDBAction("INITIALIZE_CATEGORIES", { count: seedCategories.length });
    }

    // Check expenses
    const expensesCount = await new Promise((res, rej) => {
      const t = db.transaction(STORES.EXPENSES, "readonly");
      const req = t.objectStore(STORES.EXPENSES).count();
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(e.target.error);
    });

    if (expensesCount === 0 && seedExpenses.length > 0) {
      await tx(STORES.EXPENSES, "readwrite", (store) => {
        seedExpenses.forEach((exp) => store.put(exp));
      });
      await logDBAction("INITIALIZE_EXPENSES", { count: seedExpenses.length });
    }

    // Return current full data
    const allExpenses = await getAllExpenses();
    const allCategories = await getAllCategories();

    return { expenses: allExpenses, categories: allCategories };
  } catch (err) {
    console.error("IndexedDB initialization error:", err);
    return null;
  }
}

/**
 * Fetch all expenses from IndexedDB
 */
export async function getAllExpenses() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES.EXPENSES, "readonly");
    const req = t.objectStore(STORES.EXPENSES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Add or update an expense
 */
export async function dbSaveExpense(expense) {
  await tx(STORES.EXPENSES, "readwrite", (store) => {
    store.put(expense);
  });
  await logDBAction("SAVE_EXPENSE", {
    id: expense.id,
    amount: expense.amount,
    date: expense.date,
    category: expense.category,
    note: expense.note,
  });
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: "SYNC_EXPENSES" });
  }
}

/**
 * Delete an expense
 */
export async function dbDeleteExpense(id) {
  await tx(STORES.EXPENSES, "readwrite", (store) => {
    store.delete(id);
  });
  await logDBAction("DELETE_EXPENSE", { id });
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: "SYNC_EXPENSES" });
  }
}

/**
 * Fetch all categories from IndexedDB
 */
export async function getAllCategories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES.CATEGORIES, "readonly");
    const req = t.objectStore(STORES.CATEGORIES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Add or update a category
 */
export async function dbSaveCategory(category) {
  await tx(STORES.CATEGORIES, "readwrite", (store) => {
    store.put(category);
  });
  await logDBAction("SAVE_CATEGORY", { id: category.id, name: category.name, color: category.color });
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: "SYNC_CATEGORIES" });
  }
}

/**
 * Delete a category
 */
export async function dbDeleteCategory(id) {
  await tx(STORES.CATEGORIES, "readwrite", (store) => {
    store.delete(id);
  });
  await logDBAction("DELETE_CATEGORY", { id });
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: "SYNC_CATEGORIES" });
  }
}

/**
 * Reassign expenses and delete category in one database transaction
 */
export async function dbReassignAndDeleteCategory(deletedCatId, targetCatId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.EXPENSES, STORES.CATEGORIES, STORES.AUDIT_LOGS], "readwrite");
    const expStore = transaction.objectStore(STORES.EXPENSES);
    const catStore = transaction.objectStore(STORES.CATEGORIES);
    const logStore = transaction.objectStore(STORES.AUDIT_LOGS);

    let countReassigned = 0;
    const req = expStore.getAll();
    req.onsuccess = () => {
      const expenses = req.result || [];
      expenses.forEach((exp) => {
        if (exp.category === deletedCatId) {
          exp.category = targetCatId;
          expStore.put(exp);
          countReassigned++;
        }
      });
      catStore.delete(deletedCatId);
      logStore.add({
        action: "REASSIGN_AND_DELETE_CATEGORY",
        details: { deletedCatId, targetCatId, countReassigned },
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleTimeString(),
      });
    };

    transaction.oncomplete = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "SYNC_ALL" });
      }
      resolve(true);
    };
    transaction.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Subscribe to external database sync events (e.g. from other tabs)
 */
export function subscribeToDBSync(callback) {
  if (!broadcastChannel) return () => {};
  const handler = (event) => {
    callback(event.data);
  };
  broadcastChannel.addEventListener("message", handler);
  return () => {
    broadcastChannel.removeEventListener("message", handler);
  };
}

/**
 * Clear the database
 */
export async function clearDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORES.EXPENSES, STORES.CATEGORIES, STORES.AUDIT_LOGS], "readwrite");
    t.objectStore(STORES.EXPENSES).clear();
    t.objectStore(STORES.CATEGORIES).clear();
    t.objectStore(STORES.AUDIT_LOGS).clear();
    t.oncomplete = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "SYNC_ALL" });
      }
      resolve(true);
    };
    t.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Export full database to JSON
 */
export async function exportDatabaseDump() {
  const expenses = await getAllExpenses();
  const categories = await getAllCategories();
  const logs = await getDBAuditLogs(100);

  return {
    database: DB_NAME,
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    auditLogs: logs,
  };
}
