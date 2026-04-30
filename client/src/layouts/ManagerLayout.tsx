import { Navigate, Outlet } from "react-router-dom";
import ManagerNavbar from "../components/sidebar/Manager";
import { useAuth } from "../auth/useAuth";

// ManagerLayout.js
export default function ManagerLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role !== "vendor_manager") return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-50"> 
      {/* Ensure Navbar/Sidebar has a fixed width like w-64 */}
      <ManagerNavbar /> 
      
      {/* Use flex-1 to take up remaining space and overflow-hidden to prevent breaking layout */}
      <main className="flex-1 min-w-0 ml-64 overflow-hidden">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}