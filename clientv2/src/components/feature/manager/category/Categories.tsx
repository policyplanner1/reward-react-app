'use client';

import { api } from '@/app/src/api/api';
import React, { useState, useEffect } from 'react';
import { 
  FiEdit, FiTrash2, FiEye, FiPlus, FiCalendar,
  FiX, FiSave, FiTag
} from 'react-icons/fi';

type Status = "active" | "inactive";

interface Category {
  category_id: number;
  name: string;
  status: Status;
  created_at: string;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  /* ==========================================
     1️⃣ FETCH ALL CATEGORIES
  ========================================== */
  const fetchCategories = async () => {
    try {
      const res = await api.get("/category");

      const formatted = res.data.map((c: any) => ({
        category_id: c.category_id,
        name: c.category_name || "Unnamed",
        status: c.status === 1 ? "active" : "inactive",
        created_at: c.created_at
      }));

      setCategories(formatted);
    } catch (err) {
      console.log("Fetch Category Error:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ==========================================
     2️⃣ CREATE CATEGORY
  ========================================== */
  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setLoading(true);

      await api.post("/vendor/create-category", {
        name: newCategoryName,
        status: 1
      });

      setNewCategoryName("");
      fetchCategories();
    } catch (err) {
      console.log("Add category error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================
     3️⃣ VIEW CATEGORY
  ========================================== */
  const handleView = async (categoryId: number) => {
    try {
      const res = await api.get(`/vendor/category/${categoryId}`);

      const data: Category = {
        category_id: res.data.category_id,
        name: res.data.category_name,
        status: res.data.status === 1 ? "active" : "inactive",
        created_at: res.data.created_at
      };

      setSelected(data);
      setEditName(data.name);
      setDrawerOpen(true);
      setIsEditing(false);
    } catch (err) {
      console.log("View error:", err);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  /* ==========================================
     4️⃣ UPDATE CATEGORY
  ========================================== */
  const handleSaveEdit = async () => {
    if (!selected) return;

    try {
      await api.put(`/vendor/update-category/${selected.category_id}`, {
        name: editName,
        status: selected.status === "active" ? 1 : 0
      });

      fetchCategories();
      setIsEditing(false);
    } catch (err) {
      console.log("Update error:", err);
    }
  };

  /* ==========================================
     5️⃣ DELETE CATEGORY
  ========================================== */
  const handleDelete = async (id: number) => {
    if (!confirm("Delete category?")) return;

    try {
      await api.delete(`/vendor/delete-category/${id}`);
      fetchCategories();
      closeDrawer();
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">

      {/* PAGE HEADER */}
      <h1 className="flex items-center gap-3 mb-6 text-4xl font-bold text-purple-700 drop-shadow-sm">
        <FiTag className="text-purple-600" /> 
        Category Management
      </h1>

      {/* ADD CATEGORY INPUT */}
      <form onSubmit={handleAdd} className="flex gap-4 mb-8">
        <input
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          className="flex-1 px-5 py-3 border shadow-sm rounded-xl focus:ring-2 focus:ring-purple-400"
          placeholder="Enter category name..."
        />

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 font-semibold text-white transition-all bg-purple-600 shadow rounded-xl hover:bg-purple-700"
        >
          <FiPlus /> Add
        </button>
      </form>

      {/* TABLE */}
      <div className="overflow-hidden bg-white shadow-xl rounded-2xl">
        <table className="min-w-full">
          <thead className="text-white bg-purple-600">
            <tr>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {categories.map(cat => (
              <tr key={cat.category_id} className="transition hover:bg-purple-50">
                
                <td className="px-6 py-4 font-semibold">{cat.name}</td>

                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    cat.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}>
                    {cat.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {new Date(cat.created_at).toLocaleDateString()}
                </td>

                <td className="flex justify-end gap-3 px-6 py-4 text-right">
                  <button className="p-2 text-blue-600 hover:text-blue-800" 
                    onClick={() => handleView(cat.category_id)}>
                    <FiEye size={18} />
                  </button>

                  <button className="p-2 text-purple-600 hover:text-purple-800"
                    onClick={() => { handleView(cat.category_id); setIsEditing(true); }}>
                    <FiEdit size={18} />
                  </button>

                  <button className="p-2 text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(cat.category_id)}>
                    <FiTrash2 size={18} />
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAWER PANEL */}
      {selected && (
        <div className={`fixed inset-0 z-50 transition ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDrawer}></div>

          <div className={`absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl rounded-l-2xl transition-transform ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}>

            {/* DRAWER HEADER */}
            <div className="flex justify-between p-6 bg-purple-600 border-b rounded-tl-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <p className="flex items-center gap-2 text-sm text-purple-100">
                  <FiCalendar /> {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={closeDrawer} className="text-white hover:text-gray-200">
                <FiX size={22} />
              </button>
            </div>

            {/* DRAWER BODY */}
            <div className="p-6">

              {!isEditing ? (
                <button
                  className="w-full py-3 mb-3 font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700"
                  onClick={() => setIsEditing(true)}
                >
                  <FiEdit className="inline-block mr-2" />
                  Edit Category
                </button>
              ) : (
                <>
                  {/* NAME INPUT */}
                  <div className="mb-6">
                    <label className="text-sm font-medium">Category Name</label>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-4 py-3 border shadow-sm rounded-xl focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  {/* STATUS SELECT */}
                  <div className="mb-6">
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      value={selected.status}
                      onChange={e => setSelected({
                        ...selected,
                        status: e.target.value as Status
                      })}
                      className="w-full px-4 py-3 border shadow-sm rounded-xl"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* SAVE BUTTON */}
                  <button
                    onClick={handleSaveEdit}
                    className="w-full py-3 mb-3 font-semibold text-white bg-purple-700 rounded-xl hover:bg-purple-800"
                  >
                    <FiSave className="inline-block mr-2" />
                    Save Changes
                  </button>

                  {/* CANCEL BUTTON */}
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
