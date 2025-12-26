"use client";

import { api } from "@/app/src/api/api";
import React, { useEffect, useMemo, useState } from "react";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlus,
  FiCalendar,
  FiTag,
  FiX,
  FiSave,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

type Status = "active" | "inactive";

interface Category {
  category_id: number;
  name: string;
}

interface Subcategory {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
}

interface SubSubcategory {
  sub_subcategory_id: number;
  subcategory_id: number;
  name: string;
  status: Status;
  created_at: string;
  subcategory_name: string;
}

const StatusBadge = ({ status }: { status: Status }) => (
  <span
    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
      status === "active"
        ? "bg-green-100 text-green-700"
        : "bg-rose-100 text-rose-700"
    }`}
  >
    {status === "active" ? (
      <FiCheckCircle className="mr-2" />
    ) : (
      <FiXCircle className="mr-2" />
    )}
    {status === "active" ? "Active" : "Inactive"}
  </span>
);

export default function SubSubCategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subsub, setSubSub] = useState<SubSubcategory[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    number | ""
  >("");
  const [newName, setNewName] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<SubSubcategory | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  /* --------------------------------------------------------
      1 FETCH ALL CATEGORIES
  -------------------------------------------------------- */
  const loadCategories = async () => {
    try {
      const res = await api.get("/category");
      setCategories(
        res.data.map((c: any) => ({
          category_id: c.category_id,
          name: c.category_name,
        }))
      );
    } catch (e) {
      console.log("Category error", e);
    }
  };

  /* --------------------------------------------------------
      2 FETCH ALL SUB-CATEGORIES
  -------------------------------------------------------- */
  const loadSubcategories = async () => {
    try {
      const res = await api.get("/subcategory");
      setSubcategories(res.data);
    } catch (e) {
      console.log("Subcategory error", e);
    }
  };

  /* --------------------------------------------------------
      3 FETCH ALL SUB-SUBCATEGORIES
  -------------------------------------------------------- */
  const loadSubSubCategories = async () => {
    try {
      const res = await api.get("/subsubcategory");
      setSubSub(
        res.data.map((s: any) => ({
          sub_subcategory_id: s.sub_subcategory_id,
          subcategory_id: s.subcategory_id,
          name: s.name,
          status: s.sub_sub_status == 1 ? "active" : "inactive",
          created_at: s.sub_sub_created,
          subcategory_name: s.subcategory_name,
        }))
      );
    } catch (e) {
      console.log("SubSub error", e);
    }
  };

  /* --------------------------------------------------------
      Run all fetch on load
  -------------------------------------------------------- */
  useEffect(() => {
    loadCategories();
    loadSubcategories();
    loadSubSubCategories();
  }, []);

  /* --------------------------------------------------------
     FILTER SUBCATEGORY
  -------------------------------------------------------- */
  const filterSubcats = useMemo(() => {
    if (selectedCategoryId === "") return [];
    return subcategories.filter((s) => s.category_id === selectedCategoryId);
  }, [selectedCategoryId, subcategories]);

  const filterSubSub = useMemo(() => {
    // 🔹 Show all data on initial load
    if (selectedSubcategoryId === "") {
      return subsub;
    }

    // 🔹 Filter only when subcategory is selected
    return subsub.filter((s) => s.subcategory_id === selectedSubcategoryId);
  }, [selectedSubcategoryId, subsub]);

  /* --------------------------------------------------------
      ADD SUB-SUBCATEGORY
  -------------------------------------------------------- */
  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim() || selectedSubcategoryId === "") return;

    try {
      await api.post("/vendor/create-sub-subcategory", {
        subcategory_id: selectedSubcategoryId,
        name: newName,
      });

      setNewName("");
      loadSubSubCategories();
    } catch (e) {
      console.log("Add error", e);
    }
  };

  /* --------------------------------------------------------
      VIEW SINGLE SUB-SUBCATEGORY
  -------------------------------------------------------- */
  const handleView = async (id: number) => {
    try {
      const res = await api.get(`/vendor/sub-subcategory/${id}`);

      const s = res.data;

      const formatted: SubSubcategory = {
        sub_subcategory_id: s.sub_subcategory_id,
        subcategory_id: s.subcategory_id,
        name: s.name,
        status: s.status === 1 ? "active" : "inactive",
        created_at: s.created_at,
        subcategory_name: s.subcategory_name,
      };

      setSelected(formatted);
      setEditName(formatted.name);
      setIsEditing(false);
      setDrawerOpen(true);
    } catch (e) {
      console.log("View error", e);
    }
  };

  /* --------------------------------------------------------
      UPDATE SUB-SUBCATEGORY
  -------------------------------------------------------- */
  const handleSaveEdit = async () => {
    if (!selected) return;

    try {
      await api.put(
        `/vendor/update-sub-subcategory/${selected.sub_subcategory_id}`,
        {
          name: editName.trim(),
          status: selected.status === "active" ? 1 : 0,
          subcategory_id: selected.subcategory_id,
        }
      );

      loadSubSubCategories();
      setIsEditing(false);
    } catch (e) {
      console.log("Update error", e);
    }
  };

  /* --------------------------------------------------------
      DELETE
  -------------------------------------------------------- */
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this Type / Sub-Type?")) return;

    try {
      await api.delete(`/vendor/delete-sub-subcategory/${id}`);
      loadSubSubCategories();
      setDrawerOpen(false);
    } catch (e) {
      console.log("Delete error", e);
    }
  };

  /* --------------------------------------------------------
     UI RENDER
  -------------------------------------------------------- */
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="flex items-center gap-2 mb-6 text-3xl font-bold text-purple-700">
        <FiTag /> Sub-Subcategory Management
      </h1>

      {/* ADD AREA */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 mb-6 md:flex-row"
      >
        {/* Category Dropdown */}
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(Number(e.target.value) || "")}
          className="px-4 py-3 border rounded-xl"
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Subcategory dropdown */}
        <select
          value={selectedSubcategoryId}
          onChange={(e) =>
            setSelectedSubcategoryId(Number(e.target.value) || "")
          }
          className="px-4 py-3 border rounded-xl"
          disabled={selectedCategoryId === ""}
        >
          <option value="">Select Subcategory</option>
          {filterSubcats.map((s) => (
            <option key={s.subcategory_id} value={s.subcategory_id}>
              {s.subcategory_name}
            </option>
          ))}
        </select>

        {/* Input */}
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Enter Type / Sub-Type…"
          className="flex-1 px-4 py-3 border rounded-xl"
          disabled={selectedSubcategoryId === ""}
        />

        <button className="flex items-center gap-2 px-6 py-3 text-white bg-purple-600 rounded-xl">
          <FiPlus /> Add
        </button>
      </form>

      {/* TABLE */}
      <div className="bg-white shadow rounded-2xl">
        <table className="min-w-full">
          <thead className="text-white bg-purple-600">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Subcategory</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filterSubSub.map((s) => (
              <tr
                key={s.sub_subcategory_id}
                className="border-b hover:bg-purple-50"
              >
                <td className="px-6 py-4">{s.name}</td>

                <td className="px-6 py-4">{s.subcategory_name}</td>

                <td className="px-6 py-4">
                  <StatusBadge status={s.status} />
                </td>

                <td className="px-6 py-4">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>

                <td className="flex justify-end gap-2 px-6 py-4">
                  <button onClick={() => handleView(s.sub_subcategory_id)}>
                    <FiEye />
                  </button>
                  <button
                    onClick={() => {
                      handleView(s.sub_subcategory_id);
                      setIsEditing(true);
                    }}
                    className="text-purple-600"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(s.sub_subcategory_id)}
                    className="text-red-600"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAWER */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 ${
            drawerOpen ? "" : "pointer-events-none opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          ></div>

          <div
            className={`absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl transition-transform rounded-l-2xl
            ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex justify-between p-6 text-white bg-purple-600 rounded-tl-2xl">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="flex items-center gap-2 text-sm">
                  <FiCalendar />{" "}
                  {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)}>
                <FiX size={22} />
              </button>
            </div>

            <div className="p-6">
              {!isEditing ? (
                <button
                  className="w-full py-3 mb-3 text-white bg-purple-600 rounded-xl"
                  onClick={() => setIsEditing(true)}
                >
                  <FiEdit className="inline mr-2" /> Edit
                </button>
              ) : (
                <>
                  <div className="mb-6">
                    <label>Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 mt-1 border rounded-xl"
                    />
                  </div>

                  <div className="mb-6">
                    <label>Status</label>
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        setSelected((prev) =>
                          prev
                            ? { ...prev, status: e.target.value as Status }
                            : prev
                        )
                      }
                      className="w-full px-4 py-3 mt-1 border rounded-xl"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveEdit}
                    className="w-full py-3 mb-3 text-white bg-purple-700 rounded-xl"
                  >
                    <FiSave className="inline mr-2" /> Save Changes
                  </button>

                  <button
                    onClick={() => setIsEditing(false)}
                    className="w-full py-3 border rounded-xl"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
