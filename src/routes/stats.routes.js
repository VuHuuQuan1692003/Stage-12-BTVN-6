// ===== BÀI LÀM: stats.routes.js =====
const express = require("express");
const controller = require("../controllers/stats.controller");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const asyncHandler = require("../middlewares/asyncHandler");
const { statsQuerySchema } = require("../schemas/stats.schema");

const router = express.Router();

// GET / chỉ dành cho admin (gắn ở /stats).
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validate(statsQuerySchema, "query"),
  asyncHandler(controller.getStats)
);

module.exports = router;
