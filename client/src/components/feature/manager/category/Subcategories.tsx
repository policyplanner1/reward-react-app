import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlus,
  FiCalendar,
  FiTag,
  FiX,
  FiSave,
  FiLayers,
} from "react-icons/fi";

import { api } from "../../../../api/api";

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
  const [error, setError] = useState<string | null>(null);

  const normalizeStatus = (status: any): Status => {
    if (status === "active") return "active";
    if (status === "inactive") return "inactive";
    if (status === 1 || status === "1") return "active";
    return "inactive";
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/category");
      const categoriesArray = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];
      const formatted = categoriesArray.map((c: any) => ({
        category_id: c.category_id,
        name: c.category_name,
      }));
      setCategories(formatted);
    } catch (err: unknown) {
      if (err instanceof Error) {
      } else {
      }
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await api.get("/subcategory");

      const subArray = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];

      console.log("Fetched subcategories:", subArray);

      const formatted = subArray.map((s: any) => ({
        subcategory_id: s?.subcategory_id ?? "",
        category_id: s?.category_id ?? "",
        subcategory_name: s?.subcategory_name ?? "",
        category_name: s?.category_name ?? "",
        // status: Number(s?.status) === 1 ? "active" : "inactive",
        status: normalizeStatus(s.status),
        created_at: s?.created_at ?? "",
      }));

      setSubcategories(formatted);
    } catch (err) {
      setError("Failed to load subcategories");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  const filteredSubcategories = useMemo(() => {
    if (selectedCategoryId === "") return subcategories;
    return subcategories.filter(
      (item) => item.category_id === selectedCategoryId
    );
  }, [subcategories, selectedCategoryId]);

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

  const handleView = async (id: number) => {
    try {
      const res = await api.get(`/vendor/subcategory/${id}`);
      const s = res.data.data;
      const formatted: Subcategory = {
        subcategory_id: s.subcategory_id,
        category_id: s.category_id,
        subcategory_name: s.subcategory_name,
        category_name: s.category_name,
        status: normalizeStatus(s.status),
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

  const handleSaveEdit = async () => {
    if (!selected) return;
    setLoadingSave(true);
    try {
      await api.put(`/vendor/update-subcategory/${selected.subcategory_id}`, {
        category_id: selected.category_id,
        name: editName,
        status: selected.status === "active" ? 1 : 0,
      });

      setSelected({
        ...selected,
        subcategory_name: editName,
        status: selected.status,
      });

      fetchSubcategories();
      setIsEditing(false);
      closeDrawer();
    } catch (err) {
      console.log("Update error:", err);
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subcategory?")) return;
    try {
      await api.delete(`/vendor/delete-subcategory/${id}`);
      fetchSubcategories();
      setDrawerOpen(false);
    } catch (err) {
      console.error("Delete error:", err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to delete subcategory"
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to delete subcategory");
      }
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  return (
    <div className="min-h-screen p-8 bg-[#FAFAFE]">
      {/* PAGE HEADER */}
      <div className="mb-10">
        <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-gray-900">
          <div className="p-3 bg-white shadow-sm rounded-2xl text-[#852BAF]">
            <FiLayers />
          </div>
          Subcategory Management
        </h1>
        <p className="mt-2 ml-16 font-medium text-gray-400">
          Deepen your catalog organization
        </p>
      </div>
      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold">
          {error}
        </div>
      )}
      {/* ADD FORM */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-4 p-2 mb-10 bg-white shadow-sm rounded-2xl border border-gray-100/50 max-w-[60rem] md:flex-row"
      >
        <select
          value={selectedCategoryId}
          onChange={(e) =>
            setSelectedCategoryId(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          className="px-5 py-3 text-sm font-bold bg-gray-50 rounded-xl outline-none text-gray-700 md:w-1/3"
        >
          <option value="">Filter by Category</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          value={newSubcategoryName}
          onChange={(e) => setNewSubcategoryName(e.target.value)}
          className="flex-1 px-5 py-3 text-sm font-semibold bg-transparent outline-none placeholder:text-gray-300"
          placeholder="Enter subcategory name..."
        />

        <button
          type="submit"
          disabled={loadingAdd}
          className="flex items-center justify-center gap-2 px-8 py-3 font-bold text-white transition-all shadow-lg bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-xl hover:opacity-90 active:scale-95 shadow-purple-200 cursor-pointer"
        >
          <FiPlus /> {loadingAdd ? "Adding…" : "Add Subcategory"}
        </button>
      </form>

      {/* TABLE */}
      <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-gray-100 overflow-hidden">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Subcategory
              </th>
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Parent Category
              </th>
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Status
              </th>
              <th className="px-8 py-6 text-xs font-black tracking-widest text-left text-gray-400 uppercase">
                Created
              </th>
              <th className="px-23 py-6 text-xs font-black tracking-widest text-right text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {filteredSubcategories.map((sub) => (
              <tr
                key={sub.subcategory_id}
                className="group transition-colors hover:bg-gray-50/50"
              >
                <td className="px-8 py-5 text-sm font-bold text-gray-700">
                  {sub.subcategory_name}
                </td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 text-[11px] font-bold bg-purple-50 text-[#852BAF] rounded-lg">
                    {sub.category_name}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                      sub.status === "active"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-red-50 text-red-500 border border-red-100"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sub.status === "active"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                    {sub.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-semibold text-gray-400">
                  {new Date(sub.created_at).toLocaleDateString()}
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-end gap-2 opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleView(sub.subcategory_id)}
                      className="p-2.5 text-gray-400 hover:text-[#852BAF] bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <FiEye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        handleView(sub.subcategory_id);
                        setIsEditing(true);
                      }}
                      className="p-2.5 text-gray-400 hover:text-[#FC3F78] bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.subcategory_id)}
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

      {/* DRAWER */}
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
                {isEditing ? "Edit Subcategory" : selected.subcategory_name}
              </h2>
              <p className="flex items-center gap-2 mt-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <FiCalendar /> Created on{" "}
                {new Date(selected.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="p-8 space-y-8">
              {!isEditing ? (
                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                      Current Category
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      {selected.category_name}
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
                      Name
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-5 py-4 font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#852BAF]/20 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2 block">
                      Status
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
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loadingSave}
                      className="w-full py-4 font-black text-white bg-gradient-to-r from-[#852BAF] to-[#FC3F78] rounded-2xl shadow-lg shadow-purple-200 hover:opacity-90 transition-all"
                    >
                      <FiSave className="inline-block mr-2" />{" "}
                      {loadingSave ? "Saving…" : "Save Changes"}
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
