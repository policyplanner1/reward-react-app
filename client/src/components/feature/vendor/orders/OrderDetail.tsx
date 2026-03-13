import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/OrderDetail.css";

interface Order {
  vendor_order_id: number;
  vendor_total: number;
  shipping_status: string;
  created_at: string;
  order_id: number;
  order_ref: string;
  awb_number?: string;
  courier_name?: string;
}

interface Customer {
  user_id: number;
  name: string;
  email: string;
  phone: string;
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
  landmark?: string;
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

interface Summary {
  item_total: number;
  vendor_total: number;
}

interface VendorOrderDetailsResponse {
  success: boolean;
  order: Order;
  customer: Customer;
  address: Address;
  items: OrderItem[];
  summary: Summary;
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<VendorOrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get<VendorOrderDetailsResponse>(
        `/order/order-view/${orderId}`
      );

      if (!res.data.success) {
        throw new Error("Failed to load order");
      }

      setData(res.data);

    } catch (err) {
      console.error("Failed to fetch vendor order details", err);
      setError("Unable to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrderDetails();
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

  if (loading) return <div style={{ padding: 20 }}>Loading order...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  if (!data) return null;

  const { order, customer, address, items, summary } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7ff] via-white to-[#f0f9ff] p-6 md:p-10">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <button
          className="inline-flex items-center gap-2 text-sm font-semibold
          bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white
          px-5 py-2.5 rounded-lg shadow-lg"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
          Order #{order.order_ref}
        </h2>
      </div>

      {/* ORDER INFO */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div>
            <span className="text-xs text-slate-500">Shipment Status</span>
            <p className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-semibold status-${order.shipping_status}`}>
              {order.shipping_status}
            </p>
          </div>

          <div>
            <span className="text-xs text-slate-500">Date</span>
            <p className="mt-1 font-medium">
              {formatDate(order.created_at)}
            </p>
          </div>

          <div>
            <span className="text-xs text-slate-500">Vendor Total</span>
            <p className="mt-1 text-lg font-bold text-[#2563eb]">
              {formatCurrency(order.vendor_total)}
            </p>
          </div>

        </div>

        {order.awb_number && (
          <div className="mt-4 text-sm text-slate-600">
            Courier: {order.courier_name} | AWB: {order.awb_number}
          </div>
        )}
      </div>

      {/* CUSTOMER */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Customer Details</h3>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-slate-500">Name</span>
            <p className="font-medium">{customer.name}</p>
          </div>

          <div>
            <span className="text-xs text-slate-500">Email</span>
            <p>{customer.email}</p>
          </div>

          <div>
            <span className="text-xs text-slate-500">Phone</span>
            <p>{customer.phone}</p>
          </div>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Shipping Address</h3>

        <p className="font-medium">{address.name}</p>
        <p>{address.phone}</p>
        <p>{address.line1}, {address.line2}</p>

        <p>
          {address.city}, {address.state}, {address.country} - {address.zipcode}
        </p>

        {address.landmark && (
          <p className="text-sm text-slate-500 mt-2">
            Landmark: {address.landmark}
          </p>
        )}
      </div>

      {/* ITEMS */}
      <div className="bg-white rounded-2xl p-6 shadow">

        <h3 className="text-lg font-semibold mb-4">Order Items</h3>

        <div className="overflow-x-auto border rounded-xl">
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
              {items.map((item) => (
                <tr key={item.order_item_id} className="border-t">

                  <td className="p-3 font-medium">{item.product_name}</td>

                  <td className="p-3">{item.brand_name}</td>

                  <td className="p-3 text-xs text-slate-600">
                    {Object.entries(item.attributes).map(([k, v]) => (
                      <div key={k}>{k}: {v}</div>
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
            <span>Items Total:</span>
            <span>{formatCurrency(summary.item_total)}</span>
          </div>

          <div className="flex justify-between text-lg font-bold">
            <span>Vendor Total:</span>
            <span className="text-[#2563eb]">
              {formatCurrency(summary.vendor_total)}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};

export default OrderDetail;