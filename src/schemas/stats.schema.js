// ===== BÀI LÀM: stats.schema.js =====
const { z } = require("zod");

const TOP_MESSAGE = "top phải từ 1 đến 10";

// Query của GET /stats: top (số nguyên 1-10, mặc định 3) với thông báo cố định trong đề.
const statsQuerySchema = z.object({
  top: z
    .preprocess((val) => {
      if (val === undefined || val === "") return 3;
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 10) return false;
      return num;
    }, z.number({ invalid_type_error: TOP_MESSAGE }).int(TOP_MESSAGE).min(1, TOP_MESSAGE).max(10, TOP_MESSAGE))
    .default(3),
});

module.exports = { statsQuerySchema };
