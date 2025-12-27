import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiTag, FiChevronDown, FiLogOut, FiLayout, FiPackage, FiPlusSquare, FiBriefcase } from "react-icons/fi";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { api } from "../../api/api";
import { useAuth } from "../../auth/useAuth";

/* ================= TYPES ================= */
interface NavLink {
  label: string;
  to: string;
  Icon: React.ElementType;
  isDisabled?: boolean;
}

interface NavDropdown {
  label: string;
  Icon: React.ElementType;
  children: NavLink[];
}

type NavItem = NavLink | NavDropdown;

export default function VendorNavbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [vendorStatus, setVendorStatus] = useState<"approved" | "pending" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get("/vendor/my-details", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendorStatus(res.data.vendor.status);
      } catch {
        setVendorStatus(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const isApproved = vendorStatus === "approved";
  const isActive = (path: string) => pathname === path;

  const navItems: NavItem[] = [
    { label: "Dashboard", to: "/vendor/dashboard", Icon: FiLayout },
    !isApproved
      ? { label: "Onboarding", to: "/vendor/onboarding", Icon: FiBriefcase }
      : { label: "Verified Partner", to: "#", Icon: FiBriefcase, isDisabled: true },
    isApproved && {
      label: "Products",
      Icon: FiTag,
      children: [
        { label: "Add Product", to: "/vendor/products/add", Icon: FiPlusSquare },
        { label: "Product List", to: "/vendor/products/list", Icon: FiPackage },
      ],
    },
  ].filter(Boolean) as NavItem[];

  if (loading) return null;

  return (
    <nav className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm font-sans">
      
      {/* BRAND LOGO */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#852BAF] to-[#FC3F78] flex items-center justify-center shadow-lg shadow-[#852BAF]/20">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-none">Rewards</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#C64EFE] font-semibold mt-1">Vendor Portal</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const hasChildren = "children" in item;
          const isLinkActive = !hasChildren && isActive(item.to);

          return (
            <div key={item.label} className="outline-none">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    className={`flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                      ${openDropdown === item.label ? "bg-gray-50" : "hover:bg-gray-50 text-gray-500"}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.Icon className={`text-lg transition-colors ${openDropdown === item.label ? "text-[#852BAF]" : "text-gray-400 group-hover:text-[#852BAF]"}`} />
                      <span className={`text-sm font-semibold ${openDropdown === item.label ? "text-gray-900" : "text-gray-600"}`}>{item.label}</span>
                    </div>
                    <FiChevronDown className={`transition-transform duration-300 ${openDropdown === item.label ? "rotate-180 text-[#852BAF]" : "text-gray-400"}`} />
                  </button>
                  
                  {/* DROPDOWN ANIMATION */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openDropdown === item.label ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"}`}>
                    <div className="ml-9 border-l-2 border-gray-100 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={`block py-2 px-4 text-sm transition-all duration-200 rounded-r-lg border-l-2 -ml-[2px]
                            ${isActive(child.to) 
                              ? "border-[#852BAF] text-[#852BAF] font-semibold bg-[#852BAF]/5" 
                              : "border-transparent text-gray-500 hover:text-[#852BAF] hover:bg-gray-50"}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                    ${item.isDisabled 
                      ? "bg-emerald-50 text-emerald-600 cursor-default opacity-80" 
                      : isLinkActive 
                        ? "bg-gradient-to-r from-[#852BAF] to-[#C64EFE] text-white shadow-md shadow-[#852BAF]/20" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-[#852BAF]"}`}
                >
                  <item.Icon className={`text-lg ${isLinkActive ? "text-white" : "text-gray-400 group-hover:text-[#852BAF]"}`} />
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* USER PROFILE SECTION */}
      <div className="p-4 bg-gray-50/50 m-4 rounded-2xl border border-gray-100">
        <button
          onClick={() => setIsProfileOpen((p) => !p)}
          className="flex items-center w-full gap-3 group"
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF7CA3] to-[#FC3F78] rounded-xl flex items-center justify-center font-bold text-white shadow-sm">
              {user?.email?.charAt(0).toUpperCase() || "V"}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-xs font-bold text-gray-800 truncate">{user?.email}</p>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{user?.role}</p>
          </div>
          <FiChevronDown className={`text-gray-400 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
        </button>

        {/* PROFILE DROPDOWN MENU */}
        <div className={`overflow-hidden transition-all duration-300 ${isProfileOpen ? "max-h-24 mt-3 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="space-y-1">
            <Link to="/vendor/profile" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white rounded-lg transition-colors">
              <HiOutlineUserCircle className="text-lg text-gray-400" /> My Profile
            </Link>
            <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <FiLogOut className="text-lg" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}