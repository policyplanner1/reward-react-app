import { Routes, Route } from "react-router-dom";
import { routes } from "./routes";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth/useAuth";

/* Auth */
import AuthLayout from "./layouts/AuthLayout";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";
import VerifyOtpPage from "./auth/VerifyOtpPage";

/* Layouts */
import VendorLayout from "./layouts/VendorLayout";
import ManagerLayout from "./layouts/ManagerLayout";

/* Dashboards */
import VendorDashboard from "./pages/vendor/Dashboard";
import ManagerDashboard from "./pages/vendor_manager/Dashboard";

import ProductApprovalList from "./components/feature/manager/product/ProductApprovalList";
import CategoryManagement from "./components/feature/manager/category/Categories";
import SubcategoryManagement from "./components/feature/manager/category/Subcategories";
import DocumentManagement from "./components/feature/manager/document/DocumentAdd";
import DocumentCategoryManagement from "./components/feature/manager/document/DocumentCategory";
import SubSubCategoryManagement from "./components/feature/manager/category/Subsubcategories";
import ProductViewPage from "./components/feature/manager/product/ProductViewPage";
import Onboarding from "./components/feature/vendor/onboarding/Onboarding";
import ChangePasswordPage from "./pages/changePassword";
import ProductListingDynamic from "./components/feature/vendor/products/ProductAdd";
import ProductManagerList from "./components/feature/vendor/products/ProductList";
import ProductManage from "./components/feature/vendor/products/ProductManage";
import ProductVariantEdit from "./components/feature/vendor/products/ProductVariantEdit";
import ProductVariantImages from "./components/feature/vendor/products/ProductVariantImage";
import EditProductPage from "./components/feature/vendor/products/ProductEdit";
import ReviewProductPage from "./components/feature/vendor/products/ProductView";
import VendorApprovalList from "./components/feature/manager/vendor/VendorApprovalList";
import VendorApprovalForm from "./components/feature/manager/vendor/VendorApprovalForm";
import NotFoundPage from "./pages/NotFound";

/* Attribute */
import AttributeManagement from "./components/feature/manager/attribute/attributes";

/* Payment */
import Payment from "./payment";

/* Sales */
import FlashSaleCreate from "./components/feature/manager/flashSale/FlashSaleCreate";
import FlashSaleList from "./components/feature/manager/flashSale/FlashSaleList";
import FlashSaleVariant from "./components/feature/manager/flashSale/FlashSaleVariant";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }
  return (
    <Routes>
      {/* ========== AUTH ========== */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/test-payment" element={<Payment />} />
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

        {/* Manage Product page */}
        <Route
          path={routes.vendor.products.manageProduct}
          element={<ProductManage />}
        />

        {/* Variant Edit */}
        <Route
          path={routes.vendor.products.variantEdit}
          element={<ProductVariantEdit />}
        />

        {/* Variant Image */}
        <Route
          path={routes.vendor.products.variantImage}
          element={<ProductVariantImages />}
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

        {/* Category */}
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

        {/* Document */}
        <Route
          path={routes.manager.addDocument}
          element={<DocumentManagement />}
        />

        <Route
          path={routes.manager.linkDocument}
          element={<DocumentCategoryManagement />}
        />

        {/* Attribute */}
        <Route
          path={routes.manager.attributes}
          element={<AttributeManagement />}
        />

        {/* Flash Sale */}
        <Route path={routes.manager.flashlist} element={<FlashSaleList />} />

        <Route
          path={routes.manager.flashCreate}
          element={<FlashSaleCreate />}
        />
      </Route>

      {/* ========== FALLBACK ========== */}
      <Route
        path="*"
        element={user ? <NotFoundPage /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
