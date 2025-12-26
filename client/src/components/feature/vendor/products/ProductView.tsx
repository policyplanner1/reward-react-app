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

            {/* Edit button - navigate to your edit route if exists */}
            {/* <Link
              href={`/src/vendor/products/edit/${product.productId}`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg bg-white hover:bg-gray-50"
            >
              <FaEdit /> Edit
            </Link> */}
            {!["approved", "rejected", "sent_for_approval"].includes(
              product.product_status ?? ""
            ) && (
              <Link
                href={`/src/vendor/products/edit/${product.productId}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg bg-white hover:bg-gray-50"
              >
                <FaEdit />
              </Link>
            )}
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
                      v.images.map((img, i) => (
                        <div
                          key={i}
                          className="w-20 h-20 border rounded overflow-hidden"
                        >
                          <img
                            src={resolveImageUrl(img)}
                            alt={`Variant ${idx + 1} img ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))
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
              product.productImages.map((img, i) => (
                <div
                  key={i}
                  className="w-20 h-20 border rounded overflow-hidden"
                >
                  <img
                    src={resolveImageUrl(img)}
                    alt={`Main ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))
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
              description="Uploaded/required documents"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {product.requiredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-white border rounded-lg shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">
                        {doc.document_name}
                      </div>
                    </div>

                    {doc.mime_type && doc.mime_type.startsWith("image/") ? (
                      <img
                        src={resolveImageUrl(doc.file_path)}
                        alt={doc.document_name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : doc.url ? (
                      <a
                        href={resolveImageUrl(doc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 underline"
                      >
                        View
                      </a>
                    ) : (
                      <div className="text-xs text-gray-500">Not uploaded</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}