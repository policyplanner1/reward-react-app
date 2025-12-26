import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaFileAlt,
} from "react-icons/fa";
import { FiUsers } from "react-icons/fi";

/* ================= TYPES ================= */

export interface VendorItem {
  vendor_id: number;
  company_name: string;
  full_name: string;
  status: "sent_for_approval" | "approved" | "rejected";
  rejection_reason?: string;
  email: string;
  phone?: string;
  submitted_at: string;
}

interface StatusChipProps {
  status: VendorItem["status"];
}

/* ================= CONFIG ================= */

const API_BASE: string = import.meta.env.VITE_API_URL;

/* ================= STATUS CHIP ================= */

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs text-green-700 bg-green-100 border border-green-300 rounded-full">
          <FaCheckCircle className="mr-1" />
          Approved
        </span>
      );

    case "rejected":
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs text-red-700 bg-red-100 border border-red-300 rounded-full">
          <FaTimesCircle className="mr-1" />
          Rejected
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full">
          <FaClock className="mr-1" />
          Pending
        </span>
      );
  }
};

/* ================= MAIN COMPONENT ================= */

const VendorApprovalList: React.FC = () => {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [filter, setFilter] = useState<
    "All" | "sent_for_approval" | "approved" | "rejected"
  >("All");
  const [loading, setLoading] = useState<boolean>(true);

  const filteredVendors =
    filter === "All"
      ? vendors
      : vendors.filter((v) => v.status === filter);

  /* ================= FETCH VENDORS ================= */

  useEffect(() => {
    const fetchVendors = async (): Promise<void> => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE}/api/manager/all-vendors`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (data?.success) {
          setVendors(data.data);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  if (loading) {
    return <p className="p-10 text-center">Loading vendors...</p>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="p-6 bg-white border border-gray-200 shadow-lg rounded-2xl">

        {/* HEADER */}
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center mr-4">
            <FiUsers className="text-xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Vendor Approval Queue
            </h1>
            <p className="text-gray-600">
              Review vendor onboarding submissions
            </p>
          </div>
        </div>

        {/* FILTER */}
        <div className="flex gap-2 mb-6">
          {[
            { label: "All", value: "All" },
            { label: "Pending", value: "sent_for_approval" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === value
                  ? "bg-white text-[#852BAF] shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500">
                  Vendor
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500">
                  Email / Phone
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((v) => (
                <tr key={v.vendor_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {v.company_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Owner: {v.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {v.submitted_at}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm">{v.email}</div>
                    <div className="text-xs text-gray-600">
                      {v.phone || "No phone"}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <StatusChip status={v.status} />
                    {v.status === "rejected" && v.rejection_reason && (
                      <p className="mt-1 text-xs text-red-600">
                        {v.rejection_reason}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      to={`/vendors/${v.vendor_id}`}
                      className="inline-flex items-center px-4 py-2 bg-[#852BAF] text-white rounded-lg hover:bg-[#73239c] transition text-sm"
                    >
                      <FaEye className="mr-2" />
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="py-12 text-center">
            <FaFileAlt className="mx-auto mb-4 text-4xl text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">
              No Vendors Found
            </h3>
            <p className="text-gray-500">
              No match for current filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorApprovalList;
