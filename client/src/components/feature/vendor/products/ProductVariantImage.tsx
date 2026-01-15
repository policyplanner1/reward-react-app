import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/api";
const API_BASEIMAGE_URL = "https://rewardplanners.com/api/crm";

export default function ProductVariantImages() {
  const { variantId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  // Fetch existing images
  useEffect(() => {
    if (!variantId) return;
    api.get(`/variant/${variantId}/images`).then((res) => {
      if (res.data.success) {
        setImages(res.data.images || []);
      }
      setLoading(false);
    });
  }, [variantId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!files.length) return alert("Please select images");

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    try {
      setUploading(true);
      const res = await api.post(`/variant/${variantId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setImages((prev) => [...prev, ...res.data.images]);
        setFiles([]);
      }
    } catch (err) {
      console.error("UPLOAD VARIANT IMAGES ERROR:", err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageUrl: string) => {
    if (!confirm("Delete this image?")) return;

    await api.delete(`/variant/${variantId}/images`, {
      data: { image_url: imageUrl },
    });

    setImages((prev) => prev.filter((img) => img !== imageUrl));
  };

  if (loading) return <div className="p-6">Loading images...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Variant Images</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="block"
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload Images"}
        </button>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img} className="relative group border rounded-lg">
            <img
              src={`${API_BASEIMAGE_URL}/uploads/${img}`}
              alt="variant"
              className="w-full h-40 object-cover rounded-lg"
            />

            <button
              onClick={() => handleDelete(img)}
              className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
