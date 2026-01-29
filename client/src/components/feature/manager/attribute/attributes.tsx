import React, { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import { FiTrash2, FiEye, FiPlus, FiX, FiSave, FiLayers } from "react-icons/fi";
import { api } from "../../../../api/api";
import "datatables.net";
import "datatables.net-responsive";
import AttributeValueManager from "./attributeValueManager";

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
  category_name?: string | null;
  subcategory_name?: string | null;
  attribute_key: string;
  attribute_label: string;
  input_type: InputType | "";
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
  const dataTableRef = useRef<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.ceil(attributes.length / rowsPerPage);

  const paginatedAttributes = attributes.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

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
      })),
    );
  };

  const fetchSubcategories = async () => {
    const res = await api.get("/subcategory");
    setSubcategories(res.data.data || []);
  };

  const fetchAttributes = async () => {
    const res = await api.get("/manager/category-attributes", {
      params: {
        category_id: categoryId || undefined,
        subcategory_id: subcategoryId || undefined,
      },
    });
    setAttributes(res.data.data || []);
  };

  useEffect(() => {
    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy(true);
      }
    };
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  // useEffect(() => {
  //   fetchAttributes();
  // }, [categoryId, subcategoryId]);

  useEffect(() => {
    fetchAttributes();
  }, []);

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
      await api.delete(`/manager/category-attributes/${id}`);
      fetchAttributes();
      Swal.fire("Deleted", "", "success");
    } catch (err: any) {
      Swal.fire("Blocked", err.response?.data?.message, "error");
    }
  };

  const handleSave = async () => {
    if (!selected) return;

    try {
      await api.put(`/manager/category-attributes/${selected.id}`, {
        attribute_label: selected.attribute_label,
        is_variant: selected.is_variant,
        is_required: selected.is_required,
        sort_order: selected.sort_order,
      });

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
          onChange={(e) => setForm({ ...form, attribute_key: e.target.value })}
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
          className="col-span-2 flex items-center justify-center gap-2 bg-[#852BAF] text-white rounded-xl cursor-pointer"
        >
          <FiPlus /> Add Attribute
        </button>
      </form>

      {/* TABLE */}
      <div className="mt-10 bg-white rounded-2xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Category</th>
              <th>Subcategory</th>
              <th>Key</th>
              <th>Label</th>
              <th>Type</th>
              <th>Variant</th>
              <th>Required</th>
              <th className="text-right px-6">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedAttributes.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium">
                  {a.category_name || "-"}
                </td>

                <td>{a.subcategory_name || "-"}</td>

                <td className="font-mono text-gray-700">{a.attribute_key}</td>
                <td>{a.attribute_label}</td>
                <td>{a.input_type || "-"}</td>

                <td>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      a.is_variant
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.is_variant ? "Yes" : "No"}
                  </span>
                </td>

                <td>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      a.is_required
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.is_required ? "Yes" : "No"}
                  </span>
                </td>

                <td className="px-6 text-right">
                  <button
                    className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelected(a);
                      setDrawerOpen(true);
                    }}
                  >
                    <FiEye />
                  </button>

                  <button
                    onClick={() => handleDelete(a.id)}
                    className="ml-2 p-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
            {Math.min(currentPage * rowsPerPage, attributes.length)} of{" "}
            {attributes.length} entries
          </div>

          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 rounded border disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded border cursor-pointer ${
                  currentPage === i + 1 ? "bg-[#852BAF] text-white" : "bg-white"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded border disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER */}
      {drawerOpen && selected && (
        <div className="fixed inset-0 bg-black/20 flex justify-end">
          <div className="w-[420px] bg-white p-6">
            <button
              className="cursor-pointer"
              onClick={() => setDrawerOpen(false)}
            >
              <FiX />
            </button>

            <h2 className="text-xl font-bold mt-4">Edit Attribute</h2>

            <div className="mt-6 space-y-4">
              {/* Label (readonly) */}
              <div>
                <label className="text-xs text-gray-500">Attribute Label</label>
                <input
                  value={selected.attribute_label}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      attribute_label: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                />
              </div>

              {/* Is Variant */}
              <div className="flex items-center justify-between">
                <label className="font-medium">Is Variant Attribute</label>
                <input
                  type="checkbox"
                  checked={selected.is_variant === 1}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      is_variant: e.target.checked ? 1 : 0,
                    })
                  }
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Is Required */}
              <div className="flex items-center justify-between">
                <label className="font-medium">Is Required</label>
                <input
                  type="checkbox"
                  checked={selected.is_required === 1}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      is_required: e.target.checked ? 1 : 0,
                    })
                  }
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-xs text-gray-500">Sort Order</label>
                <input
                  type="number"
                  value={selected.sort_order}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      sort_order: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                />
              </div>

              {(selected.input_type === "select" ||
                selected.input_type === "multiselect") && (
                <AttributeValueManager attributeId={selected.id} />
              )}
            </div>

            <button
              onClick={handleSave}
              className="mt-8 w-full bg-[#852BAF] text-white py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <FiSave /> Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
