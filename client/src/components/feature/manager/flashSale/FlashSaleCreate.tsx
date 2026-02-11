import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../../api/api";

const API_BASEIMAGE_URL = "https://rewardplanners.com/api/crm";

const FlashSaleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch existing data if edit
  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        if (isEdit && id) {
          const res = await api.get(`/admin/flash-sales/${id}`);
          const data = res.data;

          setTitle(data.title);
          setStartAt(data.start_at?.slice(0, 16));
          setEndAt(data.end_at?.slice(0, 16));

          if (data.banner_image) {
            setBannerPreview(
              `${API_BASEIMAGE_URL}/uploads/flash-banners/${data.banner_image}`
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch flash sale", error);
      }
    };

    fetchFlashSale();
  }, [id, isEdit]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
      setBannerPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async () => {
    if (!title || !startAt || !endAt) {
      alert("Please fill all fields");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("start_at", startAt);
    formData.append("end_at", endAt);

    if (bannerFile) {
      formData.append("banner_image", bannerFile);
    }

    try {
      setLoading(true);

      let res;

      if (isEdit && id) {
        res = await api.post(
          `/flash/flash-sales/${id}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        res = await api.post(
          `/flash/flash-sale`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      }

      const data = res.data;

      // redirect to variants page
      navigate(`/admin/flash-sales/${data.flash_id}/variants`);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2>{isEdit ? "Edit Flash Sale" : "Create Flash Sale"}</h2>

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      {/* Start Time */}
      <div style={{ marginBottom: 16 }}>
        <label>Start Time</label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      {/* End Time */}
      <div style={{ marginBottom: 16 }}>
        <label>End Time</label>
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      {/* Banner Upload */}
      <div style={{ marginBottom: 16 }}>
        <label>Banner Image</label>
        <input type="file" onChange={handleBannerChange} />
      </div>

      {bannerPreview && (
        <div style={{ marginBottom: 16 }}>
          <img
            src={bannerPreview}
            alt="preview"
            style={{ width: "100%", borderRadius: 8 }}
          />
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: "10px 16px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {loading ? "Saving..." : "Save & Manage Variants"}
      </button>
    </div>
  );
};

export default FlashSaleForm;
