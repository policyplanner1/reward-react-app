import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import { FaArrowLeft } from "react-icons/fa";

export default function ProductVariantEdit() {
  const { variantId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [variant, setVariant] = useState<any>(null);

  const [form, setForm] = useState({
    mrp: "",
    sale_price: "",
    stock: "",
    manufacturing_date: "",
    expiry_date: "",
  });

  // Fetch variant details
  useEffect(() => {
    if (!variantId) return;
    api.get(`/variant/${variantId}`).then((res) => {
      if (res.data?.success) {
        const v = res.data.data;

        setVariant(v);
        setForm({
          mrp: v.mrp ?? "",
          sale_price: v.sale_price ?? "",
          stock: v.stock ?? "",
          manufacturing_date: v.manufacturing_date ?? "",
          expiry_date: v.expiry_date ?? "",
        });
      }
      setLoading(false);
    });
  }, [variantId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/variant/${variantId}`, form);
      navigate(-1);
    } catch (err) {
      console.error("SAVE VARIANT ERROR:", err);
      alert("Failed to save variant");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading variant...</div>;
  }

  if (!variant) {
    return <div className="p-6 text-red-600">Variant not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Variant</h1>
            <p className="text-gray-500 mt-1">
              Update pricing, stock, and lifecycle details
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 shadow-sm transition cursor-pointer"
          >
            <FaArrowLeft />
            Back
          </button>
        </div>

        {/* Variant Summary Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                SKU
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {variant.sku}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                Attributes
              </p>
              <div className="flex flex-wrap gap-2">
                {variant.variant_attributes &&
                  Object.entries(variant.variant_attributes).map(
                    ([key, value]: any) => (
                      <span
                        key={key}
                        className="px-3 py-1.5 text-sm font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200"
                      >
                        {key.toUpperCase()}: {value}
                      </span>
                    )
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Editable Form */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Variant Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* MRP */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                MRP
              </label>
              <input
                type="number"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition"
                placeholder="Enter MRP"
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Sale Price
              </label>
              <input
                type="number"
                value={form.sale_price}
                onChange={(e) =>
                  setForm({ ...form, sale_price: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition"
                placeholder="Enter sale price"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Stock
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition"
                placeholder="Available stock"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={form.manufacturing_date}
                onChange={(e) =>
                  setForm({ ...form, manufacturing_date: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm({ ...form, expiry_date: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 bg-white border-t p-4 rounded-xl shadow-lg flex justify-end gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white font-semibold hover:opacity-90 transition disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Variant"}
          </button>
        </div>
      </div>
    </div>
  );
}
