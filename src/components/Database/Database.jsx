import { useState, useEffect } from "react";
import {
  getDBAuditLogs,
  exportDatabaseDump,
  subscribeToDBSync,
} from "../../services/db";
import "./Database.css";

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  return (bytes / 1024).toFixed(1) + " KB";
}

function Database({
  expenses = [],
  categories = [],
  onSimulateIncomingExpense,
  onResetDatabase,
}) {
  const [logs, setLogs] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState("Just now");
  const [isExporting, setIsExporting] = useState(false);

  const fetchLogs = async () => {
    const list = await getDBAuditLogs(25);
    setLogs(list);
    setLastSyncTime(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to live database updates
    const unsubscribe = subscribeToDBSync((msg) => {
      fetchLogs();
    });

    const interval = setInterval(fetchLogs, 5000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const dump = await exportDatabaseDump();
      const blob = new Blob([JSON.stringify(dump, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expense_tracker_db_backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const estimatedSize =
    JSON.stringify(expenses).length + JSON.stringify(categories).length;

  return (
    <div className="database-view">
      {/* 1. Header Overview & Status Cards */}
      <div className="db-stats-grid">
        <div className="db-stat-card">
          <div className="db-stat-header">
            <span className="db-stat-label">Database Status</span>
            <span className="db-live-badge">🟢 Connected</span>
          </div>
          <div className="db-stat-val">IndexedDB v1</div>
          <div className="db-stat-sub">Persistent HTML5 Engine (Browser Storage)</div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-header">
            <span className="db-stat-label">Live Records</span>
            <span className="db-sync-pulse">⚡ Real-time</span>
          </div>
          <div className="db-stat-val">
            {expenses.length}{" "}
            <span className="db-stat-unit">expenses</span>
          </div>
          <div className="db-stat-sub">
            across {categories.length} categories ({formatFileSize(estimatedSize)})
          </div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-header">
            <span className="db-stat-label">Last Database Update</span>
            <span className="db-clock-icon">🕒</span>
          </div>
          <div className="db-stat-val">{lastSyncTime}</div>
          <div className="db-stat-sub">Updates automatically on every website action</div>
        </div>
      </div>

      {/* 2. Database Action Toolbar */}
      <div className="db-toolbar">
        <div>
          <h3>Database Operations</h3>
          <p>
            Data modified or added through the website is committed directly to
            IndexedDB and broadcast across browser tabs in real time.
          </p>
        </div>

        <div className="db-toolbar-actions">
          <button
            type="button"
            className="btn-db-action btn-db-simulate"
            onClick={onSimulateIncomingExpense}
            title="Simulate a real-time incoming transaction to see live database logging"
          >
            <span>⚡</span> Simulate Live Expense
          </button>

          <button
            type="button"
            className="btn-db-action btn-db-export"
            onClick={handleExportBackup}
            disabled={isExporting}
          >
            <span>💾</span> Export JSON Dump
          </button>

          <button
            type="button"
            className="btn-db-action btn-db-reset"
            onClick={onResetDatabase}
          >
            <span>🔄</span> Reset to Defaults
          </button>
        </div>
      </div>

      {/* 3. Live Database Transaction Stream (Updates constantly over time) */}
      <div className="db-logs-card">
        <div className="db-logs-header">
          <div>
            <h3>Live Database Audit & Transaction Log</h3>
            <p>Every change made through the website is recorded with a timestamp</p>
          </div>
          <span className="db-live-indicator">
            <span className="pulsing-dot" /> Live Stream
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="db-logs-empty">
            No database transactions recorded yet. Add an expense or category to
            see live updates!
          </div>
        ) : (
          <div className="db-logs-list">
            {logs.map((log) => {
              const actionClass =
                log.action?.includes("DELETE")
                  ? "action-delete"
                  : log.action?.includes("SAVE") || log.action?.includes("INITIALIZE")
                  ? "action-save"
                  : "action-info";

              return (
                <div key={log.id} className="db-log-item">
                  <div className="db-log-left">
                    <span className={`db-action-tag ${actionClass}`}>
                      {log.action}
                    </span>
                    <span className="db-log-time">{log.displayTime || log.timestamp}</span>
                  </div>

                  <div className="db-log-details">
                    {log.details?.amount && (
                      <span className="db-log-detail-badge amount">
                        Amount: ₹{log.details.amount}
                      </span>
                    )}
                    {log.details?.name && (
                      <span className="db-log-detail-badge name">
                        Name: {log.details.name}
                      </span>
                    )}
                    {log.details?.count !== undefined && (
                      <span className="db-log-detail-badge count">
                        Count: {log.details.count}
                      </span>
                    )}
                    {log.details?.id && (
                      <span className="db-log-detail-badge id">
                        ID: {log.details.id.slice(0, 8)}...
                      </span>
                    )}
                    {log.details?.note && (
                      <span className="db-log-note">"{log.details.note}"</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Database;
