import Header from "./components/header";
import Sidebar from "./components/sidebar";
import "./App.css";

function App() {
  return (
    <div className="app-layout">
      <Header />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          <h1>Dashboard</h1>
          <p>Welcome to Transaction Reconciliation.</p>
        </main>
      </div>
    </div>
  );
}

export default App;