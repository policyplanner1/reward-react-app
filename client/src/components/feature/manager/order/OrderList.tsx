import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/orderList.css";
import { FiShoppingCart } from "react-icons/fi";

interface Order {
  order_id: number;
  order_ref: string;
  total_amount: number;
  status: string;
  created_at: string;
  item_count: number;
  product_name: string | null;
  brand_name: string | null;
  awb_number?: string;
}

interface OrderListResponse {
  success: boolean;
  orders: Order[];
  totalPages: number;
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
        params: { page, limit },
      });

      if (!res.data.success) throw new Error();

      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
    } catch {
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
      <div className="order-container">
        {/* Header */}
        <div className="order-header">
          <div className="header-left">
            <div className="icon-box">
              <FiShoppingCart />
            </div>

            <div>
              <h2>Order List</h2>
              <p>Manage and monitor all customer orders</p>
            </div>
          </div>
        </div>

        {/* States */}
        {loading && <div className="loader"></div>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            {/* Table */}
            <div className="table-wrapper">
              <table className="order-table">
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
                      <td colSpan={8} className="no-data">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.order_id}>
                        <td data-label="Order Ref" className="order-ref">
                          {order.order_ref}
                          {order.awb_number && (
                            <div className="awb-text">
                              AWB: {order.awb_number}
                            </div>
                          )}
                        </td>

                        <td data-label="Product">
                          {order.product_name ?? "-"}
                        </td>

                        <td data-label="Brand">{order.brand_name ?? "-"}</td>

                        <td data-label="Total" className="amount">
                          {formatCurrency(order.total_amount)}
                        </td>

                        <td data-label="Status">
                          <span
                            className={`status-badge status-${order.status.toLowerCase()}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td data-label="Date">
                          {new Date(order.created_at).toLocaleDateString(
                            "en-IN",
                          )}
                        </td>

                        <td data-label="Items">{order.item_count}</td>

                        <td data-label="Action">
                          <button
                            className="view-btn"
                            onClick={() =>
                              navigate(`/manager/order-view/${order.order_id}`)
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

            {/* Pagination */}
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderList;
