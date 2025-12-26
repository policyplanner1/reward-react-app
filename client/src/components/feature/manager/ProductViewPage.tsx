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
