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

/* Manager Features */
import VendorApprovalList from './components/feature/manager/VendorApprovalList';
import ProductApprovalList from './components/feature/manager/ProductApprovalList';
import ProductViewPage from './components/feature/manager/ProductViewPage';
import VendorApprovalForm from './components/feature/manager/VendorApprovalForm';
import CategoryManagement from './components/feature/manager/categoriesManagement/categories';
import SubcategoryManagement from './components/feature/manager/categoriesManagement/subcategories';
import SubSubCategoryManagement from './components/feature/manager/categoriesManagement/subsubcategories';

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
        <Route path={routes.manager.products} element={<ProductApprovalList />} />

        {/* ✅ FIXED ROUTES */}
        <Route
          path={`${routes.manager.productView}/:productId`}
          element={<ProductViewPage />}
        />

        <Route
          path={routes.manager.vendorReview}
          element={<VendorApprovalForm />}
        />

        <Route
    path={routes.manager.categories}
    element={<CategoryManagement />}
  />
  <Route
    path={routes.manager.subcategories}
    element={<SubcategoryManagement />}
  />
  <Route
    path={routes.manager.subsubcategories}
    element={<SubSubCategoryManagement />}
  />
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
