const db = require("../../../../config/database");
const ServiceBannerModel = require("../models/serviceBannerModel");

class ServiceBannerController {
  // Create banner
  async createBanner(req, res) {
    try {
      const {
        title,
        subtitle,
        image_url,
        redirect_type,
        redirect_id,
        redirect_url,
        sort_order,
      } = req.body;

      if (!image_url) {
        return res.status(400).json({
          success: false,
          message: "image_url is required",
        });
      }

      const banner = await ServiceBannerModel.create({
        title,
        subtitle,
        image_url,
        redirect_type,
        redirect_id,
        redirect_url,
        sort_order,
      });

      res.json({
        success: true,
        message: "Banner created",
        data: banner,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

//   Get Banners
  async getBanners(req, res) {
    try {
      const banners = await ServiceBannerModel.getActiveBanners();

      res.json({
        success: true,
        data: banners,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceBannerController();
