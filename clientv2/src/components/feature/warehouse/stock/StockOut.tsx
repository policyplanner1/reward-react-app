'use client';

import { useState } from "react";

export default function StockOutTable() {

  // 🔹 Dummy Data (API ready structure)
  const STOCK_OUT_DATA = [
    {
      dispatchDate: "2025-01-12",
      orderId: "ORD-10021",
      product: "Blue Widget",
      sku: "BW-455",
      quantity: 12,
      warehouse: "Mumbai WH-1",
      location: "Rack A / Bin 3",
      deliveryPartner: "Delhivery",
      trackingId: "DLV123456",
      status: "In Transit"
    },
    {
      dispatchDate: "2025-01-12",
      orderId: "ORD-10022",
      product: "Red Gadget",
      sku: "RG-228",
      quantity: 8,
      warehouse: "Pune WH-2",
      location: "Rack B / Bin 1",
      deliveryPartner: "Bluedart",
      trackingId: "BLD889977",
      status: "Delivered"
    },
    {
      dispatchDate: "2025-01-11",
      orderId: "ORD-10018",
      product: "Green Component",
      sku: "GC-332",
      quantity: 25,
      warehouse: "Delhi WH-1",
      location: "Rack C / Bin 7",
      deliveryPartner: "Ecom Express",
      trackingId: "ECM554433",
      status: "Pending"
    }
  ];

  // 🔹 FILTER STATES
  const [productFilter, setProductFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // 🔹 FILTER LOGIC
  const filteredData = STOCK_OUT_DATA.filter((row) => {
    const matchProduct =
      productFilter === "" ||
      row.product.toLowerCase().includes(productFilter.toLowerCase());

    const matchOrder =
      orderFilter === "" ||
      row.orderId.toLowerCase().includes(orderFilter.toLowerCase());

    const matchStatus =
      statusFilter === "" || row.status === statusFilter;

    return matchProduct && matchOrder && matchStatus;
  });

  // 🔹 STATUS COLORS
  const statusColorMap: Record<string, string> = {
    Pending: "bg-gray-500",
    Picked: "bg-orange-500",
    "In Transit": "bg-blue-600",
    Delivered: "bg-green-600",
    Cancelled: "bg-red-600",
  };

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Warehouse Stock Out</h1>
      <p className="text-gray-600">
        Track dispatched inventory and delivery status.
      </p>

      {/* 🔹 FILTER SECTION */}
      <div className="flex flex-col gap-4 p-4 bg-white shadow rounded-xl md:flex-row">

        <input
          type="text"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          placeholder="Filter by Product"
          className="flex-1 p-3 border rounded-lg"
        />

        <input
          type="text"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
          placeholder="Filter by Order ID"
          className="flex-1 p-3 border rounded-lg"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex-1 p-3 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Picked">Picked</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

      </div>

      {/* 🔹 TABLE */}
      <div className="p-6 bg-white shadow rounded-xl overflow-x-auto">

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 font-semibold text-left">
              <th className="p-3 border">Dispatch Date</th>
              <th className="p-3 border">Order ID</th>
              <th className="p-3 border">Product</th>
              <th className="p-3 border">SKU</th>
              <th className="p-3 border">Qty</th>
              <th className="p-3 border">Warehouse</th>
              <th className="p-3 border">Location</th>
              <th className="p-3 border">Delivery Partner</th>
              <th className="p-3 border">Tracking ID</th>
              <th className="p-3 border">Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr key={index}>
                  <td className="p-3 border">{row.dispatchDate}</td>
                  <td className="p-3 border">{row.orderId}</td>
                  <td className="p-3 border">{row.product}</td>
                  <td className="p-3 border">{row.sku}</td>
                  <td className="p-3 border">{row.quantity}</td>
                  <td className="p-3 border">{row.warehouse}</td>
                  <td className="p-3 border">{row.location}</td>
                  <td className="p-3 border">{row.deliveryPartner}</td>
                  <td className="p-3 border">{row.trackingId}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-3 py-1 rounded-full text-white text-xs ${statusColorMap[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}
