function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <img src="https://openfabric.co/images/logo.png" alt="OpenFabric Logo" data-testid="header-logo" height={30}/>
        <span>Transaction Reconciliation</span>
      </div>

      <div className="header-right">
        {/* <button type="button" aria-label="Notifications">
          🔔
        </button> */}

        <div className="profile">
          <div className="profile-avatar">S</div>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
