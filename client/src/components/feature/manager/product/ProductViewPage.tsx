import React, { useEffect, useState } from "react";
import {
  FaTag,
  FaImages,
  FaFileUpload,
  FaSpinner,
  FaArrowLeft,
  FaDownload,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

/* ================= CONFIG ================= */
const API_BASE: string = import.meta.env.VITE_API_URL;

/* ================= TYPES ================= */

interface VariantView {
  size?: string;
  color?: string;
  dimension?: string;
  customAttributes?: Record<string, unknown>;
  MRP?: string | number;
  salesPrice?: string | number;
  stock?: string | number;
  expiryDate?: string;
  manufacturingYear?: string;
  materialType?: string;
  images?: string[];
}

interface RequiredDoc {
  id: number;
  document_name: string;
  status: string;
  mime_type: string;
  file_path: string;
}

interface ProductView {
  productId?: number | string;
  productName?: string;
  brandName?: string;
  manufacturer?: string;
  barCode?: string;
  description?: string;
  shortDescription?: string;
  categoryName?: string | null;
  subCategoryName?: string | null;
  subSubCategoryName?: string | null;
  gstIn?: string;
  product_status?: string;
  variants?: VariantView[];
  productImages?: string[];
  requiredDocs?: RequiredDoc[];
}

/* ================= SMALL COMPONENTS ================= */

interface FormInputProps {
  id: string;
  label: string;
  value?: string | number;
  type?: "text" | "textarea";
}

const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  value,
  type = "text",
}) => (
  <div className="flex flex-col space-y-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    {type === "textarea" ? (
      <textarea
        readOnly
        rows={4}
        value={value ?? ""}
        className="p-3 border rounded-lg bg-gray-50"
      />
    ) : (
      <input
        readOnly
        value={value ?? ""}
        className="p-3 border rounded-lg bg-gray-50"
      />
    )}
  </div>
);

interface SectionHeaderProps {
  icon: React.FC<any>;
  title: string;
  description: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="flex items-center pb-2 mb-4 space-x-3 border-b">
    <Icon className="text-2xl text-[#852BAF]" />
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

/* ================= MAIN COMPONENT ================= */

const ProductViewPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= HELPERS ================= */

  const resolveImageUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API_BASE}/uploads/${path.replace(/^\/+/, "")}`;
  };

  const downloadFile = (url: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!productId) {
      setError("Product ID missing in route");
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/product/${productId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (!res.ok) throw new Error("Failed to load product");

        const json = await res.json();
        const raw = json.data ?? json.product ?? json;

        const mapped: ProductView = {
          productId: raw.product_id,
          productName: raw.product_name,
          brandName: raw.brand_name,
          manufacturer: raw.manufacturer,
          barCode: raw.barcode,
          gstIn: raw.gst,
          description: raw.description,
          shortDescription: raw.short_description,
          categoryName: raw.category_name ?? raw.custom_category,
          subCategoryName: raw.subcategory_name ?? raw.custom_subcategory,
          subSubCategoryName:
            raw.sub_subcategory_name ?? raw.custom_sub_subcategory,
          productImages: raw.productImages ?? raw.images ?? [],
          variants: raw.variants ?? [],
          requiredDocs: raw.documents ?? [],
        };

        setProduct(mapped);
      } catch (err: any) {
        setError(err.message || "Error loading product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  /* ================= STATES ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-[#852BAF]" />
        <span className="ml-3">Loading product...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-700 border rounded bg-red-50">
        {error}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-yellow-700 border rounded bg-yellow-50">
        No product found
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 bg-[#FFFAFB]">
      <div className="p-6 mx-auto bg-white border shadow-xl max-w-7xl rounded-2xl">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Product Review</h1>
            <p className="text-sm text-gray-600">
              Viewing product ID: {product.productId}
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <FaArrowLeft /> Back
          </button>
        </div>

        {/* CATEGORY */}
        <SectionHeader
          icon={FaTag}
          title="Category Selection"
          description="Category and classification"
        />

        <div className="grid gap-6 md:grid-cols-3">
          <FormInput label="Category" id="cat" value={product.categoryName} />
          <FormInput
            label="Sub Category"
            id="sub"
            value={product.subCategoryName}
          />
          <FormInput
            label="Type"
            id="type"
            value={product.subSubCategoryName}
          />
        </div>

        {/* BASIC INFO */}
        <section className="mt-6">
          <SectionHeader
            icon={FaTag}
            title="Product Identification"
            description="Basic product details"
          />

          <div className="grid gap-5 md:grid-cols-3">
            <FormInput label="Product Name" id="name" value={product.productName} />
            <FormInput label="Brand Name" id="brand" value={product.brandName} />
            <FormInput label="Manufacturer" id="man" value={product.manufacturer} />
            <FormInput label="Barcode" id="bar" value={product.barCode} />
            <FormInput label="GST" id="gst" value={product.gstIn} />
          </div>
        </section>

        {/* PRODUCT IMAGES */}
        <section className="mt-6">
          <SectionHeader
            icon={FaImages}
            title="Product Images"
            description="Main listing images"
          />

          <div className="flex flex-wrap gap-2">
            {product.productImages?.length ? (
              product.productImages.map((img, i) => {
                const url = resolveImageUrl(img);
                return (
                  <div
                    key={i}
                    className="relative w-20 h-20 overflow-hidden border rounded group"
                  >
                    <img
                      src={url}
                      className="object-cover w-full h-full"
                    />
                    <button
                      onClick={() => downloadFile(url, `product-${i + 1}.jpg`)}
                      className="absolute p-1 text-white rounded opacity-0 bottom-1 right-1 bg-black/60 group-hover:opacity-100"
                    >
                      <FaDownload />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No images</p>
            )}
          </div>
        </section>

        {/* DOCUMENTS */}
        {product.requiredDocs?.length && (
          <section className="mt-6">
            <SectionHeader
              icon={FaFileUpload}
              title="Documents"
              description="Uploaded documents"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {product.requiredDocs.map((doc) => {
                const url = resolveImageUrl(doc.file_path);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{doc.document_name}</div>
                      <div className="text-xs text-gray-500">
                        {doc.mime_type}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadFile(url, doc.document_name)}
                      className="px-3 py-1.5 text-white bg-[#852BAF] rounded"
                    >
                      <FaDownload />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductViewPage;
"use client";

import React, { useEffect, useState } from "react";
import {
  FaTag,
  FaBox,
  FaImages,
  FaFileUpload,
  FaSpinner,
  FaArrowLeft,
  FaEdit,
  FaDownload,
} from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:5000/api";
const API_BASEIMAGE_URL = "http://localhost:5000";

interface VariantView {
  size?: string;
  color?: string;
  dimension?: string;
  customAttributes?: Record<string, any>;
  MRP?: string | number;
  salesPrice?: string | number;
  stock?: string | number;
  expiryDate?: string;
  manufacturingYear?: string;
  materialType?: string;
  images?: string[]; // URLs
}

interface ProductView {
  productId?: number | string;
  productName?: string;
  brandName?: string;
  manufacturer?: string;
  barCode?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: number | null;
  subCategoryId?: number | null;
  subSubCategoryId?: number | null;
  categoryName?: string | null;
  subCategoryName?: string | null;
  subSubCategoryName?: string | null;
  gstIn?: string;
  product_status?: string;
  variants?: VariantView[];
  productImages?: string[];
  requiredDocs?: Array<{
    id: number;
    document_name: string;
    status: string;
    url?: string;
    mime_type: string;
    file_path: string;
  }>;
}

const FormInput = ({
  id,
  label,
  type = "text",
  value,
  placeholder = "",
}: any) => (
  <div className="flex flex-col space-y-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    {type === "textarea" ? (
      <textarea
        id={id}
        rows={4}
        name={id}
        value={value ?? ""}
        placeholder={placeholder}
        readOnly
        className={`p-3 border border-gray-300 rounded-lg bg-gray-50`}
      />
    ) : (
      <input
        type={type}
        id={id}
        name={id}
        value={value ?? ""}
        placeholder={placeholder}
        readOnly
        className={`p-3 border border-gray-300 rounded-lg bg-gray-50`}
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

export default function ReviewProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const { productId } = params;
  const router = useRouter();

  const [product, setProduct] = useState<ProductView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setError("Product ID not provided in route.");
      setLoading(false);
      return;
    }
    fetchProduct(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const resolveImageUrl = (path?: string) => {
    if (!path) return "";

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    return `${API_BASEIMAGE_URL}/uploads/${path.replace(/^\/+/, "")}`;
  };

  const isValidDate = (date: any): boolean => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  };

  const fetchProduct = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/product/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch product: ${res.status} ${txt}`);
      }

      const json = await res.json();
      const raw = json.data ?? json.product ?? json;

      // Map backend shape to ProductView expected by this page
      const mapped: ProductView = {
        productId: raw.product_id ?? raw.productId,
        productName: raw.product_name ?? raw.productName,
        brandName: raw.brand_name ?? raw.brandName,
        manufacturer: raw.manufacturer ?? "",
        barCode: raw.barcode ?? raw.barCode ?? "",
        gstIn: raw.gst ?? "",
        description: raw.description ?? "",
        shortDescription: raw.short_description ?? raw.shortDescription ?? "",
        categoryId: raw.category_id ?? raw.categoryId ?? null,
        subCategoryId: raw.subcategory_id ?? raw.subCategoryId ?? null,
        subSubCategoryId:
          raw.sub_subcategory_id ?? raw.subSubCategoryId ?? null,

        categoryName: raw.category_name ?? raw.custom_category ?? null,
        subCategoryName: raw.subcategory_name ?? raw.custom_subcategory ?? null,
        subSubCategoryName:
          raw.sub_subcategory_name ?? raw.custom_sub_subcategory ?? null,

        product_status: raw.status ?? "",
        productImages: Array.isArray(raw.productImages)
          ? raw.productImages
          : raw.images ?? [],
        variants: Array.isArray(raw.variants)
          ? raw.variants.map((v: any) => ({
              size: v.size ?? "",
              color: v.color ?? "",
              dimension: v.dimension ?? "",
              customAttributes: v.customAttributes ?? {},
              MRP: v.mrp ?? "",
              salesPrice: v.sale_price ?? "",
              stock: v.stock ?? v.qty ?? "",
              expiryDate:
                v.expiry_date && isValidDate(v.expiry_date)
                  ? new Date(v.expiry_date).toLocaleDateString()
                  : "",
              manufacturingYear:
                v.manufacturing_date && isValidDate(v.manufacturing_date)
                  ? new Date(v.manufacturing_date).toLocaleDateString()
                  : "",
              materialType: v.material_type ?? "",
              images: Array.isArray(v.images) ? v.images : v.imageUrls ?? [],
            }))
          : [],
        requiredDocs: raw.documents ?? [],
      };

      setProduct(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-[#852BAF]" />
        <span className="ml-4 text-gray-600">Loading product...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 border rounded bg-red-50 text-red-700">{error}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="p-4 border rounded bg-yellow-50 text-yellow-700">
          No product found.
        </div>
      </div>
    );
  }

  const downloadFile = (fileUrl: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename || fileUrl.split("/").pop() || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6" style={{ backgroundColor: "#FFFAFB" }}>
      <div className="p-6 mx-auto bg-white border border-gray-100 shadow-xl rounded-2xl max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-gray-900">
              Product Review
            </h1>
            <div className="text-sm text-gray-600">
              Viewing product ID: {product.productId}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg bg-white hover:bg-gray-50"
            >
              <FaArrowLeft /> Back
            </button>
          </div>
        </div>

        {/* Category Selection (readonly / disabled) */}
        <section>
          <SectionHeader
            icon={FaTag}
            title="Category Selection"
            description="Category, sub-category and type"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                readOnly
                value={String(product.categoryName ?? "Not selected")}
                className="w-full p-3 border rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Sub Category
              </label>
              <input
                readOnly
                value={String(product.subCategoryName ?? "Not selected")}
                className="w-full p-3 border rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Type / Sub-type
              </label>
              <input
                readOnly
                value={String(product.subSubCategoryName ?? "Not selected")}
                className="w-full p-3 border rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </section>

        {/* Product Identification */}
        <section className="mt-6">
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
            />
            <FormInput
              id="brandName"
              label="Brand Name"
              value={product.brandName}
            />
            <FormInput
              id="manufacturer"
              label="Manufacturer"
              value={product.manufacturer}
            />
            <FormInput id="barCode" label="Barcode" value={product.barCode} />
            <FormInput id="gst" label="GST" value={product.gstIn} />
          </div>
        </section>

        {/* Variants & Descriptions */}
        <section className="mt-6">
          <SectionHeader
            icon={FaBox}
            title="Product Variants"
            description="Configured product variants"
          />

          {product.variants && product.variants.length > 0 ? (
            product.variants.map((v, idx) => (
              <div
                key={idx}
                className="p-6 mb-6 border shadow-sm rounded-xl bg-gray-50"
              >
                <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Size
                    </label>
                    <input
                      readOnly
                      value={v.size ?? ""}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <input
                      readOnly
                      value={v.color ?? ""}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Material Type
                    </label>
                    <input
                      readOnly
                      value={v.materialType ?? ""}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Dimension
                    </label>
                    <input
                      readOnly
                      value={v.dimension ?? ""}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      MRP
                    </label>
                    <input
                      readOnly
                      value={String(v.MRP ?? "")}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Sales Price
                    </label>
                    <input
                      readOnly
                      value={String(v.salesPrice ?? "")}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Stock
                    </label>
                    <input
                      readOnly
                      value={String(v.stock ?? "")}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Manufacturing Year
                    </label>
                    <input
                      readOnly
                      value={v.manufacturingYear ?? ""}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      readOnly
                      value={v.expiryDate ?? ""}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Custom attributes (if any) */}
                {v.customAttributes &&
                  Object.keys(v.customAttributes).length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 font-medium text-gray-700">
                        Product Attributes
                      </h4>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {Object.keys(v.customAttributes).map((key) => (
                          <div key={key}>
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              {key}
                            </label>
                            <input
                              readOnly
                              value={String(v.customAttributes?.[key] ?? "")}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Variant images thumbnails */}
                <div className="mt-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Variant Images
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {v.images && v.images.length > 0 ? (
                      v.images.map((img, i) => {
                        const resolvedUrl = resolveImageUrl(img);

                        return (
                          <div
                            key={i}
                            className="relative w-20 h-20 border rounded overflow-hidden group"
                          >
                            <img
                              src={resolvedUrl}
                              alt={`Variant ${idx + 1} img ${i + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Download button */}
                            <button
                              onClick={() =>
                                downloadFile(
                                  resolvedUrl,
                                  `variant-${idx + 1}-${i + 1}.jpg`
                                )
                              }
                              title="Download"
                              className="absolute bottom-1 right-1 p-1 text-xs text-white bg-black/60 rounded opacity-0 group-hover:opacity-100"
                            >
                              <FaDownload className="text-sm" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-500">No images</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No variants configured.</div>
          )}

          {/* Descriptions */}
          <div className="mt-6">
            <FormInput
              id="description"
              label="Detailed Description"
              type="textarea"
              value={product.description}
            />
            <div className="mt-4">
              <FormInput
                id="shortDescription"
                label="Short Description"
                value={product.shortDescription}
              />
            </div>
          </div>
        </section>

        {/* Product Images */}
        <section className="mt-6">
          <SectionHeader
            icon={FaImages}
            title="Product Images"
            description="Main images for product listing"
          />

          <div className="flex gap-2 flex-wrap">
            {product.productImages && product.productImages.length > 0 ? (
              product.productImages.map((img, i) => {
                const resolvedUrl = resolveImageUrl(img);

                return (
                  <div
                    key={i}
                    className="relative w-20 h-20 border rounded overflow-hidden group"
                  >
                    <img
                      src={resolvedUrl}
                      alt={`Main ${i + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Download button */}
                    <button
                      onClick={() =>
                        downloadFile(resolvedUrl, `product-main-${i + 1}.jpg`)
                      }
                      title="Download"
                      className="absolute bottom-1 right-1 p-1 text-xs text-white bg-black/60 rounded opacity-0 group-hover:opacity-100"
                    >
                      <FaDownload className="text-sm" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-500">No images available</div>
            )}
          </div>
        </section>

        {/* Required Documents (if any) */}
        {product.requiredDocs && product.requiredDocs.length > 0 && (
          <section className="mt-6">
            <SectionHeader
              icon={FaFileUpload}
              title="Documents"
              description="Uploaded / required documents"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {product.requiredDocs.map((doc) => {
                const fileUrl = resolveImageUrl(doc.file_path);

                return (
                  <div
                    key={doc.id}
                    className="p-4 bg-white border rounded-lg shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Document info */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {doc.document_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {doc.mime_type || "Unknown type"}
                        </div>
                      </div>

                      {/* Right: Preview + Download */}
                      <div className="flex items-center gap-3">
                        {/* Image preview */}
                        {doc.mime_type?.startsWith("image/") && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                          >
                            <img
                              src={fileUrl}
                              alt={doc.document_name}
                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-90"
                            />
                          </a>
                        )}

                        {/* Download button */}
                        <button
                          onClick={() =>
                            downloadFile(fileUrl, doc.document_name)
                          }
                          className="px-3 py-1.5 text-sm font-medium text-white bg-[#852BAF] rounded hover:bg-[#76209e]"
                        >
                          <FaDownload className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
