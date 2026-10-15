
import { useState } from "react";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import type { PageName } from "./components/sidebar";
import Dashboard from "./components/Dashboard";
import Transactions from "./components/Transactions";
import Reconciliation from "./components/Reconciliation";
import Issues from "./components/Issues";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] =
    useState<PageName>("Dashboard");

  return (
    <div className="app-layout">
      <Header />

      <div className="app-body">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />

        {currentPage === "Dashboard" && <Dashboard />}

        {currentPage === "Transactions" && <Transactions />}

        {currentPage === "Reconciliation" && <Reconciliation />}

        {currentPage === "Issues" && <Issues />}

        {currentPage === "Reports" && <Reports />}

        {currentPage === "Settings" && <Settings />}

        {currentPage !== "Dashboard" &&
          currentPage !== "Transactions" &&
          currentPage !== "Reconciliation" &&
          currentPage !== "Issues" &&
          currentPage !== "Reports" &&
          currentPage !== "Settings" && (
            <main className="main-content">
              <h1>{currentPage}</h1>
              <p>This section will be implemented next.</p>
            </main>
          )}
      </div>
    </div>
  );
}

export default App;
