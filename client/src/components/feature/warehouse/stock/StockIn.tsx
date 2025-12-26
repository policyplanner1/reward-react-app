"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEdit, FaPaperPlane } from "react-icons/fa";

const API_BASE_URL = "http://localhost:5000/api";

// Types
interface StockEntry {
  grn: string;
  sku: string;
  vendorName: string;
  productName: string;
  category: string;
  totalQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  stockInDate: string;
  expiryDate?: string;
  status: "Pending" | "Sent";
}

interface Warehouse {
  warehouse_id: number;
  name: string;
  location:string;
}

interface ApiStockRow {
  grn: string;
  sku: string;
  productName: string;
  vendorName: string;
  categoryName: string;
  total_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  stock_in_date: string;
  expiry_date?: string;
  status: "Pending" | "Sent";
}

interface Props {
  onClose: () => void;
  onSubmit: (warehouseId: number, warehouseLocation: string) => void;
}

function SendToInventoryModal({ onClose, onSubmit }: Props) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(
    null
  );
  const [warehouseLocation, setWarehouseLocation] = useState<string>("");

  useEffect(() => {
    const fetchWarehouses = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/warehouse/all-warehouses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setWarehouses(data.rows || []);
    };
    fetchWarehouses();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 space-y-4">
        <h2 className="text-xl font-semibold mb-5">Select Warehouse</h2>
        <label className="font-medium">Warehouse</label>
        <select
          className="w-full p-3 border rounded"
          value={selectedWarehouse || ""}
          onChange={(e) => setSelectedWarehouse(Number(e.target.value))}
        >
          <option value="">Select Warehouse</option>
          {warehouses.map((wh) => (
            <option key={wh.warehouse_id} value={wh.warehouse_id}>
              {wh.name} | {wh.location}
            </option>
          ))}
        </select>

        <div>
          <label className="font-medium">Storage</label>
          <input
            type="text"
            className="w-full p-3 border rounded mt-1"
            value={warehouseLocation}
            onChange={(e) => setWarehouseLocation(e.target.value)}
            placeholder="Rack/ Bin/ Aisle"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={() =>
              selectedWarehouse &&
              onSubmit(selectedWarehouse, warehouseLocation)
            }
            className="px-4 py-2 bg-purple-600 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockInPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"Pending" | "Sent">("Pending");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  const [tableData, setTableData] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // fetch table Data
  useEffect(() => {
    fetchStockInList();
  }, [activeTab]);

  const fetchStockInList = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/warehouse/stock-in?status=${activeTab}&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setTableData(
        data.data.map((row: ApiStockRow) => ({
          grn: row.grn,
          sku: row.sku,
          vendorName: row.vendorName,
          productName: row.productName,
          category: row.categoryName,
          totalQuantity: row.total_quantity,
          passedQuantity: row.passed_quantity,
          failedQuantity: row.failed_quantity,
          stockInDate: new Date(row.stock_in_date).toLocaleDateString(),
          expiryDate: row.expiry_date
            ? new Date(row.expiry_date).toLocaleDateString()
            : "N/A",
          status: row.status,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch stock-in list", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter based on search and active tab
  const filteredData = tableData.filter((row) => {
    const q = search.toLowerCase();

    return (
      row.status === activeTab &&
      (row.productName?.toLowerCase().includes(q) ||
        row.vendorName?.toLowerCase().includes(q) ||
        row.grn?.toLowerCase().includes(q) ||
        row.sku?.toLowerCase().includes(q))
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleOpenModal = (grn: string) => {
    setSelectedGRN(grn);
    setIsModalOpen(true);
  };

  const handleSendToInventory = async (warehouseId: number, warehouseLocation: string) => {
    if (!selectedGRN) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/warehouse/send-to-inventory`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          grn: selectedGRN,
          warehouse_id: warehouseId,
          warehouseLocation: warehouseLocation,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to send stock");
      }

      alert("Stock sent to inventory successfully!");
      setIsModalOpen(false);
      setSelectedGRN(null);
      await fetchStockInList();
    } catch (error) {
      console.error(error);
      alert("Failed to send stock to inventory. Please try again.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Warehouse Stock In</h1>
      <p className="text-gray-600">
        View all stock-in entries received into warehouse.
      </p>

      {/* Top Actions */}
      <div className="flex justify-left p-6 bg-white shadow rounded-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // reset page on search
          }}
          placeholder="Search by GRN, SKU, Product, Vendor..."
          className="w-1/2 p-3 border rounded-lg"
        />

        <button
          className="px-6 py-3 ml-8 text-white bg-purple-600 rounded-lg"
          onClick={() => router.push("stockcreate")}
        >
          + New Stock In
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === "Pending" ? "bg-purple-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => {
            setActiveTab("Pending");
            setCurrentPage(1);
          }}
        >
          Pending Inventory
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === "Sent" ? "bg-purple-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => {
            setActiveTab("Sent");
            setCurrentPage(1);
          }}
        >
          Sent to Inventory
        </button>
      </div>

      {/* Table container */}
      <div className="bg-white shadow rounded-xl mt-4">
        <h2 className="p-6 text-xl font-semibold">
          {activeTab === "Pending" ? "Pending Inventory" : "Sent to Inventory"}{" "}
          Records
        </h2>

        {/* Scrollable table ONLY */}
        <div className="overflow-x-auto">
          <table className="min-w-max w-full border-collapse">
            <thead>
              <tr className="text-left bg-gray-100">
                <th className="p-3 border">SKU</th>
                <th className="p-3 border">GRN No</th>
                <th className="p-3 border">Vendor</th>
                <th className="p-3 border">Product</th>
                <th className="p-3 border">Category</th>
                <th className="p-3 border">Total Qty</th>
                <th className="p-3 border">Passed Qty</th>
                <th className="p-3 border">Failed Qty</th>
                <th className="p-3 border">Stock-In Date</th>
                <th className="p-3 border">Expiry</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-4 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-3 border font-semibold">{row.sku}</td>
                    <td className="p-3 border font-semibold">{row.grn}</td>
                    <td className="p-3 border">{row.vendorName}</td>
                    <td className="p-3 border">{row.productName}</td>
                    <td className="p-3 border">{row.category}</td>
                    <td className="p-3 border">{row.totalQuantity}</td>
                    <td className="p-3 border">{row.passedQuantity}</td>
                    <td className="p-3 border">{row.failedQuantity}</td>
                    <td className="p-3 border">{row.stockInDate}</td>
                    <td className="p-3 border">{row.expiryDate || "N/A"}</td>
                    <td className="p-3 border">{row.status}</td>
                    <td className="p-3 border whitespace-nowrap flex space-x-2">
                      {/* view */}
                      <button
                        className="text-purple-600 hover:text-purple-800"
                        onClick={() =>
                          router.push(
                            `/src/warehouse/stock/stockview?grn=${row.grn}`
                          )
                        }
                      >
                        <FaEye className="h-5 w-5" />
                      </button>

                      {/* Edit */}
                      {activeTab === "Pending" && (
                        <button
                          className="text-green-600 hover:text-green-800"
                          onClick={() =>
                            router.push(
                              `/src/warehouse/stock/stockedit?grn=${row.grn}`
                            )
                          }
                        >
                          <FaEdit className="h-5 w-5" />
                        </button>
                      )}

                      {/* send to inventory */}
                      {activeTab === "Pending" && (
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => handleOpenModal(row.grn)}
                        >
                          <FaPaperPlane className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center p-4 space-x-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                className={`px-3 py-1 border rounded ${
                  currentPage === idx + 1 ? "bg-purple-600 text-white" : ""
                }`}
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <SendToInventoryModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSendToInventory}
        />
      )}
    </div>
  );
}
