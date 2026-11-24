// ===== BÀI LÀM: stats.repository.js =====
const pool = require("../db/pool");

// { students, courses, enrollments }: số người dùng vai trò student, số khóa học, số ghi danh ở mọi trạng thái.
async function totals() {
  const [rows] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*) FROM courses) AS courses,
      (SELECT COUNT(*) FROM enrollments) AS enrollments
  `);
  return {
    students: Number(rows[0]?.students) || 0,
    courses: Number(rows[0]?.courses) || 0,
    enrollments: Number(rows[0]?.enrollments) || 0,
  };
}

// Tiến độ trung bình (làm tròn 1 chữ số) của các ghi danh active và completed; không có ghi danh nào thì 0.
async function averageProgress() {
  const [rows] = await pool.query(`
    SELECT AVG(progress) AS avgProgress
    FROM enrollments
    WHERE status IN ('active', 'completed')
  `);
  const avg = rows[0]?.avgProgress;
  if (avg === null || avg === undefined) return 0;
  return Math.round(Number(avg) * 10) / 10;
}

// Số ghi danh theo trạng thái, dạng { active, completed, dropped }; trạng thái không có hàng nào vẫn là 0.
async function enrollmentsByStatus() {
  const [rows] = await pool.query(`
    SELECT
      COALESCE(SUM(status = 'active'), 0) AS active,
      COALESCE(SUM(status = 'completed'), 0) AS completed,
      COALESCE(SUM(status = 'dropped'), 0) AS dropped
    FROM enrollments
  `);
  return {
    active: Number(rows[0]?.active) || 0,
    completed: Number(rows[0]?.completed) || 0,
    dropped: Number(rows[0]?.dropped) || 0,
  };
}

// Số ghi danh active và completed theo level của khóa học, dạng { beginner, intermediate, advanced }; level không có hàng nào vẫn là 0.
async function enrollmentsByLevel() {
  const [rows] = await pool.query(`
    SELECT
      COALESCE(SUM(c.level = 'beginner'), 0) AS beginner,
      COALESCE(SUM(c.level = 'intermediate'), 0) AS intermediate,
      COALESCE(SUM(c.level = 'advanced'), 0) AS advanced
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.status IN ('active', 'completed')
  `);
  return {
    beginner: Number(rows[0]?.beginner) || 0,
    intermediate: Number(rows[0]?.intermediate) || 0,
    advanced: Number(rows[0]?.advanced) || 0,
  };
}

// Mỗi khóa học một dòng: { courseId, title, studentCount, avgProgress }; chỉ tính ghi danh active và completed;
// khóa chưa có học viên vẫn có mặt với studentCount 0 và avgProgress 0. Sắp theo courseId tăng dần.
async function perCourse() {
  const [rows] = await pool.query(`
    SELECT
      c.id AS courseId,
      c.title,
      COUNT(e.id) AS studentCount,
      AVG(e.progress) AS rawAvgProgress
    FROM courses c
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.status IN ('active', 'completed')
    GROUP BY c.id, c.title
    ORDER BY c.id ASC
  `);
  return rows.map((row) => ({
    courseId: Number(row.courseId),
    title: row.title,
    studentCount: Number(row.studentCount),
    avgProgress:
      row.rawAvgProgress !== null && row.rawAvgProgress !== undefined
        ? Math.round(Number(row.rawAvgProgress) * 10) / 10
        : 0,
  }));
}

// limit khóa học đông học viên nhất, dạng { courseId, title, studentCount }; đồng hạng xem đề.
async function topCourses(limit) {
  const numericLimit = Math.max(1, Math.min(10, Number(limit) || 3));
  const [rows] = await pool.query(
    `
    SELECT
      c.id AS courseId,
      c.title,
      COUNT(e.id) AS studentCount,
      AVG(e.progress) AS avgProgress
    FROM courses c
    JOIN enrollments e ON e.course_id = c.id AND e.status IN ('active', 'completed')
    GROUP BY c.id, c.title
    ORDER BY studentCount DESC, avgProgress DESC, c.id ASC
    LIMIT ?
    `,
    [numericLimit]
  );
  return rows.map((row) => ({
    courseId: Number(row.courseId),
    title: row.title,
    studentCount: Number(row.studentCount),
  }));
}

module.exports = {
  totals,
  averageProgress,
  enrollmentsByStatus,
  enrollmentsByLevel,
  perCourse,
  topCourses,
};
