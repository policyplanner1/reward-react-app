import React, { useEffect, useState } from "react";
import { api } from "../../../../api/api";

const ProductRewardMapping = () => {
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [rules, setRules] = useState([]);
  const [mappings, setMappings] = useState([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    product_id: "",
    variant_id: "",
    reward_rule_id: "",
    can_earn_reward: 1,
    can_redeem_reward: 1,
  });

  // 🔹 Initial load
  useEffect(() => {
    fetchProducts();
    fetchRules();
    fetchMappings();
  }, []);

  const fetchProducts = async () => {
    const res = await api.get("/product/all-products");
    setProducts(res.data?.products || []);
  };

  const fetchRules = async () => {
    const res = await api.get("/reward/get-rule");
     setRules(res.data?.data || res.data || []);
  };

  const fetchMappings = async () => {
    const res = await api.get("/reward/product-reward-settings");
    setMappings(res.data?.data || []);
  };

  // 🔹 Load variants
  const handleProductChange = async (productId: string) => {
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      variant_id: "",
    }));

    if (!productId) return;

    const res = await api.get(`/variant/product/${productId}`);
    setVariants(res.data.data || []);
  };

  // 🔹 Submit (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/reward/product-reward-settings", form);

      alert(editingId ? "Updated successfully" : "Created successfully");

      resetForm();
      fetchMappings();
    } catch (err) {
      console.error(err);
      alert("Failed to save mapping");
    }
  };

  // 🔹 Edit
  const handleEdit = async (m: any) => {
    setEditingId(m.id);

    setForm({
      product_id: m.product_id,
      variant_id: m.variant_id || "",
      reward_rule_id: m.reward_rule_id,
      can_earn_reward: m.can_earn_reward,
      can_redeem_reward: m.can_redeem_reward,
    });

    // load variants
    if (m.product_id) {
      const res = await api.get(`/variant/product/${m.product_id}`);
      setVariants(res.data.data);
    }
  };

  // 🔹 Delete
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this mapping?")) return;

    await api.delete(`/reward/product-reward-settings/${id}`);
    fetchMappings();
  };

  // 🔹 Reset
  const resetForm = () => {
    setEditingId(null);
    setForm({
      product_id: "",
      variant_id: "",
      reward_rule_id: "",
      can_earn_reward: 1,
      can_redeem_reward: 1,
    });
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          Product Reward Mapping
        </h2>

        {/* ================= FORM CARD ================= */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Product
              </label>
              <select
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                value={form.product_id}
                onChange={(e) => handleProductChange(e.target.value)}
                required
                disabled={!!editingId}
              >
                <option value="">Select Product</option>

                {products.map((p: any) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.brand_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Variant */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Variant
              </label>
              <select
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                value={form.variant_id}
                onChange={(e) =>
                  setForm({ ...form, variant_id: e.target.value })
                }
              >
                <option value="">All Variants</option>
                {variants.map((v: any) => (
                  <option key={v.variant_id} value={v.variant_id}>
                    {"Variant"} ({v.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Rule */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Reward Rule
              </label>
              <select
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                value={form.reward_rule_id}
                onChange={(e) =>
                  setForm({ ...form, reward_rule_id: e.target.value })
                }
                required
              >
                <option value="">Select Reward Rule</option>
                {rules.map((r:any) => (
                  <option key={r.reward_rule_id} value={r.reward_rule_id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 md:col-span-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={form.can_earn_reward === 1}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      can_earn_reward: e.target.checked ? 1 : 0,
                    })
                  }
                />
                <span className="text-sm text-gray-700">Can Earn</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-green"
                  checked={form.can_redeem_reward === 1}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      can_redeem_reward: e.target.checked ? 1 : 0,
                    })
                  }
                />
                <span className="text-sm text-gray-700">Can Redeem</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="md:col-span-2 flex gap-3 mt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer"
              >
                {editingId ? "Update Mapping" : "Create Mapping"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-400 text-white px-5 py-2 rounded-lg hover:bg-gray-500 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-200 text-gray-700">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Variant</th>
                <th className="p-3">Rule</th>
                <th className="p-3">Earn</th>
                <th className="p-3">Redeem</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-gray-500">
                    No mappings found
                  </td>
                </tr>
              ) : (
                mappings.map((m: any, index) => (
                  <tr
                    key={m.id}
                    className={`border-t ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-blue-50`}
                  >
                    <td className="p-3">{m.product_name}</td>
                    <td className="p-3">{m.variant_name || "All"}</td>
                    <td className="p-3">{m.rule_name}</td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          m.can_earn_reward
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {m.can_earn_reward ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          m.can_redeem_reward
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {m.can_redeem_reward ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3 py-1 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500 cursor-pointer"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(m.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductRewardMapping;
