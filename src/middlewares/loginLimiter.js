// ===== BÀI LÀM: loginLimiter.js =====
const rateLimit = require("express-rate-limit");
const httpError = require("../errors/httpError");

// Giới hạn đăng nhập: 5 yêu cầu trong 15 phút theo IP, chỉ cho /auth/login; yêu cầu thứ 6 trả 429
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(httpError(429, "RATE_LIMITED", "Quá nhiều yêu cầu, hãy thử lại sau"));
  },
});

module.exports = loginLimiter;
