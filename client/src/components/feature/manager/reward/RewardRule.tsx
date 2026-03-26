import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow">
              <FiGift className="text-white text-xl" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800">Reward Rules</h2>
              <p className="text-gray-500 text-sm">
                Manage reward configurations easily
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/manager/reward-create`)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition cursor-pointer"
          >
            <FiPlus />
            Create Rule
          </button>
        </div>

        {/* Loader */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error */}
        {error && <div className="text-red-500 text-center py-6">{error}</div>}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Max</th>
                  <th className="px-4 py-3 text-right">Min Order</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center py-12 text-gray-400">
                        <FiGift className="text-4xl mb-2" />
                        <p>No reward rules found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rules.map((rule, index) => (
                    <tr
                      key={rule.reward_rule_id}
                      className={`border-t hover:bg-gray-50 transition ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {rule.name}
                      </td>

                      <td className="px-4 py-3 capitalize">
                        {rule.reward_type}
                      </td>

                      <td className="px-4 py-3 text-right font-medium">
                        {rule.reward_type === "percentage"
                          ? `${rule.reward_value}%`
                          : `₹${rule.reward_value}`}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {rule.max_reward ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        ₹{rule.min_order_amount}
                      </td>

                      <td className="px-4 py-3">{rule.source_type}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            rule.is_active
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-500"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3 flex justify-center gap-2">
                        <button
                          onClick={() =>
                            navigate(
                              `/manager/reward-edit/${rule.reward_rule_id}`,
                            )
                          }
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(rule.reward_rule_id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-500 rounded-md hover:bg-red-200 transition cursor-pointer"
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
    </div>
  );
};

export default RewardRule;
