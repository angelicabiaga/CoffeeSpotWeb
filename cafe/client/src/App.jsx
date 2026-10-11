import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './Auth';
import { Loading } from './components/UI';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Board from './pages/Board';
import MenuPage from './pages/MenuPage';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Team from './pages/Team';
import Announcements from './pages/Announcements';
import Profile from './pages/Profile';
import Audit from './pages/Audit';
function Protected({ manager = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (manager && user.role !== 'manager') return <Navigate to="/" replace />;
  return <Outlet />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="board" element={<Board />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="profile" element={<Profile />} />
          <Route element={<Protected manager />}>
            <Route path="reports" element={<Orders reports />} />
            <Route path="users" element={<Team />} />
            <Route path="audit" element={<Audit />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
