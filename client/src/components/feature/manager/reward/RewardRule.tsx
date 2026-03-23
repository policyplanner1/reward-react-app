import React, { useEffect, useState } from "react";
import { api } from "../../../../api/api";
import { FiGift, FiPlus } from "react-icons/fi";

interface RewardRule {
  reward_rule_id: number;
  name: string;
  reward_type: "fixed" | "percentage";
  reward_value: number;
  max_reward: number | null;
  min_order_amount: number;
  is_active: number;
  source_type: string;
  created_at: string;
}

const RewardRule: React.FC = () => {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null); 

      const res = await api.get("/reward/get-rule");

      if (!res.data.success) {
        throw new Error("Failed to fetch rules");
      }

      setRules(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load reward rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deactivate this rule?")) return;

    try {
      const res = await api.delete(`/reward/delete-rule/${id}`);

      if (!res.data.success) {
        throw new Error("Delete failed");
      }

      fetchRules();
    } catch (err) {
      console.error(err);
      alert("Failed to delete rule");
    }
  };

  return (
    <div className="order-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center">
            <FiGift className="text-white text-xl" />
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Reward Rules</h2>
            <p className="text-gray-500">Manage reward configurations</p>
          </div>
        </div>

        {/* Create Button */}
        <button className="create-btn">
          <FiPlus /> Create Rule
        </button>
      </div>

      {/* Loader */}
      {loading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Max Reward</th>
                <th>Min Order</th>
                <th>Source</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    No reward rules found
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.reward_rule_id}>
                    <td>{rule.name}</td>

                    <td>{rule.reward_type}</td>

                    <td>
                      {rule.reward_type === "percentage"
                        ? `${rule.reward_value}%`
                        : `₹${rule.reward_value}`}
                    </td>

                    <td>{rule.max_reward ?? "-"}</td>

                    <td>₹{rule.min_order_amount}</td>

                    <td>{rule.source_type}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          rule.is_active ? "status-approved" : "status-rejected"
                        }`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="flex gap-2">
                      <button className="view-btn">Edit</button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(rule.reward_rule_id)}
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
      )}
    </div>
  );
};

export default RewardRule;
