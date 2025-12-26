"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:5000/api";

interface StockEntry {
  grn: string;
  sku: string;
  vendorName: string;
  productName: string;
  category: string;
  total_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  stock_in_date: string;
  expiry_date?: string;
}

const formatDate = (date?: string) =>
  date ? new Date(date).toISOString().split("T")[0] : "";

export default function StockInEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const grn = searchParams.get("grn");

  const [stock, setStock] = useState<StockEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const [totalQuantity, setTotalQuantity] = useState(0);
  const [passedQuantity, setPassedQuantity] = useState(0);
  const [failedQuantity, setFailedQuantity] = useState(0);
  const [stockInDate, setStockInDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // 🔹 Fetch stock by GRN
  useEffect(() => {
    if (!grn) return;

    const fetchStock = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE_URL}/warehouse/stock-in/${grn}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        const data = result.data;

        setStock(data);
        setTotalQuantity(Number(data.total_quantity));
        setPassedQuantity(Number(data.passed_quantity));
        setFailedQuantity(Number(data.failed_quantity));
        setStockInDate(formatDate(data.stock_in_date));
        setExpiryDate(formatDate(data.expiry_date));
      } catch (err) {
        console.error("Fetch stock failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [grn]);

  // 🔹 Update stock
  const handleSubmit = async () => {
    if (!stock) return;

    // Ensure numbers
    const total = Number(totalQuantity);
    const passed = Number(passedQuantity);
    const failed = Number(failedQuantity);

    if (passed + failed !== total) {
      alert("Total quantity must equal passed + failed quantity");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/warehouse/stock-in/${stock.grn}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          total_quantity: total,
          passed_quantity: passed,
          failed_quantity: failed,
          stock_in_date: stockInDate,
          expiry_date: expiryDate || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      alert("Stock-In updated successfully");
      router.push("/src/warehouse/stock/stockin");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update stock-in");
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!stock) return <p className="p-6">Stock entry not found</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Edit Stock-In</h1>

      <div className="p-6 bg-white shadow rounded-xl space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReadOnly label="SKU" value={stock.sku} />
          <ReadOnly label="GRN No" value={stock.grn} />
          <ReadOnly label="Product" value={stock.productName} />
          <ReadOnly label="Vendor" value={stock.vendorName} />
          <ReadOnly label="Category" value={stock.category} />

          <Editable label="Total Quantity" value={totalQuantity} set={setTotalQuantity} type="number" />
          <Editable label="Passed Quantity" value={passedQuantity} set={setPassedQuantity} type="number" />
          <Editable label="Failed Quantity" value={failedQuantity} set={setFailedQuantity} type="number" />

          <Editable label="Stock-In Date" value={stockInDate} set={setStockInDate} type="date" />
          <Editable label="Expiry Date" value={expiryDate} set={setExpiryDate} type="date" />
        </div>

        <button
          onClick={handleSubmit}
          className="px-6 py-3 mt-4 text-white bg-purple-600 rounded-lg"
        >
          Update Stock-In
        </button>
      </div>
    </div>
  );
}

/* 🔹 Small reusable components */

const ReadOnly = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="font-medium">{label}</label>
    <input
      value={value}
      readOnly
      className="w-full p-3 border rounded-lg mt-1 bg-gray-100"
    />
  </div>
);

const Editable = ({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value: string | number;
  set: (val: any) => void;
  type?: string;
}) => (
  <div>
    <label className="font-medium">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) =>
        set(type === "number" ? Number(e.target.value) : e.target.value)
      }
      className="w-full p-3 border rounded-lg mt-1"
    />
  </div>
);
