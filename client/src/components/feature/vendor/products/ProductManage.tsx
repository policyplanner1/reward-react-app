import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import { FaEdit, FaImages, FaArrowLeft, FaSpinner } from "react-icons/fa";

import $ from "jquery";
import "datatables.net";
import "datatables.net-responsive";

interface Variant {
  variant_id: number;
  sku: string;
  mrp: number | null;
  sale_price: number | null;
  stock: number;
  variant_attributes: Record<string, string>;
}

export default function ProductManage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!productId) return;

    api
      .get(`/variant/product/${productId}`)
      .then((res) => {
        if (res.data.success) {
          setVariants(res.data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  /* Initialize DataTable AFTER data renders */
  useEffect(() => {
    if (!tableRef.current || variants.length === 0) return;

    const table = $(tableRef.current).DataTable({
      destroy: true, 
      responsive: true,
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      ordering: true,
      searching: true,
      language: {
        search: "Search variants:",
        lengthMenu: "Show _MENU_ variants",
        info: "Showing _START_ to _END_ of _TOTAL_ variants",
        emptyTable: "No variants available",
      },
      columnDefs: [
        { orderable: false, targets: [1, 5] }, // attributes + actions
      ],
    });

    return () => {
      table.destroy();
    };
  }, [variants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFFAFB]">
        <FaSpinner className="animate-spin text-3xl text-[#852BAF]" />
        <span className="ml-3 text-gray-600 text-lg">
          Loading variants...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FFFAFB] min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Product Variants
          </h1>
        </div>

        {/* DataTable */}
        <div className="p-6 overflow-x-auto">
          <table
            ref={tableRef}
            className="display responsive nowrap w-full"
          >
            <thead>
              <tr>
                <th>SKU</th>
                <th>Attributes</th>
                <th>MRP</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {variants.map((v) => (
                <tr key={v.variant_id}>
                  <td>{v.sku}</td>

                  <td>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(v.variant_attributes).map(
                        ([key, val]) => (
                          <span
                            key={key}
                            className="px-3 py-1 text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full"
                          >
                            {key.toUpperCase()}: {val}
                          </span>
                        )
                      )}
                    </div>
                  </td>

                  <td>{v.mrp ?? "—"}</td>
                  <td>{v.sale_price ?? "—"}</td>
                  <td className="font-semibold">{v.stock}</td>

                  <td>
                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          navigate(
                            `/vendor/products/variant-edit/${v.variant_id}`
                          )
                        }
                        className="flex items-center gap-2 text-blue-600 hover:underline cursor-pointer"
                      >
                        <FaEdit /> Edit
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/vendor/products/variant-image/${v.variant_id}`
                          )
                        }
                        className="flex items-center gap-2 text-purple-600 hover:underline cursor-pointer"
                      >
                        <FaImages /> Images
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
