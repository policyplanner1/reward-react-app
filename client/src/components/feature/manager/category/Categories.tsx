import React, { useState, useEffect } from "react";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlus,
  FiCalendar,
  FiX,
  FiSave,
  FiTag,
} from "react-icons/fi";
import { api } from "../../../../api/api";

type Status = "active" | "inactive";

interface Category {
  category_id: number;
  name: string;
  status: Status;
  created_at: string;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/category");

      const categoriesArray = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];

      const formatted: Category[] = categoriesArray.map((c: any) => ({
        category_id: c.category_id,
        name: c.category_name || "Unnamed",
        status: c.status === 1 ? "active" : "inactive",
        created_at: c.created_at,
      }));

      setCategories(formatted);
    } catch (err: any) {
      console.error("Fetch Category Error:", err.response?.data || err.message);
      setError("Failed to fetch categories. Please check your login and role.");
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setLoading(true);
      await api.post("/vendor/create-category", {
        name: newCategoryName,
        status: 1,
      });
      setNewCategoryName("");
      fetchCategories();
    } catch (err: any) {
      console.error("Add category error:", err.response?.data || err.message);
      setError("Failed to add category. Make sure you are a vendor_manager.");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (categoryId: number) => {
    try {
      const res = await api.get(`/vendor/category/${categoryId}`);
      const data: Category = {
        category_id: res.data.data.category_id,
        name: res.data.data.category_name,
        status: res.data.data.status === 1 ? "active" : "inactive",
        created_at: res.data.data.created_at,
      };
      setSelected(data);
      setEditName(data.name);
      setDrawerOpen(true);
      setIsEditing(false);
    } catch (err: any) {
      console.error("View error:", err.response?.data || err.message);
      setError("Failed to fetch category details.");
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    try {
      await api.put(`/vendor/update-category/${selected.category_id}`, {
        name: editName,
        status: selected.status === "active" ? 1 : 0,
      });
      fetchCategories();
      setIsEditing(false);
      closeDrawer();
    } catch (err: any) {
      console.error("Update error:", err.response?.data || err.message);
      setError("Failed to update category.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete category?")) return;
    try {
      await api.delete(`/vendor/delete-category/${id}`);
      fetchCategories();
      closeDrawer();
    } catch (err: any) {
      console.error("Delete error:", err.response?.data?.error);
      setError(`Delete error: ${err.response?.data?.error}`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-[#FAFAFE]">
      {/* PAGE HEADER */}
      <div className="mb-10">
        <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-gray-900">
          <div className="p-3 bg-white shadow-sm rounded-2xl text-[#852BAF]">
            <FiTag />
          </div>
          Category Management
        </h1>
        <p className="mt-2 ml-16 font-medium text-gray-400">
          Manage and organize your product catalog
        </p>
      </div>
      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold">
          {error}
        </div>
      )}
      {/* ADD CATEGORY INPUT */}
      <form
        onSubmit={handleAdd}
        className="flex gap-4 p-2 mb-10 bg-white shadow-sm rounded-2xl border border-gray-100/50 max-w-[60rem]"
      >
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1 px-5 py-3 text-sm font-semibold bg-transparent outline-none placeholder:text-gray-300"
          placeholder="Type new category name..."
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 font-bold text-white transition-all shadow-lg bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-xl hover:opacity-90 active:scale-95 shadow-purple-200 cursor-pointer"
        >
          <FiPlus /> {loading ? "Adding..." : "Add Category"}
        </button>
      </form>

      {/* TABLE SECTION */}
      <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-gray-100 overflow-hidden">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Category Name
              </th>
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Status
              </th>
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Created Date
              </th>
              <th className="px-24 py-6 text-xs font-black tracking-widest text-right text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <tr
                key={cat.category_id}
                className="group transition-colors hover:bg-gray-50/50"
              >
                <td className="px-8 py-5 text-sm font-bold text-gray-700">
                  {cat.name}
                </td>
                <td className="px-8 py-5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                      cat.status === "active"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-red-50 text-red-500 border border-red-100"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cat.status === "active"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                    {cat.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-semibold text-gray-400">
                  {new Date(cat.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-end gap-2 opacity-100 transition-opacity duration-200">

                    <button
                      onClick={() => handleView(cat.category_id)}
                      className="p-2.5 text-gray-400 hover:text-[#852BAF] bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <FiEye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        handleView(cat.category_id);
                        setIsEditing(true);
                      }}
                      className="p-2.5 text-gray-400 hover:text-[#FC3F78] bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.category_id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAWER PANEL */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 transition-all duration-500 ${
            drawerOpen ? "visible" : "invisible"
          }`}
        >
          <div
            className={`absolute inset-0 bg-gray-900/20 backdrop-blur-md transition-opacity duration-500 ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeDrawer}
          />

          <div
            className={`absolute right-0 top-0 h-full w-[450px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.05)] transition-transform duration-500 ease-out ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* DRAWER HEADER */}
            <div className="p-8 border-b border-gray-50">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#852BAF] to-[#FC3F78] rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-purple-200">
                  <FiTag />
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  <FiX size={24} />
                </button>
              </div>
              <h2 className="text-2xl font-black text-gray-900">
                {isEditing ? "Edit Category" : selected.name}
              </h2>
              <p className="flex items-center gap-2 mt-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <FiCalendar /> Created on{" "}
                {new Date(selected.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* DRAWER BODY */}
            <div className="p-8 space-y-8">
              {!isEditing ? (
                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                      Current Status
                    </p>
                    <p className="text-lg font-bold text-gray-800 capitalize">
                      {selected.status}
                    </p>
                  </div>
                  <button
                    className="w-full py-4 font-black text-white bg-gray-900 rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
                    onClick={() => setIsEditing(true)}
                  >
                     Edit
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2 block">
                      Category Name
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-5 py-4 font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#852BAF]/20 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2 block">
                      Display Status
                    </label>
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          status: e.target.value as Status,
                        })
                      }
                      className="w-full px-5 py-4 font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl outline-none"
                    >
                      <option value="active">Active (Visible to users)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleSaveEdit}
                      className="w-full py-4 font-black text-white bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-2xl shadow-lg shadow-purple-200 hover:opacity-90 transition-all"
                    >
                      <FiSave className="inline-block mr-2" /> Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="w-full py-4 font-bold text-gray-400 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}