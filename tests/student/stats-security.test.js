// tests/student/stats-security.test.js
// Bộ test của học viên kiểm tra tính năng và bảo mật hệ thống
const request = require("supertest");
const app = require("../../src/app");
const pool = require("../../src/db/pool");
const { resetDatabase } = require("../helpers/db");
const { tokenFor } = require("../helpers/token");

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

const adminToken = "Bearer " + tokenFor(1, "admin");
const studentToken = "Bearer " + tokenFor(2, "student");

describe("Bộ test của học viên cho API và lớp bảo mật", () => {
  it("quản trị viên lấy thống kê thành công với tham số top=2 nhận mã 200 và danh sách topCourses có đúng 2 khóa học", async () => {
    const res = await request(app).get("/stats?top=2").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.topCourses).toHaveLength(2);
    expect(res.body.topCourses[0]).toEqual({ courseId: 2, title: "JavaScript cơ bản", studentCount: 3 });
  });

  it("quản trị viên tạo mới một khóa học thành công nhận mã 201 và khóa học được lưu vào cơ sở dữ liệu", async () => {
    const newCourse = { title: "Python cho người mới", description: "Nhập môn Python", level: "beginner" };
    const res = await request(app).post("/courses").set("Authorization", adminToken).send(newCourse);
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Python cho người mới");

    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [res.body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Python cho người mới");
  });

  it("gửi tham số top không hợp lệ (số âm) nhận mã lỗi 400 cùng chi tiết lỗi validation", async () => {
    const res = await request(app).get("/stats?top=-1").set("Authorization", adminToken);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([{ field: "top", message: "top phải từ 1 đến 10" }]);
  });

  it("yêu cầu thống kê mà không gửi token xác thực nhận mã 401 và thông báo từ chối truy cập", async () => {
    const res = await request(app).get("/stats");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Thiếu hoặc sai mã xác thực");
  });

  it("học viên cố gắng truy cập API thống kê nhận mã 403 do không đủ quyền quản trị", async () => {
    const res = await request(app).get("/stats").set("Authorization", studentToken);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toBe("Bạn không có quyền thực hiện thao tác này");
  });

  it("truy vấn thông tin khóa học với id không tồn tại trong hệ thống nhận mã lỗi 404", async () => {
    const res = await request(app).get("/courses/99999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Không tìm thấy khóa học");
  });

  it("học viên ghi danh lại vào khóa học đã ghi danh trước đó nhận mã lỗi 409 xung đột dữ liệu", async () => {
    const res = await request(app).post("/courses/1/enroll").set("Authorization", studentToken);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toBe("Học viên đã ghi danh khóa học này");
  });

  it("khóa học mới chưa có người ghi danh vẫn hiển thị trong perCourse với số lượng học viên và tiến độ bằng 0", async () => {
    await pool.query("INSERT INTO courses (title, description, level) VALUES ('Golang căn bản', '', 'beginner')");
    const res = await request(app).get("/stats?top=10").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.totals.courses).toBe(7);

    const golangCourse = res.body.perCourse.find((c) => c.title === "Golang căn bản");
    expect(golangCourse).toBeDefined();
    expect(golangCourse.studentCount).toBe(0);
    expect(golangCourse.avgProgress).toBe(0);
    expect(res.body.topCourses.map((c) => c.title)).not.toContain("Golang căn bản");
  });

  it("khi toàn bộ ghi danh chuyển sang dropped thì tiến độ trung bình bằng 0 và topCourses là mảng rỗng", async () => {
    await pool.query("UPDATE enrollments SET status = 'dropped'");
    const res = await request(app).get("/stats?top=10").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.averageProgress).toBe(0);
    expect(res.body.byStatus.dropped).toBe(10);
    expect(res.body.byStatus.active).toBe(0);
    expect(res.body.topCourses).toEqual([]);
  });
});
