import React, { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { ComponentType } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuillEditor from "../../../QuillEditor";
import { FaArrowLeft } from "react-icons/fa";

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
  FaImages,
  FaFileUpload,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

// const API_BASE = import.meta.env.VITE_API_URL;
import { api } from "../../../../api/api";
const API_BASEIMAGE_URL = "https://rewardplanners.com/api/crm";

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
  existingImages?: string[];
  removedImages?: string[];
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
  existingImages: [],
  removedImages: [],
};

const allowOnlyAlphabets = (value: string) => /^[A-Za-z ]*$/.test(value);

export default function EditProductPage() {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductData>(initialProductData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>(
    [],
  );
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [docFiles, setDocFiles] = useState<Record<number, File | null>>({});
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

  // --- Fetch data from API ---
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/category");

      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMainImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);

    setProduct((prev) => {
      const existingCount = prev.existingImages?.length || 0;
      const newCount = prev.productImages.length;

      if (existingCount + newCount + newFiles.length > 5) {
        setImageError("Maximum 5 images allowed (existing + new).");
        return prev;
      }

      const previews = newFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));

      return {
        ...prev,
        productImages: [...prev.productImages, ...previews],
      };
    });

    e.target.value = "";
    setImageError("");
  };

  const removeExistingMainImage = (img: string) => {
    setProduct((prev) => ({
      ...prev,
      existingImages: prev.existingImages?.filter((i) => i !== img),
      removedImages: [...(prev.removedImages || []), img],
    }));
  };

  const removeNewMainImage = (index: number) => {
    setProduct((prev) => {
      const imgs = [...prev.productImages];
      URL.revokeObjectURL(imgs[index].url);
      imgs.splice(index, 1);
      return { ...prev, productImages: imgs };
    });
  };

  // useEffect(() => {
  //   return () => {
  //     product.productImages.forEach((img) => URL.revokeObjectURL(img.url));
  //   };
  // }, [product.productImages]);

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

  // Fetch sub-subcategories when subcategory changes
  useEffect(() => {
    if (product.subCategoryId) {
      fetchSubSubCategories(product.subCategoryId);
    } else {
      setSubSubCategories([]);
      setProduct((prev) => ({ ...prev, subSubCategoryId: null }));
    }
  }, [product.subCategoryId]);

  const fetchSubCategories = async (categoryId: number) => {
    try {
      const res = await api.get(`/subcategory/${categoryId}`);

      if (res.data.success) {
        setSubCategories(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching subcategories:", err);
    }
  };

  const fetchSubSubCategories = async (subcategoryId: number) => {
    try {
      const res = await api.get(`/subsubcategory/${subcategoryId}`);

      if (res.data.success) {
        setSubSubCategories(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching sub-subcategories:", err);
    }
  };

  const fetchRequiredDocuments = async (categoryId: number) => {
    try {
      const res = await api.get(
        `/product/category/required_docs/${categoryId}`,
      );

      if (res.data.success) {
        setRequiredDocs(res.data.data || []);
        setDocFiles({});
      } else {
        setRequiredDocs([]);
      }
    } catch (err) {
      console.error("Error fetching category documents:", err);
      setRequiredDocs([]);
    }
  };

  const handleFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    /* ===== PRODUCT TEXT (ALPHABETS ONLY) ===== */
    const productAlphabetFields = ["productName", "brandName", "manufacturer"];

    if (productAlphabetFields.includes(name)) {
      if (!allowOnlyAlphabets(value)) return;
    }

    /* ===== CATEGORY LOGIC (UNCHANGED) ===== */
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

    /* ===== DEFAULT ===== */
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (!productId) return;
    fetchProductDetails(productId);
  }, [productId]);

  // character Limit
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

  const fetchProductDetails = async (id: string) => {
    try {
      setLoading(true);

      const res = await api.get(`/product/${id}`);
      const json = res.data;

      if (!json.success) {
        throw new Error(json.message || "Failed to fetch product");
      }

      const p = json.product;
      if (!p) throw new Error("Product not found");

      // Detect custom taxonomy
      const hasCustomCategory = !p.category_id && !!p.custom_category;
      const hasCustomSubcategory = !p.subcategory_id && !!p.custom_subcategory;
      const hasCustomSubSubcategory =
        !p.sub_subcategory_id && !!p.custom_sub_subcategory;

      // Set flags FIRST
      setIsCustomCategory(hasCustomCategory);
      setIsCustomSubcategory(hasCustomSubcategory);
      setIsCustomSubSubcategory(hasCustomSubSubcategory);

      // Set custom values
      setCustomCategory(p.custom_category || "");
      setCustomSubCategory(p.custom_subcategory || "");
      setCustomSubSubCategory(p.custom_sub_subcategory || "");

      // preload dropdowns
      if (p.category_id) {
        await fetchSubCategories(p.category_id);
        await fetchRequiredDocuments(p.category_id);
      }
      if (p.subcategory_id) {
        await fetchSubSubCategories(p.subcategory_id);
      }

      setProduct({
        productName: p.product_name || "",
        brandName: p.brand_name || "",
        manufacturer: p.manufacturer || "",
        gstSlab: p.gst_slab || "",
        hsnSacCode: p.hsn_sac_code || "",
        description: p.description || "",
        shortDescription: p.short_description || "",
        categoryId: p.category_id || null,
        subCategoryId: p.subcategory_id || null,
        subSubCategoryId: p.sub_subcategory_id || null,
        productImages: [],
        existingImages: p.images || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!product.categoryId && !custom_category.trim()) {
        throw new Error("Please select or enter a category");
      }

      if (
        !product.productName ||
        !product.brandName ||
        !product.manufacturer ||
        !product.gstSlab ||
        !product.hsnSacCode
      ) {
        throw new Error("Please fill in all required product information");
      }

      const formData = new FormData();
      if (!product.categoryId && !custom_category.trim()) {
        throw new Error("Please select or enter a category");
      }

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
      if (isCustomCategory) {
        formData.append("custom_category", custom_category.trim());
      }
      if (isCustomSubcategory) {
        formData.append("custom_subcategory", custom_subcategory.trim());
      }
      if (isCustomSubSubcategory) {
        formData.append("custom_sub_subcategory", custom_subsubcategory.trim());
      }

      formData.append("brandName", product.brandName);
      formData.append("manufacturer", product.manufacturer);
      formData.append("productName", product.productName);
      formData.append("gstSlab", product.gstSlab);
      formData.append("hsnSacCode", product.hsnSacCode);
      formData.append("description", product.description);
      formData.append("shortDescription", product.shortDescription);

      // Add main product images
      product.productImages.forEach(({ file }) => {
        formData.append("images", file);
      });

      formData.append(
        "removedMainImages",
        JSON.stringify(product.removedImages || []),
      );

      // Documents
      Object.entries(docFiles).forEach(([docId, file]) => {
        if (file) {
          formData.append(docId, file);
        }
      });

      // Submit to backend
      const response = await api.put(
        `/product/update-product/${productId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to update product");
      }

      setSuccess(`Product updated successfully! Product ID: ${data.productId}`);
      navigate("/vendor/products/list");
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-gray-900">
              Edit Product Details
            </h1>
            <p className="text-sm text-gray-600">
              Editing product ID: {productId}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg
      bg-[#852BAF] text-white transition-all duration-300
      hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78]
      cursor-pointer"
          >
            <FaArrowLeft /> Back
          </button>
        </div>

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
                  disabled
                  value={isCustomCategory ? "other" : product.categoryId || ""}
                  onChange={(e) => {
                    if (e.target.value === "other") {
                      setIsCustomCategory(true);
                      setProduct((prev) => ({ ...prev, categoryId: null }));
                    } else {
                      setIsCustomCategory(false);
                      setCustomCategory("");
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
                  disabled
                  value={
                    isCustomSubcategory ? "other" : product.subCategoryId || ""
                  }
                  onChange={(e) => {
                    if (e.target.value === "other") {
                      setIsCustomSubcategory(true);
                      setProduct((prev) => ({ ...prev, subCategoryId: null }));
                    } else {
                      setIsCustomSubcategory(false);
                      setCustomSubCategory("");
                      handleFieldChange(e);
                    }
                  }}
                  // disabled={!product.categoryId && !isCustomCategory}
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
                    placeholder="Enter new sub-category"
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
                  disabled
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
                  // disabled={!product.subCategoryId && !isCustomSubcategory}
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
                    placeholder="Enter new type"
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
                required
                value={product.gstSlab}
                onChange={handleFieldChange}
                placeholder="e.g. 5, 12, 18, 28"
              />

              <FormInput
                id="hsnSacCode"
                label="HSN / SAC Code"
                required
                value={product.hsnSacCode}
                onChange={handleFieldChange}
                placeholder="Enter HSN or SAC code"
              />
            </div>
          </section>

          {/* Product Description */}
          <section>
            {/* ===================== DETAILED DESCRIPTION ===================== */}
            <div className="mt-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Detailed Description <span className="text-red-500">*</span>
              </label>

              <QuillEditor
                value={product.description}
                placeholder="Describe the product, features, usage, specifications, etc."
                minHeight={300}
                onChange={(val) =>
                  setProduct((prev) => ({
                    ...prev,
                    description: val,
                  }))
                }
              />
            </div>

            {/* ===================== SHORT DESCRIPTION ===================== */}
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
          </section>

          {/* Main Product Images */}
          <section>
            <SectionHeader
              icon={FaImages}
              title="Product Images"
              description="Main images for product listing"
            />

            {product.existingImages && product.existingImages.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {product.existingImages?.map((img) => (
                  <div key={img} className="relative w-20 h-20 group">
                    <img
                      src={`${API_BASEIMAGE_URL}/uploads/${img}`}
                      className="w-full h-full object-cover border rounded"
                    />

                    <button
                      type="button"
                      onClick={() => removeExistingMainImage(img)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full
                 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center p-3 bg-white border border-gray-400 border-dashed rounded-lg">
              <span className="flex-1 text-sm text-gray-600">
                {product.productImages.length === 0
                  ? "No images chosen"
                  : `${product.productImages.length} image(s) selected`}
              </span>
              <label className="cursor-pointer bg-[#852BAF] text-white px-3 py-1 text-xs rounded-full hover:bg-[#7a1c94]">
                Choose Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*"
                  onChange={handleMainImages}
                />
              </label>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Upload additional product images (optional, max 5)
            </p>

            {imageError && (
              <p className="mt-1 text-xs text-red-500">{imageError}</p>
            )}

            {/* Image Previews */}
            {product.productImages.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {product.productImages.map((img, index) => (
                  <div
                    key={img.url}
                    className="relative w-20 h-20 border rounded overflow-hidden group"
                  >
                    <img
                      src={img.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Remove NEW main image */}
                    <button
                      type="button"
                      onClick={() => removeNewMainImage(index)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full
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
                  Updating...
                </>
              ) : (
                "Update Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
