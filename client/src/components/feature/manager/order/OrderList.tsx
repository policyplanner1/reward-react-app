import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/orderList.css";
import { FiBox } from "react-icons/fi";

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
  shipping_status?: string;
  awb_number?: string;
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
        params: { page, limit },
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

  const handleCreateShipment = async (orderId: number) => {
    try {
      setLoading(true);

      const res = await api.post(`/order/create-shipment/${orderId}`);

      if (!res.data.success) {
        throw new Error("Shipment creation failed");
      }

      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  return (
    <div className="order-page">
      <div className=" flex items-center gap-4 mb-8">
  <div className="w-12 h-12 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-full flex items-center justify-center shrink-0">
    <FiBox className="text-white text-xl" />
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
                      <td className="order-ref">
                        {order.order_ref}
                        {order.awb_number && (
                          <div className="awb-text">
                            AWB: {order.awb_number}
                          </div>
                        )}
                      </td>

                      <td>{order.product_name ?? "-"}</td>

                      <td>{order.brand_name ?? "-"}</td>

                      <td className="amount">
                        {formatCurrency(order.total_amount)}
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${order.status.toLowerCase()}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        {new Date(order.created_at).toLocaleDateString("en-IN")}
                      </td>

                      <td>{order.item_count}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="view-btn"
                            onClick={() =>
                              navigate(`/manager/order-view/${order.order_id}`)
                            }
                          >
                            View
                          </button>

                          {order.status === "paid" && !order.awb_number && (
                            <button
                              className="ship-btn"
                              onClick={() =>
                                handleCreateShipment(order.order_id)
                              }
                            >
                              Create Shipment
                            </button>
                          )}
                        </div>
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

export default OrderList;
