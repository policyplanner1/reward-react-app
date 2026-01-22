import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
import { FaArrowLeft, FaImages, FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";

const BASE_IMAGE_URL = "https://rewardplanners.com/api/crm/uploads";

function SectionHeader({ icon: Icon, title, description }: any) {
  return (
    <div className="flex items-center space-x-4 pb-4 border-b border-gray-100 mb-6">
      <div className="p-4 text-white rounded-2xl shadow-xl shadow-[#852BAF]/20 bg-gradient-to-tr from-[#852BAF] to-[#FC3F78]">
        <Icon className="text-2xl" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 font-medium">{description}</p>
        )}
      </div>
    </div>
  );
}

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

  const fetchImages = async () => {
    if (!variantId) return;
    const res = await api.get(`/variant/${variantId}/images`);
    if (res.data.success) setImages(res.data.images);
  };

  useEffect(() => {
    fetchImages();
  }, [variantId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const remainingSlots = 5 - images.length;

    if (remainingSlots <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Image limit reached",
        text: "You can upload a maximum of 5 images for a variant.",
        confirmButtonText: "OK",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      await Swal.fire({
        icon: "warning",
        title: "Too many images",
        text: `You can upload only ${remainingSlots} more image(s).`,
        confirmButtonText: "OK",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPreviews(
      selectedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
    );
  };

  const handleUpload = async () => {
    if (!previews.length) return;

    const formData = new FormData();
    previews.forEach((p) => formData.append("images", p.file));

    try {
      setUploading(true);
      await api.post(`/variant/${variantId}/images`, formData);

      previews.forEach((p) => URL.revokeObjectURL(p.preview));
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchImages();

      await Swal.fire({
        icon: "success",
        title: "Images uploaded",
        text: "Variant images have been uploaded successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Upload failed",
        text: "Unable to upload images. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    const result = await Swal.fire({
      title: "Delete image?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/variant/images/${imageId}`);
      setImages((prev) => prev.filter((i) => i.image_id !== imageId));

      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Image has been deleted successfully.",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Unable to delete image. Please try again.",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Variant <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#852BAF] to-[#FC3F78]">Images</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Upload and manage images for this variant (max 5)
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition cursor-pointer"
        >
          <FaArrowLeft /> Back
        </button>
      </div>

      {/* Upload Section */}
      <section className="space-y-4 bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg">
        <SectionHeader
          icon={FaImages}
          title="Upload Images"
          description="Select and upload images for this variant"
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Select Images
            </button>

            <span className="text-sm text-gray-500 font-medium">
              {images.length}/5 uploaded
            </span>
          </div>

          {previews.length > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 transition cursor-pointer"
            >
              {uploading ? "Uploading..." : "Upload Selected"}
            </button>
          )}
        </div>
      </section>

      {/* Preview Section */}
      {previews.length > 0 && (
        <section className="mt-8 space-y-4 bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg">
          <SectionHeader
            icon={FaImages}
            title="Preview Before Upload"
            description="Review selected images"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previews.map((p, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border bg-gray-50">
                <img src={p.preview} className="h-40 w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Uploaded Images */}
      <section className="mt-8 space-y-4 bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg">
        <SectionHeader
          icon={FaImages}
          title="Uploaded Images"
          description="Existing images for this variant"
        />

        {images.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
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
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(img.image_id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition cursor-pointer"
                  >
                    <FaTrash size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
