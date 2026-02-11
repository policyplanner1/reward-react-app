import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Variant {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sale_price: number;
  flash_price: number;
}

const FlashSaleVariant: React.FC = () => {
  const { flashId } = useParams();
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
      prev.map((v) =>
        v.variant_id === id ? { ...v, flash_price: price } : v
      )
    );
  };

  return (
    <div className="fs-page">
      <div className="fs-card wide">
        <h2>Manage Flash Sale Variants</h2>

        <button className="fs-primary-btn">+ Add Variant</button>

        <table className="fs-table" style={{ marginTop: 20 }}>
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
            {variants.map((v) => (
              <tr key={v.variant_id}>
                <td>{v.product_name}</td>
                <td>{v.variant_name}</td>
                <td>₹{v.sale_price}</td>
                <td>
                  <input
                    type="number"
                    value={v.flash_price}
                    onChange={(e) =>
                      updateFlashPrice(v.variant_id, Number(e.target.value))
                    }
                    style={{ width: 100 }}
                  />
                </td>
                <td>
                  <button className="fs-action-btn">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FlashSaleVariant;
