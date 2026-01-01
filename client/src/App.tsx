import { Routes, Route } from "react-router-dom";
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

/* Dashboards */
import VendorDashboard from "./pages/vendor/Dashboard";
import ManagerDashboard from "./pages/vendor_manager/Dashboard";

/* Manager Features */
import ProductApprovalList from "./components/feature/manager/product/ProductApprovalList";
import CategoryManagement from "./components/feature/manager/category/Categories";
import SubcategoryManagement from "./components/feature/manager/category/Subcategories";
import SubSubCategoryManagement from "./components/feature/manager/category/Subsubcategories";
import ProductViewPage from "./components/feature/manager/product/ProductViewPage";
import Onboarding from "./components/feature/vendor/onboarding/Onboarding";
import ChangePasswordPage from "./pages/changePassword";
import ProductListingDynamic from "./components/feature/vendor/products/ProductAdd";
import ProductManagerList from "./components/feature/vendor/products/ProductList";
import EditProductPage from "./components/feature/vendor/products/ProductEdit";
import ReviewProductPage from "./components/feature/vendor/products/ProductView";
import VendorApprovalList from "./components/feature/manager/vendor/VendorApprovalList";
import VendorApprovalForm from "./components/feature/manager/vendor/VendorApprovalForm";
import NotFoundPage from "./pages/NotFound";

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

        <Route path={routes.vendor.onboarding} element={<Onboarding />} />

        <Route
          path={routes.vendor.changePassword}
          element={<ChangePasswordPage />}
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
          path={routes.vendor.products.review}
          element={<ReviewProductPage />}
        />

        <Route
          path={routes.vendor.products.edit}
          element={<EditProductPage />}
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
          path={routes.manager.changePassword}
          element={<ChangePasswordPage />}
        />

        <Route
          path={routes.manager.products}
          element={<ProductApprovalList />}
        />

        <Route
          path={routes.manager.productView}
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

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
