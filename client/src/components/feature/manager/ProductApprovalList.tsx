import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaFileAlt,
  FaSpinner,
  FaFilter,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaRedo,
  FaCheck,
  FaTimes,
  FaQuestionCircle,
  FaBox,
  FaPaperPlane,
  FaTrash,
} from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';

const API_BASE = 'http://localhost:5000/api';

type ProductStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'resubmission'
  | 'sent_for_approval';

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

type ActionType = 'approve' | 'reject' | 'request_resubmission';

const StatusChip = ({ status }: { status: ProductStatus }) => {
  const config: Record<
    ProductStatus,
    { text: string; className: string; Icon: React.ComponentType<{ size?: number }> }
  > = {
    approved: { text: 'Approved', className: 'bg-green-100 text-green-700', Icon: FaCheckCircle },
    rejected: { text: 'Rejected', className: 'bg-red-100 text-red-700', Icon: FaTimesCircle },
    resubmission: { text: 'Resubmission', className: 'bg-blue-100 text-blue-700', Icon: FaRedo },
    pending: { text: 'Pending', className: 'bg-yellow-100 text-yellow-700', Icon: FaClock },
    sent_for_approval: { text: 'Sent for Approval', className: 'bg-blue-100 text-blue-700', Icon: FaPaperPlane },
  };

  const cfg = config[status] || {
    text: status,
    className: 'bg-gray-100 text-gray-700',
    Icon: FaQuestionCircle,
  };

  const Icon = cfg.Icon;

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon size={12} className="mr-1.5" />
      {cfg.text}
    </span>
  );
};

export default function ProductApprovalList() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        search: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : '',
        sortBy,
        sortOrder,
      });

      const res = await fetch(`${API_BASE}/product/all-products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading && products.length === 0)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="text-4xl text-purple-600 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="p-6 bg-white border shadow rounded-2xl">

        <h1 className="flex items-center gap-2 mb-4 text-2xl font-bold">
          <FiPackage /> Product Management
        </h1>

        <div className="flex gap-4 mb-4">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full px-4 py-2 border rounded-lg"
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-left uppercase">Product</th>
                <th className="px-4 py-3 text-xs font-semibold text-left uppercase">Brand</th>
                <th className="px-4 py-3 text-xs font-semibold text-left uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-left uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.product_id} className="hover:bg-gray-50">
                  <td className="flex items-center gap-3 px-4 py-4">
                    {p.main_image ? (
                      <img
                        src={`${API_BASE}/uploads/${p.main_image}`}
                        className="object-cover w-10 h-10 rounded"
                      />
                    ) : (
                      <FaBox className="text-gray-400" />
                    )}
                    {p.product_name}
                  </td>
                  <td className="px-4 py-4">{p.brand_name}</td>
                  <td className="px-4 py-4"><StatusChip status={p.status} /></td>
                  <td className="px-4 py-4">
                    <Link to={`/manager/products/${p.product_id}`}>
                      <button className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-purple-600 rounded-lg">
                        <FaEye /> View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && !loading && (
          <div className="py-12 text-center text-gray-500">
            <FaFileAlt className="mx-auto mb-3 text-4xl" />
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
