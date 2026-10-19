// Load .env first: config modules read process.env when they are first required.
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./utils/seed');

// Import modular route handlers
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const employeeRoutes = require('./routes/employee.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const noticeRoutes = require('./routes/notice.routes');
const courseRoutes = require('./routes/course.routes');
const routineRoutes = require('./routes/routine.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const faceRoutes = require('./routes/face.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const materialRoutes = require('./routes/material.routes');
const attendanceConfig = require('./config/attendance');

const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Ensure upload directories exist
fs.mkdirSync(path.join(__dirname, 'uploads', 'notices'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads', 'assignments'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads', 'materials'), { recursive: true });

const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-internal-secret"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads (documents, images, audio announcements)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MOUNT ROUTERS ─────────────────────────────────────────────
// Auth routes (/api/me)
app.use('/api', authRoutes);

// Students (/api/students)
app.use('/api/students', studentRoutes);

// Teachers (/api/teachers)
app.use('/api/teachers', teacherRoutes);

// Employees (/api/employees)
app.use('/api/employees', employeeRoutes);

// Admin & Stats (/api/admin)
app.use('/api/admin', adminRoutes);

// Unified User Profile (/api/users)
app.use('/api/users', userRoutes);

// Notices (/api/notices)
app.use('/api/notices', noticeRoutes);

// Curriculum Courses (/api/courses)
app.use('/api/courses', courseRoutes);

// Academic Routines (/api/routines & aliases)
app.use('/api/routines', routineRoutes);
app.get('/api/admin/routine', routineRoutes.handleAdminGetRoutine);
app.post('/api/admin/routine', routineRoutes.handleSaveRoutineSlot);
app.get('/api/student/routine', routineRoutes.handleStudentGetRoutine);
app.get('/api/teacher/routine', routineRoutes.handleTeacherGetRoutine);

// Smart Geofence Attendance (/api/attendance) and face enrollment (/api/face)
app.use('/api/attendance', attendanceRoutes);
app.use('/api/face', faceRoutes);

// Coursework & Assignments (/api/assignments)
app.use('/api/assignments', assignmentRoutes);

// Course Study Materials & Slides (/api/materials)
app.use('/api/materials', materialRoutes);

// ── ROOT & HEALTH ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Department Server is running!');
});

// ── DATABASE & SERVER INITIALIZATION ──────────────────────────
async function startServer() {
  try {
    const { collections } = await connectDB();
    await seedInitialData(collections);

    const server = http.createServer({ maxHeaderSize: 65536 }, app);
    server.listen(port, () => {
      console.log(`Department Server listening on port ${port}`);
      console.log(
        `[attendance] window=${attendanceConfig.windowMinutes}min radius=${attendanceConfig.radiusMeters}m ` +
          `tz=${attendanceConfig.timezone} locations=${attendanceConfig.locations.length} face=${attendanceConfig.face.url}`
      );
      if (attendanceConfig.devMode) {
        console.warn(
          '[attendance] *** DEV MODE IS ON *** The 10 m location check is relaxed and test windows can be opened. ' +
            'Set ATTENDANCE_DEV_MODE=false before real use. Face verification is never skipped.'
        );
      }
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
