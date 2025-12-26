import { Routes, Route, Navigate } from "react-router-dom";

import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import ManagerLogin from "./pages/manager/Login";
import ManagerDashboard from "./pages/manager/Dashboard";
import VendorLogin from "./pages/vendor/Login";
import VendorDashboard from "./pages/vendor/Dashboard";
import VendorManagerDashboard from "./pages/vendor_manager/Dashboard";
import WarehouseDashboard from "./pages/warehouse/Dashboard";

// Manager feature components
import Categories from "./components/feature/manager/category/Categories";
import Subcategories from "./components/feature/manager/category/Subcategories";
import Subsubcategories from "./components/feature/manager/category/Subsubcategories";
import DocumentAdd from "./components/feature/manager/document/DocumentAdd";
import DocumentCategory from "./components/feature/manager/document/DocumentCategory";
import ProductApprovalList from "./components/feature/manager/product/ProductApprovalList";
import ProductViewPage from "./components/feature/manager/product/ProductViewPage";
import VendorApprovalList from "./components/feature/manager/vendor/VendorApprovalList";
import VendorApprovalForm from "./components/feature/manager/vendor/VendorApprovalForm";

// Vendor feature components
import Onboarding from "./components/feature/vendor/onboarding/Onboarding";
import ProductAdd from "./components/feature/vendor/products/ProductAdd";
import ProductEdit from "./components/feature/vendor/products/ProductEdit";
import ProductList from "./components/feature/vendor/products/ProductList";

// Warehouse feature components
import Inventory from "./components/feature/warehouse/inventory/Inventory";
import StockCreate from "./components/feature/warehouse/stock/StockCreate";
import StockEdit from "./components/feature/warehouse/stock/StockEdit";
import StockIn from "./components/feature/warehouse/stock/StockIn";
import StockOut from "./components/feature/warehouse/stock/StockOut";
import Stockview from "./components/feature/warehouse/stock/Stockview";
import StockAdjustment from "./components/feature/warehouse/stock/StockAdjustment";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vendor/login" />} />
      <Route path="/vendor/login" element={<VendorLogin />} />
      <Route path="/vendor/dashboard" element={<VendorDashboard />} />
      {/* Vendor feature routes */}
      <Route path="/vendor/onboarding" element={<Onboarding />} />
      <Route path="/vendor/products/add" element={<ProductAdd />} />
      <Route path="/vendor/products/edit" element={<ProductEdit />} />
      <Route path="/vendor/products/list" element={<ProductList />} />
      <Route path="/vendor/products/view" element={<ProductView />} />
      <Route path="/manager/login" element={<ManagerLogin />} />
      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      {/* Manager feature routes */}
      <Route path="/manager/categories" element={<Categories />} />
      <Route path="/manager/categories/subcategories" element={<Subcategories />} />
      <Route path="/manager/categories/subsubcategories" element={<Subsubcategories />} />
      <Route path="/manager/document/add" element={<DocumentAdd />} />
      <Route path="/manager/document/category" element={<DocumentCategory />} />
      <Route path="/manager/product/approvals" element={<ProductApprovalList />} />
      <Route path="/manager/product/view" element={<ProductViewPage />} />
      <Route path="/manager/vendor/approvals" element={<VendorApprovalList />} />
      <Route path="/manager/vendor/approval" element={<VendorApprovalForm />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/vendor-manager/dashboard" element={<VendorManagerDashboard />} />
      <Route path="/warehouse/dashboard" element={<WarehouseDashboard />} />
      {/* Warehouse feature routes */}
      <Route path="/warehouse/inventory" element={<Inventory />} />
      <Route path="/warehouse/stock/create" element={<StockCreate />} />
      <Route path="/warehouse/stock/edit" element={<StockEdit />} />
      <Route path="/warehouse/stock/in" element={<StockIn />} />
      <Route path="/warehouse/stock/out" element={<StockOut />} />
      <Route path="/warehouse/stock/view" element={<Stockview />} />
      <Route path="/warehouse/stock/adjustment" element={<StockAdjustment />} />
    </Routes>
  );
}
