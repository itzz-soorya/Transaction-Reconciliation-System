
export type PageName =
  | "Dashboard"
  | "Transactions"
  | "Reconciliation"
  | "Issues"
  | "Reports"
  | "Settings";

interface SidebarProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
}

const menuItems: { icon: string; label: PageName }[] = [
  { icon: "", label: "Dashboard" },
  { icon: "", label: "Transactions" },
  { icon: "", label: "Reconciliation" },
  { icon: "", label: "Issues" },
  { icon: "", label: "Reports" },
];

function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            type="button"
            key={item.label}
            className={`sidebar-link ${
              currentPage === item.label ? "active" : ""
            }`}
            onClick={() => onNavigate(item.label)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-heading">SYSTEM</div>
        <button
          type="button"
          className={`sidebar-link ${
            currentPage === "Settings" ? "active" : ""
          }`}
          onClick={() => onNavigate("Settings")}
        >
          <span className="sidebar-icon">⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
