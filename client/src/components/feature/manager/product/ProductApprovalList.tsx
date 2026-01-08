"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaFileAlt,
  FaSpinner,
  FaSearch,
  FaSort,
  FaSortUp,
  FaQuestionCircle,
  FaSortDown,
  FaRedo,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { routes } from "../../../../routes";
import { api } from "../../../../api/api";

/* ================================
       TYPES
================================ */
type BackendProductStatus =
  | "pending"
  | "sent_for_approval"
  | "approved"
  | "rejected"
  | "resubmission";

type ProductStatus = "pending" | "approved" | "rejected" | "resubmission";

interface ProductDocument {
  document_id: number;
  document_name: string;
  document_url: string;
  uploaded_at: string;
}

interface ProductItem {
  product_id: number;
  vendor_id: number;
  company_name: string;
  vendor_name: string;
  vendor_email: string;
  product_name: string;
  brand_name: string;
  sale_price: number;
  vendor_price: number;
  stock: number;
  status: BackendProductStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  main_image: string | null;
  category_name: string;
  subcategory_name: string;
  sub_subcategory_name: string | null;
  custom_category: string;
  custom_subcategory: string;
  custom_sub_subcategory: string | null;
  sku: string;
  barcode: string;
  documents?: ProductDocument[];
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  resubmission: number;
}

interface ApiResponse {
  success: boolean;
  products: ProductItem[];
  total: number;
  page: number;
  totalPages: number;
  stats: Stats;
}

type ActionType = "approve" | "reject" | "request_resubmission";

/* ================================
       STATUS CHIP
================================ */
const StatusChip = ({ status }: { status: ProductStatus }) => {
  const configMap: Record<
    ProductStatus,
    {
      color: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
      text: string;
    }
  > = {
    approved: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: FaCheckCircle,
      text: "Approved",
    },
    rejected: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: FaTimesCircle,
      text: "Rejected",
    },
    resubmission: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: FaRedo,
      text: "Resubmission",
    },
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: FaClock,
      text: "Pending",
    },
  };

  const cfg = configMap[status] ?? {
    color: "bg-gray-200 text-gray-700 border-gray-300",
    icon: FaQuestionCircle,
    text: status || "Unknown",
  };

  const Icon = cfg.icon;

  return (
    <div
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border shadow-sm text-[11px] font-semibold tracking-wide uppercase ${cfg.color}`}
    >
      <Icon className="mr-1" size={12} />
      {cfg.text}
    </div>
  );
};

// Stats
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${color}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 -mt-10 -mr-10 bg-white opacity-20 rounded-full" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase opacity-90">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>

        <div className="p-3 bg-white/20 rounded-xl">
          <Icon className="text-xl" />
        </div>
      </div>
    </div>
  );
};

/* ================================
       MAIN COMPONENT
================================ */
export default function ProductManagerList() {
  const [products, setProducts] = useState<
    (Omit<ProductItem, "status"> & { status: ProductStatus })[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    resubmission: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  // ✅ Debounce ref (important for focus issue)
  const debounceRef = useRef<number | null>(null);

  const okBtnClass =
    "px-6 py-2 rounded-xl font-bold text-white bg-[#852BAF] transition-all duration-300 cursor-pointer " +
    "hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78] active:scale-95";

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <FaSort className="ml-1 opacity-30" />;
    return sortOrder === "asc" ? (
      <FaSortUp className="ml-1 text-[#852BAF]" />
    ) : (
      <FaSortDown className="ml-1 text-[#852BAF]" />
    );
  };

  const normalizeManagerStatus = (status: BackendProductStatus): ProductStatus => {
    if (status === "sent_for_approval") return "pending";
    return status as ProductStatus;
  };

  const normalizeStatusForApi = (status: string) => {
    if (status === "pending") return "sent_for_approval";
    return status;
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        status:
          statusFilter !== "all" ? normalizeStatusForApi(statusFilter) : "",
        search: searchQuery,
        sortBy,
        sortOrder,
      };

      const res = await api.get("/product/all-products", { params });
      const data: ApiResponse = res.data;

      if (data.success) {
        const normalizedProducts = data.products.map((p) => ({
          ...p,
          status: normalizeManagerStatus(p.status),
        }));

        setProducts(normalizedProducts);
        setPagination((prev) => ({
          ...prev,
          totalPages: data.totalPages || 1,
          totalItems: data.total || 0,
        }));

        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    statusFilter,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // ✅ First load only (no debounce)
  useEffect(() => {
    fetchProducts();
  }, [pagination.currentPage, pagination.itemsPerPage, sortBy, sortOrder, fetchProducts]);

  //  Debounced search + filter (THIS FIXES TYPING FOCUS ISSUE)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      setPagination((p) => ({ ...p, currentPage: 1 }));
      fetchProducts();
    }, 450);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQuery, statusFilter, fetchProducts]);

  const handleProductAction = async (action: ActionType, product: ProductItem) => {
    const modalConfigs: Record<
      ActionType,
      {
        title: string;
        text: string;
        icon: "warning" | "question" | "success" | "error" | "info";
        confirmText: string;
        confirmColor: string;
        needsReason: boolean;
        placeholder?: string;
      }
    > = {
      approve: {
        title: "Approve Product?",
        text: `Do you want to approve "${product.product_name}"?`,
        icon: "question",
        confirmText: "Approve",
        confirmColor: "#16A34A",
        needsReason: false,
      },
      reject: {
        title: "Reject Product?",
        text: `Do you want to reject "${product.product_name}"?`,
        icon: "warning",
        confirmText: "Reject",
        confirmColor: "#DC2626",
        needsReason: true,
        placeholder: "Provide rejection reason...",
      },
      request_resubmission: {
        title: "Allow Resubmission?",
        text: `Allow vendor to resubmit "${product.product_name}"?`,
        icon: "warning",
        confirmText: "Allow",
        confirmColor: "#2563EB",
        needsReason: true,
        placeholder: "Reason for resubmission...",
      },
    };

    const cfg = modalConfigs[action];

    const result = await Swal.fire({
      title: cfg.title,
      text: cfg.text,
      icon: cfg.icon,
      showCancelButton: true,
      confirmButtonText: cfg.confirmText,
      cancelButtonText: "Cancel",
      confirmButtonColor: cfg.confirmColor,
      cancelButtonColor: "#9CA3AF",
      reverseButtons: true,
      input: cfg.needsReason ? "textarea" : undefined,
      inputPlaceholder: cfg.needsReason ? cfg.placeholder : undefined,
      inputAttributes: cfg.needsReason ? { "aria-label": "Reason" } : undefined,
      preConfirm: (value) => {
        if (cfg.needsReason && (!value || !String(value).trim())) {
          Swal.showValidationMessage("Reason is required.");
          return false;
        }
        return value;
      },
      buttonsStyling: false,
      customClass: {
        actions: "gap-[7px]",
        confirmButton:
          action === "approve"
            ? "px-6 py-2 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-all duration-300 cursor-pointer active:scale-95"
            : action === "request_resubmission"
            ? "px-6 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 cursor-pointer active:scale-95"
            : "px-6 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all duration-300 cursor-pointer active:scale-95",
        cancelButton:
          "px-6 py-2 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-300 cursor-pointer",
        popup: "rounded-2xl",
      },
    });

    if (!result.isConfirmed) return;

    const reason = cfg.needsReason ? String(result.value || "").trim() : undefined;

    try {
      const endpoint = action === "request_resubmission" ? "resubmission" : action;

      const res = await api.put(
        `/manager/product/${endpoint}/${product.product_id}`,
        reason ? { reason } : {}
      );

      if (!res.data.success) throw new Error(res.data.message || "Action failed");

      await fetchProducts();

      await Swal.fire({
        title: "Success!",
        text: res.data.message || "Action completed successfully.",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
        customClass: { popup: "rounded-2xl" },
      });
    } catch (error: any) {
      await Swal.fire({
        title: "Failed",
        text: error?.message || "Something went wrong.",
        icon: "error",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: okBtnClass,
          popup: "rounded-2xl",
        },
      });
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <div className="p-4 bg-white border border-gray-200 shadow-lg rounded-2xl md:p-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Products"
            value={stats.total}
            icon={FaFileAlt}
            color="from-purple-500 to-purple-700"
          />
          <StatCard
            title="Pending for Review"
            value={stats.pending}
            icon={FaClock}
            color="from-yellow-500 to-yellow-700"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={FaCheckCircle}
            color="from-green-500 to-green-700"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={FaTimesCircle}
            color="from-red-500 to-red-700"
          />
          <StatCard
            title="Need Resubmission"
            value={stats.resubmission}
            icon={FaRedo}
            color="from-blue-500 to-blue-700"
          />
        </div>

        {/* FILTERS + SEARCH */}
        <div className="flex flex-col gap-4 mb-6 md:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search products..."
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg outline-none
                         focus:ring-2 focus:ring-[#852BAF] focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-4 text-gray-400 pointer-events-none" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, currentPage: 1 }));
            }}
            className="p-3 border border-gray-300 rounded-lg cursor-pointer outline-none
                       focus:ring-2 focus:ring-[#852BAF] focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="resubmission">Resubmission</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="relative overflow-x-auto border rounded-lg">
          {/* ✅ Loading overlay (focus never breaks) */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <FaSpinner className="animate-spin text-3xl text-[#852BAF]" />
            </div>
          )}

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort("product_name")}
                  className="px-4 py-3 cursor-pointer text-xs font-bold uppercase text-gray-700"
                >
                  <div className="flex items-center">
                    Product {getSortIcon("product_name")}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-700">
                  Brand
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 pl-0 text-xs font-bold uppercase text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">
                    {product.product_name}
                  </td>
                  <td className="px-4 py-4 text-center">{product.brand_name}</td>
                  <td className="px-4 py-4 text-center">
                    <StatusChip status={product.status} />
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end">
                      <div className="grid grid-cols-4 gap-2 w-[176px] justify-items-center">
                        <Link
                          to={routes.manager.productView.replace(
                            ":id",
                            product.product_id.toString()
                          )}
                          className="w-9 h-9 inline-flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                          title="View"
                        >
                          <FaEye />
                        </Link>

                        {product.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleProductAction("approve", product)}
                              className="w-9 h-9 inline-flex items-center justify-center bg-green-100 text-green-700 rounded cursor-pointer"
                              title="Approve"
                            >
                              <FaCheck />
                            </button>

                            <button
                              onClick={() => handleProductAction("reject", product)}
                              className="w-9 h-9 inline-flex items-center justify-center bg-red-100 text-red-700 rounded cursor-pointer"
                              title="Reject"
                            >
                              <FaTimes />
                            </button>

                            <button
                              onClick={() =>
                                handleProductAction("request_resubmission", product)
                              }
                              className="w-9 h-9 inline-flex items-center justify-center bg-blue-100 text-blue-700 rounded cursor-pointer"
                              title="Resubmission"
                            >
                              <FaRedo />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="w-9 h-9 opacity-0 pointer-events-none" />
                            <div className="w-9 h-9 opacity-0 pointer-events-none" />
                            <div className="w-9 h-9 opacity-0 pointer-events-none" />
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EMPTY STATE */}
        {products.length === 0 && !loading && (
          <div className="py-20 text-center text-gray-500">
            <FaFileAlt className="mx-auto text-4xl mb-4 opacity-20" />
            <p>No products found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
