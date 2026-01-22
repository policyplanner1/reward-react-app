import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import { FaArrowLeft, FaCubes } from "react-icons/fa";

/* ================= SMALL UI HELPERS (same as onboarding) ================= */

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center space-x-4 pb-4 border-b border-gray-100 mb-6">
      <div className="p-4 text-white rounded-2xl shadow-xl shadow-[#852BAF]/20 bg-gradient-to-tr from-[#852BAF] to-[#FC3F78]">
        <Icon className="text-2xl" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 font-medium">{description}</p>
        )}
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (e: any) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl
        focus:ring-4 focus:ring-[#852BAF]/20 focus:border-[#852BAF]
        focus:bg-white transition-all outline-none text-sm"
      />
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

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

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (!variantId) return;

    const fetchVariant = async () => {
      try {
        const res = await api.get(`/variant/${variantId}`);
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
      } finally {
        setLoading(false);
      }
    };

    fetchVariant();
  }, [variantId]);

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/variant/${variantId}`, form);
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("Failed to update variant");
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

  /* ================= UI ================= */
  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Edit Product <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#852BAF] to-[#FC3F78]">Variant</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Update pricing, stock and lifecycle details
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition cursor-pointer"
        >
          <FaArrowLeft /> Back
        </button>
      </div>

      {/* Variant Summary */}
      <section className="space-y-4 bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg">
        <SectionHeader
          icon={FaCubes}
          title="Variant Summary"
          description="SKU and attribute information"
        />

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">SKU</p>
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
      </section>

      {/* Editable Form */}
      <section className="mt-8 space-y-4 bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-shadow">
        <SectionHeader
          icon={FaCubes}
          title="Variant Details"
          description="Edit commercial and lifecycle fields"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormInput
            label="MRP"
            type="number"
            value={form.mrp}
            onChange={(e) => setForm({ ...form, mrp: e.target.value })}
            placeholder="Enter MRP"
          />

          <FormInput
            label="Sale Price"
            type="number"
            value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
            placeholder="Enter sale price"
          />

          <FormInput
            label="Stock"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            placeholder="Available stock"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <FormInput
            label="Manufacturing Date"
            type="date"
            value={form.manufacturing_date}
            onChange={(e) =>
              setForm({ ...form, manufacturing_date: e.target.value })
            }
          />

          <FormInput
            label="Expiry Date"
            type="date"
            value={form.expiry_date}
            onChange={(e) =>
              setForm({ ...form, expiry_date: e.target.value })
            }
          />
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex justify-end gap-4 pt-8">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition cursor-pointer"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
          text-white font-semibold hover:opacity-90 transition disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving..." : "Save Variant"}
        </button>
      </div>
    </div>
  );
}
