import React, { useEffect, useState } from "react";
import {
  FaTag,
  FaBox,
  FaImages,
  FaFileUpload,
  FaSpinner,
  FaArrowLeft,
  FaDownload,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

/* ================= CONFIG ================= */
const API_BASE = import.meta.env.VITE_API_URL;

/* ================= TYPES ================= */

interface VariantView {
  size?: string;
  color?: string;
  dimension?: string;
  materialType?: string;
  MRP?: string | number;
  salesPrice?: string | number;
  stock?: string | number;
  expiryDate?: string;
  manufacturingDate?: string;
  images?: string[];
  customAttributes?: Record<string, unknown>;
}

interface RequiredDoc {
  id: number;
  document_name: string;
  mime_type: string;
  file_path: string;
}

interface ProductView {
  productId: number | string;
  productName?: string;
  brandName?: string;
  manufacturer?: string;
  barCode?: string;
  gstIn?: string;
  description?: string;
  shortDescription?: string;
  categoryName?: string | null;
  subCategoryName?: string | null;
  subSubCategoryName?: string | null;
  productImages?: string[];
  variants?: VariantView[];
  requiredDocs?: RequiredDoc[];
}

/* ================= SMALL COMPONENTS ================= */

const FormInput = ({
  label,
  value,
  textarea,
}: {
  label: string;
  value?: string | number;
  textarea?: boolean;
}) => (
  <div>
    <label className="block mb-1 text-sm font-medium text-gray-700">
      {label}
    </label>
    {textarea ? (
      <textarea
        readOnly
        rows={4}
        value={value ?? ""}
        className="w-full p-3 border rounded bg-gray-50"
      />
    ) : (
      <input
        readOnly
        value={value ?? ""}
        className="w-full p-3 border rounded bg-gray-50"
      />
    )}
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex items-center gap-3 pb-2 mb-4 border-b">
    <Icon className="text-2xl text-[#852BAF]" />
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

/* ================= MAIN COMPONENT ================= */

export default function ProductViewPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= HELPERS ================= */

  const resolveFileUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API_BASE}/uploads/${path.replace(/^\/+/, "")}`;
  };

  const downloadFile = (url: string, filename?: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!productId) {
      setError("Product ID missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/product/${productId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch product");

        const json = await res.json();
        const raw = json.data ?? json.product ?? json;

        setProduct({
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
          productImages: raw.images ?? [],
          variants: raw.variants ?? [],
          requiredDocs: raw.documents ?? [],
        });
      } catch (err: any) {
        setError(err.message || "Error loading product");
      } finally {
        setLoading(false);
      }
    })();
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

  if (error || !product) {
    return (
      <div className="p-6 text-red-700 bg-red-50 border rounded">
        {error ?? "Product not found"}
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 bg-[#FFFAFB]">
      <div className="max-w-7xl p-6 mx-auto bg-white border shadow rounded-2xl">
        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Product Review</h1>
            <p className="text-sm text-gray-600">
              Product ID: {product.productId}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50"
          >
            <FaArrowLeft /> Back
          </button>
        </div>

        {/* CATEGORY */}
        <SectionHeader
          icon={FaTag}
          title="Category"
          description="Category classification"
        />
        <div className="grid md:grid-cols-3 gap-4">
          <FormInput label="Category" value={product.categoryName} />
          <FormInput label="Sub Category" value={product.subCategoryName} />
          <FormInput label="Type" value={product.subSubCategoryName} />
        </div>

        {/* BASIC INFO */}
        <section className="mt-6">
          <SectionHeader
            icon={FaTag}
            title="Product Info"
            description="Basic identification"
          />
          <div className="grid md:grid-cols-3 gap-4">
            <FormInput label="Product Name" value={product.productName} />
            <FormInput label="Brand Name" value={product.brandName} />
            <FormInput label="Manufacturer" value={product.manufacturer} />
            <FormInput label="Barcode" value={product.barCode} />
            <FormInput label="GST" value={product.gstIn} />
          </div>
        </section>

        {/* VARIANTS */}
        <section className="mt-6">
          <SectionHeader
            icon={FaBox}
            title="Variants"
            description="Product variants"
          />

          {product.variants?.map((v, i) => (
            <div
              key={i}
              className="p-4 mb-4 bg-gray-50 border rounded-lg"
            >
              <div className="grid md:grid-cols-3 gap-3">
                <FormInput label="Size" value={v.size} />
                <FormInput label="Color" value={v.color} />
                <FormInput label="Material" value={v.materialType} />
                <FormInput label="MRP" value={v.MRP} />
                <FormInput label="Sales Price" value={v.salesPrice} />
                <FormInput label="Stock" value={v.stock} />
                <FormInput label="Manufacturing Date" value={v.manufacturingDate} />
                <FormInput label="Expiry Date" value={v.expiryDate} />
              </div>

              {/* Variant Images */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {v.images?.map((img, idx) => {
                  const url = resolveFileUrl(img);
                  return (
                    <div key={idx} className="relative w-20 h-20 border rounded">
                      <img
                        src={url}
                        className="object-cover w-full h-full"
                      />
                      <button
                        onClick={() =>
                          downloadFile(url, `variant-${i}-${idx}.jpg`)
                        }
                        className="absolute bottom-1 right-1 p-1 text-white bg-black/60 rounded"
                      >
                        <FaDownload />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* DOCUMENTS */}
        {product.requiredDocs && product.requiredDocs.length > 0 && (
          <section className="mt-6">
            <SectionHeader
              icon={FaFileUpload}
              title="Documents"
              description="Uploaded documents"
            />
            <div className="grid md:grid-cols-2 gap-4">
              {product.requiredDocs.map((doc) => {
                const url = resolveFileUrl(doc.file_path);
                return (
                  <div
                    key={doc.id}
                    className="flex justify-between p-4 border rounded"
                  >
                    <div>
                      <div className="font-medium">{doc.document_name}</div>
                      <div className="text-xs text-gray-500">
                        {doc.mime_type}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        downloadFile(url, doc.document_name)
                      }
                      className="px-3 py-1 text-white bg-[#852BAF] rounded"
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
}
