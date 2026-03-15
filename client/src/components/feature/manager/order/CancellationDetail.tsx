import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/orderView.css";

interface Timeline {
  label: string;
  date: string;
}

interface Refund {
  amount: number;
  method: string;
  status: string;
}

interface Address {
  type: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  landmark: string;
}

interface CancellationData {
  orderId: number;
  status: string;

  customer: {
    name: string;
  };

  address: Address;

  timeline: Timeline[];

  refunds: Refund[];

  totalRefund: number;
}

interface CancellationResponse {
  success: boolean;
  data: CancellationData;
}

const CancellationDetail: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<CancellationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get<CancellationResponse>(
        `/order/cancellation-request/${orderId}`
      );

      if (!res.data.success) {
        throw new Error("Failed to load cancellation details");
      }

      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch cancellation details", err);
      setError("Unable to load cancellation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchDetails();
  }, [orderId]);

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

  const approveCancellation = async () => {
    await api.post(`/order/approve-cancellation/${orderId}`);
    fetchDetails();
  };

  const rejectCancellation = async () => {
    await api.post(`/order/reject-cancellation/${orderId}`);
    fetchDetails();
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7ff] via-white to-[#f0f9ff] p-6 md:p-10">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <button
          className="bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white px-5 py-2.5 rounded-lg"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold">
          Cancellation Details (Order #{data.orderId})
        </h2>
      </div>

      {/* ORDER STATUS */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <span className="text-sm text-gray-500">Order Status</span>
        <p className="font-semibold mt-1">{data.status}</p>
      </div>

      {/* CUSTOMER */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Customer</h3>
        <p>{data.customer.name}</p>
      </div>

      {/* ADDRESS */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Address</h3>

        <p>{data.address.line1}, {data.address.line2}</p>
        <p>
          {data.address.city}, {data.address.state}, {data.address.country}
        </p>
        <p>{data.address.zipcode}</p>
      </div>

      {/* TIMELINE */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Cancellation Timeline</h3>

        {data.timeline.map((event, index) => (
          <div key={index} className="mb-2">
            <span className="font-medium">{event.label}</span>
            <span className="text-gray-500 ml-2">
              {formatDate(event.date)}
            </span>
          </div>
        ))}
      </div>

      {/* REFUND */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Refunds</h3>

        {data.refunds.length === 0 ? (
          <p>No refunds yet</p>
        ) : (
          data.refunds.map((refund, index) => (
            <div key={index} className="flex justify-between mb-2">
              <span>{refund.method}</span>
              <span>{formatCurrency(refund.amount)}</span>
              <span>{refund.status}</span>
            </div>
          ))
        )}

        <div className="mt-4 font-bold">
          Total Refund: {formatCurrency(data.totalRefund)}
        </div>
      </div>

      {/* ACTIONS */}
      {data.status !== "cancelled" && (
        <div className="flex gap-4">
          <button
            onClick={approveCancellation}
            className="bg-green-600 text-white px-6 py-2 rounded-lg cursor-pointer"
          >
            Approve Cancellation
          </button>

          <button
            onClick={rejectCancellation}
            className="bg-red-600 text-white px-6 py-2 rounded-lg cursor-pointer"
          >
            Reject
          </button>
        </div>
      )}

    </div>
  );
};

export default CancellationDetail;