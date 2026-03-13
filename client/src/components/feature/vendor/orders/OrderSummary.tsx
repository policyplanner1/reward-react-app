import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/OrderSummary.css";
import { FiShoppingCart } from "react-icons/fi";

interface Order {
  vendor_order_id: number;
  order_id: number;
  order_ref: string;
  vendor_total: number;
  shipping_status: string;
  created_at: string;
  item_count: number;
  awb_number?: string;
  courier_name?: string;
}

interface OrderListResponse {
  success: boolean;
  orders: Order[];
  total: number;
}

const OrderSummary: React.FC = () => {
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

      const res = await api.get<OrderListResponse>("/order/order-summary", {
        params: { page, limit },
      });

      if (!res.data.success) {
        throw new Error("Failed to load orders");
      }

      setOrders(res.data.orders);
      setTotalPages(Math.ceil(res.data.total / limit));
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

  return (
    <div className="order-page">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center shrink-0">
          <FiShoppingCart className="text-white text-xl mr-0.75" />
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Orders</h2>
          <p className="text-gray-500">
            Manage and monitor all customer orders
          </p>
        </div>
      </div>

      {loading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Total</th>
                  <th>Shipment Status</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.vendor_order_id}>
                      <td className="order-ref">
                        {order.order_ref}

                        {order.awb_number && (
                          <div className="awb-text">
                            AWB: {order.awb_number}
                          </div>
                        )}
                      </td>

                      <td className="amount">
                        {formatCurrency(order.vendor_total)}
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${order.shipping_status}`}
                        >
                          {order.shipping_status}
                        </span>
                      </td>

                      <td>
                        {new Date(order.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>

                      <td>{order.item_count}</td>

                      <td>
                        <button
                          className="view-btn"
                          onClick={() =>
                            navigate(
                              `/vendor/orders/details/${order.vendor_order_id}`,
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
          </div>

          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              ← Prev
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderSummary;
