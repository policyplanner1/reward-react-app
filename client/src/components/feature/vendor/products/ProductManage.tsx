import  { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import {
  FaEdit,
  FaImages,
  FaArrowLeft,
  FaSpinner,
} from "react-icons/fa";

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

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const totalPages = Math.ceil(variants.length / itemsPerPage);

  const paginatedVariants = variants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-700 uppercase">
                  SKU
                </th>
                <th className="p-4 text-sm font-semibold text-gray-700 uppercase">
                  Attributes
                </th>
                <th className="p-4 text-sm font-semibold text-gray-700 uppercase">
                  MRP
                </th>
                <th className="p-4 text-sm font-semibold text-gray-700 uppercase">
                  Price
                </th>
                <th className="p-4 text-sm font-semibold text-gray-700 uppercase">
                  Stock
                </th>
                <th className="p-4 text-sm font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedVariants.map((v) => (
                <tr
                  key={v.variant_id}
                  className="border-b hover:bg-purple-50 transition"
                >
                  <td className="p-4 font-medium text-gray-900">
                    {v.sku}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(v.variant_attributes).map(
                        ([key, val]) => (
                          <span
                            key={key}
                            className="px-3 py-1.5 text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full"
                          >
                            {key.toUpperCase()}: {val}
                          </span>
                        )
                      )}
                    </div>
                  </td>

                  <td className="p-4 text-gray-800">
                    {v.mrp ?? "—"}
                  </td>

                  <td className="p-4 text-gray-800">
                    {v.sale_price ?? "—"}
                  </td>

                  <td className="p-4 font-semibold text-gray-900">
                    {v.stock}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() =>
                          navigate(
                            `/vendor/products/variant-edit/${v.variant_id}`
                          )
                        }
                        className="flex items-center gap-2 text-base font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        <FaEdit />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/vendor/products/variant-image/${v.variant_id}`
                          )
                        }
                        className="flex items-center gap-2 text-base font-medium text-purple-600 hover:underline cursor-pointer"
                      >
                        <FaImages />
                        Images
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {variants.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-500 text-lg"
                  >
                    No variants generated for this product
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((p) => Math.max(p - 1, 1))
                }
                className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Previous
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(p + 1, totalPages)
                  )
                }
                className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
