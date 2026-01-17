import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import {
  FaEdit,
  FaImages,
  FaArrowLeft,
  FaSpinner,
  FaBoxOpen,
} from "react-icons/fa";
import { FiPackage } from "react-icons/fi";

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

  /* ================= FETCH VARIANTS ================= */
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

  /* ================= INIT DATATABLE ================= */
  useEffect(() => {
    if (!tableRef.current || variants.length === 0) return;

    const table = $(tableRef.current).DataTable({
      destroy: true,
      responsive: true,
      pageLength: 10,
      lengthMenu: [10, 25, 50],
      ordering: true,
      searching: true,
      language: {
        search: "Search variants",
        lengthMenu: "Show _MENU_",
        info: "Showing _START_ to _END_ of _TOTAL_ variants",
        emptyTable: "No variants available",
      },
      columnDefs: [{ orderable: false, targets: [1, 5] }],
    });

    return () => {
      table.destroy();
    };
  }, [variants]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <FaSpinner className="animate-spin text-3xl text-[#852BAF]" />
        <span className="ml-3 text-gray-600 text-lg">Loading variants…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 px-6 py-4 border-b md:flex-row md:items-center md:justify-between">
          {/* LEFT: TITLE */}
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center mr-4">
              <FiPackage className="text-xl text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Manage Product Variants
              </h1>
              <p className="text-gray-600">
                View and manage pricing, stock and images
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg
           bg-[#852BAF] text-white transition-all duration-300
           hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78]
           hover:text-white cursor-pointer"
            >
              <FaArrowLeft />
              Back
            </button>

            <div className="mt-2 text-sm text-gray-600 font-medium flex items-center gap-2">
              <FaBoxOpen className="text-gray-500" />
              {variants.length} Variants
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="p-6 overflow-x-auto">
          <table ref={tableRef} className="display responsive nowrap w-full">
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
                  {/* SKU */}
                  <td className="font-medium text-gray-900">{v.sku}</td>

                  {/* ATTRIBUTES (compact, not cluttered) */}
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(v.variant_attributes).map(
                        ([key, val]) => (
                          <span
                            key={key}
                            className="
                              inline-flex items-center
                              px-2.5 py-1
                              text-xs font-medium
                              text-gray-700
                              bg-gray-100
                              border border-gray-200
                              rounded-md
                              whitespace-nowrap
                            "
                          >
                            <span className="mr-1 text-gray-500 uppercase">
                              {key}
                            </span>
                            <span className="font-semibold text-gray-800">
                              {val}
                            </span>
                          </span>
                        )
                      )}
                    </div>
                  </td>

                  {/* MRP */}
                  <td className="text-gray-600">{v.mrp ? `₹${v.mrp}` : "—"}</td>

                  {/* SALE PRICE */}
                  <td className="font-medium text-gray-900">
                    {v.sale_price ? `₹${v.sale_price}` : "—"}
                  </td>

                  {/* STOCK (kept exactly as requested) */}
                  <td>
                    <span
                      className={`px-2.5 py-1 text-sm font-semibold rounded-md ${
                        v.stock > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {v.stock}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          navigate(
                            `/vendor/products/variant-edit/${v.variant_id}`
                          )
                        }
                        className="text-blue-600 hover:underline text-sm font-medium cursor-pointer"
                      >
                        <FaEdit className="inline mr-1" />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/vendor/products/variant-image/${v.variant_id}`
                          )
                        }
                        className="text-purple-600 hover:underline text-sm font-medium cursor-pointer"
                      >
                        <FaImages className="inline mr-1" />
                        Images
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* EMPTY STATE */}
          {variants.length === 0 && (
            <div className="py-16 text-center">
              <FaBoxOpen className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">
                No variants found
              </h3>
              <p className="text-gray-500">
                This product does not have any variants yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
