const menuItems = [
  { icon: "", label: "Dashboard" },
  { icon: "", label: "Transactions" },
  { icon: "", label: "Reconciliation" },
  { icon: "", label: "Issues" },
  { icon: "", label: "Reports" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      {/* <div className="sidebar-heading">WORKSPACE</div> */}

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <a
            href="#"
            key={item.label}
            className={`sidebar-link ${index === 0 ? "active" : ""}`}
            onClick={(event) => event.preventDefault()}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-heading">SYSTEM</div>
        <a
          href="#"
          className="sidebar-link"
          onClick={(event) => event.preventDefault()}
        >
          <span className="sidebar-icon">⚙</span>
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;