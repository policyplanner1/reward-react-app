"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:5000/api";

/* ================= TYPES ================= */

interface Vendor {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  vendorId: number;
  category: string;
}

interface Variant {
  id: number;
  sku: string;
}

interface StockEntry {
  productId: number;
  vendorId: number;
  variantId: number;
  totalQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  stockInDate: string;
  expiryDate?: string;
}

/* ================= COMPONENT ================= */

export default function StockInCreatePage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [selectedVendor, setSelectedVendor] = useState<number | "">("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | "">("");

  const [totalQuantity, setTotalQuantity] = useState(0);
  const [passedQuantity, setPassedQuantity] = useState(0);
  const [failedQuantity, setFailedQuantity] = useState(0);

  const [stockInDate, setStockInDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  /* ================= FETCH VENDORS ================= */

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/vendor/approved-list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    setVendors(
      data.vendors.map((v: any) => ({
        id: v.vendor_id,
        name: v.full_name,
      }))
    );
  };

  /* ================= FETCH PRODUCTS BY VENDOR ================= */

  const handleVendorSelect = async (vendorId: number) => {
    setSelectedVendor(vendorId);
    setSelectedProduct(null);
    setVariants([]);
    setSelectedVariant("");

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/product/approved-list?vendorId=${vendorId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    setProducts(
      data.products.map((p: any) => ({
        id: p.product_id,
        name: p.product_name,
        vendorId: p.vendor_id,
        category: p.category_name,
      }))
    );
  };

  // validation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isStockInDateValid = (dateStr: string) => {
    if (!dateStr) return true; // handled separately
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  };

  const isExpiryDateValid = (dateStr: string) => {
    if (!dateStr) return true; // optional field
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d > today;
  };

  /* ================= FETCH PRODUCT DETAILS + VARIANTS ================= */

  const handleProductSelect = async (productId: number) => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/product/approved-products/${productId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    const p = data.products[0];

    setSelectedProduct({
      id: p.product_id,
      name: p.product_name,
      vendorId: p.vendor_id,
      category: p.category_name || p.custom_category,
    });

    setVariants(
      (p.variants || []).map((v: any) => ({
        id: v.variant_id,
        sku: v.sku,
      }))
    );
  };

  /* ================= AUTO FAILED QTY ================= */

  useEffect(() => {
    if (totalQuantity >= passedQuantity) {
      setFailedQuantity(totalQuantity - passedQuantity);
    }
  }, [totalQuantity, passedQuantity]);

  /* ================= SUBMIT ================= */

  const submitStockIn = async () => {
    if (stockInDate && !isStockInDateValid(stockInDate)) {
      alert("Stock-In Date cannot be in the future");
      return;
    }

    if (expiryDate && !isExpiryDateValid(expiryDate)) {
      alert("Expiry Date must be a future date");
      return;
    }

    if (!selectedVendor || !selectedProduct || !selectedVariant) {
      alert("Please select vendor, product and variant");
      return;
    }

    const stockEntry: StockEntry = {
      vendorId: selectedVendor,
      productId: selectedProduct.id,
      variantId: selectedVariant,
      totalQuantity,
      passedQuantity,
      failedQuantity,
      stockInDate: stockInDate || new Date().toISOString().split("T")[0],
      expiryDate: expiryDate || undefined,
    };

    const token = localStorage.getItem("token");

    await fetch(`${API_BASE_URL}/warehouse/stock-in`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stockEntry),
    });

    alert("Stock-In created successfully");
    router.push("/src/warehouse/stock/stockin");
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create New Stock In</h1>

      <div className="p-6 bg-white shadow rounded-xl space-y-4">
        <h2 className="text-xl font-semibold">Stock-In Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor */}
          <div>
            <label className="font-medium">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => handleVendorSelect(Number(e.target.value))}
              className="w-full p-3 border rounded-lg mt-1"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="font-medium">Product</label>
            <select
              value={selectedProduct?.id || ""}
              onChange={(e) => handleProductSelect(Number(e.target.value))}
              className="w-full p-3 border rounded-lg mt-1"
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Variant */}
          <div>
            <label className="font-medium">Product Variant</label>
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(Number(e.target.value))}
              className="w-full p-3 border rounded-lg mt-1"
            >
              <option value="">-- Select Variant --</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="font-medium">Category</label>
            <input
              value={selectedProduct?.category || ""}
              readOnly
              className="w-full p-3 border bg-gray-100 rounded-lg mt-1"
            />
          </div>

          {/* Quantities */}
          <div>
            <label className="font-medium">Total Quantity</label>
            <input
              type="number"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(+e.target.value)}
              className="w-full p-3 border rounded-lg mt-1"
            />
          </div>

          <div>
            <label className="font-medium">Passed Quantity</label>
            <input
              type="number"
              value={passedQuantity}
              onChange={(e) => setPassedQuantity(+e.target.value)}
              className="w-full p-3 border rounded-lg mt-1"
            />
          </div>

          <div>
            <label className="font-medium">Failed Quantity</label>
            <input
              type="number"
              value={failedQuantity}
              readOnly
              className="w-full p-3 border rounded-lg mt-1 bg-gray-100"
            />
          </div>

          {/* Date*/}
          <div>
            <label className="font-medium">Stock-In Date</label>
            <input
              type="date"
              value={stockInDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setStockInDate(e.target.value)}
              className="w-full p-3 border rounded-lg mt-1"
            />
          </div>

          <div>
            <label className="font-medium">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-3 border rounded-lg mt-1"
            />
          </div>
        </div>

        <button
          onClick={submitStockIn}
          className="px-6 py-3 mt-4 text-white bg-purple-600 rounded-lg"
        >
          Submit Stock-In
        </button>
      </div>
    </div>
  );
}
