import { useState, useEffect } from "react";
import {
  FaBox,
  FaShoppingCart,
  FaWallet,
  FaPlus,
  FaEllipsisH,
} from "react-icons/fa";
import { FiPackage, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/api";
import { useAuth } from "../../auth/useAuth";

export default function VendorDashboard() {
  const [vendorStatus, setVendorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  const dashboardStats = [
    {
      title: "Total Revenue",
      value: "₹4,25,000",
      icon: FaWallet,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      trend: "+12.5%",
    },
    {
      title: "Total Orders",
      value: "1,240",
      icon: FaShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+8.2%",
    },
    {
      title: "Active Products",
      value: productStats.totalProducts.toString(),
      icon: FaBox,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: "+2",
    },
    {
      title: "Customer Rating",
      value: "4.8/5",
      icon: FiUsers,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: "Top 5%",
    },
  ];

  useEffect(() => {
    fetchVendorStats();
    fetchVendorStatus();
  }, []);

  const fetchVendorStats = async () => {
    try {
      const res = await api.get("/vendor/stats");

      if (res.data?.success) {
        setProductStats({
          totalProducts: res.data.stats?.total || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchVendorStatus = async () => {
    try {
      const res = await api.get("/vendor/my-details");

      if (res.data?.success) {
        setVendorStatus(res.data?.vendor?.status);
      } else {
        setVendorStatus(null);
      }
    } catch (error) {
      console.error("Error fetching vendor status:", error);
      setVendorStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-12 h-12 border-b-2 rounded-full animate-spin"
          style={{ borderColor: "#852BAF" }}
        />
      </div>
    );
  }

  const isApproved = vendorStatus === "approved";

  return (
    <div className="min-h-screen bg-[#F8F9FD] p-4 md:p-8">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Vendor <span className="text-[#852BAF]">Dashboard</span>
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Welcome back, <span className="text-gray-800">{user?.name}</span>.
            Here's what's happening today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isApproved ? (
            <button
              onClick={() => navigate("/vendor/onboarding")}
              className="flex items-center gap-2 px-6 py-2.5
bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
text-white font-semibold rounded-xl
transition-all
shadow-lg shadow-[#852BAF]/25
cursor-pointer
hover:from-[#FC3F78] hover:to-[#852BAF] hover:shadow-xl hover:opacity-90
active:scale-95
disabled:opacity-60 disabled:cursor-not-allowed
"
            >
              Complete Onboarding
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/vendor/products/list")}
                className="flex items-center gap-2 px-5 py-2.5
           bg-black text-white font-semibold rounded-xl
           transition-all duration-300 shadow-sm cursor-pointer
           hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78]"

              >
                My Products
              </button>

              <button
                onClick={() => navigate("/vendor/products/add")}
                className="flex items-center gap-2 px-5 py-2.5
           bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
           text-white font-semibold rounded-xl
           hover:bg-gradient-to-r hover:from-[#FC3F78] hover:to-[#852BAF]
           transition-all duration-300
           shadow-lg shadow-[#852BAF]/25
           active:scale-95
           disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <FaPlus size={14} />
                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {dashboardStats.map((item, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start">
              <div
                className={`p-3 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}
              >
                <item.icon size={24} />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                {item.trend}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {item.title}
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {item.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- RECENT ORDERS TABLE (Left 2 Columns) --- */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Recent Orders</h3>
            <button className="text-[#852BAF] text-sm font-bold hover:underline">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[1, 2, 3].map((order) => (
                  <tr
                    key={order}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <FiPackage size={20} />
                        </div>
                        <span className="font-semibold text-gray-700 text-sm">
                          Designer Silk Saree
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      Rahul Sharma
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-600">
                        Processing
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                      ₹12,499
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- PERFORMANCE CARD (Right Column) --- */}
        <div className="bg-gradient-to-br from-[#852BAF] to-[#5a1d7a] rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>

          <div>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">Store Rating</h3>
              <FaEllipsisH className="opacity-60 cursor-pointer" />
            </div>
            <div className="mt-8">
              <h2 className="text-5xl font-extrabold tracking-tighter">4.9</h2>
              <p className="mt-2 opacity-80 text-sm">Excellent Performance</p>
            </div>
          </div>

          <div className="mt-12 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest">
                Profile Strength
              </span>
              <span className="text-xs font-bold">92%</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full w-[92%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
