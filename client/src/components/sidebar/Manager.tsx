import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiGrid, FiUsers, FiPackage, FiTag, FiChevronDown,
  FiChevronsRight, FiSettings, FiUser, FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../../auth/useAuth';
import { routes } from '../../routes';

// ... (Keep Interfaces and Types as they are)

export default function ManagerNavbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (to: string) => pathname === to;
interface NavChild {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  to?: string;
  icon?: React.ReactNode;
  type: 'link' | 'dropdown';
  children?: NavChild[];
}
const navItems: NavItem[] = [
  { label: 'Dashboard', to: routes.manager.dashboard, icon: <FiGrid />, type: 'link' },
  { label: 'Vendors', to: routes.manager.vendors, icon: <FiUsers />, type: 'link' },
  { label: 'Products', to: routes.manager.products, icon: <FiPackage />, type: 'link' },
  {
    label: 'Categories',
    icon: <FiTag />,
    type: 'dropdown',
    children: [
      { label: 'Categories', to: routes.manager.categories },
      { label: 'Subcategories', to: routes.manager.subcategories },
      { label: 'Type / Sub-type', to: routes.manager.subsubcategories },
    ],
  },
];


  return (
    <nav className="fixed top-0 left-0 flex flex-col w-64 h-full bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      
      {/* Branding Section */}
      <div className="px-8 py-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#852BAF] to-[#FC3F78] shadow-lg shadow-[#852BAF]/20 flex items-center justify-center text-white font-black italic">
            R
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none">REWARDS</h1>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#852BAF] to-[#FC3F78] mt-1">
              Manager Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map(item => {
          const isItemActive = item.type === 'link' && isActive(item.to);
          const isDropdownOpen = open === item.label;

          if (item.type === 'dropdown') {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => setOpen(isDropdownOpen ? null : item.label)}
                  className={`flex items-center justify-between w-full px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group ${
                    isDropdownOpen ? 'text-[#852BAF] bg-purple-50/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`text-lg transition-colors ${isDropdownOpen ? 'text-[#852BAF]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  <FiChevronDown className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[#852BAF]' : 'text-gray-300'}`} />
                </button>

                {isDropdownOpen && (
                  <div className="mx-2 py-1 space-y-1 bg-gray-50/50 rounded-xl border border-gray-100/50 animate-in slide-in-from-top-2 duration-200">
                    {item.children.map(child => (
                      <Link
                        key={child.to}
                        to={child.to}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                          isActive(child.to)
                            ? 'text-[#852BAF]'
                            : 'text-gray-500 hover:text-[#FC3F78]'
                        }`}
                      >
                        <FiChevronsRight className={`text-[10px] ${isActive(child.to) ? 'text-[#852BAF]' : 'text-gray-300'}`} />
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${
                isItemActive
                  ? 'bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white shadow-md shadow-[#852BAF]/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`text-lg ${isItemActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Profile Section */}
      <div className="p-4 mt-auto">
        <div className="relative border-t border-gray-100 pt-4">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex items-center w-full gap-3 p-2 rounded-2xl transition-all ${profileOpen ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center font-black text-white bg-gradient-to-tr from-[#852BAF] to-[#FC3F78] rounded-xl w-10 h-10 shadow-lg shadow-[#852BAF]/10">
              {user?.email?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1 text-left truncate">
              <p className="text-xs font-black text-gray-900 truncate uppercase tracking-tighter">
                {user?.email?.split('@')[0] || 'Manager'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold truncate italic">View Profile</p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Link to="/manager/profile" className="flex items-center gap-3 px-5 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#852BAF] transition-colors border-b border-gray-50">
                <FiUser className="text-lg" /> Profile Details
              </Link>
              <Link to="/manager/settings" className="flex items-center gap-3 px-5 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#852BAF] transition-colors border-b border-gray-50">
                <FiSettings className="text-lg" /> Settings
              </Link>
              <button
                onClick={logout}
                className="flex items-center w-full gap-3 px-5 py-4 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <FiLogOut className="text-lg" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}