import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import VendorNavbar from "../components/sidebar/Vendor";

export default function VendorLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== "vendor") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavbar />
      <main className="ml-64 p-4">
        <Outlet />
      </main>
    </div>
  );
}
