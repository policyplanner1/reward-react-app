import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/orderList.css";
import { FiXCircle } from "react-icons/fi";

interface CancellationRequest {
  order_id: number;
  order_ref: string;
  customer_name: string;
  total_amount: number;
  reason_id: number;
  reason: string;
  comment: string | null;
  requested_at: string;
}

interface CancellationResponse {
  success: boolean;
  requests: CancellationRequest[];
}

const CancellationRequests: React.FC = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get<CancellationResponse>(
        "/order/cancellation-requests",
      );

      if (!res.data.success) {
        throw new Error("Failed to load requests");
      }

      setRequests(res.data.requests);
    } catch (err) {
      console.error("Failed to fetch cancellation requests", err);
      setError("Unable to load cancellation requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="order-page">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-[#FC3F78] to-[#852BAF] rounded-full flex items-center justify-center">
          <FiXCircle className="text-white text-xl" />
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Cancellation Requests</h2>
          <p className="text-gray-500">
            Review and manage customer cancellation requests
          </p>
        </div>
      </div>

      {loading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Reason</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    No cancellation requests
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.order_id}>
                    <td className="order-ref">{req.order_ref}</td>

                    <td>{req.customer_name}</td>

                    <td className="amount">
                      {formatCurrency(req.total_amount)}
                    </td>

                    <td>
                      # {req.reason_id} ({req.reason}) 
                    </td>

                    <td>{req.comment ?? "-"}</td>

                    <td>{formatDate(req.requested_at)}</td>

                    <td>
                      <button
                        className="view-btn"
                        onClick={() =>
                          navigate(`/manager/cancellation-detail/${req.order_id}`)
                        }
                      >
                        View
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

export default CancellationRequests;
