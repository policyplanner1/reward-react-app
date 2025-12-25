import { Routes, Route, Navigate } from 'react-router-dom';
import { routes } from './routes';

/* Auth */
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import ForgotPassword from './auth/ForgotPassword';
import VerifyOtpPage from './auth/VerifyOtpPage';

/* Layouts */
import VendorLayout from './layouts/VendorLayout';
import ManagerLayout from './layouts/ManagerLayout';
import WarehouseLayout from './layouts/WarehouseLayout';

/* Dashboards */
import VendorDashboard from './pages/vendor/Dashboard';
import ManagerDashboard from './pages/vendor_manager/Dashboard';
import WarehouseDashboard from './pages/warehouse/Dashboard';
import VendorApprovalList from './components/feature/manager/VendorApprovalList';
import ProductApprovalList from './components/feature/manager/ProductApprovalList';

export default function App() {
  return (
    <Routes>
      {/* ========== AUTH ========== */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
      </Route>

      {/* ========== VENDOR ========== */}
      <Route element={<VendorLayout />}>
        <Route path={routes.vendor.dashboard} element={<VendorDashboard />} />

      </Route>

      {/* ========== MANAGER ========== */}
      <Route element={<ManagerLayout />}>
        <Route path={routes.manager.dashboard} element={<ManagerDashboard />} />
        <Route path={routes.manager.vendors} element={<VendorApprovalList />} />
        <Route path={routes.manager.products} element={<ProductApprovalList/>} />

      </Route>

      {/* ========== WAREHOUSE ========== */}
      <Route element={<WarehouseLayout />}>
        <Route path={routes.warehouse.dashboard} element={<WarehouseDashboard />} />
      </Route>

      {/* ========== FALLBACK ========== */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
