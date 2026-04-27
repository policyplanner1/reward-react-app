import { useState } from "react";
import { FiUser, FiUsers, FiCheckCircle } from "react-icons/fi";
import { FaUsers } from "react-icons/fa";

type DistributionType = "employee" | "team" | "all" | null;

export default function ManageRewards() {
  const [useCTC, setUseCTC] = useState(true);
  const [useTenure, setUseTenure] = useState(false);
  const [selectedType, setSelectedType] = useState<DistributionType>(null);

  return (
    <div className="max-w-5xl p-6 mx-auto space-y-8 duration-500 animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Manage <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Rewards</span>
        </h2>
        <p className="text-gray-500">Configure how incentives are distributed across your organization.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* LEFT COLUMN: DEFAULT SETUP */}
        <div className="lg:col-span-4">
          <div className="sticky p-6 bg-white border border-gray-100 shadow-xl top-6 shadow-gray-200/50 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiCheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800">Default Setup</h3>
            </div>

            <p className="mb-6 text-xs leading-relaxed text-gray-400">
              Fallback logic used when no custom distribution is defined.
            </p>

            <div className="space-y-4">
              <label className={`flex items-start gap-3 p-4 transition-all border rounded-2xl cursor-pointer ${useTenure ? 'border-purple-200 bg-purple-50/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={useTenure}
                  onChange={() => setUseTenure(!useTenure)}
                  className="w-4 h-4 mt-1 rounded accent-purple-600"
                />
                <span className="text-sm font-medium text-gray-700">CTC + Tenure Based</span>
              </label>

              <div className="relative flex items-center justify-center py-2">
                <div className="w-full border-t border-gray-100"></div>
                <span className="absolute px-3 text-[10px] font-bold tracking-widest text-gray-300 bg-white uppercase">OR</span>
              </div>

              <label className={`flex items-start gap-3 p-4 transition-all border rounded-2xl cursor-pointer ${useCTC ? 'border-purple-200 bg-purple-50/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={useCTC}
                  onChange={() => setUseCTC(!useCTC)}
                  className="w-4 h-4 mt-1 rounded accent-purple-600"
                />
                <span className="text-sm font-medium text-gray-700">CTC Only</span>
              </label>
            </div>

            <button className="w-full py-3 mt-8 text-sm font-bold text-white transition-all bg-gray-900 shadow-lg rounded-xl hover:bg-gray-800 active:scale-95 shadow-gray-200">
              Save Configuration
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOM DISTRIBUTION */}
        <div className="lg:col-span-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">Custom Distribution</h3>
            <p className="text-sm text-gray-500">Select a specific target for reward allocation.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DistributionCard
              title="Individual"
              subtitle="Particular Employee"
              icon={<FiUser className="w-6 h-6" />}
              color="rose"
              active={selectedType === "employee"}
              onClick={() => setSelectedType("employee")}
            />

            <DistributionCard
              title="Team"
              subtitle="Department Group"
              icon={<FiUsers className="w-6 h-6" />}
              color="blue"
              active={selectedType === "team"}
              onClick={() => setSelectedType("team")}
            />

            <DistributionCard
              title="Company"
              subtitle="All Employees"
              icon={<FaUsers className="w-6 h-6" />}
              color="orange"
              active={selectedType === "all"}
              onClick={() => setSelectedType("all")}
            />
          </div>

          {/* DYNAMIC FORM AREA */}
          {selectedType && (
            <div className="p-12 mt-8 text-center duration-300 border-2 border-gray-200 border-dashed rounded-3xl animate-in zoom-in-95">
              <p className="text-gray-400">Configure details for <span className="font-bold text-gray-600 capitalize">{selectedType}</span> distribution here...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= REFINED CARD COMPONENT ================= */

interface CardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  active: boolean;
  color: "rose" | "blue" | "orange";
  onClick: () => void;
}

function DistributionCard({ title, subtitle, icon, active, color, onClick }: CardProps) {
  const colorMap = {
    rose: active ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-500",
    blue: active ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-500",
    orange: active ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-500",
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden cursor-pointer p-6 rounded-3xl border-2 transition-all duration-500
        flex flex-col gap-4 group
        ${active 
          ? "border-purple-600 bg-white shadow-2xl shadow-purple-100 -translate-y-1" 
          : "border-transparent bg-white shadow-sm hover:shadow-md hover:border-gray-200"
        }
      `}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${colorMap[color]}`}>
        {icon}
      </div>
      
      <div>
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 transition-colors group-hover:text-gray-700">{subtitle}</p>
      </div>

      {active && (
        <div className="absolute top-4 right-4 animate-in fade-in zoom-in">
          <FiCheckCircle className="w-5 h-5 text-purple-600" />
        </div>
      )}
    </div>
  );
}