import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./css/flashsalevariant.css";
import { api } from "../../../../api/api";

interface Variant {
  variant_id: number;
  product_name: string;
  sku: string;
  sale_price: number;
  flash_price: number;
  max_qty: number | null;
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
      const res = await api.get(
        `/flash/flash-sale/${flashId}/available-variants`,
      );
      console.log(res.data.data);
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

  const updateFlashVariant = async (
    id: number,
    price: number | null,
    maxQty: number | null,
    salePrice: number,
  ) => {
    // Validate price ONLY if price is being changed
    if (price !== null) {
      if (price >= salePrice) {
        alert("Flash price must be lower than sale price.");
        return;
      }
    }

    // Validate max quantity ONLY if maxQty is being changed
    if (maxQty !== null) {
      if (maxQty <= 0) {
        alert("Max quantity must be greater than 0.");
        return;
      }
    }

    try {
      await api.put(`/flash/flash-sale/${flashId}/variants/${id}`, {
        offer_price: price,
        max_qty: maxQty,
      });

      setVariants((prev) =>
        prev.map((v) =>
          v.variant_id === id
            ? {
                ...v,
                flash_price: price ?? v.flash_price,
                max_qty: maxQty ?? v.max_qty,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to update flash variant", err);
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
                <th>SKU</th>
                <th>Sale Price</th>
                <th>Flash Price</th>
                <th>Maximum Quantity</th>
                <th>Action</th>
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

                  <td className="fs-variant">{v.sku}</td>

                  <td className="fs-sale-price">₹{v.sale_price}</td>

                  <td>
                    <div className="fs-price-input">
                      ₹
                      <input
                        type="number"
                        value={v.flash_price}
                        onChange={(e) =>
                          updateFlashVariant(
                            v.variant_id,
                            Number(e.target.value),
                            null,
                            Number(v.sale_price),
                          )
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="Max Qty"
                      value={v.max_qty || ""}
                      onChange={(e) =>
                        updateFlashVariant(
                          v.variant_id,
                          null, 
                          e.target.value ? Number(e.target.value) : null,
                          Number(v.sale_price),
                        )
                      }
                    />
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
                              {variant.sku} – ₹{variant.sale_price}
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
