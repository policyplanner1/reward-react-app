import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import WarehouseNavbar from "../components/sidebar/Warehouse";

export default function WarehouseLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== "warehouse_manager") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WarehouseNavbar />
      <main className="ml-64 p-4">
        <Outlet />
      </main>
    </div>
  );
}
