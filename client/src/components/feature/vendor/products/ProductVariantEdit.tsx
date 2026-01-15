import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";

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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Variant</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back
        </button>
      </div>

      {/* Variant Info */}
      <div className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <p className="text-sm text-gray-500">SKU</p>
          <p className="font-medium">{variant.sku}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Attributes</p>
          <div className="flex flex-wrap gap-2">
            {variant.variant_attributes &&
              Object.entries(variant.variant_attributes).map(
                ([key, value]: any) => (
                  <span
                    key={key}
                    className="px-3 py-1 text-xs bg-gray-100 border rounded-full"
                  >
                    {key.toUpperCase()}: {value}
                  </span>
                )
              )}
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">MRP</label>
            <input
              type="number"
              value={form.mrp}
              onChange={(e) => setForm({ ...form, mrp: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Sale Price
            </label>
            <input
              type="number"
              value={form.sale_price}
              onChange={(e) =>
                setForm({ ...form, sale_price: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Manufacturing Date
            </label>
            <input
              type="date"
              value={form.manufacturing_date}
              onChange={(e) =>
                setForm({ ...form, manufacturing_date: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) =>
                setForm({ ...form, expiry_date: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Variant"}
          </button>
        </div>
      </div>
    </div>
  );
}
