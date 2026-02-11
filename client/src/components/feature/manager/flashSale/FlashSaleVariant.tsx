import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./css/flashsalevariant.css";

interface Variant {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sale_price: number;
  flash_price: number;
}

const FlashSaleVariant: React.FC = () => {
  const { flashId } = useParams();
  const [showModal, setShowModal] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    fetchVariants();
  }, []);

  const fetchVariants = async () => {
    const res = await fetch(`/flash-sales/${flashId}/variants`);
    const data = await res.json();
    setVariants(data);
  };

  const updateFlashPrice = (id: number, price: number) => {
    setVariants((prev) =>
      prev.map((v) => (v.variant_id === id ? { ...v, flash_price: price } : v)),
    );
  };

  return (
    <div className="fs-page">
      <div className="fs-card wide">
        {/* Header */}
        <div className="fs-header">
          <div>
            <h2>Flash Sale Variant Pricing</h2>
            <p>Set special flash prices for selected variants</p>
          </div>

          <button className="fs-primary-btn" onClick={() => setShowModal(true)}>
            + Add Variant
          </button>
        </div>

        {/* Table */}
        <div className="fs-table-wrapper">
          <table className="fs-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Sale Price</th>
                <th>Flash Price</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {variants.length === 0 && (
                <tr>
                  <td colSpan={5} className="fs-empty">
                    No variants added to this flash sale yet.
                  </td>
                </tr>
              )}

              {variants.map((v) => (
                <tr key={v.variant_id}>
                  <td className="fs-product">{v.product_name}</td>

                  <td className="fs-variant">{v.variant_name}</td>

                  <td className="fs-sale-price">₹{v.sale_price}</td>

                  <td>
                    <div className="fs-price-input">
                      ₹
                      <input
                        type="number"
                        value={v.flash_price}
                        onChange={(e) =>
                          updateFlashPrice(v.variant_id, Number(e.target.value))
                        }
                      />
                    </div>
                  </td>

                  <td>
                    <button className="fs-remove-btn">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* modal */}
        {showModal && (
          <div className="fs-modal-overlay">
            <div className="fs-modal">
              <div className="fs-modal-header">
                <h3>Select Variants for Flash Sale</h3>
                <button onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div className="fs-modal-body">
                <p>Variant list will come here...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSaleVariant;
