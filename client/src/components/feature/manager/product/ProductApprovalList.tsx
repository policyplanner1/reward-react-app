import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaQuestionCircle,
  FaEye,
  FaFileAlt,
  FaSpinner,
  FaFilter,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaRedo,
 
  FaBox,
  FaPaperPlane,
} from "react-icons/fa";
import { FiPackage } from "react-icons/fi";

/* ================= CONFIG ================= */
const API_BASE: string = import.meta.env.VITE_API_URL;

/* ================= TYPES ================= */

type ProductStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "resubmission"
  | "sent_for_approval";

type StatusFilter = "all" | ProductStatus;

type SortKey = "created_at" | "product_name";
type SortOrder = "asc" | "desc";

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

/* ================= STATUS CHIP ================= */

interface StatusChipProps {
  status: ProductStatus;
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const map: Record<
    ProductStatus,
    { text: string; color: string; Icon: React.FC<{ size?: number }> }
  > = {
    approved: {
      text: "Approved",
      color: "bg-green-100 text-green-800 border-green-200",
      Icon: FaCheckCircle,
    },
    rejected: {
      text: "Rejected",
      color: "bg-red-100 text-red-800 border-red-200",
      Icon: FaTimesCircle,
    },
    resubmission: {
      text: "Resubmission",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      Icon: FaRedo,
    },
    pending: {
      text: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Icon: FaClock,
    },
    sent_for_approval: {
      text: "Sent for Approval",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      Icon: FaPaperPlane,
    },
  };

  const cfg = map[status] ?? {
    text: "Unknown",
    color: "bg-gray-200 text-gray-700 border-gray-300",
    Icon: FaQuestionCircle,
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium border rounded-full ${cfg.color}`}
    >
      <cfg.Icon className="mr-1.5" size={12} />
      {cfg.text}
    </span>
  );
};

/* ================= MAIN COMPONENT ================= */

const ProductManagerList: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    sent_for_approval: 0,
    approved: 0,
    rejected: 0,
    resubmission: 0,
  });

  /* ================= FETCH ================= */

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchQuery,
        sortBy,
        sortOrder,
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const res = await fetch(
        `${API_BASE}/api/product/all-products?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data: ApiResponse = await res.json();

      if (data.success) {
        setProducts(data.products);
        setPagination((p) => ({
          ...p,
          totalPages: data.totalPages,
          totalItems: data.total,
        }));
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    searchQuery,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ================= SORT ICON ================= */

  const getSortIcon = (column: SortKey) => {
    if (sortBy !== column) return <FaSort className="ml-1 opacity-30" />;
    return sortOrder === "asc" ? (
      <FaSortUp className="ml-1" />
    ) : (
      <FaSortDown className="ml-1" />
    );
  };

  /* ================= RENDER ================= */

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="text-4xl animate-spin text-[#852BAF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50 md:p-6">
      <div className="p-4 bg-white border border-gray-200 shadow-lg rounded-2xl md:p-6">

        {/* HEADER */}
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center mr-4">
            <FiPackage className="text-xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-gray-600">
              Review and manage vendor submitted products
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-4 mb-6 md:flex-row">
          {/* SEARCH */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((p) => ({ ...p, currentPage: 1 }));
              }}
              placeholder="Search product name..."
              className="w-full py-3 pl-10 pr-4 border rounded-lg"
            />
          </div>

          {/* STATUS FILTER */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPagination((p) => ({ ...p, currentPage: 1 }));
              }}
              className="py-3 pl-10 pr-8 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="sent_for_approval">Sent for Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="resubmission">Resubmission</option>
            </select>
          </div>

          {/* SORT */}
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [col, order] = e.target.value.split(":");
              setSortBy(col as SortKey);
              setSortOrder(order as SortOrder);
              setPagination((p) => ({ ...p, currentPage: 1 }));
            }}
            className="px-4 py-3 border rounded-lg"
          >
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="product_name:asc">Product Name A-Z</option>
            <option value="product_name:desc">Product Name Z-A</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-left">
                  Product
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-left">
                  Brand
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-left">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {p.main_image ? (
                        <img
                          src={`${API_BASE}/uploads/${p.main_image}`}
                          className="object-cover w-12 h-12 mr-3 rounded"
                        />
                      ) : (
                        <FaBox className="w-12 h-12 mr-3 text-gray-400" />
                      )}
                      <span className="font-semibold">{p.product_name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">{p.brand_name}</td>

                  <td className="px-4 py-4">
                    <StatusChip status={p.status} />
                  </td>

                  <td className="px-4 py-4">
                    <Link
                      to={`/manager/product/${p.product_id}`}
                      className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <FaEye />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EMPTY */}
        {products.length === 0 && !loading && (
          <div className="py-12 text-center">
            <FaFileAlt className="mx-auto mb-4 text-4xl text-gray-400" />
            <h3 className="text-lg font-medium">No Products Found</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagerList;
