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
          `/order/order-details/${orderId}`
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
      <div style={{ padding: "20px" }}>
        <button onClick={() => navigate(-1)}>← Back</button>

        <h2 style={{ marginTop: "10px" }}>
          Order #{data.order.order_ref}
        </h2>

        {/* Order Info */}
        <div style={{ marginTop: "20px" }}>
          <p><strong>Status:</strong> {data.order.status}</p>
          <p><strong>Date:</strong> {new Date(data.order.created_at).toLocaleDateString("en-IN")}</p>
          <p><strong>Total:</strong> {formatCurrency(data.order.total_amount)}</p>
        </div>

        {/* Customer Info */}
        <h3 style={{ marginTop: "30px" }}>Customer Details</h3>
        <p><strong>Name:</strong> {data.customer.name}</p>
        <p><strong>Email:</strong> {data.customer.email}</p>
        <p><strong>Phone:</strong> {data.customer.phone}</p>

        {/* Company Info (Optional) */}
        {data.company && (
          <>
            <h3 style={{ marginTop: "30px" }}>Company</h3>
            <p>{data.company.company_name}</p>
          </>
        )}

        {/* Address */}
        <h3 style={{ marginTop: "30px" }}>Shipping Address</h3>
        <p>{data.address.name}</p>
        <p>{data.address.phone}</p>
        <p>
          {data.address.line1}, {data.address.line2}
        </p>
        <p>
          {data.address.city}, {data.address.state},{" "}
          {data.address.country} - {data.address.zipcode}
        </p>
        {data.address.landmark && <p>Landmark: {data.address.landmark}</p>}

        {/* Items */}
        <h3 style={{ marginTop: "30px" }}>Order Items</h3>

        <table
          border={1}
          cellPadding={10}
          cellSpacing={0}
          style={{ width: "100%", marginTop: "10px" }}
        >
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
                <td>{formatCurrency(item.item_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <p><strong>Items Total:</strong> {formatCurrency(data.summary.item_total)}</p>
          <p><strong>Order Total:</strong> {formatCurrency(data.summary.order_total)}</p>
        </div>
      </div>
    );
  };

  export default OrderView;
