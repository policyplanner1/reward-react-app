import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./css/flashsalevariant.css";
import { api } from "../../../../api/api";

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
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  useEffect(() => {
    if (showModal) {
      fetchAvailableVariants();
    }
  }, [showModal]);

  const fetchAvailableVariants = async () => {
    try {
      setLoadingAvailable(true);
      const res = await api.get(`/flash/flash-sale/${flashId}/available-variants`);
      setAvailableVariants(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch available variants", err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, []);

  const fetchVariants = async () => {
    const res = await api.get(`/flash/flash-sale/${flashId}/variants`);
    setVariants(res.data.data || []);
  };

  const updateFlashPrice = async (id: number, price: number) => {
    try {
      await api.put(`/flash/flash-sale/${flashId}/variants/${id}`, {
        offer_price: price,
      });

      setVariants((prev) =>
        prev.map((v) =>
          v.variant_id === id ? { ...v, flash_price: price } : v,
        ),
      );
    } catch (err) {
      console.error("Failed to update flash price", err);
    }
  };

  const groupedVariants = availableVariants.reduce((acc: any, item: any) => {
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        product_name: item.product_name,
        variants: [],
      };
    }

    acc[item.product_id].variants.push(item);
    return acc;
  }, {});

  const toggleVariant = (id: number) => {
    setSelectedVariants((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  // Handle Add variants to flash sale
  const handleAddVariants = async () => {
    if (!selectedVariants.length) return;

    try {
      await api.post(`/flash/flash-sale/${flashId}/variants`, {
        variant_ids: selectedVariants,
      });

      setShowModal(false);
      setSelectedVariants([]);
      fetchVariants();
    } catch (err) {
      console.error("Failed to add variants", err);
    }
  };

  // Handle remove variant
  const handleRemoveVariant = async (variantId: number) => {
    try {
      await api.delete(`/flash/flash-sale/${flashId}/variants/${variantId}`);

      setVariants((prev) => prev.filter((v) => v.variant_id !== variantId));
    } catch (err) {
      console.error("Failed to remove variant", err);
    }
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
                    <button
                      className="fs-remove-btn"
                      onClick={() => handleRemoveVariant(v.variant_id)}
                    >
                      Remove
                    </button>
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
                {loadingAvailable ? (
                  <p>Loading variants...</p>
                ) : Object.keys(groupedVariants).length === 0 ? (
                  <p>No more variants available to add.</p>
                ) : (
                  Object.entries(groupedVariants).map(
                    ([productId, product]: any) => (
                      <div key={productId} className="fs-product-group">
                        <h4 className="fs-product-title">
                          {product.product_name}
                        </h4>

                        {product.variants.map((variant: any) => (
                          <label
                            key={variant.variant_id}
                            className="fs-variant-row"
                          >
                            <input
                              type="checkbox"
                              checked={selectedVariants.includes(
                                variant.variant_id,
                              )}
                              onChange={() => toggleVariant(variant.variant_id)}
                            />
                            <span>
                              {variant.variant_name} – ₹{variant.sale_price}
                            </span>
                          </label>
                        ))}
                      </div>
                    ),
                  )
                )}
              </div>

              {/* MOVE FOOTER HERE */}
              <div className="fs-modal-footer">
                <button
                  className="fs-action-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  className="fs-primary-btn"
                  onClick={handleAddVariants}
                  disabled={!selectedVariants.length}
                >
                  Add Selected ({selectedVariants.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSaleVariant;
