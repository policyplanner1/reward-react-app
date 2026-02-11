import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../../api/api";
import "./css/flashsalecreate.css"

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

  useEffect(() => {
    const fetchFlashSale = async () => {
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

      const url = isEdit && id
        ? `/flash/flash-sales/${id}`
        : `/flash/flash-sale`;

      const res = await api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate(`/flash-sales/${res.data.flash_id}/variants`);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fs-page">
      <div className="fs-card">
        <h2 className="fs-title">
          {isEdit ? "Edit Flash Sale" : "Create Flash Sale"}
        </h2>

        {/* Title */}
        <div className="fs-field">
          <label>Flash Sale Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="eg. Diwali Mega Offer"
          />
        </div>

        {/* Date Row */}
        <div className="fs-row">
          <div className="fs-field">
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>

          <div className="fs-field">
            <label>End Time</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
        </div>

        {/* Banner Upload */}
        <div className="fs-field">
          <label>Banner Image</label>
          <div className="fs-upload">
            <input type="file" onChange={handleBannerChange} />
            <span>Click to upload banner</span>
          </div>
        </div>

        {/* Preview */}
        {bannerPreview && (
          <div className="fs-preview">
            <img src={bannerPreview} alt="preview" />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="fs-btn"
        >
          {loading ? "Saving..." : "Save & Manage Variants"}
        </button>
      </div>
    </div>
  );
};

export default FlashSaleForm;
