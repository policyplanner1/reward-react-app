import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../../api/api";
import "./Css/rewardForm.css"

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
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
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
    <div className="min-h-screen bg-gray-50 flex justify-center items-start py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {isEdit ? "Edit Reward Rule" : "Create Reward Rule"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Basic Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="label">Rule Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              {/* Reward Type */}
              <div>
                <label className="label">Reward Type</label>
                <select
                  name="reward_type"
                  value={form.reward_type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reward Config */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Reward Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reward Value */}
              <div>
                <label className="label">Reward Value</label>
                <input
                  type="number"
                  name="reward_value"
                  value={form.reward_value}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              {/* Max Reward */}
              <div>
                <label className="label">Max Reward</label>
                <input
                  type="number"
                  name="max_reward"
                  value={form.max_reward}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              {/* Min Order */}
              <div>
                <label className="label">Minimum Order</label>
                <input
                  type="number"
                  name="min_order_amount"
                  value={form.min_order_amount}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Source + Status */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Additional Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Type */}
              <div>
                <label className="label">Source Type</label>
                <select
                  name="source_type"
                  value={form.source_type}
                  onChange={handleChange}
                  className="input"
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

              {/* Status Toggle */}
              <div className="flex items-center justify-between mt-6 md:mt-0">
                <span className="text-gray-700 font-medium">Active Status</span>

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: prev.is_active ? 0 : 1,
                    }))
                  }
                  className={`w-14 h-7 flex items-center rounded-full p-1 transition ${
                    form.is_active ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition ${
                      form.is_active ? "translate-x-7" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/manager/reward-list")}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow cursor-pointer"
            >
              {isEdit ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RewardForm;
