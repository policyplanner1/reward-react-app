import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaFileAlt,
} from 'react-icons/fa';
import { FiUsers } from 'react-icons/fi';

interface VendorItem {
  vendor_id: number;
  company_name: string;
  full_name: string;
  status: 'sent_for_approval' | 'approved' | 'rejected';
  rejection_reason?: string;
  email: string;
  phone?: string;
  submitted_at: string;
}

const API_BASE = 'https://rewardplanners.com/api/crm';

const StatusChip = ({ status }: { status: VendorItem['status'] }) => {
  const styles = {
    approved: "text-green-700 bg-green-100 border-green-300",
    rejected: "text-red-700 bg-red-100 border-red-300",
    sent_for_approval: "text-yellow-700 bg-yellow-100 border-yellow-300",
  };

  const icons = {
    approved: <FaCheckCircle className="mr-1" />,
    rejected: <FaTimesCircle className="mr-1" />,
    sent_for_approval: <FaClock className="mr-1" />,
  };

  const labels = {
    approved: "Approved",
    rejected: "Rejected",
    sent_for_approval: "Pending",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full ${styles[status]}`}>
      {icons[status]} {labels[status]}
    </span>
  );
};

export default function VendorApprovalList() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [filter, setFilter] = useState<'All' | 'sent_for_approval' | 'approved' | 'rejected'>('All');
  const [loading, setLoading] = useState(true);

  const filteredVendors = filter === 'All' ? vendors : vendors.filter(v => v.status === filter);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/manager/all-vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setVendors(data.data as VendorItem[]);
        }
      } catch (err) {
        console.error('Error loading vendors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  if (loading) return <div className="flex justify-center p-20 text-gray-500">Loading vendors...</div>;

  return (
    <div className="w-full duration-500 animate-in fade-in">
      <div className="w-full overflow-hidden bg-white shadow-sm ring-1 ring-black/5 rounded-3xl">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#852BAF] to-[#FC3F78] flex items-center justify-center shadow-lg shrink-0">
                <FiUsers className="text-xl text-white md:text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                  Vendor Approval Queue
                </h1>
                <p className="text-sm text-gray-500">Review and manage vendor onboarding</p>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All', value: 'All' },
                { label: 'Pending', value: 'sent_for_approval' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value as any)}
                  className={`px-4 py-2 text-xs md:text-sm font-medium rounded-xl transition-all ${
                    filter === value
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-inset ring-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Section with Horizontal Scroll fix */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Vendor Details</th>
                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Contact Info</th>
                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-right text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredVendors.map(v => (
                <tr key={v.vendor_id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-6 py-5">
                    <div className="font-bold text-gray-900">{v.company_name}</div>
                    <div className="text-xs text-gray-500">Owner: {v.full_name}</div>
                    <div className="mt-1 text-[10px] text-gray-400 font-mono uppercase">{v.submitted_at}</div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-700">{v.email}</div>
                    <div className="text-xs text-gray-500">{v.phone || 'No phone'}</div>
                  </td>

                  <td className="px-6 py-5">
                    <StatusChip status={v.status} />
                    {v.status === 'rejected' && v.rejection_reason && (
                      <p className="max-w-[150px] mt-1 text-[11px] text-red-500 truncate" title={v.rejection_reason}>
                        Reason: {v.rejection_reason}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <Link to={`/manager/vendors/${v.vendor_id}`}>
                      <button className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#852BAF] to-[#FC3F78] hover:opacity-90 transition-all shadow-sm active:scale-95">
                        <FaEye className="mr-2" /> Review
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredVendors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30">
            <FaFileAlt className="mb-4 text-5xl text-gray-200" />
            <h3 className="text-lg font-medium text-gray-900">No results found</h3>
            <p className="text-sm text-gray-500">Try changing your filter settings</p>
          </div>
        )}
      </div>
    </div>
  );
}