import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface FlashSale {
  flash_id: number;
  title: string;
  banner_image: string;
  start_at: string;
  end_at: string;
  status: "Upcoming" | "Live" | "Expired";
}

const FlashSaleList: React.FC = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFlashSales = async () => {
    try {
      const res = await fetch("/admin/flash-sales");
      const data = await res.json();
      setSales(data);
    } catch (err) {
      console.error("Failed to fetch flash sales", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "#16a34a";
      case "Upcoming":
        return "#f59e0b";
      case "Expired":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  if (loading) return <div>Loading flash sales...</div>;

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Flash Sale Campaigns</h2>
        <button
          onClick={() => navigate("/manager/flash-create")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          + Create Flash Sale
        </button>
      </div>

      {/* Table */}
      <table
        width="100%"
        cellPadding={12}
        style={{ borderCollapse: "collapse", background: "#fff" }}
      >
        <thead style={{ background: "#f3f4f6" }}>
          <tr>
            <th>Banner</th>
            <th>Title</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                No flash sales found
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.flash_id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                {/* Banner */}
                <td>
                  <img
                    src={`/uploads/flash-banners/${sale.banner_image}`}
                    alt="banner"
                    width={90}
                    style={{ borderRadius: "6px" }}
                  />
                </td>

                {/* Title */}
                <td>{sale.title}</td>

                {/* Dates */}
                <td>{new Date(sale.start_at).toLocaleString()}</td>
                <td>{new Date(sale.end_at).toLocaleString()}</td>

                {/* Status */}
                <td>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "20px",
                      color: "#fff",
                      background: getStatusColor(sale.status),
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {sale.status}
                  </span>
                </td>

                {/* Actions */}
                <td>
                  <button
                    onClick={() =>
                      navigate(`/admin/flash-sales/${sale.flash_id}`)
                    }
                    style={{
                      marginRight: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      navigate(
                        `/admin/flash-sales/${sale.flash_id}/variants`
                      )
                    }
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Variants
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FlashSaleList;
