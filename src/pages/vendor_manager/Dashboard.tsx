import DashboardCharts from "../../chart/manager/ManagerChart";

export default function ManagerDashboard() {
  return (
    <div className="w-full min-h-screen p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of platform performance and activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 mb-10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Vendors', value: '128', color: 'from-purple-500 to-purple-700' },
          { title: 'Total Products', value: '2,340', color: 'from-indigo-500 to-indigo-700' },
          { title: 'Monthly Revenue', value: '₹4.8L', color: 'from-pink-500 to-pink-700' },
          { title: 'Pending Approvals', value: '12', color: 'from-amber-500 to-amber-700' },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg bg-gradient-to-br ${card.color}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 bg-white rounded-full opacity-20" />
            <p className="text-sm opacity-90">{card.title}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Content Section */}
      
            <DashboardCharts />

    </div>
  );
}
