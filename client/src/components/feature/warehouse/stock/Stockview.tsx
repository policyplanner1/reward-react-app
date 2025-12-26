"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE_URL = "http://localhost:5000/api";

interface StockEntry {
  grn: string;
  productName: string;
  sku: string;
  vendorName: string;
  category: string;
  totalQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  stockInDate: string;
  expiryDate?: string;
}

const formatDateForInput = (date?: string) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export default function StockInViewPage() {
  const searchParams = useSearchParams();
  const grn = searchParams.get("grn");

  const [stockEntry, setStockEntry] = useState<StockEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!grn) return;

    const fetchStockIn = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE_URL}/warehouse/stock-in/${grn}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.message);

        setStockEntry({
          grn,
          productName: result.data.productName,
          sku: result.data.sku,
          vendorName: result.data.vendorName,
          category: result.data.category,
          totalQuantity: result.data.total_quantity,
          passedQuantity: result.data.passed_quantity,
          failedQuantity: result.data.failed_quantity,
          stockInDate: formatDateForInput(result.data.stock_in_date),
          expiryDate: formatDateForInput(result.data.expiry_date)
        });
      } catch (err) {
        console.error("Failed to load stock entry", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockIn();
  }, [grn]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!stockEntry) return <p className="p-6">Stock entry not found</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">View Stock-In</h1>

      <div className="p-6 bg-white shadow rounded-xl space-y-4">
        <h2 className="text-xl font-semibold">Stock-In Details</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Product" value={stockEntry.productName} />
          <Input label="SKU / Barcode" value={stockEntry.sku} />
          <Input label="Vendor" value={stockEntry.vendorName} />
          <Input label="Category" value={stockEntry.category} />
          <Input label="Total Quantity" value={stockEntry.totalQuantity} />
          <Input label="Passed Quantity" value={stockEntry.passedQuantity} />
          <Input label="Failed Quantity" value={stockEntry.failedQuantity} />
          <Input
            label="Stock-In Date"
            value={stockEntry.stockInDate}
            type="date"
          />
        </div>
      </div>
    </div>
  );
}

const Input = ({ label, value, type = "text" }: any) => (
  <div>
    <label className="font-medium">{label}</label>
    <input
      type={type}
      value={value}
      readOnly
      className="w-full p-3 border rounded-lg mt-1 bg-gray-100"
    />
  </div>
);
