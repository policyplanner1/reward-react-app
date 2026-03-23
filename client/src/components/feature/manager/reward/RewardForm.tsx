import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../../api/api";

const RewardForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: "",
    reward_type: "percentage",
    reward_value: "",
    max_reward: "",
    min_order_amount: "",
    source_type: "product",
    is_active: 1,
  });

  const [loading, setLoading] = useState(false);

  // 🔹 Fetch existing rule (Edit mode)
  useEffect(() => {
    if (isEdit) fetchRule();
  }, [id]);

  const fetchRule = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reward-rules/${id}`);

      if (res.data.success) {
        const data = res.data.data;

        setForm({
          name: data.name || "",
          reward_type: data.reward_type,
          reward_value: data.reward_value,
          max_reward: data.max_reward || "",
          min_order_amount: data.min_order_amount,
          source_type: data.source_type,
          is_active: data.is_active,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load rule");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔹 Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        ...form,
        reward_value: Number(form.reward_value),
        max_reward: form.max_reward ? Number(form.max_reward) : null,
        min_order_amount: Number(form.min_order_amount),
      };

      if (isEdit) {
        await api.put(`/reward-rules/${id}`, payload);
      } else {
        await api.post(`/reward-rules`, payload);
      }

      navigate("/manager/reward-list");

    } catch (err) {
      console.error(err);
      alert("Failed to save rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-page">
      <h2 className="text-2xl font-semibold mb-6">
        {isEdit ? "Edit Reward Rule" : "Create Reward Rule"}
      </h2>

      <form onSubmit={handleSubmit} className="form-container">

        {/* Name */}
        <div className="form-group">
          <label>Rule Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Reward Type */}
        <div className="form-group">
          <label>Reward Type</label>
          <select
            name="reward_type"
            value={form.reward_type}
            onChange={handleChange}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
        </div>

        {/* Reward Value */}
        <div className="form-group">
          <label>Reward Value</label>
          <input
            type="number"
            name="reward_value"
            value={form.reward_value}
            onChange={handleChange}
            required
          />
        </div>

        {/* Max Reward */}
        <div className="form-group">
          <label>Max Reward</label>
          <input
            type="number"
            name="max_reward"
            value={form.max_reward}
            onChange={handleChange}
          />
        </div>

        {/* Min Order */}
        <div className="form-group">
          <label>Minimum Order Amount</label>
          <input
            type="number"
            name="min_order_amount"
            value={form.min_order_amount}
            onChange={handleChange}
          />
        </div>

        {/* Source Type */}
        <div className="form-group">
          <label>Source Type</label>
          <select
            name="source_type"
            value={form.source_type}
            onChange={handleChange}
          >
            <option value="product">Product</option>
            <option value="service">Service</option>
            <option value="steps">Steps</option>
            <option value="referral">Referral</option>
            <option value="payment">Payment</option>
            <option value="onboarding">Onboarding</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Status */}
        <div className="form-group">
          <label>Status</label>
          <select
            name="is_active"
            value={form.is_active}
            onChange={handleChange}
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-4 mt-6">
          <button type="submit" className="save-btn">
            {isEdit ? "Update Rule" : "Create Rule"}
          </button>

          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate("/manager/reward-list")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RewardForm;