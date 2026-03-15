import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/orderView.css";
import Swal from "sweetalert2";

interface Order {
  order_id: number;
  order_ref: string;
  status: string;
  cancellation_status: string;
  total_amount: string;
  reason: string;
  comment: string;
  requested_at: string;
}

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

interface Customer {
  user_id: number;
  name: string;
  email: string;
  phone: string;
}

interface CancellationData {
  order: Order;
  customer: Customer;
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

  const fetchDetails = async () => {
    setLoading(true);

    const res = await api.get<CancellationResponse>(
      `/order/cancellation-request/${orderId}`,
    );

    setData(res.data.data);
    setLoading(false);
  };

  useEffect(() => {
    if (orderId) fetchDetails();
  }, [orderId]);

  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number(amount));

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const approveCancellation = async () => {
    const result = await Swal.fire({
      title: "Approve Cancellation?",
      text: "This will cancel the order and process the refund.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      await api.post(`/order/approve-cancellation/${orderId}`);

      Swal.fire({
        icon: "success",
        title: "Cancellation Approved",
        text: "The order cancellation has been approved.",
        timer: 1800,
        showConfirmButton: false,
      });

      fetchDetails();
    }
  };

  const rejectCancellation = async () => {
    const result = await Swal.fire({
      title: "Reject Cancellation?",
      text: "The order will continue as normal.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Reject",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      await api.post(`/order/reject-cancellation/${orderId}`);

      Swal.fire({
        icon: "success",
        title: "Cancellation Rejected",
        text: "The cancellation request has been rejected.",
        timer: 1800,
        showConfirmButton: false,
      });

      fetchDetails();
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7ff] via-white to-[#f0f9ff] p-6 md:p-10">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white px-6 py-2.5 rounded-lg shadow cursor-pointer"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-slate-800">
          Cancellation Request
        </h2>
      </div>

      {/* ORDER SUMMARY */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6 grid md:grid-cols-4 gap-6">
        <div>
          <span className="text-xs text-gray-500">Order Ref</span>
          <p className="font-semibold">{data.order.order_ref}</p>
        </div>

        <div>
          <span className="text-xs text-gray-500">Order Status</span>
          <p className="font-semibold capitalize">{data.order.status}</p>
        </div>

        <div>
          <span className="text-xs text-gray-500">Cancellation Status</span>
          <p className="font-semibold text-orange-600 capitalize">
            {data.order.cancellation_status}
          </p>
        </div>

        <div>
          <span className="text-xs text-gray-500">Order Total</span>
          <p className="font-bold text-[#2563eb]">
            {formatCurrency(data.order.total_amount)}
          </p>
        </div>
      </div>

      {/* CANCELLATION REASON */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">Cancellation Reason</h3>

        <p className="font-medium">{data.order.reason}</p>

        {data.order.comment && (
          <p className="text-gray-600 mt-2">Comment: {data.order.comment}</p>
        )}

        <p className="text-sm text-gray-400 mt-2">
          Requested on {formatDate(data.order.requested_at)}
        </p>
      </div>

      {/* CUSTOMER */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Customer Details</h3>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-gray-500">Name</span>
            <p>{data.customer.name}</p>
          </div>

          <div>
            <span className="text-xs text-gray-500">Email</span>
            <p>{data.customer.email}</p>
          </div>

          <div>
            <span className="text-xs text-gray-500">Phone</span>
            <p>{data.customer.phone}</p>
          </div>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">Shipping Address</h3>

        <p>
          {data.address.line1}, {data.address.line2}
        </p>
        <p>
          {data.address.city}, {data.address.state}, {data.address.country}
        </p>
        <p>{data.address.zipcode}</p>

        {data.address.landmark && (
          <p className="text-sm text-gray-500">
            Landmark: {data.address.landmark}
          </p>
        )}
      </div>

      {/* TIMELINE */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Cancellation Timeline</h3>

        {data.timeline.map((event, i) => (
          <div key={i} className="flex justify-between border-b py-2">
            <span className="capitalize">{event.label}</span>
            <span className="text-gray-500">{formatDate(event.date)}</span>
          </div>
        ))}
      </div>

      {/* REFUND */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Refund Details</h3>

        {data.refunds.length === 0 ? (
          <p className="text-gray-500">No refunds yet</p>
        ) : (
          data.refunds.map((refund, i) => (
            <div key={i} className="flex justify-between mb-2">
              <span>{refund.method}</span>
              <span>{formatCurrency(refund.amount)}</span>
              <span className="capitalize">{refund.status}</span>
            </div>
          ))
        )}

        <div className="flex justify-between mt-4 border-t pt-3 font-semibold">
          <span>Total Refund</span>
          <span className="text-[#2563eb]">
            {formatCurrency(data.totalRefund)}
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      {data.order.cancellation_status === "requested" && (
        <div className="flex gap-4">
          <button
            onClick={approveCancellation}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg cursor-pointer"
          >
            Approve Cancellation
          </button>

          <button
            onClick={rejectCancellation}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg cursor-pointer"
          >
            Reject Cancellation
          </button>
        </div>
      )}
    </div>
  );
};

export default CancellationDetail;
