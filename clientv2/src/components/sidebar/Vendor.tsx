import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiTag, FiChevronDown, FiLogOut } from "react-icons/fi";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { api } from "../../api/api";
import { useAuth } from "../../auth/useAuth";

/* ================= SVG ICON TYPES ================= */

type SvgProps = React.SVGProps<SVGSVGElement>;

const LayoutDashboard = (props: SvgProps) => (
  <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const PackageIcon = (props: SvgProps) => (
  <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m7.5 4.27 9 5.15" />
    <path d="m21 8.24-9-5.15-9 5.15" />
    <path d="M3.27 12.44 12 17.59l8.73-5.15" />
    <path d="M2.57 17.59 12 22.74l9.43-5.15" />
  </svg>
);

const PlusSquare = (props: SvgProps) => (
  <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const Building = (props: SvgProps) => (
  <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 22V7.5L12 2L6 7.5V22" />
    <path d="M4 22h16" />
  </svg>
);

/* ================= TYPES ================= */

interface NavLink {
  label: string;
  to: string;
  Icon: React.FC<SvgProps>;
  isDisabled?: boolean;
}

interface NavDropdown {
  label: string;
  Icon: React.FC<SvgProps>;
  children: NavLink[];
}

type NavItem = NavLink | NavDropdown;

/* ================= COMPONENT ================= */

export default function VendorNavbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [vendorStatus, setVendorStatus] = useState<"approved" | "pending" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  /* ---------------- FETCH VENDOR STATUS ---------------- */

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/vendor/my-details");
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
    {
      label: "Dashboard",
      to: "/vendor/dashboard",
      Icon: LayoutDashboard,
    },
    !isApproved
      ? {
          label: "Onboarding Form",
          to: "/vendor/onboarding",
          Icon: Building,
        }
      : {
          label: "Onboarding Completed",
          to: "#",
          Icon: Building,
          isDisabled: true,
        },
    isApproved && {
      label: "Products",
      Icon: FiTag,
      children: [
        { label: "Add Product", to: "/vendor/products/add", Icon: PlusSquare },
        { label: "Product List", to: "/vendor/products/list", Icon: PackageIcon },
      ],
    },
  ].filter(Boolean) as NavItem[];

  if (loading) return null;

  return (
    <nav className="fixed top-0 left-0 h-full w-60 bg-white border-r flex flex-col">
      {/* LOGO */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Rewards</h1>
        <p className="text-xs text-gray-400">Vendor Portal</p>
      </div>

      {/* MENU */}
      <div className="flex-1 p-4 space-y-1">
        {navItems.map((item) =>
          "children" in item ? (
            <div key={item.label}>
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === item.label ? null : item.label)
                }
                className="flex items-center w-full gap-3 px-4 py-3 font-semibold rounded-xl hover:bg-gray-50"
              >
                <item.Icon />
                <span>{item.label}</span>
              </button>

              {openDropdown === item.label && (
                <div className="ml-6 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                        isActive(child.to)
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold ${
                item.isDisabled
                  ? "bg-green-50 text-green-700 cursor-default"
                  : isActive(item.to)
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.Icon />
              <span>{item.label}</span>
            </Link>
          )
        )}
      </div>

      {/* PROFILE */}
      <div className="p-4 border-t">
        <button
          onClick={() => setIsProfileOpen((p) => !p)}
          className="flex items-center w-full gap-3"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-700">
            {user?.email?.charAt(0).toUpperCase() || "V"}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold truncate">{user?.email}</p>
            <p className="text-xs capitalize">{user?.role}</p>
          </div>
          <FiChevronDown className={isProfileOpen ? "rotate-180" : ""} />
        </button>

        {isProfileOpen && (
          <div className="mt-2 bg-white border rounded-xl shadow">
            <Link
              to="/vendor/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
            >
              <HiOutlineUserCircle /> Profile
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
