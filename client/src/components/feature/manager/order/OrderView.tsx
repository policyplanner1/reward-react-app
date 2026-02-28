import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/orderView.css";

interface Order {
  order_id: number;
  order_ref: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface Customer {
  user_id: number;
  name: string;
  email: string;
  phone: string;
}

interface Company {
  company_id: number;
  company_name: string;
}

interface Address {
  type: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  landmark: string;
}

interface OrderItem {
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  brand_name: string;
  image: string | null;
  attributes: Record<string, string>;
  quantity: number;
  price: number;
  item_total: number;
}

interface OrderSummary {
  item_total: number;
  order_total: number;
}

interface OrderDetailsResponse {
  success: boolean;
  order: Order;
  customer: Customer;
  company: Company | null;
  address: Address;
  items: OrderItem[];
  summary: OrderSummary;
}

const OrderView: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<OrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get<OrderDetailsResponse>(
        `/order/order-details/${orderId}`,
      );

      if (!res.data.success) {
        throw new Error("Failed to load order");
      }

      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch order details", err);
      setError("Unable to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  if (loading) return <div style={{ padding: 20 }}>Loading order...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  if (!data) return null;

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#f5f7ff] via-white to-[#f0f9ff] p-6 md:p-10">

    {/* HEADER */}
    <div className="flex items-center justify-between mb-8">
      <button
        className="inline-flex items-center gap-2 text-sm font-semibold
        bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white
        px-5 py-2.5 rounded-lg
        shadow-lg hover:scale-[1.03] active:scale-95 transition cursor-pointer"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
        Order #{data.order.order_ref}
      </h2>
    </div>

    {/* ORDER INFO */}
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-xl mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div>
          <span className="text-xs text-slate-500">Status</span>
          <p className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-semibold status-${data.order.status.toLowerCase()}`}>
            {data.order.status}
          </p>
        </div>

        <div>
          <span className="text-xs text-slate-500">Date</span>
          <p className="mt-1 font-medium text-slate-700">
            {new Date(data.order.created_at).toLocaleDateString("en-IN")}
          </p>
        </div>

        <div>
          <span className="text-xs text-slate-500">Total</span>
          <p className="mt-1 text-lg font-bold text-[#2563eb]">
            {formatCurrency(data.order.total_amount)}
          </p>
        </div>

      </div>
    </div>

    {/* CUSTOMER */}
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-xl mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Customer Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-xs text-slate-500">Name</span>
          <p className="mt-1 font-medium">{data.customer.name}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Email</span>
          <p className="mt-1 font-medium">{data.customer.email}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Phone</span>
          <p className="mt-1 font-medium">{data.customer.phone}</p>
        </div>
      </div>
    </div>

    {/* COMPANY */}
    {data.company && (
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-xl mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Company</h3>
        <p className="text-slate-700">{data.company.company_name}</p>
      </div>
    )}

    {/* ADDRESS */}
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-xl mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">Shipping Address</h3>

      <p className="font-medium">{data.address.name}</p>
      <p>{data.address.phone}</p>
      <p>{data.address.line1}, {data.address.line2}</p>
      <p>
        {data.address.city}, {data.address.state}, {data.address.country} - {data.address.zipcode}
      </p>

      {data.address.landmark && (
        <p className="text-sm text-slate-500 mt-2">
          Landmark: {data.address.landmark}
        </p>
      )}
    </div>

    {/* ITEMS */}
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-xl">

      <h3 className="text-lg font-semibold text-slate-800 mb-4">Order Items</h3>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">

          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Brand</th>
              <th className="p-3 text-left">Attributes</th>
              <th className="p-3 text-left">Qty</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Total</th>
            </tr>
          </thead>

          <tbody>
            {data.items.map((item) => (
              <tr key={item.order_item_id} className="border-t hover:bg-slate-50 transition">

                <td className="p-3 font-medium">{item.product_name}</td>

                <td className="p-3">{item.brand_name}</td>

                <td className="p-3 text-xs text-slate-600">
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <div key={key}>{key}: {value}</div>
                  ))}
                </td>

                <td className="p-3">{item.quantity}</td>

                <td className="p-3">{formatCurrency(item.price)}</td>

                <td className="p-3 font-semibold text-[#2563eb]">
                  {formatCurrency(item.item_total)}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 border-t pt-4 space-y-2 text-sm">

        <div className="flex justify-between">
          <span className="text-slate-600">Items Total:</span>
          <span className="font-medium">{formatCurrency(data.summary.item_total)}</span>
        </div>

        <div className="flex justify-between text-lg font-bold text-slate-800">
          <span>Order Total:</span>
          <span className="text-[#2563eb]">
            {formatCurrency(data.summary.order_total)}
          </span>
        </div>

      </div>
    </div>
  </div>
);
};

export default OrderView;
