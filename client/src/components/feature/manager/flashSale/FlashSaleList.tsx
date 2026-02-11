import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css//flashsalelist.css";

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
  const [loading, setLoading] = useState(true);

  const fetchFlashSales = async () => {
    try {
      const res = await fetch("/flash/flash-sales");
      const data = await res.json();
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Live":
        return "fs-badge live";
      case "Upcoming":
        return "fs-badge upcoming";
      case "Expired":
        return "fs-badge expired";
      default:
        return "fs-badge";
    }
  };

  return (
    <div className="fs-page">
      <div className="fs-card wide">
        {/* Header */}
        <div className="fs-header">
          <h2>Flash Sale Campaign</h2>
          <button
            className="fs-primary-btn"
            onClick={() => navigate("/manager/flash-create")}
          >
            + Create Flash Sale
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="fs-loading">Loading flash sales...</div>
        ) : (
          <table className="fs-table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Title</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="fs-empty">
                    No flash sales found
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.flash_id}>
                    <td>
                      <img
                        src={`/uploads/flash-banners/${sale.banner_image}`}
                        alt="banner"
                        className="fs-thumb"
                      />
                    </td>

                    <td className="fs-title-cell">{sale.title}</td>

                    <td>{new Date(sale.start_at).toLocaleString()}</td>
                    <td>{new Date(sale.end_at).toLocaleString()}</td>

                    <td>
                      <span className={getStatusClass(sale.status)}>
                        {sale.status}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button
                        className="fs-action-btn"
                        onClick={() =>
                          navigate(`/admin/flash-sales/${sale.flash_id}`)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="fs-action-btn primary"
                        onClick={() =>
                          navigate(
                            `/admin/flash-sales/${sale.flash_id}/variants`,
                          )
                        }
                      >
                        Variants
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FlashSaleList;
