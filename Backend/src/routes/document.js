const express = require("express");
const multer = require("multer");
const axios = require("axios");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8001";

/**
 * @route POST /api/document/extract
 * @desc Extracts loan application fields from an uploaded document using the ML service.
 * @access Public
 */
router.post("/extract", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No document uploaded." });
  }

  try {
    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("document", fileBlob, req.file.originalname);

    const response = await axios.post(`${RAG_SERVICE_URL}/extract`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Document extraction error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to extract data from document.",
      details: error.response?.data?.detail || error.message,
    });
  }
});

module.exports = router;
