import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Coffee,
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Package,
  UtensilsCrossed,
  BarChart3,
  Users,
  Megaphone,
  History,
  UserRound,
  LogOut,
  Bell,
  Menu,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../Auth';
import { useLoad, Alert } from './UI';
import { message } from '../api';
const links = [
  ['/', 'Overview', LayoutDashboard],
  ['/pos', 'Point of Sale', ShoppingBag],
  ['/board', 'Preparation Board', ClipboardList],
  ['/menu', 'Menu & Recipes', UtensilsCrossed],
  ['/inventory', 'Stock Inventory', Package],
  ['/orders', 'Transactions', History],
  ['/reports', 'Sales & Reports', BarChart3, true],
  ['/announcements', 'Announcements', Megaphone],
  ['/users', 'Team Members', Users, true],
  ['/audit', 'Activity History', History, true],
];
export default function Layout() {
  const { user, logout, demo } = useAuth();
  const [open, setOpen] = useState(false),
    [notice, setNotice] = useState(false),
    [error, setError] = useState('');
  const location = useLocation();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision((v) => v + 1);
    window.addEventListener('data-changed', update);
    const timer = setInterval(update, 30000);
    return () => {
      window.removeEventListener('data-changed', update);
      clearInterval(timer);
    };
  }, []);
  const { data } = useLoad('/dashboard', location.key + revision);
  const name = user.name.split(' ')[0];
  return (
    <div className="app-shell">
      <div className={'sidebar-shade ' + (open ? 'visible' : '')} onClick={() => setOpen(false)} />
      <aside className={'sidebar ' + (open ? 'open' : '')}>
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Coffee size={24} />
          </span>
          <span>
            Coffee Spot<small>BREW. SERVE. GROW.</small>
          </span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {links
            .filter((l) => !l[3] || user.role === 'manager')
            .map(([path, label, Icon]) => (
              <NavLink key={path} end={path === '/'} to={path} onClick={() => setOpen(false)}>
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="shift-card">
            <span className="live-dot" />
            Single branch workspace<small>Every good day starts here.</small>
          </div>
          <NavLink to="/profile">
            <UserRound size={19} />
            My Profile
          </NavLink>
          <button
            onClick={async () => {
              try {
                await logout();
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <span className="branch-dot" />
            <span>
              Coffee Spot <b> / </b>
              <strong>Main Branch</strong>
            </span>
          </div>
          <div className="topbar-right">
            <div className="notification-anchor">
              <button
                className="icon-button"
                aria-label="Stock notifications"
                onClick={() => setNotice(!notice)}
              >
                <Bell size={21} />
                {data?.low?.length > 0 && (
                  <span className="notification-count">{data.low.length}</span>
                )}
              </button>
              {notice && (
                <div className="notification-panel">
                  <h3>Stock notifications</h3>
                  {data?.low?.length ? (
                    data.low.map((i) => (
                      <Link key={i._id} to="/inventory?low=true" onClick={() => setNotice(false)}>
                        <span>
                          <b>{i.name}</b>
                          <small>
                            {i.stock} {i.unit} remaining
                          </small>
                        </span>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))
                  ) : (
                    <p>No stock alerts right now.</p>
                  )}
                </div>
              )}
            </div>
            <div className="user-chip">
              <div className="avatar">{name.slice(0, 1)}</div>
              <span>
                {name}
                <small>{user.role}</small>
              </span>
            </div>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            Sample workspace · Demo data resets when the server stops.
          </div>
        )}
        <main>
          <Alert>{error}</Alert>
          <Outlet />
        </main>
        <footer className="app-footer">
          Coffee Spot <span>Made for the daily grind.</span>
        </footer>
      </div>
    </div>
  );
}
