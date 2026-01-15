import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import { FaEdit, FaImages, FaArrowLeft, FaSpinner } from "react-icons/fa";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-3xl text-[#852BAF]" />
        <span className="ml-3 text-gray-600">Loading variants...</span>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: "#FFFAFB" }}>
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <FaArrowLeft />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Product Variants
            </h1>
          </div>
        </div>

        {/* Variant Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="p-4">SKU</th>
                <th className="p-4">Attributes</th>
                <th className="p-4">MRP</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.variant_id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{v.sku}</td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(v.variant_attributes).map(([k, val]) => (
                        <span
                          key={k}
                          className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                        >
                          {k.toUpperCase()}: {val}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-4">{v.mrp ?? "—"}</td>
                  <td className="p-4">{v.sale_price ?? "—"}</td>
                  <td className="p-4">{v.stock}</td>

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/vendor/products/variant-edit/${v.variant_id}`)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => navigate(`/vendor/products/variant-image/${v.variant_id}`)}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
                      >
                        <FaImages /> Images
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {variants.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No variants generated for this product
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
