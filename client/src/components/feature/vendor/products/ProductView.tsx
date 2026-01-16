import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import type { ComponentType } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuillEditor from "../../../QuillEditor";
type IconComp = ComponentType<any>;

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
    <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-gray-200">
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
  onChange?: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  type?: "text" | "textarea";
  required?: boolean;
  placeholder?: string;
  error?: string;
  readOnly?: boolean;
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
    readOnly = false,
  } = props;

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          id={id}
          name={id}
          value={String(value)}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 shadow-sm cursor-default"
        />
      ) : (
        <input
          id={id}
          name={id}
          value={String(value)}
          onChange={onChange}
          readOnly={readOnly}
          type="text"
          placeholder={placeholder}
          className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 shadow-sm cursor-default"
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

import {
  FaTag,
  FaBox,
  FaImages,
  FaFileUpload,
  FaSpinner,
  FaArrowLeft,
  FaEdit,
} from "react-icons/fa";
import { Link } from "react-router-dom";

// const API_BASE = import.meta.env.VITE_API_URL;
import { api } from "../../../../api/api";
const API_BASEIMAGE_URL = "https://rewardplanners.com/api/crm";

interface ProductView {
  productId?: number | string;
  productName?: string;
  brandName?: string;
  manufacturer?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: number | null;
  subCategoryId?: number | null;
  subSubCategoryId?: number | null;
  categoryName?: string | null;
  subCategoryName?: string | null;
  subSubCategoryName?: string | null;
  product_status?: string;
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
export default function ReviewProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

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
      const res = await api.get(`/product/${encodeURIComponent(id)}`);

      const raw = res.data?.data ?? res.data?.product ?? res.data;

      // Map backend shape to ProductView expected by this page
      const mapped: ProductView = {
        productId: raw.product_id ?? raw.productId,
        productName: raw.product_name ?? raw.productName,
        brandName: raw.brand_name ?? raw.brandName,
        manufacturer: raw.manufacturer ?? "",
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

        requiredDocs: raw.documents ?? [],
      };

      setProduct(mapped);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || err.message || "Failed to load product"
      );
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
      <div className="p-6 mx-auto bg-white border border-gray-200 shadow-2xl rounded-2xl max-w-7xl">
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
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg
           bg-[#852BAF] text-white transition-all duration-300
           hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78]
           hover:text-white cursor-pointer"
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
                to={`/vendor/products/edit/${product.productId}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg
           bg-[#852BAF] text-white transition-all duration-300
           hover:bg-gradient-to-r hover:from-[#852BAF] hover:to-[#FC3F78]
           hover:text-white cursor-pointer"
              >
                Edit
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
          </div>
        </section>

        {/*  Descriptions */}
        <section className="mt-6">
            <SectionHeader
            icon={FaBox}
            title="Product Description"
            description="Detailed and short Description"
          />

          {/* Descriptions */}
          <div className="mt-6">
            <div className="mt-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Detailed Description
              </label>

              <QuillEditor
                value={product.description || ""}
                readOnly
                minHeight={260}
              />
            </div>

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
