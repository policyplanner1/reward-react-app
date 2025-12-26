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
  category_name: string;
  status: Status;
  created_at: string;
}

export default function SubcategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");

  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Subcategory | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  /* =============================
        FETCH CATEGORIES
  ============================== */
  const fetchCategories = async () => {
    try {
      const res = await api.get("/category");

      const formatted = res.data.map((c: any) => ({
        category_id: c.category_id,
        name: c.category_name,
      }));

      setCategories(formatted);
    } catch (err) {
      console.log("Category load error:", err);
    }
  };

  /* =============================
        FETCH SUBCATEGORIES
  ============================== */
  const fetchSubcategories = async () => {
  try {
    const res = await api.get("/subcategory");

    const formatted = res.data.map((s: any) => {
      const statusValue = Number(s?.status);  
// const status: Status = statusValue === 1 ? "active" : "inactive";
console.log("Status Value:", statusValue);
      return {
        subcategory_id: s?.subcategory_id ?? "",
        category_id: s?.category_id ?? "",
        subcategory_name: s?.subcategory_name ?? "",
        category_name: s?.category_name ?? "",
        status: statusValue === 1 ? "active" : "inactive", 
        created_at: s?.created_at ?? "",
      };
      
    });

    setSubcategories(formatted);
  } catch (err) {
    console.log("Subcategory load error:", err);
  }
};



  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  /* =============================
        FILTER SUBCATEGORY
  ============================== */
  const filteredSubcategories = useMemo(() => {
    if (selectedCategoryId === "") return subcategories;
    return subcategories.filter(
      (item) => item.category_id === selectedCategoryId
    );
  }, [subcategories, selectedCategoryId]);

  /* =============================
          ADD SUBCATEGORY
  ============================== */
  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSubcategoryName.trim() || selectedCategoryId === "") return;

    setLoadingAdd(true);

    try {
      await api.post("/vendor/create-subcategory", {
        category_id: selectedCategoryId,
        name: newSubcategoryName,
      });

      setNewSubcategoryName("");
      fetchSubcategories();
    } catch (err) {
      console.log("Add error:", err);
    } finally {
      setLoadingAdd(false);
    }
  };

  /* =============================
          VIEW DRAWER
  ============================== */
  const handleView = async (id: number) => {
    try {
      const res = await api.get(`/vendor/subcategory/${id}`);
      const s = res.data;

      const formatted: Subcategory = {
        subcategory_id: s.subcategory_id,
        category_id: s.category_id,
        subcategory_name: s.subcategory_name,
        category_name: s.category_name,
        status: Number(s.status) === 1 ? "active" : "inactive",
        created_at: s.created_at,
      };

      setSelected(formatted);
      setEditName(formatted.subcategory_name);
      setIsEditing(false);
      setDrawerOpen(true);
    } catch (err) {
      console.log("View error:", err);
    }
  };

  /* =============================
          UPDATE
  ============================== */
  const handleSaveEdit = async () => {
  if (!selected) return;

  setLoadingSave(true);

  try {
    const res = await api.put(
      `/vendor/update-subcategory/${selected.subcategory_id}`,
      {
        category_id: selected.category_id,
        name: editName,
        status: selected.status === "active" ? 1 : 0,
      }
    );

    const updated = res.data;
    console.log("Update Data",updated);
    setSelected({
      subcategory_id: updated.subcategory_id,
      category_id: updated.category_id,
      subcategory_name: updated.subcategory_name,
      category_name: selected.category_name,
      status: Number(updated.status) === 1 ? "active" : "inactive",
      created_at: updated.created_at,
    });

    // Refresh table
    fetchSubcategories();

    setIsEditing(false);
  } catch (err) {
    console.log("Update error:", err);
  } finally {
    setLoadingSave(false);
  }
};


  /* =============================
            DELETE
  ============================== */
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subcategory?")) return;

    try {
      await api.delete(`/vendor/delete-subcategory/${id}`);
      fetchSubcategories();
      setDrawerOpen(false);
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  /* =============================
              UI
  ============================== */

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="flex items-center gap-2 mb-6 text-3xl font-bold text-purple-700">
        <FiTag /> Subcategory Management
      </h1>

      {/* ADD FORM */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-4 mb-6 md:flex-row"
      >
        <select
          value={selectedCategoryId}
          onChange={(e) =>
            setSelectedCategoryId(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          className="px-4 py-3 border rounded-xl md:w-1/3"
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          value={newSubcategoryName}
          onChange={(e) => setNewSubcategoryName(e.target.value)}
          className="flex-1 px-4 py-3 border rounded-xl"
          placeholder="Enter subcategory name…"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-6 py-3 text-white bg-purple-600 rounded-xl"
        >
          <FiPlus /> {loadingAdd ? "Adding…" : "Add"}
        </button>
      </form>

      {/* TABLE */}
      <div className="bg-white shadow rounded-2xl">
        <table className="min-w-full">
          <thead className="text-white bg-purple-600">
            <tr>
              <th className="px-6 py-4 text-left">Subcategory</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredSubcategories.map((sub) => (
              <tr
                key={sub.subcategory_id}
                className="border-b hover:bg-purple-50"
              >
                <td className="px-6 py-4 font-semibold">
                  {sub.subcategory_name}
                </td>
                <td className="px-6 py-4">{sub.category_name}</td>

                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      sub.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {sub.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {new Date(sub.created_at).toLocaleDateString()}
                </td>

                <td className="flex justify-end gap-3 px-6 py-4">
                  <button onClick={() => handleView(sub.subcategory_id)}>
                    <FiEye />
                  </button>

                  <button
                    className="text-purple-600"
                    onClick={() => {
                      handleView(sub.subcategory_id);
                      setIsEditing(true);
                    }}
                  >
                    <FiEdit />
                  </button>

                  <button
                    className="text-red-600"
                    onClick={() => handleDelete(sub.subcategory_id)}
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
          className={`fixed inset-0 z-50 transition ${
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeDrawer}
          ></div>

          {/* SIDE PANEL */}
          <div
            className={`absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl rounded-l-2xl transition-transform ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* HEADER */}
            <div className="flex justify-between p-6 bg-purple-600 border-b rounded-tl-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selected.subcategory_name}
                </h2>
                <p className="flex items-center gap-2 text-sm text-purple-100">
                  <FiCalendar />{" "}
                  {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-white hover:text-gray-200"
              >
                <FiX size={22} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6">
              {!isEditing ? (
                <button
                  className="w-full py-3 mb-3 font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700"
                  onClick={() => setIsEditing(true)}
                >
                  <FiEdit className="inline-block mr-2" />
                  Edit Subcategory
                </button>
              ) : (
                <>
                  {/* NAME INPUT */}
                  <div className="mb-6">
                    <label className="text-sm font-medium">
                      Subcategory Name
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 border shadow-sm rounded-xl focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  {/* STATUS */}
                  <div className="mb-6">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          status: e.target.value as Status,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-xl"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* SAVE */}
                  <button
                    onClick={handleSaveEdit}
                    className="w-full py-3 mb-3 font-semibold text-white bg-purple-700 rounded-xl hover:bg-purple-800"
                  >
                    <FiSave className="inline-block mr-2" />
                    {loadingSave ? "Saving…" : "Save Changes"}
                  </button>

                  {/* CANCEL */}
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
