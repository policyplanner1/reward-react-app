import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaFileAlt,
  FaSpinner,
  FaFilter,
  FaSearch,
  FaQuestionCircle,
  FaEdit,
  FaRedo,
  FaCheck,
  FaTimes,
  FaBox,
  FaPaperPlane,
  FaCogs,
  FaTrash,
} from "react-icons/fa";
import { FiPackage } from "react-icons/fi";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import { routes } from "../../../../routes";
import { api } from "../../../../api/api";

const API_BASEIMAGE_URL = "https://rewardplanners.com/api/crm";

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
  is_visible: boolean;
  is_searchable: boolean;
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
  approved: number;
  rejected: number;
  resubmission: number;
  sent_for_approval: number;
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

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  active?: boolean;
  onClick?: () => void;
}

const StatsCard = ({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: StatsCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-5 cursor-pointer
        text-white shadow-lg bg-gradient-to-br ${color}
        transition-all
        ${active ? "ring-2 ring-white/70 scale-[1.02]" : "hover:scale-[1.01]"}
      `}
    >
      {/* Decorative background circle */}
      <div className="absolute -top-18 -right-14 w-30 h-30 rounded-full bg-white/20" />

      {/* CONTENT (must be relative + z-10) */}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase opacity-90">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
        </div>

        <div className="p-3 rounded-xl bg-white/25">
          <Icon className="text-xl" />
        </div>
      </div>
    </div>
  );
};

type ActionType = "approve" | "reject" | "request_resubmission" | "delete";

/* ================================
       STATUS CHIP
================================ */
const StatusChip = ({ status }: { status: ProductStatus }) => {
  const configMap: Record<
    ProductStatus,
    {
      color: string;
      icon: React.ComponentType<{ size?: number }>;
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cfg.color}`}
    >
      <Icon size={12} />
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

  const config = {
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
      title: "Send for Approval",
      description: `Are you sure you want to send "${product.product_name}" for approval?`,
      buttonText: "Send",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      Icon: FaPaperPlane,
      showReason: false,
      placeholder: "",
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
  }[actionType];

  const handleSubmit = async () => {
    if (config.showReason && !reason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Reason Required",
        text: "Please provide a reason.",
      });
      return;
    }

    setLoading(true);
    try {
      await onSubmit(actionType, config.showReason ? reason : undefined);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Action completed successfully!",
        timer: 2000,
        showConfirmButton: false,
      });

      onClose();
    } catch (err) {
      console.error("Action failed:", err);

      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(2, 6, 23, 0.45)" }}
    >
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
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Reason / Comments *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#852BAF] focus:border-transparent"
            />
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-lg ${config.buttonColor} disabled:opacity-50 flex items-center cursor-pointer`}
          >
            {loading ? (
              <>
                <FaSpinner className="mr-2 animate-spin" />
                Processing...
              </>
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
  const [tableLoading, setTableLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
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

  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    resubmission: 0,
    sent_for_approval: 0,
  });

  const debounceRef = useRef<number | null>(null);

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    product: ProductItem | null;
    actionType: ActionType;
  }>({
    isOpen: false,
    product: null,
    actionType: "approve",
  });

  /* ================================
       FETCH PRODUCTS
  ================================= */
  const fetchProducts = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent;

      try {
        if (!silent) {
          setTableLoading(true);
        }

        const params = {
          page: pagination.currentPage,
          limit: pagination.itemsPerPage,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchQuery ? searchQuery : undefined,
          sortBy,
          sortOrder,
        };

        const res = await api.get("/product/my-listed-products", { params });
        const data: ApiResponse = res.data;

        if (data.success) {
          setProducts(data.products);
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
        if (!silent) {
          setTableLoading(false);
        }
      }
    },
    [
      pagination.currentPage,
      pagination.itemsPerPage,
      statusFilter,
      searchQuery,
      sortBy,
      sortOrder,
    ],
  );

  //  first load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchProducts({ silent: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    sortBy,
    sortOrder,
    statusFilter,
    fetchProducts,
  ]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setPagination((p) => ({ ...p, currentPage: 1 }));
      fetchProducts();
    }, 450);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchProducts]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchProducts({ silent: true });
    }, 30000);
    return () => clearInterval(id);
  }, [fetchProducts]);

  /* ================================
       ACTION HANDLERS
  ================================= */
  const handleProductAction = async (
    action: ActionType,
    productId: number,
    reason?: string,
  ) => {
    try {
      if (action === "delete") {
        await api.delete(`/product/delete-product/${productId}`);

        setProducts((prev) => prev.filter((p) => p.product_id !== productId));

        setStats((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pending: Math.max(0, prev.pending - 1),
        }));

        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product deleted successfully",
          showConfirmButton: false,
        });
      }

      if (action === "request_resubmission") {
        const res = await api.post(`/product/submission/${productId}`, {
          reason: reason || null,
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.product_id === productId
              ? { ...p, status: "sent_for_approval" }
              : p,
          ),
        );

        Swal.fire({
          icon: "success",
          title: "Success",
          text: res.data.message || "Product sent for approval successfully",
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      console.error("Error performing action:", error);
      alert(error.message || "Error performing action");
      throw error;
    } finally {
    }
  };

  const toggleVisibility = async (productId: number, current: boolean) => {
    try {
      await api.patch(`/product/visibility/${productId}`, {
        is_visible: !current,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === productId ? { ...p, is_visible: !current } : p,
        ),
      );
    } catch (error) {
      console.error("Visibility update failed", error);
      Swal.fire("Error", "Failed to update visibility", "error");
    }
  };

  const toggleSearchable = async (productId: number, current: boolean) => {
    try {
      await api.patch(`/product/searchable/${productId}`, {
        is_searchable: !current,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === productId ? { ...p, is_searchable: !current } : p,
        ),
      );
    } catch (error) {
      console.error("Searchable update failed", error);
      Swal.fire("Error", "Failed to update searchable status", "error");
    }
  };

  const openActionModal = (product: ProductItem, actionType: ActionType) => {
    setModalState({ isOpen: true, product, actionType });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      product: null,
      actionType: "approve",
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPagination((p) => ({ ...p, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: page }));
    }
  };

  /* ================================
       RENDER
  ================================= */
  if (loading && products?.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-[#852BAF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-2 bg-gray-50">
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSubmit={(action, reason) =>
          modalState.product
            ? handleProductAction(action, modalState.product.product_id, reason)
            : Promise.resolve()
        }
        product={modalState.product}
        actionType={modalState.actionType}
      />

      <div className="p-4 bg-white border border-gray-200 shadow-lg rounded-2xl md:p-6">
        {/* HEADER */}
        <div className="flex flex-col justify-between mb-6 md:flex-row md:items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center mr-4">
              <FiPackage className="text-xl text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Product Management
              </h1>
              <p className="text-gray-600">Review and Manage Products</p>
            </div>
          </div>

          <div className="text-sm text-right text-gray-600">
            <div className="font-semibold">
              Total: {products?.length || 0} products
            </div>
            <div className="text-xs">Auto-refreshes every 30s</div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-6">
          <StatsCard
            label="Total Products"
            value={stats.total}
            icon={FiPackage}
            color="from-gray-500 to-gray-700"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />

          <StatsCard
            label="Pending"
            value={stats.pending}
            icon={FaClock}
            color="from-yellow-500 to-yellow-700"
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter("pending")}
          />

          <StatsCard
            label="Sent for Approval"
            value={stats.sent_for_approval}
            icon={FaPaperPlane}
            color="from-indigo-500 to-indigo-700"
            active={statusFilter === "sent_for_approval"}
            onClick={() => setStatusFilter("sent_for_approval")}
          />

          <StatsCard
            label="Approved"
            value={stats.approved}
            icon={FaCheckCircle}
            color="from-green-500 to-green-700"
            active={statusFilter === "approved"}
            onClick={() => setStatusFilter("approved")}
          />

          <StatsCard
            label="Rejected"
            value={stats.rejected}
            icon={FaTimesCircle}
            color="from-red-500 to-red-700"
            active={statusFilter === "rejected"}
            onClick={() => setStatusFilter("rejected")}
          />

          <StatsCard
            label="Resubmission"
            value={stats.resubmission}
            icon={FaRedo}
            color="from-blue-500 to-blue-700"
            active={statusFilter === "resubmission"}
            onClick={() => setStatusFilter("resubmission")}
          />
        </div>

        {/* FILTERS + SEARCH */}
        <div className="flex flex-col gap-4 mb-6 md:flex-row">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by product name..."
                className="w-full p-3 pl-10 pr-[90px] border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#852BAF] focus:border-transparent"
              />
              <FaSearch className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />

              {searchInput?.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-[78px] top-2 px-2 py-1.5 text-gray-600 rounded-md text-sm bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                className="absolute right-2 top-2 px-3 py-1.5 text-white rounded-md text-sm
                           bg-[#852BAF] cursor-pointer transition-all duration-300 active:scale-95
                           hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78]"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="appearance-none pl-10 pr-8 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#852BAF] focus:border-transparent cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent_for_approval">Sent for Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resubmission">Resubmission</option>
              </select>
              <FaFilter className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>

            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [col, order] = e.target.value.split(":");
                setSortBy(col);
                setSortOrder(order as "asc" | "desc");
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#852BAF] focus:border-transparent cursor-pointer"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="product_name:asc">Product Name A-Z</option>
              <option value="product_name:desc">Product Name Z-A</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="relative overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          {tableLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <FaSpinner className="animate-spin text-3xl text-[#852BAF]" />
            </div>
          )}

          <table className="min-w-full divide-y divide-gray-200">
            {/* TABLE HEADER */}
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                {[
                  "Product",
                  "Brand",
                  "Category",
                  "Subcategory",
                  "SubType",
                  "Status",
                  "Rejection Reason",
                  "Visibility",
                  "Searchable",
                  "Action",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-5 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase whitespace-nowrap"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr
                  key={product.product_id}
                  className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors"
                >
                  {/* PRODUCT */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {product.main_image ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                          <img
                            src={`${API_BASEIMAGE_URL}/uploads/${product.main_image}`}
                            alt={product.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 ring-1 ring-gray-200">
                          <FaBox className="text-gray-400 text-lg" />
                        </div>
                      )}

                      <div className="text-sm font-semibold text-gray-900 leading-tight">
                        {product.product_name || "Unnamed Product"}
                      </div>
                    </div>
                  </td>

                  {/* BRAND */}
                  <td className="px-5 py-4 text-sm font-medium text-gray-800">
                    {product.brand_name || "N/A"}
                  </td>

                  {/* CATEGORY */}
                  <td className="px-5 py-4 text-sm font-medium text-gray-800">
                    {product.category_name || product.custom_category || "N/A"}
                  </td>

                  {/* SUBCATEGORY */}
                  <td className="px-5 py-4 text-sm font-medium text-gray-800">
                    {product.subcategory_name ||
                      product.custom_subcategory ||
                      "N/A"}
                  </td>

                  {/* SUB TYPE */}
                  <td className="px-5 py-4 text-sm font-medium text-gray-800">
                    {product.sub_subcategory_name ||
                      product.custom_sub_subcategory ||
                      "N/A"}
                  </td>

                  {/* STATUS */}
                  <td className="px-5 py-4">
                    <div className="flex items-center">
                      <StatusChip status={product.status} />
                    </div>
                  </td>

                  {/* REJECTION REASON */}
                  <td className="px-5 py-4 text-sm text-gray-700">
                    {product.rejection_reason || "—"}
                  </td>

                  {/* VISIBILITY */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() =>
                        toggleVisibility(product.product_id, product.is_visible)
                      }
                      className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        product.is_visible ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`cursor-pointer inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          product.is_visible ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>

                  {/* SEARCHABLE */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() =>
                        toggleSearchable(
                          product.product_id,
                          product.is_searchable,
                        )
                      }
                      className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        product.is_searchable ? "bg-indigo-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`cursor-pointer inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          product.is_searchable
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={routes.vendor.products.review.replace(
                          ":productId",
                          String(product.product_id),
                        )}
                      >
                        <button
                          title="View"
                          className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 cursor-pointer"
                        >
                          <FaEye />
                        </button>
                      </Link>

                      <Link
                        to={routes.vendor.products.manageProduct.replace(
                          ":productId",
                          String(product.product_id),
                        )}
                      >
                        <button
                          title="Manage"
                          className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-300 cursor-pointer"
                        >
                          <FaCogs />
                        </button>
                      </Link>

                      {!["approved", "rejected", "sent_for_approval"].includes(
                        product.status,
                      ) && (
                        <Link
                          to={routes.vendor.products.edit.replace(
                            ":id",
                            String(product.product_id),
                          )}
                        >
                          <button
                            title="Edit"
                            className="p-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 focus:ring-2 focus:ring-purple-300 cursor-pointer"
                          >
                            <FaEdit />
                          </button>
                        </Link>
                      )}

                      {![
                        "approved",
                        "rejected",
                        "resubmission",
                        "sent_for_approval",
                      ].includes(product.status) && (
                        <button
                          title="Delete"
                          onClick={() => openActionModal(product, "delete")}
                          className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 focus:ring-2 focus:ring-red-300 cursor-pointer"
                        >
                          <FaTrash />
                        </button>
                      )}

                      {["pending", "resubmission"].includes(product.status) && (
                        <button
                          title="Send"
                          onClick={() =>
                            openActionModal(product, "request_resubmission")
                          }
                          className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 focus:ring-2 focus:ring-green-300 cursor-pointer"
                        >
                          <FaPaperPlane />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing{" "}
              {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
              {Math.min(
                pagination.currentPage * pagination.itemsPerPage,
                pagination.totalItems,
              )}{" "}
              of {pagination.totalItems} products
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (
                    pagination.currentPage >=
                    pagination.totalPages - 2
                  ) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border text-sm font-medium rounded-md ${
                        pagination.currentPage === pageNum
                          ? "bg-[#852BAF] text-white border-[#852BAF]"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                },
              )}

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {products?.length === 0 && !loading && (
          <div className="py-12 text-center">
            <FaFileAlt className="mx-auto mb-4 text-4xl text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">
              No Products Found
            </h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "No products have been submitted yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
