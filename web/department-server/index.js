const express = require('express');
const dotenv = require('dotenv');
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

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// ── ROOT & HEALTH ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Department Server is running!');
});

// ── DATABASE & SERVER INITIALIZATION ──────────────────────────
async function startServer() {
  try {
    const { collections } = await connectDB();
    await seedInitialData(collections);

    app.listen(port, () => {
      console.log(`Department Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
