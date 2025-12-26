"use client";

import { useEffect, useState } from "react";
const API_BASE_URL = "http://localhost:5000/api";

// ============================
// Type Definitions
// ============================
interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  vendor_name: string;
  warehouse_name: string;
  location: string;
  quantity: number;
}

interface AdjustmentEntry {
  adjusted_date: string;
  product_name: string;
  sku: string;
  quantity: number;
  adjustment_type: "IN" | "OUT";
  reason: string;
  name: string;
  location: string;
}

// ============================

export default function StockAdjustmentPage() {
  // Form States
  const [date, setDate] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [selectedInventory, setSelectedInventory] =
    useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [adjustType, setAdjustType] = useState("");
  const [reason, setReason] = useState("");

  // Table
  const [tableData, setTableData] = useState<AdjustmentEntry[]>([]);

  // ============================
  // Fetch Inventory API
  // ============================
  const fetchInventory = async (search: string) => {
    if (!search.trim()) {
      setInventoryList([]);
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_BASE_URL}/warehouse/search?query=${search}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (data.success) {
        setInventoryList(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    }
  };

  // ============================
  // Fetch Existing Adjustments
  // ============================
  const fetchAdjustments = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE_URL}/warehouse/stock-adjustments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setTableData(
          data.data.map((adjustment: any) => ({
            ...adjustment,
            warehouse: adjustment.warehouse_name,
            location: adjustment.location,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch adjustments", err);
    }
  };

  // validation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isAdjustmentDateValid = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  };

  // ============================
  // Add Adjustment
  // ============================
  const addAdjustment = async () => {
    if (!date || !selectedInventory || !quantity || !adjustType || !reason) {
      alert("Please fill all fields");
      return;
    }

    if (!isAdjustmentDateValid(date)) {
      alert("Date cannot be in the future");
      return;
    }

    const adjustmentTypeMap: Record<string, "IN" | "OUT"> = {
      Damage: "OUT",
      "Lost Item": "OUT",
      Return: "IN",
    };

    const payload = {
      date,
      inventory_id: selectedInventory.inventory_id,
      quantity: Number(quantity),
      adjustment_type: adjustmentTypeMap[adjustType],
      reason,
    };

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE_URL}/warehouse/stock-adjustments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      // Update table UI
      setTableData((prev) => [
        ...prev,
        {
          adjusted_date: date,
          product_name: selectedInventory.product_name,
          sku: selectedInventory.sku,
          quantity: Number(quantity),
          adjustment_type: adjustmentTypeMap[adjustType],
          reason,
          name: selectedInventory.warehouse_name,
          location: selectedInventory.location,
        },
      ]);

      // Reset form
      setDate("");
      setProductSearch("");
      setInventoryList([]);
      setSelectedInventory(null);
      setQuantity("");
      setAdjustType("");
      setReason("");
      alert("Stock count updated");
    } catch (err) {
      console.error("Failed to add adjustment", err);
      alert("Failed to add adjustment. Please try again.");
    }
  };

  // Fetch existing adjustments when the component mounts
  useEffect(() => {
    fetchAdjustments();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Warehouse Stock Adjustment</h1>

      {/* FORM */}
      <div className="p-6 space-y-4 bg-white shadow rounded-xl">
        {/* Inventory Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product / SKU / Vendor
          </label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg"
            placeholder="Search product or SKU"
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              fetchInventory(e.target.value);
            }}
          />

          {inventoryList.length > 0 && (
            <div className="mt-1 max-h-56 overflow-y-auto border rounded-lg bg-white">
              {inventoryList.map((item) => (
                <div
                  key={item.inventory_id}
                  onClick={() => {
                    setSelectedInventory(item);
                    setProductSearch(`${item.product_name} (${item.sku})`);
                    setInventoryList([]);
                  }}
                  className="p-3 cursor-pointer hover:bg-gray-100"
                >
                  <div className="font-medium">
                    {item.product_name} ({item.sku})
                  </div>
                  <div className="text-sm text-gray-500">
                    Vendor: {item.vendor_name} | WH: {item.warehouse_name}
                  </div>
                  <div className="text-sm text-gray-400">
                    Quantity: {item.quantity} | {item.location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <input
            type="number"
            className="w-full p-3 border rounded-lg"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {/* Adjustment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Adjustment Type
          </label>
          <select
            className="w-full p-3 border rounded-lg"
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value)}
          >
            <option value="">Select Type</option>
            <option value="Damage">Damage</option>
            <option value="Return">Return</option>
            <option value="Lost Item">Lost Item</option>
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reason
          </label>
          <textarea
            className="w-full p-3 border rounded-lg"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            className="w-full p-3 border rounded-lg"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            onClick={addAdjustment}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg"
          >
            Add Adjustment
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="p-6 bg-white shadow rounded-xl">
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border">SKU</th>
              <th className="p-3 border">Product</th>
              <th className="p-3 border">Quantity</th>
              <th className="p-3 border">Type</th>
              <th className="p-3 border">Reason</th>
              <th className="p-3 border">Warehouse</th>
              <th className="p-3 border">Location</th>
              <th className="p-3 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i}>
                <td className="p-3 border font-semibold">{row.sku}</td>
                <td className="p-3 border">{row.product_name}</td>
                <td className="p-3 border">{row.quantity}</td>
                <td className="p-3 border">{row.adjustment_type}</td>
                <td className="p-3 border">{row.reason}</td>
                <td className="p-3 border">{row.name}</td>
                <td className="p-3 border">{row.location}</td>
                <td className="p-3 border">
                  {row.adjusted_date
                    ? new Date(row.adjusted_date).toLocaleDateString()
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
