import React, { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { ComponentType } from "react";
import { api } from "../../../../api/api";
import QuillEditor from "../../../QuillEditor";
import Swal from "sweetalert2";

type IconComp = ComponentType<any>;

interface ImagePreview {
  file: File;
  url: string;
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComp;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start space-x-3">
      <div
        className="p-3 text-white rounded-md"
        style={{ background: "linear-gradient(to right, #852BAF, #FC3F78)" }}
      >
        <Icon />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function FormInput(props: {
  id: string;
  label: string;
  value?: string | number;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const {
    id,
    label,
    value = "",
    onChange,
    type = "text",
    required,
    placeholder,
    error,
  } = props;
  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        className="p-3 transition duration-150 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-purple focus:border-brand-purple"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

import {
  FaTag,
  FaBox,
  FaImages,
  FaFileUpload,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

// --- Interfaces matching your backend ---
interface Category {
  category_id: number;
  category_name: string;
  variant_type?: string;
  is_custom?: boolean;
}

interface SubCategory {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
}

interface SubSubCategory {
  sub_subcategory_id: number;
  subcategory_id: number;
  name: string;
  attributes?: any;
}

interface RequiredDocument {
  document_id: number;
  document_name: string;
  status: number;
}

interface ProductData {
  productName: string;
  brandName: string;
  manufacturer: string;
  gstSlab: string;
  hsnSacCode: string;
  description: string;
  shortDescription: string;
  categoryId: number | null;
  subCategoryId: number | null;
  subSubCategoryId: number | null;
  productImages: ImagePreview[];
  isDiscountEligible: 1 | 0;
  isReturnable: 1 | 0;
  returnWindowDays: string;
  deliveryMinDays: string;
  deliveryMaxDays: string;
  shippingClass: "standard" | "bulky" | "fragile";
}

const initialProductData: ProductData = {
  brandName: "",
  manufacturer: "",
  productName: "",
  gstSlab: "",
  hsnSacCode: "",
  description: "",
  shortDescription: "",
  categoryId: null,
  subCategoryId: null,
  subSubCategoryId: null,
  productImages: [],
  isDiscountEligible: 1,
  isReturnable: 1,
  returnWindowDays: "",

  deliveryMinDays: "1",
  deliveryMaxDays: "3",
  shippingClass: "standard",
};

// --- UI Components ---
const allowOnlyAlphabets = (value: string) => {
  return /^[A-Za-z ]*$/.test(value);
};

export default function ProductListingDynamic() {
  const [product, setProduct] = useState<ProductData>(initialProductData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>(
    [],
  );
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [docFiles, setDocFiles] = useState<Record<number, File | null>>({}); // key by document_id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [isCustomSubSubcategory, setIsCustomSubSubcategory] = useState(false);
  const [imageError, setImageError] = useState("");
  const [custom_category, setCustomCategory] = useState("");
  const [custom_subcategory, setCustomSubCategory] = useState("");
  const [custom_subsubcategory, setCustomSubSubCategory] = useState("");
  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]);
  const [productAttributes, setProductAttributes] = useState<
    Record<string, any>
  >({});

  // --- Fetch data from API ---
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/category");
      if (res.data.success) setCategories(res.data.data);
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleMainImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);

    setProduct((prev) => {
      const existingImages = prev.productImages;

      if (existingImages.length + newFiles.length > 1) {
        setImageError("Only one cover image is allowed.");
        return prev;
      }

      const newPreviews = newFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));

      return {
        ...prev,
        productImages: [...existingImages, ...newPreviews],
      };
    });

    setImageError("");

    // reset input so same file can be selected again if needed
    e.target.value = "";
  };

  // Fetch subcategories when category changes
  useEffect(() => {
    if (product.categoryId) {
      fetchSubCategories(product.categoryId);
      fetchRequiredDocuments(product.categoryId);
    } else {
      setSubCategories([]);
      setSubSubCategories([]);
      setRequiredDocs([]);
      setDocFiles({});
    }
  }, [product.categoryId]);

  useEffect(() => {
    if (!product.subCategoryId) {
      setCategoryAttributes([]);
      setProductAttributes({});
      return;
    }

    const params = new URLSearchParams({
      categoryId: String(product.categoryId),
      subcategoryId: String(product.subCategoryId),
    });

    api.get(`/category/attributes?${params.toString()}`).then((res) => {
        if (res.data.success) {
          const attrs = res.data.data;
          setCategoryAttributes(attrs);

          setProductAttributes((prev) => {
            const next: Record<string, any> = {};

            attrs.forEach((attr: any) => {
              next[attr.attribute_key] = prev[attr.attribute_key] || [];
            });

            return next;
          });
        }
    });
  }, [product.subCategoryId]);

  useEffect(() => {
    if (product.subCategoryId) {
      fetchSubSubCategories(product.subCategoryId);
    } else {
      setSubSubCategories([]);
      setProduct((prev) => ({ ...prev, subSubCategoryId: null }));
    }
  }, [product.subCategoryId]);

  const fetchSubCategories = async (categoryId: number) => {
    const res = await api.get(`/subcategory/${categoryId}`);
    if (res.data.success) setSubCategories(res.data.data);
  };

  const fetchSubSubCategories = async (subcategoryId: number) => {
    const res = await api.get(`/subsubcategory/${subcategoryId}`);
    if (res.data.success) setSubSubCategories(res.data.data);
  };

  // FIXED: Using correct endpoint for required documents
  const fetchRequiredDocuments = async (categoryId: number) => {
    const res = await api.get(`/product/category/required_docs/${categoryId}`);
    if (res.data.success) {
      setRequiredDocs(res.data.data || []);
      setDocFiles({});
    }
  };

  // --- Form Handlers ---
  const handleFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    /* ================= PRODUCT TEXT FIELDS ================= */

    const productAlphabetFields = ["brandName", "manufacturer"];

    if (productAlphabetFields.includes(name)) {
      if (!allowOnlyAlphabets(value)) return;
    }

    /* ================= CATEGORY HANDLING ================= */
    if (name === "category_id") {
      setProduct((prev) => ({
        ...prev,
        categoryId: value ? Number(value) : null,
        subCategoryId: null,
        subSubCategoryId: null,
      }));
      return;
    }

    if (name === "subcategory_id") {
      setProduct((prev) => ({
        ...prev,
        subCategoryId: value ? Number(value) : null,
        subSubCategoryId: null,
      }));
      return;
    }

    if (name === "sub_subcategory_id") {
      setProduct((prev) => ({
        ...prev,
        subSubCategoryId: value ? Number(value) : null,
      }));
      return;
    }

    /* ================= DEFAULT ================= */
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Character Limit
  const CHAR_LIMIT = 150;

  const handleShortDescriptionChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const value = e.target.value;

    if (value.length <= CHAR_LIMIT) {
      setProduct((prev) => ({
        ...prev,
        shortDescription: value,
      }));
    }
  };

  const removeMainImage = (index: number) => {
    setProduct((prev) => {
      const updatedImages = [...prev.productImages];

      URL.revokeObjectURL(updatedImages[index].url);

      updatedImages.splice(index, 1);

      return {
        ...prev,
        productImages: updatedImages,
      };
    });
  };

  const onDocInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    documentId: number,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setDocFiles((prev) => ({ ...prev, [documentId]: file }));
  };

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingAttrs = categoryAttributes.filter((attr) => {
      if (attr.is_required !== 1) return false;

      const val = productAttributes[attr.attribute_key];

      return (
        !val ||
        !Array.isArray(val) ||
        val.length === 0 ||
        val.every((v) => !v || v.trim() === "")
      );
    });

    if (missingAttrs.length > 0) {
      setError(
        `Please fill required attributes: ${missingAttrs
          .map((a) => a.attribute_label)
          .join(", ")}`,
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please login.");
      }

      // Validate required fields
      if (!product.categoryId && !custom_category) {
        throw new Error("Please select a category");
      }

      if (!product.productName || !product.brandName || !product.manufacturer) {
        throw new Error("Please fill in all required product information");
      }

      // Validate required documents
      for (const doc of requiredDocs) {
        if (doc.status === 1 && !docFiles[doc.document_id]) {
          // status 1 = required
          throw new Error(
            `Please upload required document: ${doc.document_name}`,
          );
        }
      }

      // Validate at least one main image
      if (product.productImages.length === 0) {
        throw new Error("Cover image is required");
      }

      const formData = new FormData();

      if (product.categoryId) {
        formData.append("category_id", product.categoryId.toString());
      }
      if (product.subCategoryId) {
        formData.append("subcategory_id", product.subCategoryId.toString());
      }

      if (product.subSubCategoryId) {
        formData.append(
          "sub_subcategory_id",
          product.subSubCategoryId.toString(),
        );
      }

      if (isCustomCategory && custom_category.trim()) {
        formData.append("custom_category", custom_category.trim());
      }
      if (isCustomSubcategory)
        formData.append("custom_subcategory", custom_subcategory);
      if (isCustomSubSubcategory)
        formData.append("custom_sub_subcategory", custom_subsubcategory);

      // if (!product.gstSlab || !product.hsnSacCode) {
      //   throw new Error("GST Slab and HSN/SAC Code are required");
      // }

      formData.append("brandName", product.brandName);
      formData.append("manufacturer", product.manufacturer);
      formData.append("productName", product.productName);
      formData.append("description", product.description);
      formData.append("shortDescription", product.shortDescription);

      if (product.gstSlab) {
        formData.append("gstSlab", product.gstSlab);
      }

      if (product.hsnSacCode) {
        formData.append("hsnSacCode", product.hsnSacCode);
      }

      formData.append(
        "is_discount_eligible",
        String(product.isDiscountEligible),
      );

      formData.append("is_returnable", String(product.isReturnable));

      if (product.isReturnable === 1 && product.returnWindowDays) {
        formData.append("return_window_days", product.returnWindowDays);
      }

      formData.append("delivery_sla_min_days", product.deliveryMinDays);

      formData.append("delivery_sla_max_days", product.deliveryMaxDays);

      formData.append("shipping_class", product.shippingClass);

      // Add main product images
      product.productImages.forEach(({ file }) => {
        formData.append("images", file);
      });

      // Add document files - map document_id to field names
      Object.entries(docFiles).forEach(([docId, file]) => {
        if (file) {
          formData.append(docId, file);
        }
      });

      formData.append("attributes", JSON.stringify(productAttributes));

      // Submit to backend
      const res = await api.post("/product/create-product", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!res.data.success)
        throw new Error(res.data.message || "Failed to create product");

      Swal.fire({
        icon: "success",
        title: "Product Created!",
        text: "Your product has been listed successfully.",
        confirmButtonColor: "#852BAF",
      });
      setProduct(initialProductData);
      setDocFiles({});
      setRequiredDocs([]);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Components ---
  const renderDocUploads = () => {
    if (requiredDocs.length === 0) return null;

    return (
      <section>
        <SectionHeader
          icon={FaFileUpload}
          title="Required Documents"
          description="Upload documents required by category"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {requiredDocs.map((doc) => (
            <div
              key={doc.document_id}
              className="p-4 bg-white border rounded-lg shadow-sm"
            >
              <label className="block mb-2 text-sm font-medium text-gray-700">
                {doc.document_name}{" "}
                {doc.status === 1 && <span className="text-red-500">*</span>}
                {doc.status === 1 && (
                  <span className="ml-2 text-xs text-gray-500">(Required)</span>
                )}
                {doc.status !== 1 && (
                  <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                )}
              </label>
              <input
                type="file"
                accept=".pdf,image/*,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => onDocInputChange(e, doc.document_id)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#852BAF] file:text-white"
              />
              <div className="mt-2 text-xs text-gray-500">
                Accepted: PDF, DOC, DOCX, JPG, PNG
              </div>
              {docFiles[doc.document_id] && (
                <div className="mt-1 text-xs text-green-600">
                  ✓ {docFiles[doc.document_id]?.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // Get selected category name
  const getSelectedCategoryName = () => {
    const category = categories.find(
      (c) => c.category_id === product.categoryId,
    );
    return category?.category_name || "Not selected";
  };

  // Get selected subcategory name
  const getSelectedSubCategoryName = () => {
    const subcategory = subCategories.find(
      (s) => s.subcategory_id === product.subCategoryId,
    );
    return subcategory?.subcategory_name || "Not selected";
  };

  // Get selected sub-subcategory name
  const getSelectedSubSubCategoryName = () => {
    const subsubcategory = subSubCategories.find(
      (ss) => ss.sub_subcategory_id === product.subSubCategoryId,
    );
    return subsubcategory?.name || "Not selected";
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-[#852BAF]" />
        <span className="ml-4 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="p-6 premium-form" style={{ backgroundColor: "#FFFAFB" }}>
      <div className="p-6 mx-auto bg-white border border-gray-100 shadow-xl rounded-2xl max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          New Product Listing
        </h1>

        {error && (
          <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
            <p className="font-medium text-red-700">Error: {error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 mb-6 border border-green-200 rounded-lg bg-green-50">
            <p className="font-medium text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Category Selection */}
          <section>
            <SectionHeader
              icon={FaTag}
              title="Category Selection"
              description="Choose category, sub-category and type"
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Category */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>

                <select
                  name="category_id"
                  value={isCustomCategory ? "other" : product.categoryId || ""}
                  onChange={(e) => {
                    if (e.target.value === "other") {
                      setIsCustomCategory(true);
                      setIsCustomSubcategory(true);
                      setIsCustomSubSubcategory(true);

                      setProduct((prev) => ({
                        ...prev,
                        categoryId: null,
                        subCategoryId: null,
                        subSubCategoryId: null,
                      }));
                    } else {
                      setIsCustomCategory(false);
                      setIsCustomSubcategory(false);
                      setIsCustomSubSubcategory(false);

                      setCustomCategory("");
                      setCustomSubCategory("");
                      setCustomSubSubCategory("");

                      handleFieldChange(e);
                    }
                  }}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Select Category</option>

                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}

                  <option value="other">Other</option>
                </select>

                {isCustomCategory && (
                  <input
                    type="text"
                    value={custom_category}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter new category"
                    className="w-full p-3 mt-3 border rounded-lg"
                  />
                )}
              </div>

              {/* Sub Category */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Sub Category
                </label>

                <select
                  name="subcategory_id"
                  value={
                    isCustomSubcategory ? "other" : product.subCategoryId || ""
                  }
                  onChange={(e) => {
                    if (e.target.value === "other") {
                      setIsCustomSubcategory(true);
                      setIsCustomSubSubcategory(true);

                      setProduct((prev) => ({
                        ...prev,
                        subCategoryId: null,
                        subSubCategoryId: null,
                      }));
                    } else {
                      setIsCustomSubcategory(false);
                      setIsCustomSubSubcategory(false);
                      setCustomSubCategory("");
                      handleFieldChange(e);
                    }
                  }}
                  disabled={!product.categoryId && !isCustomCategory}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Select Sub Category</option>

                  {subCategories.map((s) => (
                    <option key={s.subcategory_id} value={s.subcategory_id}>
                      {s.subcategory_name}
                    </option>
                  ))}

                  <option value="other">Other</option>
                </select>

                {isCustomSubcategory && (
                  <input
                    type="text"
                    value={custom_subcategory}
                    onChange={(e) => setCustomSubCategory(e.target.value)}
                    placeholder="Enter custom sub-category"
                    className="w-full p-3 mt-3 border rounded-lg"
                  />
                )}
              </div>

              {/* Sub Sub Category */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Type / Sub-type
                </label>

                <select
                  name="sub_subcategory_id"
                  value={
                    isCustomSubSubcategory
                      ? "other"
                      : product.subSubCategoryId || ""
                  }
                  onChange={(e) => {
                    if (e.target.value === "other") {
                      setIsCustomSubSubcategory(true);
                      setProduct((prev) => ({
                        ...prev,
                        subSubCategoryId: null,
                      }));
                    } else {
                      setIsCustomSubSubcategory(false);
                      setCustomSubSubCategory("");
                      handleFieldChange(e);
                    }
                  }}
                  disabled={!product.subCategoryId && !isCustomSubcategory}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Select Type</option>

                  {subSubCategories.map((t) => (
                    <option
                      key={t.sub_subcategory_id}
                      value={t.sub_subcategory_id}
                    >
                      {t.name}
                    </option>
                  ))}

                  <option value="other">Other</option>
                </select>

                {isCustomSubSubcategory && (
                  <input
                    type="text"
                    value={custom_subsubcategory}
                    onChange={(e) => setCustomSubSubCategory(e.target.value)}
                    placeholder="Enter custom type / sub-type"
                    className="w-full p-3 mt-3 border rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Selected Categories Display */}
            {(product.categoryId ||
              product.subCategoryId ||
              product.subSubCategoryId) && (
              <div className="p-3 mt-4 border rounded-lg bg-gray-50">
                <h4 className="mb-2 font-medium text-gray-700">
                  Selected Categories:
                </h4>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">
                    {getSelectedCategoryName()}
                  </span>
                  {product.subCategoryId && (
                    <>
                      <span className="mx-2">›</span>
                      <span>{getSelectedSubCategoryName()}</span>
                    </>
                  )}
                  {product.subSubCategoryId && (
                    <>
                      <span className="mx-2">›</span>
                      <span>{getSelectedSubSubCategoryName()}</span>
                    </>
                  )}
                </div>
                {requiredDocs.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {requiredDocs.filter((doc) => doc.status === 1).length}{" "}
                    required document(s)
                  </div>
                )}
              </div>
            )}
          </section>
          {/* Product Identification */}
          <section>
            <SectionHeader
              icon={FaTag}
              title="Product Identification"
              description="Basic product information"
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <FormInput
                id="productName"
                label="Product Name"
                value={product.productName}
                onChange={handleFieldChange}
                placeholder="Type of product (e.g., Shoes, TV)"
              />
              <FormInput
                id="brandName"
                label="Brand"
                required
                value={product.brandName}
                onChange={handleFieldChange}
                placeholder="Nike, Samsung, Puma"
              />

              <FormInput
                id="manufacturer"
                label="Manufacturer"
                required
                value={product.manufacturer}
                onChange={handleFieldChange}
                placeholder="Manufacturer name"
              />

              <FormInput
                id="gstSlab"
                label="GST Slab (%)"
                type="number"
                value={product.gstSlab}
                onChange={handleFieldChange}
                placeholder="e.g. 5, 12, 18, 28"
              />

              <FormInput
                id="hsnSacCode"
                label="HSN / SAC Code"
                value={product.hsnSacCode}
                onChange={handleFieldChange}
                placeholder="Enter HSN or SAC code"
              />
            </div>
          </section>
          <section>
            <SectionHeader
              icon={FaBox}
              title="Product Attributes"
              description="Select available options for this product"
            />

            {/* Product Attributes */}
            {!isCustomCategory && categoryAttributes.length > 0 && (
              <div className="mt-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {categoryAttributes.map((attr) => {
                    const inputType = attr.input_type?.trim().toLowerCase();

                    return (
                      <div key={attr.attribute_key}>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                          {attr.attribute_label}
                          {attr.is_required === 1 && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>

                        {/* MULTISELECT */}
                        {inputType === "multiselect" && (
                          <div className="flex flex-wrap gap-2">
                            {(attr.options || []).map((opt: string) => {
                              const selected =
                                productAttributes[attr.attribute_key]?.includes(
                                  opt,
                                );

                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) => {
                                      const prevVals =
                                        productAttributes[attr.attribute_key] ||
                                        [];

                                      const newVals = e.target.checked
                                        ? [...prevVals, opt]
                                        : prevVals.filter(
                                            (v: string) => v !== opt,
                                          );

                                      setProductAttributes((prev) => ({
                                        ...prev,
                                        [attr.attribute_key]: newVals,
                                      }));
                                    }}
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* SELECT */}
                        {inputType === "select" && (
                          <select
                            required={attr.is_required === 1}
                            value={
                              (productAttributes[attr.attribute_key] ||
                                [])[0] || ""
                            }
                            onChange={(e) =>
                              setProductAttributes((prev) => ({
                                ...prev,
                                [attr.attribute_key]: [e.target.value],
                              }))
                            }
                            className="w-full p-2 border rounded-lg"
                          >
                            <option value="">
                              Select {attr.attribute_label}
                            </option>

                            {(attr.options || []).map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* NUMBER */}
                        {inputType === "number" && (
                          <input
                            type="number"
                            required={attr.is_required === 1}
                            value={
                              (productAttributes[attr.attribute_key] ||
                                [])[0] || ""
                            }
                            onChange={(e) =>
                              setProductAttributes((prev) => ({
                                ...prev,
                                [attr.attribute_key]: [e.target.value],
                              }))
                            }
                            className="w-full p-2 border rounded-lg"
                          />
                        )}

                        {/* TEXT */}
                        {inputType === "text" && (
                          <input
                            type="text"
                            required={attr.is_required === 1}
                            value={(
                              productAttributes[attr.attribute_key] || []
                            ).join(",")}
                            onChange={(e) =>
                              setProductAttributes((prev) => ({
                                ...prev,
                                [attr.attribute_key]: [e.target.value],
                              }))
                            }
                            className="w-full p-2 border rounded-lg"
                          />
                        )}

                        {/* TEXTAREA */}
                        {inputType === "textarea" && (
                          <textarea
                            required={attr.is_required === 1}
                            value={
                              (productAttributes[attr.attribute_key] ||
                                [])[0] || ""
                            }
                            onChange={(e) =>
                              setProductAttributes((prev) => ({
                                ...prev,
                                [attr.attribute_key]: [e.target.value],
                              }))
                            }
                            className="w-full p-2 border rounded-lg"
                            rows={3}
                            placeholder={attr.attribute_label}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Product Description */}
          <section>
            <SectionHeader
              icon={FaBox}
              title="Product Description"
              description="Describe the product in detail and add a short summary"
            />

            <div className="mt-4 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
              {/* Detailed Description */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Detailed Description <span className="text-red-500">*</span>
                </label>

                <QuillEditor
                  value={product.description}
                  placeholder="Describe your product, features, benefits, specifications, and usage instructions..."
                  minHeight={300}
                  onChange={(val) =>
                    setProduct((prev) => ({ ...prev, description: val }))
                  }
                />
              </div>

              {/* Short Description */}
              <div className="mt-6">
                <FormInput
                  id="shortDescription"
                  label="Short Description"
                  type="textarea"
                  required
                  value={product.shortDescription}
                  onChange={handleShortDescriptionChange}
                  placeholder="Short description (max 150 characters)"
                />

                <p
                  className={`mt-1 text-xs ${
                    product.shortDescription.length >= CHAR_LIMIT
                      ? "text-red-500"
                      : "text-gray-500"
                  }`}
                >
                  {product.shortDescription.length} / {CHAR_LIMIT} characters
                </p>
              </div>
            </div>
          </section>

          {/* Discount */}
          <section>
            <SectionHeader
              icon={FaTag}
              title="Pricing & Commercial Controls"
              description="Define discount eligibility and return policies"
            />

            <div className="mt-4 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Discount Eligible */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Discount Eligible
                  </label>
                  <select
                    name="isDiscountEligible"
                    value={product.isDiscountEligible}
                    onChange={(e) =>
                      setProduct((prev) => ({
                        ...prev,
                        isDiscountEligible: Number(e.target.value) as 1 | 0,
                      }))
                    }
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                  </select>
                </div>

                {/* Returnable */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Returnable
                  </label>
                  <select
                    name="isReturnable"
                    value={product.isReturnable}
                    onChange={(e) => {
                      const val = Number(e.target.value) as 1 | 0;
                      setProduct((prev) => ({
                        ...prev,
                        isReturnable: val,
                        returnWindowDays:
                          val === 0 ? "" : prev.returnWindowDays,
                      }));
                    }}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                  </select>
                </div>

                {/* Return Window */}
                {product.isReturnable === 1 && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Return Window (Days)
                    </label>
                    <input
                      type="number"
                      name="returnWindowDays"
                      value={product.returnWindowDays}
                      onChange={handleFieldChange}
                      min={1}
                      max={30}
                      placeholder="e.g. 7"
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Logistics */}
          <section>
            <SectionHeader
              icon={FaBox}
              title="Logistics & Fulfilment"
              description="Delivery timelines and shipping classification"
            />

            <div className="mt-4 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Delivery SLA */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Delivery SLA (Min Days)
                  </label>
                  <input
                    type="number"
                    name="deliveryMinDays"
                    value={product.deliveryMinDays}
                    onChange={handleFieldChange}
                    min={1}
                    placeholder="e.g. 3"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Delivery SLA (Max Days)
                  </label>
                  <input
                    type="number"
                    name="deliveryMaxDays"
                    value={product.deliveryMaxDays}
                    onChange={handleFieldChange}
                    min={1}
                    placeholder="e.g. 5"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                {/* Shipping Class */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Shipping Class
                  </label>
                  <select
                    name="shippingClass"
                    value={product.shippingClass}
                    onChange={handleFieldChange}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="standard">Standard</option>
                    <option value="bulky">Bulky</option>
                    <option value="fragile">Fragile</option>
                  </select>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Delivery timeline shown to customers as an estimate. Actual
                delivery may vary by location.
              </p>
            </div>
          </section>

          {/* Main Product Images */}
          <section>
            <SectionHeader
              icon={FaImages}
              title="Cover Image"
              description="Single cover image for product listing"
            />

            <div className="flex items-center p-3 bg-white border border-gray-400 border-dashed rounded-lg">
              <span className="flex-1 text-sm text-gray-600">
                {product.productImages.length === 0
                  ? "No cover image chosen"
                  : "1 cover image selected"}
              </span>
              <label
                className={`cursor-pointer px-3 py-1 text-xs rounded-full
    ${
      product.productImages.length >= 5
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-[#852BAF] hover:bg-[#7a1c94] text-white"
    }
  `}
              >
                Choose Files
                <input
                  type="file"
                  multiple
                  hidden
                  disabled={product.productImages.length >= 1}
                  accept="image/*"
                  onChange={handleMainImages}
                />
              </label>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Upload one high-quality cover image (required)
            </p>

            {imageError && (
              <p className="mt-1 text-xs text-red-500">{imageError}</p>
            )}

            {/* Image Previews */}

            {product.productImages.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {product.productImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 border rounded overflow-hidden group"
                  >
                    <img
                      src={img.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeMainImage(index)}
                      className="absolute top-1 right-1 bg-black/80 text-white rounded-full p-1
                     opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {/* Documents */}
          {renderDocUploads()}
          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center w-full px-6 py-3 text-lg font-bold text-white
             rounded-full transition-all duration-300 cursor-pointer
             bg-gradient-to-r from-[#852BAF] to-[#FC3F78]
             hover:bg-gradient-to-r hover:from-[#FC3F78] hover:to-[#852BAF]
             shadow-lg shadow-[#852BAF]/25 hover:shadow-xl
             active:scale-95
             disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
