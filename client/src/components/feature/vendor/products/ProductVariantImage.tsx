import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";

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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Variant Images</h2>
        <button onClick={() => navigate(-1)} className="text-sm underline">
          ← Back
        </button>
      </div>

      {/* Upload Section */}
      <div className="border p-4 rounded-lg space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Select Images
          </button>

          {previews.length > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
      </div>

      {/* Preview grid (BEFORE upload) */}
      {previews.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previews.map((p, idx) => (
              <img
                key={idx}
                src={p.preview}
                className="h-40 w-full object-cover rounded border"
                alt="Preview"
              />
            ))}
          </div>
        </div>
      )}

      {/* Existing images */}
      <div>
        <h3 className="font-medium mb-2">Uploaded Images</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.image_id} className="relative group">
              <img
                src={`${BASE_IMAGE_URL}/${img.image_url}`}
                className="h-40 w-full object-cover rounded border"
                alt="Variant"
              />
              <button
                onClick={() => handleDelete(img.image_id)}
                className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
