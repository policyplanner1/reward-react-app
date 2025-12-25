import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiUsers,
  FiPackage,
  FiTag,
  FiChevronDown,
  FiChevronsRight,
  FiSettings,
  FiUser,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../../auth/useAuth';
import { routes } from '../../routes';


interface NavItemBase {
  label: string;
  icon: JSX.Element;
}

interface NavLink extends NavItemBase {
  to: string;
  type: 'link';
}

interface NavDropdown extends NavItemBase {
  type: 'dropdown';
  children: { label: string; to: string }[];
}

type NavItem = NavLink | NavDropdown;

export default function ManagerNavbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [open, setOpen] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (to: string) => pathname === to;

  const navItems: NavItem[] = [
  { label: 'Dashboard', to: routes.manager.dashboard, icon: <FiGrid />, type: 'link' },
  { label: 'Vendors', to: routes.manager.vendors, icon: <FiUsers />, type: 'link' },
  { label: 'Products', to: routes.manager.products, icon: <FiPackage />, type: 'link' },
  {
    label: 'Category Management',
    icon: <FiTag />,
    type: 'dropdown',
    children: [
      { label: 'Categories', to: routes.manager.categories },
      { label: 'Subcategories', to: routes.manager.subcategories },
      { label: 'Type / Sub-type', to: '/manager/category_management/subsubcategories' },
    ],
  },
];


  return (
    <nav className="fixed top-0 left-0 flex flex-col w-64 h-full bg-white border-r shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
        <p className="text-xs text-gray-400">Manager Portal</p>
      </div>

      {/* Menu */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          if (item.type === 'dropdown') {
            const isOpen = open === item.label;

            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpen(isOpen ? null : item.label)}
                  className="flex items-center justify-between w-full px-4 py-3 font-medium rounded-xl hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  <FiChevronDown className={isOpen ? 'rotate-180' : ''} />
                </button>

                {isOpen && (
                  <div className="mt-1 ml-8 space-y-1">
                    {item.children.map(child => (
                      <Link
                        key={child.to}
                        to={child.to}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          isActive(child.to)
                            ? 'bg-purple-100 text-purple-700'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <FiChevronsRight size={14} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
                isActive(item.to)
                  ? 'bg-purple-100 text-purple-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Profile */}
      <div className="p-4 border-t">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center w-full gap-3"
        >
          <div className="flex items-center justify-center font-bold text-purple-700 bg-purple-100 rounded-full w-9 h-9">
            {user?.email?.[0]?.toUpperCase() || 'M'}
          </div>
          <span className="text-sm truncate">{user?.email || 'Manager'}</span>
        </button>

        {profileOpen && (
          <div className="mt-2 bg-white border shadow rounded-xl">
            <Link to="/manager/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
              <FiUser /> Profile
            </Link>
            <Link to="/manager/settings" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
              <FiSettings /> Settings
            </Link>
            <button
              onClick={logout}
              className="flex items-center w-full gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
