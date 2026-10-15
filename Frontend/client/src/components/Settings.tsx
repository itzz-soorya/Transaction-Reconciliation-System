const reconciliationStatuses = [
  "PENDING",
  "PARTIAL",
  "FULLY_SETTLED",
  "OVER_SETTLED",
  "REFUNDED",
  "NOT_APPLICABLE",
];

function Settings() {
  return (
    <main className="main-content settings-page">
      <div className="dashboard-heading">
        <div>
          <h1>Settings</h1>
          <p>Review the reconciliation rules used by this system.</p>
        </div>
        <span className="live-badge">Read-only configuration</span>
      </div>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <h2>Reconciliation configuration</h2>
            <p>
              These values are defined by the assignment and are not user-editable.
            </p>
          </div>
        </div>

        <dl className="settings-list">
          <div>
            <dt>Primary settlement match</dt>
            <dd>Lifecycle ID</dd>
          </div>
          <div>
            <dt>Fallback settlement match</dt>
            <dd>Account ID, merchant name, and transaction date</dd>
          </div>
          <div>
            <dt>Settlement grace period</dt>
            <dd>7 days</dd>
          </div>
          <div>
            <dt>Supported report format</dt>
            <dd>CSV, up to 5 MB</dd>
          </div>
          <div>
            <dt>Settlement calculation</dt>
            <dd>Total DEBIT minus total CREDIT</dd>
          </div>
        </dl>
      </section>

      <section className="settings-card">
        <h2>Supported settlement statuses</h2>
        <div className="settings-status-list">
          {reconciliationStatuses.map((status) => (
            <span className="transaction-status" key={status}>
              {status.replaceAll("_", " ")}
            </span>
          ))}
        </div>
        <p className="settings-note">
          There are no user-configurable preferences or account settings in the
          current assignment scope.
        </p>
      </section>
    </main>
  );
}

export default Settings;
