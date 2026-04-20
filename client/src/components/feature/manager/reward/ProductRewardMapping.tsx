import React, { useEffect, useState } from "react";
import { api } from "../../../../api/api";

const ProductRewardMapping = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [targetType, setTargetType] = useState("product");

  const [form, setForm] = useState({
    product_id: "",
    variant_id: "",
    category_id: "",
    subcategory_id: "",
    reward_rule_id: "",
    can_earn_reward: 1,
    can_redeem_reward: 1,
  });

  // ================= INIT =================
  useEffect(() => {
    fetchProducts();
    fetchRules();
    fetchMappings();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const res = await api.get("/product/all-products");
    setProducts(res.data?.products || []);
  };

  const fetchRules = async () => {
    const res = await api.get("/reward/get-rule");
    setRules(res.data?.data || []);
  };

  const fetchMappings = async () => {
    const res = await api.get("/reward/product-reward-settings");
    setMappings(res.data?.data || []);
  };

  const fetchCategories = async () => {
    const res = await api.get("/category");
    setCategories(res.data?.data || []);
  };

  // ================= HANDLERS =================

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

  const handleCategoryChange = async (categoryId: string) => {
    setForm((prev) => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: "",
    }));

    const res = await api.get(`/subcategory/${categoryId}`);
    setSubcategories(res.data.data || []);
  };

  // ================= SUBMIT =================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: any = {
        reward_rule_id: Number(form.reward_rule_id),
        can_earn_reward: Number(form.can_earn_reward),
        can_redeem_reward: Number(form.can_redeem_reward),
      };

      if (targetType === "variant") {
        payload.product_id = Number(form.product_id);
        payload.variant_id = Number(form.variant_id);
      }

      if (targetType === "product") {
        payload.product_id = Number(form.product_id);
      }

      if (targetType === "subcategory") {
        payload.subcategory_id = Number(form.subcategory_id);
      }

      if (targetType === "category") {
        payload.category_id = Number(form.category_id);
      }

      await api.post("/reward/product-reward-settings", payload);

      alert(editingId ? "Updated successfully" : "Created successfully");

      resetForm();
      fetchMappings();
    } catch (err) {
      console.error(err);
      alert("Failed to save mapping");
    }
  };

  // ================= EDIT =================

  const handleEdit = async (m: any) => {
    setEditingId(m.id);

    if (m.variant_id) setTargetType("variant");
    else if (m.product_id) setTargetType("product");
    else if (m.subcategory_id) setTargetType("subcategory");
    else if (m.category_id) setTargetType("category");
    else setTargetType("global");

    setForm({
      product_id: m.product_id || "",
      variant_id: m.variant_id || "",
      category_id: m.category_id || "",
      subcategory_id: m.subcategory_id || "",
      reward_rule_id: m.reward_rule_id,
      can_earn_reward: m.can_earn_reward,
      can_redeem_reward: m.can_redeem_reward,
    });

    if (m.product_id) {
      const res = await api.get(`/variant/product/${m.product_id}`);
      setVariants(res.data.data);
    }
  };

  // ================= DELETE =================

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this mapping?")) return;

    await api.delete(`/reward/product-reward-settings/${id}`);
    fetchMappings();
  };

  // ================= RESET =================

  const resetForm = () => {
    setEditingId(null);
    setTargetType("product");
    setForm({
      product_id: "",
      variant_id: "",
      category_id: "",
      subcategory_id: "",
      reward_rule_id: "",
      can_earn_reward: 1,
      can_redeem_reward: 1,
    });
  };

  // ================= UI =================

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Reward Mapping</h2>

        {/* FORM */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* TARGET TYPE */}
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="variant">Variant</option>
              <option value="product">Product</option>
              <option value="subcategory">Subcategory</option>
              <option value="category">Category</option>
              <option value="global">Global</option>
            </select>

            {/* RULE */}
            <select
              value={form.reward_rule_id}
              onChange={(e) =>
                setForm({ ...form, reward_rule_id: e.target.value })
              }
              className="border p-2 rounded"
              required
            >
              <option value="">Select Rule</option>
              {rules.map((r) => (
                <option key={r.reward_rule_id} value={r.reward_rule_id}>
                  {r.name} (
                  {r.reward_type === "percentage"
                    ? `${r.reward_value}%`
                    : `₹${r.reward_value}`}
                  )
                </option>
              ))}
            </select>

            {/* PRODUCT */}
            {(targetType === "product" || targetType === "variant") && (
              <select
                value={form.product_id}
                onChange={(e) => handleProductChange(e.target.value)}
                className="border p-2 rounded"
                required
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            )}

            {/* VARIANT */}
            {targetType === "variant" && (
              <select
                value={form.variant_id}
                onChange={(e) =>
                  setForm({ ...form, variant_id: e.target.value })
                }
                className="border p-2 rounded"
                required
              >
                <option value="">Select Variant</option>
                {variants.map((v) => (
                  <option key={v.variant_id} value={v.variant_id}>
                    {v.sku}
                  </option>
                ))}
              </select>
            )}

            {/* CATEGORY */}
            {(targetType === "category" || targetType === "subcategory") && (
              <select
                value={form.category_id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="border p-2 rounded"
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            )}

            {/* SUBCATEGORY */}
            {targetType === "subcategory" && (
              <select
                value={form.subcategory_id}
                onChange={(e) =>
                  setForm({ ...form, subcategory_id: e.target.value })
                }
                className="border p-2 rounded"
                required
              >
                <option value="">Select Subcategory</option>
                {subcategories.map((s) => (
                  <option key={s.subcategory_id} value={s.subcategory_id}>
                    {s.subcategory_name}
                  </option>
                ))}
              </select>
            )}

            {/* TOGGLES */}
            <div className="flex gap-4 col-span-2">
              <label>
                <input
                  type="checkbox"
                  checked={!!form.can_earn_reward}
                  onChange={() =>
                    setForm((p) => ({
                      ...p,
                      can_earn_reward: p.can_earn_reward ? 0 : 1,
                    }))
                  }
                />
                Earn Reward
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={!!form.can_redeem_reward}
                  onChange={() =>
                    setForm((p) => ({
                      ...p,
                      can_redeem_reward: p.can_redeem_reward ? 0 : 1,
                    }))
                  }
                />
                Redeem Reward
              </label>
            </div>

            <button className="col-span-2 bg-blue-600 text-white p-2 rounded">
              {editingId ? "Update Mapping" : "Create Mapping"}
            </button>
          </form>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-200 text-gray-700">
              <tr>
                <th className="p-3">Target</th>
                <th className="p-3">Details</th>
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
                mappings.map((m: any, index) => {
                  // 🎯 Detect target type
                  let target = "Global";
                  if (m.variant_id) target = "Variant";
                  else if (m.product_id) target = "Product";
                  else if (m.subcategory_id) target = "Subcategory";
                  else if (m.category_id) target = "Category";

                  // 🎯 Details display
                  let details = "-";

                  if (target === "Variant") {
                    details = `${m.product_name} → ${m.variant_name}`;
                  }

                  if (target === "Product") {
                    details = m.product_name;
                  }

                  if (target === "Subcategory") {
                    details = m.subcategory_name;
                  }

                  if (target === "Category") {
                    details = m.category_name;
                  }

                  return (
                    <tr
                      key={m.id}
                      className={`border-t ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50`}
                    >
                      {/* TARGET TYPE */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            target === "Variant"
                              ? "bg-purple-100 text-purple-700"
                              : target === "Product"
                                ? "bg-blue-100 text-blue-700"
                                : target === "Subcategory"
                                  ? "bg-orange-100 text-orange-700"
                                  : target === "Category"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {target}
                        </span>
                      </td>

                      {/* DETAILS */}
                      <td className="p-3">{details}</td>

                      {/* RULE */}
                      <td className="p-3 font-medium">{m.rule_name}</td>

                      {/* EARN */}
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

                      {/* REDEEM */}
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

                      {/* ACTION */}
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(m)}
                          className="px-3 py-1 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(m.id)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductRewardMapping;
