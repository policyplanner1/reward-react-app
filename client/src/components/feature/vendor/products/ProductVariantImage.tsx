import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import { FaArrowLeft } from "react-icons/fa";

const BASE_IMAGE_URL = "https://rewardplanners.com/api/crm/uploads";

type VariantImage = {
  image_id: number;
  image_url: string;
};

type PreviewImage = {
  file: File;
  preview: string;
};

export default function ProductVariantImages() {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<VariantImage[]>([]);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch existing images
  const fetchImages = async () => {
    if (!variantId) return;
    const res = await api.get(`/variant/${variantId}/images`);
    if (res.data.success) {
      setImages(res.data.images);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [variantId]);

  // Handle file selection (PREVIEW STEP)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    const remainingSlots = 5 - images.length;

    if (remainingSlots <= 0) {
      alert("Maximum 5 images already uploaded for this variant.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      alert(`You can upload only ${remainingSlots} more image(s).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const selected = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPreviews(selected);
  };

  // Upload selected images
  const handleUpload = async () => {
    if (!previews.length) return;

    if (images.length + previews.length > 5) {
      alert("Total variant images cannot exceed 5.");
      return;
    }

    const formData = new FormData();
    previews.forEach((p) => formData.append("images", p.file));

    try {
      setUploading(true);
      await api.post(`/variant/${variantId}/images`, formData);
      previews.forEach((p) => URL.revokeObjectURL(p.preview));
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchImages();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm("Delete this image?")) return;
    await api.delete(`/variant/images/${imageId}`);
    setImages((prev) => prev.filter((img) => img.image_id !== imageId));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Variant Images</h1>
            <p className="text-gray-500 mt-1">
              Upload and manage images for this variant (max 5)
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 shadow-sm transition cursor-pointer"
          >
            <FaArrowLeft />
            Back
          </button>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Upload Images</h2>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white font-semibold hover:opacity-90 transition cursor-pointer"
              >
                Select Images
              </button>

              <span className="text-sm text-gray-500">
                {images.length}/5 images uploaded
              </span>
            </div>

            {previews.length > 0 && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 transition cursor-pointer"
              >
                {uploading ? "Uploading..." : "Upload Selected"}
              </button>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {previews.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Preview Before Upload
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((p, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden border bg-gray-50"
                >
                  <img
                    src={p.preview}
                    className="h-40 w-full object-cover"
                    alt="Preview"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Images */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Uploaded Images
          </h3>

          {images.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No images uploaded for this variant yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {images.map((img) => (
                <div
                  key={img.image_id}
                  className="relative group rounded-xl overflow-hidden border bg-gray-100"
                >
                  <img
                    src={`${BASE_IMAGE_URL}/${img.image_url}`}
                    className="h-44 w-full object-cover"
                    alt="Variant"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(img.image_id)}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
