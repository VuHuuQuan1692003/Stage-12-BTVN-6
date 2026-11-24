// ===== BÀI LÀM: stats.controller.js =====
const statsRepository = require("../repositories/stats.repository");

// GET /stats: trả { totals, averageProgress, byStatus, byLevel, perCourse, topCourses } theo đề.
async function getStats(req, res) {
  const top = req.query.top ?? 3;
  const [
    totals,
    averageProgress,
    byStatus,
    byLevel,
    perCourse,
    topCourses,
  ] = await Promise.all([
    statsRepository.totals(),
    statsRepository.averageProgress(),
    statsRepository.enrollmentsByStatus(),
    statsRepository.enrollmentsByLevel(),
    statsRepository.perCourse(),
    statsRepository.topCourses(top),
  ]);

  res.json({
    totals,
    averageProgress,
    byStatus,
    byLevel,
    perCourse,
    topCourses,
  });
}

module.exports = { getStats };
