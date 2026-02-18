import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";

interface Order {
  order_id: number;
  order_ref: string;
  user_id: number;
  company_id: number | null;
  total_amount: number;
  status: string;
  created_at: string;
  item_count: number;
  product_name: string | null;
  brand_name: string | null;
  image: string | null;
}

interface OrderListResponse {
  success: boolean;
  orders: Order[];
  total: number;
  totalPages: number;
  currentPage: number;
}

const OrderList: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const limit = 10;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get<OrderListResponse>("/order/order-list", {
        params: {
          page,
          limit,
        },
      });

      if (!res.data.success) {
        throw new Error("Failed to load orders");
      }

      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setError("Unable to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return { backgroundColor: "#facc15", color: "#000" };
      case "paid":
        return { backgroundColor: "#60a5fa", color: "#fff" };
      case "shipped":
        return { backgroundColor: "#818cf8", color: "#fff" };
      case "delivered":
        return { backgroundColor: "#34d399", color: "#fff" };
      case "cancelled":
        return { backgroundColor: "#f87171", color: "#fff" };
      default:
        return { backgroundColor: "#e5e7eb", color: "#000" };
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Order List</h2>

      {loading && <p>Loading orders...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <table
            border={1}
            cellPadding={10}
            cellSpacing={0}
            style={{ width: "100%", marginTop: "20px" }}
          >
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Product</th>
                <th>Brand</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Items</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} align="center">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.order_ref}</td>
                    <td>{order.product_name ?? "-"}</td>
                    <td>{order.brand_name ?? "-"}</td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 500,
                          ...getStatusStyle(order.status),
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td>{order.item_count}</td>
                    <td>
                      <button
                        onClick={() =>
                          navigate(
                            `/order/order-details/${order.order_id}`
                          )
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

          {/* Pagination */}
          <div style={{ marginTop: "20px" }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              Prev
            </button>

            <span style={{ margin: "0 10px" }}>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderList;
