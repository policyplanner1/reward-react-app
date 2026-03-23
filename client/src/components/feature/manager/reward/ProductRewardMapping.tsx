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
    const res = await api.get("/products");
    setProducts(res.data.data);
  };

  const fetchRules = async () => {
    const res = await api.get("/reward-rules");
    setRules(res.data.data);
  };

  const fetchMappings = async () => {
    const res = await api.get("/product-reward-settings");
    setMappings(res.data.data);
  };

  // 🔹 Load variants
  const handleProductChange = async (productId: string) => {
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      variant_id: "",
    }));

    if (!productId) return;

    const res = await api.get(`/products/${productId}/variants`);
    setVariants(res.data.data);
  };

  // 🔹 Submit (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/map", form);

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
      const res = await api.get(`/products/${m.product_id}/variants`);
      setVariants(res.data.data);
    }
  };

  // 🔹 Delete
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this mapping?")) return;

    await api.delete(`/product-reward-settings/${id}`);
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
    <div className="order-page">
      <h2 className="text-2xl font-semibold mb-6">
        Product Reward Mapping
      </h2>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit} className="form-container">

        {/* Product */}
        <select
          value={form.product_id}
          onChange={(e) => handleProductChange(e.target.value)}
          required
          disabled={!!editingId}
        >
          <option value="">Select Product</option>
          {products.map((p: any) => (
            <option key={p.product_id} value={p.product_id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* Variant */}
        <select
          value={form.variant_id}
          onChange={(e) =>
            setForm({ ...form, variant_id: e.target.value })
          }
        >
          <option value="">All Variants</option>
          {variants.map((v: any) => (
            <option key={v.variant_id} value={v.variant_id}>
              {v.name}
            </option>
          ))}
        </select>

        {/* Reward Rule */}
        <select
          value={form.reward_rule_id}
          onChange={(e) =>
            setForm({ ...form, reward_rule_id: e.target.value })
          }
          required
        >
          <option value="">Select Reward Rule</option>
          {rules.map((r: any) => (
            <option key={r.reward_rule_id} value={r.reward_rule_id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* Toggles */}
        <label>
          <input
            type="checkbox"
            checked={form.can_earn_reward === 1}
            onChange={(e) =>
              setForm({
                ...form,
                can_earn_reward: e.target.checked ? 1 : 0,
              })
            }
          />
          Can Earn
        </label>

        <label>
          <input
            type="checkbox"
            checked={form.can_redeem_reward === 1}
            onChange={(e) =>
              setForm({
                ...form,
                can_redeem_reward: e.target.checked ? 1 : 0,
              })
            }
          />
          Can Redeem
        </label>

        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          <button type="submit" className="save-btn">
            {editingId ? "Update Mapping" : "Create Mapping"}
          </button>

          {editingId && (
            <button
              type="button"
              className="cancel-btn"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="table-wrapper mt-6">
        <table className="order-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>Rule</th>
              <th>Earn</th>
              <th>Redeem</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  No mappings found
                </td>
              </tr>
            ) : (
              mappings.map((m: any) => (
                <tr key={m.id}>
                  <td>{m.product_name}</td>
                  <td>{m.variant_name || "All"}</td>
                  <td>{m.rule_name}</td>
                  <td>{m.can_earn_reward ? "Yes" : "No"}</td>
                  <td>{m.can_redeem_reward ? "Yes" : "No"}</td>

                  <td className="flex gap-2">
                    <button
                      className="view-btn"
                      onClick={() => handleEdit(m)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(m.id)}
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
  );
};

export default ProductRewardMapping;