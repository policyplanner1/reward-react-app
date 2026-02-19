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
    <div className="order-view-container">
      <div className="order-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Order #{data.order.order_ref}</h2>
      </div>

      {/* Order Info */}
      <div className="card">
        <div className="card-row">
          <div>
            <span className="label">Status</span>
            <p className={`status ${data.order.status.toLowerCase()}`}>
              {data.order.status}
            </p>
          </div>
          <div>
            <span className="label">Date</span>
            <p>{new Date(data.order.created_at).toLocaleDateString("en-IN")}</p>
          </div>
          <div>
            <span className="label">Total</span>
            <p className="price">{formatCurrency(data.order.total_amount)}</p>
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="card">
        <h3>Customer Details</h3>
        <div className="info-grid">
          <div>
            <span className="label">Name</span>
            <p>{data.customer.name}</p>
          </div>
          <div>
            <span className="label">Email</span>
            <p>{data.customer.email}</p>
          </div>
          <div>
            <span className="label">Phone</span>
            <p>{data.customer.phone}</p>
          </div>
        </div>
      </div>

      {/* Company */}
      {data.company && (
        <div className="card">
          <h3>Company</h3>
          <p>{data.company.company_name}</p>
        </div>
      )}

      {/* Address */}
      <div className="card">
        <h3>Shipping Address</h3>
        <p>{data.address.name}</p>
        <p>{data.address.phone}</p>
        <p>
          {data.address.line1}, {data.address.line2}
        </p>
        <p>
          {data.address.city}, {data.address.state}, {data.address.country} -{" "}
          {data.address.zipcode}
        </p>
        {data.address.landmark && (
          <p className="landmark">Landmark: {data.address.landmark}</p>
        )}
      </div>

      {/* Items */}
      <div className="card">
        <h3>Order Items</h3>
        <div className="table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Attributes</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.order_item_id}>
                  <td>{item.product_name}</td>
                  <td>{item.brand_name}</td>
                  <td>
                    {Object.entries(item.attributes).map(([key, value]) => (
                      <div key={key}>
                        {key}: {value}
                      </div>
                    ))}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td className="price">{formatCurrency(item.item_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="summary">
          <div>
            <span>Items Total:</span>
            <span>{formatCurrency(data.summary.item_total)}</span>
          </div>
          <div className="grand-total">
            <span>Order Total:</span>
            <span>{formatCurrency(data.summary.order_total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderView;
