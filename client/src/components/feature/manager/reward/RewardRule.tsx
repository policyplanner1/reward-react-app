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
  max_order_amount?: number | null;

  source_type: string;
  is_active: number;

  // NEW FIELDS
  description?: string;
  start_date?: string;
  end_date?: string;
  priority?: number;
  is_stackable?: number;
  expiry_days?: number;
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatus = (rule: any) => {
    const now = new Date();

    if (!rule.is_active) return { label: "Inactive", color: "red" };

    if (rule.start_date && new Date(rule.start_date) > now) {
      return { label: "Scheduled", color: "yellow" };
    }

    if (rule.end_date && new Date(rule.end_date) < now) {
      return { label: "Expired", color: "gray" };
    }

    return { label: "Active", color: "green" };
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow">
              <FiGift className="text-white text-xl" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800">Reward Rules</h2>
              <p className="text-gray-500 text-sm">
                Manage reward configurations
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/manager/reward-create`)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
          >
            <FiPlus />
            Create Rule
          </button>
        </div>

        {/* LOADER */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* ERROR */}
        {error && <div className="text-red-500 text-center py-6">{error}</div>}

        {/* TABLE */}
        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Max Reward</th>
                  <th className="px-4 py-3">Min Order</th>
                  <th className="px-4 py-3">Max Order</th>

                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Stackable</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Validity</th>

                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center p-6 text-gray-500">
                      No reward rules found
                    </td>
                  </tr>
                ) : (
                  rules.map((rule, index) => (
                    <tr
                      key={rule.reward_rule_id}
                      className={`border-t ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50`}
                    >
                      <td className="px-4 py-3 font-medium">{rule.name}</td>

                      <td className="px-4 py-3 capitalize">
                        {rule.reward_type}
                      </td>

                      <td className="px-4 py-3">
                        {rule.reward_type === "percentage"
                          ? `${rule.reward_value}%`
                          : `₹${rule.reward_value}`}
                      </td>

                      <td className="px-4 py-3">{rule.max_reward ?? "-"}</td>

                      <td className="px-4 py-3">₹{rule.min_order_amount}</td>

                      <td className="px-4 py-3">
                        {rule.max_order_amount
                          ? `₹${rule.max_order_amount}`
                          : "-"}
                      </td>

                      <td className="px-4 py-3">{rule.priority}</td>

                      <td className="px-4 py-3">
                        {rule.is_stackable ? "Yes" : "No"}
                      </td>

                      <td className="px-4 py-3">
                        {rule.expiry_days
                          ? `${rule.expiry_days} days`
                          : "No expiry"}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {!rule.start_date && !rule.end_date && (
                          <span className="text-gray-500">Always Active</span>
                        )}

                        {rule.start_date && !rule.end_date && (
                          <span className="text-blue-600">
                            Starts: {formatDate(rule.start_date)}
                          </span>
                        )}

                        {!rule.start_date && rule.end_date && (
                          <span className="text-orange-600">
                            Until: {formatDate(rule.end_date)}
                          </span>
                        )}

                        {rule.start_date && rule.end_date && (
                          <span className="text-purple-600">
                            {formatDate(rule.start_date)} →{" "}
                            {formatDate(rule.end_date)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">{rule.source_type}</td>

                      <td className="px-4 py-3">
                        {(() => {
                          const status = getStatus(rule);

                          return (
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                status.color === "green"
                                  ? "bg-green-100 text-green-600"
                                  : status.color === "yellow"
                                    ? "bg-yellow-100 text-yellow-600"
                                    : status.color === "gray"
                                      ? "bg-gray-200 text-gray-600"
                                      : "bg-red-100 text-red-600"
                              }`}
                            >
                              {status.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3 flex justify-center gap-2">
                        <button
                          onClick={() =>
                            navigate(
                              `/manager/reward-edit/${rule.reward_rule_id}`,
                            )
                          }
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(rule.reward_rule_id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-500 rounded hover:bg-red-200"
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
