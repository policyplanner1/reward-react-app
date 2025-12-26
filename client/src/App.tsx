import { Routes, Route, Navigate } from "react-router-dom";
import { routes } from "./routes";

/* Auth */
import AuthLayout from "./layouts/AuthLayout";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import ForgotPassword from "./auth/ForgotPassword";
import VerifyOtpPage from "./auth/VerifyOtpPage";

/* Layouts */
import VendorLayout from "./layouts/VendorLayout";
import ManagerLayout from "./layouts/ManagerLayout";
import WarehouseLayout from "./layouts/WarehouseLayout";

/* Dashboards */
import VendorDashboard from "./pages/vendor/Dashboard";
import ManagerDashboard from "./pages/vendor_manager/Dashboard";
import WarehouseDashboard from "./pages/warehouse/Dashboard";

/* Manager Features */
import VendorApprovalList from "./components/feature/manager/vendor/VendorApprovalList";
import ProductApprovalList from "./components/feature/manager/product/ProductApprovalList";
import VendorApprovalForm from "./components/feature/manager/vendor/VendorApprovalForm";
import CategoryManagement from "./components/feature/manager/category/Categories";
import SubcategoryManagement from "./components/feature/manager/category/Subcategories";
import SubSubCategoryManagement from "./components/feature/manager/category/Subsubcategories";
import InventoryMasterPage from "./components/feature/warehouse/inventory/Inventory";
import StockAdjustmentPage from "./components/feature/warehouse/stock/StockAdjustment";
import StockInPage from "./components/feature/warehouse/stock/StockIn";
import StockOutTable from "./components/feature/warehouse/stock/StockOut";
import StockInViewPage from "./components/feature/warehouse/stock/Stockview";
import StockInCreatePage from "./components/feature/warehouse/stock/StockCreate";
import StockInEditPage from "./components/feature/warehouse/stock/StockEdit";
import ProductViewPage from "./components/feature/manager/product/ProductViewPage";
import Onboarding from "./components/feature/vendor/onboarding/Onboarding";
import ProductListingDynamic from "./components/feature/vendor/products/ProductAdd";
import ProductManagerList from "./components/feature/vendor/products/ProductList";
import EditProductPage from "./components/feature/vendor/products/ProductEdit";
import ReviewProductPage from "./components/feature/vendor/products/ProductView";

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

  <Route
    path={routes.vendor.dashboard}
    element={<VendorDashboard />}
  />

  <Route
    path={routes.vendor.onboarding}
    element={<Onboarding />}
  />

  <Route
    path={routes.vendor.products.add}
    element={<ProductListingDynamic />}
  />

  <Route
    path={routes.vendor.products.list}
    element={<ProductManagerList />}
  />

  <Route
    path={routes.vendor.products.edit}
    element={<EditProductPage />}
  />

  <Route
    path={routes.vendor.products.review}
    element={<ReviewProductPage/>}
  />

  <Route
    path={routes.vendor.productManagerList}
    element={<ProductManagerList />}
  />

</Route>


      {/* ========== MANAGER ========== */}
      <Route element={<ManagerLayout />}>
        <Route path={routes.manager.dashboard} element={<ManagerDashboard />} />
        <Route path={routes.manager.vendors} element={<VendorApprovalList />} />
        <Route
          path={routes.manager.products}
          element={<ProductApprovalList />}
        />

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
        <Route path={routes.warehouse.inventory} element={<InventoryMasterPage />} />
        <Route path={routes.warehouse.stockIn} element={<StockInPage />} />
        <Route path={routes.warehouse.stockOut} element={<StockOutTable />} />
        <Route path={routes.warehouse.stockAdjustment} element={<StockAdjustmentPage />} />
        <Route path={routes.warehouse.stockCreate} element={<StockInCreatePage />} />
        <Route path={routes.warehouse.stockView} element={<StockInViewPage />} />
        <Route path={routes.warehouse.stockEdit} element={<StockInEditPage />} />
      </Route>

      {/* ========== FALLBACK ========== */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
