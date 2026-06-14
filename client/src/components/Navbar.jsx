import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, User, Users, DollarSign, Upload, Activity } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  
  // Extract groupId from URL if present
  const match = location.pathname.match(/\/group\/(\d+)/);
  const groupId = match ? match[1] : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <Activity className="brand-icon" />
            <span className="gradient-text">SharedExpenses</span>
          </Link>
          
          <div className="navbar-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              <Home size={18} />
              <span>Dashboard</span>
            </Link>
            
            {groupId && (
              <>
                <div className="nav-divider"></div>
                <Link to={`/group/${groupId}`} className={`nav-link ${location.pathname === `/group/${groupId}` ? 'active' : ''}`}>
                  <DollarSign size={18} />
                  <span>Expenses</span>
                </Link>
                <Link to={`/group/${groupId}/balances`} className={`nav-link ${location.pathname.includes('/balances') ? 'active' : ''}`}>
                  <Users size={18} />
                  <span>Balances</span>
                </Link>
                <Link to={`/group/${groupId}/import`} className={`nav-link ${location.pathname.includes('/import') ? 'active' : ''}`}>
                  <Upload size={18} />
                  <span>Import CSV</span>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="navbar-right">
          <div className="user-profile">
            <div className="avatar">
              <User size={16} />
            </div>
            <span className="username">{user.username}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
