import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlus,
  FiX,
  FiSave,
  FiLayers,
  FiTag,
} from "react-icons/fi";
import { api } from "../../../../api/api";

type InputType = "text" | "number" | "select" | "multiselect" | "textarea";

interface Category {
  category_id: number;
  name: string;
}

interface Subcategory {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
}

interface Attribute {
  id: number;
  category_id?: number;
  subcategory_id?: number;
  attribute_key: string;
  attribute_label: string;
  input_type: InputType;
  is_variant: number;
  is_required: number;
  sort_order: number;
  created_at: string;
}

export default function CategoryAttributeManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [subcategoryId, setSubcategoryId] = useState<number | "">("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Attribute | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    attribute_key: "",
    attribute_label: "",
    input_type: "text" as InputType,
    is_variant: 0,
    is_required: 0,
    sort_order: 0,
  });

  /* ------------------ FETCH ------------------ */

  const fetchCategories = async () => {
    const res = await api.get("/category");
    setCategories(
      (res.data.data || []).map((c: any) => ({
        category_id: c.category_id,
        name: c.category_name,
      }))
    );
  };

  const fetchSubcategories = async () => {
    const res = await api.get("/subcategory");
    setSubcategories(res.data.data || []);
  };

  const fetchAttributes = async () => {
    const res = await api.get("/category-attributes", {
      params: {
        category_id: categoryId || undefined,
        subcategory_id: subcategoryId || undefined,
      },
    });
    setAttributes(res.data.data || []);
  };

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    fetchAttributes();
  }, [categoryId, subcategoryId]);

  /* ------------------ HANDLERS ------------------ */

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId && !subcategoryId) {
      return Swal.fire("Select category or subcategory", "", "warning");
    }

    try {
      await api.post("/manager/category-attributes", {
        ...form,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
      });

      setForm({
        attribute_key: "",
        attribute_label: "",
        input_type: "text",
        is_variant: 0,
        is_required: 0,
        sort_order: 0,
      });

      fetchAttributes();
      Swal.fire("Created", "Attribute added successfully", "success");
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Delete attribute?",
      text: "This cannot be undone",
      icon: "warning",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/category-attributes/${id}`);
      fetchAttributes();
      Swal.fire("Deleted", "", "success");
    } catch (err: any) {
      Swal.fire("Blocked", err.response?.data?.message, "error");
    }
  };

  const handleSave = async () => {
    if (!selected) return;

    try {
      await api.put(`/category-attributes/${selected.id}`, selected);
      fetchAttributes();
      setDrawerOpen(false);
      Swal.fire("Updated", "", "success");
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message, "error");
    }
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen p-8 bg-[#FAFAFE]">
      <h1 className="flex items-center gap-4 text-3xl font-black">
        <FiLayers /> Attribute Management
      </h1>

      {/* FILTERS */}
      <div className="flex gap-4 mt-6">
        <select
          value={categoryId}
          onChange={(e) =>
            setCategoryId(e.target.value ? Number(e.target.value) : "")
          }
          className="px-4 py-3 rounded-xl"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={subcategoryId}
          onChange={(e) =>
            setSubcategoryId(e.target.value ? Number(e.target.value) : "")
          }
          className="px-4 py-3 rounded-xl"
        >
          <option value="">Subcategory</option>
          {subcategories
            .filter((s) => s.category_id === categoryId)
            .map((s) => (
              <option key={s.subcategory_id} value={s.subcategory_id}>
                {s.subcategory_name}
              </option>
            ))}
        </select>
      </div>

      {/* ADD FORM */}
      <form
        onSubmit={handleAdd}
        className="grid grid-cols-6 gap-4 mt-6 bg-white p-6 rounded-2xl"
      >
        <input
          placeholder="Key"
          value={form.attribute_key}
          onChange={(e) =>
            setForm({ ...form, attribute_key: e.target.value })
          }
          className="col-span-1 px-4 py-3 rounded-xl"
        />
        <input
          placeholder="Label"
          value={form.attribute_label}
          onChange={(e) =>
            setForm({ ...form, attribute_label: e.target.value })
          }
          className="col-span-2 px-4 py-3 rounded-xl"
        />
        <select
          value={form.input_type}
          onChange={(e) =>
            setForm({ ...form, input_type: e.target.value as InputType })
          }
          className="col-span-1 px-4 py-3 rounded-xl"
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
          <option value="multiselect">Multi Select</option>
          <option value="textarea">Textarea</option>
        </select>

        <button
          type="submit"
          className="col-span-2 flex items-center justify-center gap-2 bg-[#852BAF] text-white rounded-xl"
        >
          <FiPlus /> Add Attribute
        </button>
      </form>

      {/* TABLE */}
      <div className="mt-8 bg-white rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-400">
              <th className="px-6 py-4">Key</th>
              <th>Label</th>
              <th>Type</th>
              <th>Variant</th>
              <th>Required</th>
              <th className="text-right px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {attributes.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-6 py-4 font-mono">{a.attribute_key}</td>
                <td>{a.attribute_label}</td>
                <td>{a.input_type}</td>
                <td>{a.is_variant ? "Yes" : "No"}</td>
                <td>{a.is_required ? "Yes" : "No"}</td>
                <td className="px-6 text-right">
                  <button
                    onClick={() => {
                      setSelected(a);
                      setDrawerOpen(true);
                      setIsEditing(false);
                    }}
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="ml-3 text-red-500"
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
      {drawerOpen && selected && (
        <div className="fixed inset-0 bg-black/20 flex justify-end">
          <div className="w-[420px] bg-white p-6">
            <button onClick={() => setDrawerOpen(false)}>
              <FiX />
            </button>

            <h2 className="text-xl font-bold mt-4">
              {selected.attribute_label}
            </h2>

            {isEditing ? (
              <button
                onClick={handleSave}
                className="mt-6 w-full bg-[#852BAF] text-white py-3 rounded-xl"
              >
                <FiSave /> Save
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-6 w-full bg-black text-white py-3 rounded-xl"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
