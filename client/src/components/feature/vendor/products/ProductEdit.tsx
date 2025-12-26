"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaTag,
  FaBox,
  FaDollarSign,
  FaImages,
  FaFileUpload,
  FaPlus,
  FaTrash,
  FaTimes,
  FaCheck,
  FaSpinner,
} from "react-icons/fa";

const API_BASE_URL = "http://localhost:5000/api";
const API_BASEIMAGE_URL = "http://localhost:5000";

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

interface DocumentType {
  document_id: number;
  document_name: string;
  status: number;
  document_key?: string;
}

interface RequiredDocument {
  document_id: number;
  document_name: string;
  status: number;
}

interface Variant {
  variant_id: string | number;
  size: string;
  color: string;
  dimension: string;
  weight: string;
  customAttributes: Record<string, any>;
  MRP: string | number;
  salesPrice: string | number;
  stock: string | number;
  sku: string;
  expiryDate: string;
  manufacturingYear: string;
  materialType: string;
  images: File[];
  existingImages?: string[];
}

interface ProductData {
  productName: string;
  brandName: string;
  manufacturer: string;
  barCode: string;
  description: string;
  shortDescription: string;
  categoryId: number | null;
  subCategoryId: number | null;
  subSubCategoryId: number | null;
  gstIn?: string;
  variants: Variant[];
  productImages: File[];
  existingImages?: string[];
}

const initialProductData: ProductData = {
  brandName: "",
  manufacturer: "",
  barCode: "",
  productName: "",
  description: "",
  shortDescription: "",
  categoryId: null,
  subCategoryId: null,
  subSubCategoryId: null,
  gstIn: "",
  variants: [
    {
      variant_id: "",
      size: "",
      color: "",
      dimension: "",
      weight: "",
      customAttributes: {},
      MRP: "",
      salesPrice: "",
      stock: "",
      sku: "",
      expiryDate: "",
      manufacturingYear: "",
      materialType: "",
      images: [],
    },
  ],
  productImages: [],
};

const allowOnlyAlphabets = (value: string) => /^[A-Za-z ]*$/.test(value);
const allowOnlyNumbers = (value: string) => /^[0-9]*$/.test(value);
const allowOnlyDecimal = (value: string) => /^\d*\.?\d*$/.test(value);
const allowOnlyDimensionFormat = (value: string) => /^[0-9.*]*$/.test(value);

const FormInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = "",
  className = "",
}: any) => (
  <div className="flex flex-col space-y-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {type === "textarea" ? (
      <textarea
        id={id}
        rows={4}
        name={id}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#852BAF] focus:border-[#852BAF] ${className}`}
      />
    ) : (
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#852BAF] focus:border-[#852BAF] ${className}`}
      />
    )}
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }: any) => (
  <div className="flex items-center pb-2 mb-4 space-x-3 border-b">
    <Icon className="text-2xl" style={{ color: "#852BAF" }} />
    <div>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

export default function EditProductPage() {
  const params = useParams();
  const productId = Array.isArray(params.productId)
    ? params.productId[0]
    : params.productId;
  const router = useRouter();

  const [product, setProduct] = useState<ProductData>(initialProductData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>(
    []
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
      const res = await fetch(`${API_BASE_URL}/category`);
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
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

    const files = Array.from(e.target.files);

    if (files.length > 5) {
      setImageError("You can select a maximum of 5 images.");
      return;
    }

    setImageError("");
    setProduct((prev) => ({
      ...prev,
      productImages: files,
    }));
  };

  useEffect(() => {
    return () => {
      product.productImages.forEach((file) => URL.revokeObjectURL(file));
    };
  }, [product.productImages]);

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
      const res = await fetch(`${API_BASE_URL}/subcategory/${categoryId}`);

      const json = await res.json();
      if (json.success) {
        setSubCategories(json.data);
      }
    } catch (err) {
      console.error("Error fetching subcategories:", err);
    }
  };

  const fetchSubSubCategories = async (subcategoryId: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/subsubcategory/${subcategoryId}`
      );
      const json = await res.json();
      if (json.success) {
        setSubSubCategories(json.data);
      }
    } catch (err) {
      console.error("Error fetching sub-subcategories:", err);
    }
  };

  // FIXED: Using correct endpoint for required documents
  const fetchRequiredDocuments = async (categoryId: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/product/category/required_docs/${categoryId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      if (json.success) {
        setRequiredDocs(json.data || []);
        // Clear any previously selected doc files
        setDocFiles({});
      } else {
        console.error("Failed to fetch documents:", json.message);
        setRequiredDocs([]);
      }
    } catch (err) {
      console.error("Error fetching category documents:", err);
      setRequiredDocs([]);
    }
  };

  const handleFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    /* ===== GST % ===== */
    if (name === "gstIn") {
      if (!allowOnlyDecimal(value)) return;
      if (value && Number(value) > 100) return;

      setProduct((prev) => ({ ...prev, gstIn: value }));
      return;
    }

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

  const fetchProductDetails = async (id: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/product/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const p = json.product;
      if (!p) {
        throw new Error("Product not found");
      }

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
        barCode: p.barcode || "",
        gstIn: p.gst || "",
        description: p.description || "",
        shortDescription: p.short_description || "",
        categoryId: p.category_id || null,
        subCategoryId: p.subcategory_id || null,
        subSubCategoryId: p.sub_subcategory_id || null,
        productImages: [],
        existingImages: p.images || [],
        variants:
          p.variants?.length > 0
            ? p.variants.map((v: any) => ({
                variant_id: v.variant_id,
                size: v.size || "",
                color: v.color || "",
                dimension: v.dimension || "",
                weight: v.weight || "",
                MRP: v.mrp || "",
                salesPrice: v.sale_price || "",
                stock: v.stock || "",
                sku: v.sku || "",
                manufacturingYear:
                  typeof v.manufacturing_date === "string"
                    ? v.manufacturing_date.substring(0, 10)
                    : "",

                expiryDate:
                  typeof v.expiry_date === "string"
                    ? v.expiry_date.substring(0, 10)
                    : "",

                materialType: v.material_type || "",
                customAttributes: v.custom_attributes || {},
                images: [],
                existingImages: v.images || [],
              }))
            : [...initialProductData.variants],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    /* ================= HARD BLOCK ================= */

    // Decimal numbers
    if (["MRP", "salesPrice", "weight"].includes(field)) {
      if (!/^\d*\.?\d*$/.test(value)) return;
    }

    // Integers only
    if (field === "stock") {
      if (!/^\d*$/.test(value)) return;
    }

    // Alphabets only
    if (field === "color" || field === "materialType") {
      if (!/^[A-Za-z ]*$/.test(value)) return;
    }

    // Dimension (numbers + * + .)
    if (field === "dimension") {
      if (!/^[0-9.*]*$/.test(value)) return;
    }

    /* ================= DATE VALIDATION ================= */

    // Manufacturing date
    if (field === "manufacturingYear") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mfg = new Date(value);
      mfg.setHours(0, 0, 0, 0);

      if (mfg >= today) return;

      const expiry = product.variants[index].expiryDate;
      if (expiry) {
        const exp = new Date(expiry);
        exp.setHours(0, 0, 0, 0);
        if (mfg >= exp) return;
      }
    }

    // Expiry date
    if (field === "expiryDate") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const exp = new Date(value);
      exp.setHours(0, 0, 0, 0);

      if (exp <= today) return;

      const mfg = product.variants[index].manufacturingYear;
      if (mfg) {
        const mfgDate = new Date(mfg);
        mfgDate.setHours(0, 0, 0, 0);
        if (exp <= mfgDate) return;
      }
    }

    /* ================= STATE UPDATE ================= */

    const updatedVariants = [...product.variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value,
    };

    setProduct((prev) => ({
      ...prev,
      variants: updatedVariants,
    }));
  };

  const handleVariantAttributeChange = (
    variantIndex: number,
    attrName: string,
    value: any
  ) => {
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].customAttributes = {
      ...updatedVariants[variantIndex].customAttributes,
      [attrName]: value,
    };
    setProduct((prev) => ({ ...prev, variants: updatedVariants }));
  };

  const handleVariantImages = (
    variantIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (files.length > 5) {
      alert("You can select a maximum of 5 images.");
      return;
    }

    setProduct((prev) => {
      const updatedVariants = [...prev.variants];
      updatedVariants[variantIndex].images = files;
      return { ...prev, variants: updatedVariants };
    });
  };

  const addVariant = () => {
    setProduct((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          variant_id: "",
          size: "",
          color: "",
          dimension: "",
          weight: "",
          customAttributes: {},
          MRP: "",
          salesPrice: "",
          stock: "",
          sku: "",
          expiryDate: "",
          manufacturingYear: "",
          materialType: "",
          images: [],
          existingImages: [],
        },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    if (product.variants.length <= 1) {
      alert("At least one variant is required");
      return;
    }
    setProduct((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const onDocInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    documentId: number
  ) => {
    const file = e.target.files?.[0] ?? null;
    setDocFiles((prev) => ({ ...prev, [documentId]: file }));
  };

  // Get attributes for selected sub-subcategory
  const getSelectedAttributes = () => {
    if (!product.subSubCategoryId) return null;

    const found = subSubCategories.find(
      (s) => s.sub_subcategory_id === product.subSubCategoryId
    );

    return (
      found?.attributes || {
        variation_types: [],
        sizes: [],
        colors: [],
        attributes: {},
      }
    );
  };

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please login.");
      }

      // Validate required fields
      if (!product.categoryId && !custom_category.trim()) {
        throw new Error("Please select or enter a category");
      }

      if (!product.productName || !product.brandName || !product.manufacturer) {
        throw new Error("Please fill in all required product information");
      }

      // Validate variants
      if (product.variants.length === 0) {
        throw new Error("Please add at least one variant");
      }

      for (const variant of product.variants) {
        if (
          !variant.salesPrice ||
          parseFloat(variant.salesPrice as string) <= 0
        ) {
          throw new Error("Please enter valid sales price for all variants");
        }

        if (!variant.stock || parseInt(variant.stock as string) < 0) {
          throw new Error("Please enter valid stock quantity for all variants");
        }
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
          product.subSubCategoryId.toString()
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
      formData.append("barCode", product.barCode || "");
      formData.append("productName", product.productName);
      formData.append("description", product.description);
      formData.append("shortDescription", product.shortDescription);
      if (product.gstIn) formData.append("gstIn", product.gstIn);

      // Add main product images
      product.productImages.forEach((file, index) => {
        formData.append("images", file);
      });

      Object.entries(docFiles).forEach(([docId, file]) => {
        if (file) {
          formData.append(docId, file);
        }
      });

      const variantsPayload = product.variants.map((variant, index) => ({
        variant_id: variant.variant_id,
        expiryDate: variant.expiryDate,
        manufacturingYear: variant.manufacturingYear,
        materialType: variant.materialType,
        size: variant.size,
        color: variant.color,
        dimension: variant.dimension,
        weight: variant.weight,
        mrp: variant.MRP,
        salesPrice: variant.salesPrice,
        stock: variant.stock,
        customAttributes: variant.customAttributes,
      }));

      formData.append("variants", JSON.stringify(variantsPayload));

      // Add variant images
      product.variants.forEach((variant, index) => {
        variant.images.forEach((file, imgIndex) => {
          formData.append(`variant_${index}_${imgIndex}`, file);
        });
      });

      // Submit to backend
      const response = await fetch(
        `${API_BASE_URL}/product/update-product/${productId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create product");
      }

      setSuccess(`Product updated successfully! Product ID: ${data.productId}`);
      router.push("/src/vendor/products/list");
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

  const renderVariantBuilder = () => {
    const attributes = getSelectedAttributes();

    return (
      <section>
        <SectionHeader
          icon={FaBox}
          title="Product Variants"
          description="Configure product variants"
        />

        {product.variants.map((variant, index) => (
          <div
            key={index}
            className="p-6 mb-6 border shadow-sm rounded-xl bg-gray-50"
          >
            <div className="flex items-center justify-between mb-4">
              {product.variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              )}
            </div>

            {/* === ALWAYS SHOW SIMPLE INPUTS === */}
            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
              {/* Size */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Size
                </label>
                <input
                  type="text"
                  value={variant.size}
                  onChange={(e) =>
                    handleVariantChange(index, "size", e.target.value)
                  }
                  placeholder="Enter Size / capacity / volume"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Color
                </label>
                <input
                  type="text"
                  value={variant.color}
                  onChange={(e) =>
                    handleVariantChange(index, "color", e.target.value)
                  }
                  placeholder="Enter Color"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Material Type */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Material Type
                </label>
                <input
                  type="text"
                  value={variant.materialType}
                  onChange={(e) =>
                    handleVariantChange(index, "materialType", e.target.value)
                  }
                  placeholder="Enter Material Type"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Dimension */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Dimension
                </label>
                <input
                  type="text"
                  value={variant.dimension}
                  onChange={(e) =>
                    handleVariantChange(index, "dimension", e.target.value)
                  }
                  placeholder="12x10x5 cm"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Weight (In Grams)
                </label>
                <input
                  type="text"
                  value={variant.weight}
                  onChange={(e) =>
                    handleVariantChange(index, "weight", e.target.value)
                  }
                  placeholder="1000g"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* MRP */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  MRP
                </label>
                <input
                  type="number"
                  value={variant.MRP}
                  onChange={(e) =>
                    handleVariantChange(index, "MRP", e.target.value)
                  }
                  placeholder="Enter MRP"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Sales Price */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Sales Price
                </label>
                <input
                  type="number"
                  value={variant.salesPrice}
                  onChange={(e) =>
                    handleVariantChange(index, "salesPrice", e.target.value)
                  }
                  placeholder="Enter Sales Price"
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  value={variant.stock}
                  onChange={(e) =>
                    handleVariantChange(index, "stock", e.target.value)
                  }
                  placeholder="Enter Stock / Unit"
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              {/* Manufacturing Year */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Manufacturing Year
                </label>
                <input
                  type="date"
                  value={variant.manufacturingYear || ""}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    handleVariantChange(
                      index,
                      "manufacturingYear",
                      e.target.value
                    )
                  }
                  placeholder="Enter Manufacturing Year"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={variant.expiryDate || ""}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  onChange={(e) =>
                    handleVariantChange(index, "expiryDate", e.target.value)
                  }
                  placeholder="Enter Expiry Date"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            {variant.existingImages && variant.existingImages.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Existing images</p>
                <div className="flex gap-2 flex-wrap">
                  {variant.existingImages.map((img, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={`${API_BASEIMAGE_URL}/uploads/${img}`}
                      alt={`Variant ${index + 1} image ${imgIndex + 1}`}
                      className="w-16 h-16 object-cover border rounded"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Variant Images */}
            <div className="mt-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Variant Images
              </label>

              <div className="flex items-center p-3 bg-white border border-gray-400 border-dashed rounded-lg">
                <span className="flex-1 text-sm text-gray-600">
                  {variant.images.length === 0
                    ? "No images chosen"
                    : `${variant.images.length} image(s) selected`}
                </span>
                <label className="cursor-pointer bg-[#852BAF] text-white px-3 py-1 text-xs rounded-full hover:bg-[#7a1c94]">
                  Choose Files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleVariantImages(index, e)}
                  />
                </label>
              </div>

              {/* Image Previews */}
              {variant.images.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {variant.images.map((file, imgIndex) => {
                    const url = URL.createObjectURL(file);
                    return (
                      <div
                        key={imgIndex}
                        className="w-20 h-20 border rounded overflow-hidden"
                      >
                        <img
                          src={url}
                          alt={`Variant ${index + 1} - Image ${imgIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addVariant}
          className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#852BAF] hover:bg-purple-50"
        >
          <FaPlus className="mr-2 text-[#852BAF]" />
          Add Another Variant
        </button>
      </section>
    );
  };

  // Get selected category name
  const getSelectedCategoryName = () => {
    const category = categories.find(
      (c) => c.category_id === product.categoryId
    );
    return category?.category_name || "Not selected";
  };

  // Get selected subcategory name
  const getSelectedSubCategoryName = () => {
    const subcategory = subCategories.find(
      (s) => s.subcategory_id === product.subCategoryId
    );
    return subcategory?.subcategory_name || "Not selected";
  };

  // Get selected sub-subcategory name
  const getSelectedSubSubCategoryName = () => {
    const subsubcategory = subSubCategories.find(
      (ss) => ss.sub_subcategory_id === product.subSubCategoryId
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
    <div className="p-6" style={{ backgroundColor: "#FFFAFB" }}>
      <div className="p-6 mx-auto bg-white border border-gray-100 shadow-xl rounded-2xl max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          Edit Product Details
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
                name="productName"
                label="Product Name"
                value={product.productName}
                onChange={handleFieldChange}
                placeholder="Type of product (e.g., Shoes, TV)"
              />
              <FormInput
                id="brandName"
                name="brandName"
                label="Brand"
                required
                value={product.brandName}
                onChange={handleFieldChange}
                placeholder="Nike, Samsung, Puma"
              />

              <FormInput
                id="manufacturer"
                name="manufacturer"
                label="Manufacturer"
                required
                value={product.manufacturer}
                onChange={handleFieldChange}
                placeholder="Manufacturer name"
              />

              <FormInput
                id="barCode"
                name="barCode"
                label="Barcode"
                value={product.barCode}
                onChange={handleFieldChange}
                placeholder="EAN/Code"
              />

              <FormInput
                id="gstIn"
                name="gstIn"
                label="GST"
                value={product.gstIn}
                onChange={handleFieldChange}
                placeholder="GST"
              />
            </div>
          </section>

          {/* Product Description */}
          <section>
            {renderVariantBuilder()}

            <FormInput
              id="description"
              name="description"
              label="Detailed Description"
              type="textarea"
              required
              value={product.description}
              onChange={handleFieldChange}
              placeholder="Write detailed product info..."
            />

            <div className="mt-4">
              <FormInput
                id="shortDescription"
                name="shortDescription"
                label="Short Description"
                required
                value={product.shortDescription}
                onChange={handleFieldChange}
                placeholder="Short one-line description"
              />
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
                {product.existingImages.map((img, i) => (
                  <img
                    key={i}
                    src={`${API_BASEIMAGE_URL}/uploads/${img}`}
                    className="w-20 h-20 object-cover border rounded"
                  />
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
                {product.productImages.map((file, index) => {
                  const url = URL.createObjectURL(file);
                  return (
                    <div
                      key={index}
                      className="w-20 h-20 border rounded overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
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
              className="flex items-center justify-center w-full px-6 py-3 text-lg font-bold text-white transition-all duration-200 rounded-full shadow-md disabled:opacity-50 hover:shadow-lg"
              style={{
                background: "linear-gradient(to right, #852BAF, #FC3F78)",
              }}
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