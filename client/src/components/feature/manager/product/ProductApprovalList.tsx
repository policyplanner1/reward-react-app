"use client";

import { useEffect, useState, useCallback } from "react";
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
  FaPaperPlane,
  FaTrash,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { routes } from "../../../../routes";

// const API_BASE = import.meta.env.VITE_API_URL;
import { api } from "../../../../api/api";

/* ================================
       TYPES
================================ */
type ProductStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "resubmission"
  | "sent_for_approval";

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
  status: ProductStatus;
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
  pending: number;
  sent_for_approval: number;
  approved: number;
  rejected: number;
  resubmission: number;
  total: number;
}

interface ApiResponse {
  success: boolean;
  products: ProductItem[];
  total: number;
  page: number;
  totalPages: number;
  stats: Stats;
}

type ActionType = "approve" | "reject" | "request_resubmission" | "delete";

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
    sent_for_approval: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: FaPaperPlane,
      text: "Sent for Approval",
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

/* ================================
       ACTION MODAL
================================ */
interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: ActionType, reason?: string) => Promise<void>;
  product: ProductItem | null;
  actionType: ActionType;
}

const ActionModal = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  actionType,
}: ActionModalProps) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const modalConfigs = {
    approve: {
      title: "Approve Product",
      description: `Approve "${product.product_name}"?`,
      buttonText: "Approve",
      buttonColor: "bg-green-600 hover:bg-green-700",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      Icon: FaCheck,
      showReason: false,
      placeholder: "",
    },
    reject: {
      title: "Reject Product",
      description: `Reject "${product.product_name}"?`,
      buttonText: "Reject",
      buttonColor: "bg-red-600 hover:bg-red-700",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      Icon: FaTimes,
      showReason: true,
      placeholder: "Provide rejection reason...",
    },
    request_resubmission: {
      title: "Allow Vendor to Resubmit",
      description: `Do you want to allow the vendor to resubmit "${product.product_name}" for approval?`,
      buttonText: "Allow Resubmission",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      Icon: FaRedo,
      showReason: true,
      placeholder: "Reason for resubmission...",
    },
    delete: {
      title: "Delete Product",
      description: `Are you sure you want to delete "${product.product_name}"?`,
      buttonText: "Delete",
      buttonColor: "bg-red-600 hover:bg-red-700",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      Icon: FaTrash,
      showReason: false,
      placeholder: "",
    },
  };

  const config = modalConfigs[actionType];

  const handleSubmit = async () => {
    if (config.showReason && !reason.trim()) {
      alert("Please provide a reason.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(actionType, config.showReason ? reason : undefined);
      onClose();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl">
        <div className="flex items-center mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${config.iconBg}`}
          >
            <config.Icon className={config.iconColor} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {config.title}
            </h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>

        {config.showReason && (
          <div className="mb-8">
            <label className="block mb-2.5 text-xs font-bold uppercase tracking-widest text-slate-500">
              Reason / Comments *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
              className="w-full p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-[#852BAF]"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center min-w-[120px] ${config.buttonColor} disabled:opacity-50`}
          >
            {loading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              config.buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================================
       MAIN COMPONENT
================================ */
export default function ProductManagerList() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  // const [actionLoading, setActionLoading] = useState<number | null>(null);

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

  // const [stats, setStats] = useState<Stats>({
  //   total: 0,
  //   pending: 0,
  //   sent_for_approval: 0,
  //   approved: 0,
  //   rejected: 0,
  //   resubmission: 0,
  // });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    product: ProductItem | null;
    actionType: ActionType;
  }>({
    isOpen: false,
    product: null,
    actionType: "approve",
  });

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <FaSort className="ml-1 opacity-30" />;
    return sortOrder === "asc" ? (
      <FaSortUp className="ml-1 text-[#852BAF]" />
    ) : (
      <FaSortDown className="ml-1 text-[#852BAF]" />
    );
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        status: statusFilter !== "all" ? statusFilter : "",
        search: searchQuery,
        sortBy,
        sortOrder,
      };

      const res = await api.get("/product/all-products", { params });
      const data: ApiResponse = res.data;
      console.log(data,"Data")

      if (data.success) {
        setProducts(data.products);
        setPagination((prev) => ({
          ...prev,
          totalPages: data.totalPages || 1,
          totalItems: data.total || 0,
        }));
        // if (data.stats) setStats(data.stats);
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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductAction = async (
    action: ActionType,
    productId: number,
    reason?: string
  ) => {
    // setActionLoading(productId);

    try {
      const endpoint =
        action === "request_resubmission" ? "resubmission" : action;

      const res = await api.put(
        `/manager/product/${endpoint}/${productId}`,
        reason ? { reason } : {}
      );

      if (!res.data.success) {
        throw new Error(res.data.message || "Action failed");
      }

      fetchProducts(); 
      alert(res.data.message || "Success");
    } catch (error: any) {
      alert(error.message);
    } finally {
      // setActionLoading(null);
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

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-[#852BAF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={(action, reason) =>
          modalState.product
            ? handleProductAction(action, modalState.product.product_id, reason)
            : Promise.resolve()
        }
        product={modalState.product}
        actionType={modalState.actionType}
      />

      <div className="p-4 bg-white border border-gray-200 shadow-lg rounded-2xl md:p-6">
        {/* Header and Stats Omitted for brevity, kept same as your snippet */}

        {/* FILTERS + SEARCH */}
        <div className="flex flex-col gap-4 mb-6 md:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-[#852BAF]"
            />
            <FaSearch className="absolute left-3 top-4 text-gray-400" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-3 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border rounded-lg">
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
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-700">
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
                  <td className="px-4 py-4">{product.brand_name}</td>
                  <td className="px-4 py-4">
                    <StatusChip status={product.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link
                        to={routes.manager.productView.replace(
                          ":id",
                          product.product_id.toString()
                        )}
                        className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        <FaEye />
                      </Link>
                      {product.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              setModalState({
                                isOpen: true,
                                product,
                                actionType: "approve",
                              })
                            }
                            className="p-2 bg-green-100 text-green-700 rounded"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() =>
                              setModalState({
                                isOpen: true,
                                product,
                                actionType: "reject",
                              })
                            }
                            className="p-2 bg-red-100 text-red-700 rounded"
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}
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
