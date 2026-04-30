"use client";

import { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaFileAlt,
} from "react-icons/fa";
import { FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";

interface VendorItem {
  vendor_id: number;
  company_name: string;
  full_name: string;
  status: "sent_for_approval" | "approved" | "rejected" | "deleted";
  rejection_reason?: string;
  email: string;
  phone?: string;
  submitted_at: string;
}

// const API_BASE = import.meta.env.VITE_API_URL;
import { api } from "../../../../api/api";

const StatusChip = ({ status }: { status: VendorItem["status"] }) => {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center text-green-700 bg-green-100 border border-green-300 px-3 py-1 text-xs rounded-full">
        <FaCheckCircle className="mr-1" /> Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center text-red-700 bg-red-100 border border-red-300 px-3 py-1 text-xs rounded-full">
        <FaTimesCircle className="mr-1" /> Rejected
      </span>
    );
  }

  if (status === "sent_for_approval") {
    return (
      <span className="inline-flex items-center text-yellow-700 bg-yellow-100 border border-yellow-300 px-3 py-1 text-xs rounded-full">
        <FaClock className="mr-1" /> Pending
      </span>
    );
  }

  if (status === "deleted") {
    return (
      <span className="inline-flex items-center text-gray-700 bg-gray-200 border border-gray-400 px-3 py-1 text-xs rounded-full">
        <FaTimesCircle className="mr-1" /> Inactive
      </span>
    );
  }

  return null;
};

export default function VendorApprovalList() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [filter, setFilter] = useState<
    "All" | "sent_for_approval" | "approved" | "rejected" | "deleted"
  >("All");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredVendors = vendors.filter((v) => {
    const matchesStatus = filter === "All" ? true : v.status === filter;

    const matchesSearch =
      v.company_name.toLowerCase().includes(debouncedSearch) ||
      v.full_name.toLowerCase().includes(debouncedSearch) ||
      v.email.toLowerCase().includes(debouncedSearch) ||
      (v.phone || "").toLowerCase().includes(debouncedSearch);

    return matchesStatus && matchesSearch;
  });

  /* ============================
          FETCH VENDORS
  ============================= */
  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await api.get("/manager/all-vendors");

        if (res.data.success) {
          setVendors(res.data.data);
        }
      } catch (err) {
        console.error("Error loading vendors:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchVendors();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.toLowerCase());
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  const handleDownloadVendorReport = async () => {
    try {
      const response = await api.get("/manager/download-vendor-report", {
        params: {
          status: filter !== "All" ? filter : "",
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      link.setAttribute("download", "vendor_report.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const handleDeleteVendor = async (vendorId: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this vendor?",
    );

    if (!confirmDelete) return;

    try {
      const res = await api.put(`/manager/deactivate/${vendorId}`);
      console.log(res, "deactivate response");

      if (res.data) {
        // remove from UI OR refetch
        setVendors((prev) =>
          prev.map((v) =>
            v.vendor_id === vendorId ? { ...v, status: "deleted" } : v,
          ),
        );
      }
    } catch (err) {
      console.error("Error deleting vendor:", err);
      alert("Failed to deactivate vendor");
    }
  };

  if (loading) return <p className="p-10 text-center">Loading vendors...</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        {/* HEADER */}
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center mr-4">
            <FiUsers className="text-white text-xl" />
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
        {/* FILTER + SEARCH ROW */}
        <div className="flex items-center justify-between mb-6">
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { label: "All", value: "All" },
              { label: "Pending", value: "sent_for_approval" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
              { label: "Inactive", value: "deleted" },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer ${
                  filter === value
                    ? "bg-white text-[#852BAF] shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#852BAF]"
            />
            <FaEye className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* REPORT FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {/* STATUS (reuse existing filter) */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="p-2 border rounded-lg cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="deleted">Inactive</option>
              <option value="sent_for_approval">Pending</option>
            </select>

            {/* DATE FILTER */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="p-2 border rounded-lg cursor-pointer"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="p-2 border rounded-lg cursor-pointer"
            />
          </div>

          {/* DOWNLOAD BUTTON */}
          <button
            onClick={handleDownloadVendorReport}
            disabled={!fromDate && !toDate && filter === "All"}
            className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#852BAF] to-[#FC3F78] disabled:opacity-50 cursor-pointer"
          >
            Download Report
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 mt-3">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Email / Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((v) => (
                <tr key={v.vendor_id} className="hover:bg-gray-50">
                  {/* Vendor Info */}
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

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="text-sm">{v.email}</div>
                    <div className="text-xs text-gray-600">
                      {v.phone || "No phone"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusChip status={v.status} />
                    {v.status === "rejected" && v.rejection_reason && (
                      <p className="mt-1 text-xs text-red-600">
                        {v.rejection_reason}
                      </p>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 flex gap-2">
                    {v.status !== "deleted" ? (
                      <>
                        {/* REVIEW BUTTON */}
                        <Link to={`/manager/vendor-review/${v.vendor_id}`}>
                          <button className="flex items-center px-3 py-2 bg-[#852BAF] text-white rounded-lg text-sm cursor-pointer">
                            <FaEye className="mr-2" /> Review
                          </button>
                        </Link>

                        {/* DELETE BUTTON */}
                        <button
                          onClick={() => handleDeleteVendor(v.vendor_id)}
                          className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm cursor-pointer"
                        >
                          <FaTimesCircle className="mr-2" /> Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        No actions available
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <FaFileAlt className="text-gray-400 text-4xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No Vendors Found
            </h3>
            <p className="text-gray-500">No match for current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
