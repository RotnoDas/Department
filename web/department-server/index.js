const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const { SEMESTER_COURSES, SEMESTER_LABELS } = require('./data/courses');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-internal-secret"]
}));
app.use(express.json());

// Token verification middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token format invalid" });
  }
  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${CLIENT_URL}/api/auth/jwks`)
    );
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.warn(`[verifyToken] Rejected: ${error.code || error.message}`);
    return res.status(401).json({ message: "Unauthorized: Token validation failed" });
  }
};

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db(process.env.DB_NAME || 'department_db');
    const usersCollection = db.collection('user');
    const studentsCollection = db.collection('students');
    const teachersCollection = db.collection('teachers');
    const employeesCollection = db.collection('employees');
    const adminsCollection = db.collection('admins');
    const noticesCollection = db.collection('notices');
    const coursesCollection = db.collection('courses');

    // ── HEALTH & ME ───────────────────────────────────────────
    app.get('/api/me', verifyToken, async (req, res) => {
      res.send({ user: req.user, message: "Secure data accessed successfully!" });
    });

    // ── STUDENTS SECTION ──────────────────────────────────────
    app.get('/api/students', async (req, res) => {
      try {
        const { status, semester, batch, search } = req.query;
        const query = {};

        if (status) query.status = status;
        if (semester) query.semester = semester;
        if (batch) query.batch = isNaN(Number(batch)) ? batch : Number(batch);
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { studentId: { $regex: search, $options: 'i' } }
          ];
        }

        const students = await studentsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, count: students.length, students });
      } catch (err) {
        console.error("Error fetching students:", err);
        res.status(500).json({ error: "Failed to fetch students" });
      }
    });

    app.get('/api/students/email/:email', async (req, res) => {
      try {
        const student = await studentsCollection.findOne({ email: req.params.email });
        if (!student) return res.status(404).json({ error: "Student not found" });
        res.json(student);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch student by email" });
      }
    });

    app.get('/api/students/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = { $or: [{ userId: id }, { studentId: id }] };
        try { query.$or.push({ _id: new ObjectId(id) }); } catch (e) {}

        const student = await studentsCollection.findOne(query);
        if (!student) return res.status(404).json({ error: "Student not found" });
        res.json(student);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch student" });
      }
    });

    app.patch('/api/students/status/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected' or 'pending'

        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
        }

        const query = {
          $or: [
            { userId: id },
            { studentId: id },
            { email: id }
          ]
        };
        try {
          if (ObjectId.isValid(id)) {
            query.$or.push({ _id: new ObjectId(id) });
          }
        } catch (e) {}

        const student = await studentsCollection.findOne(query);
        if (!student) return res.status(404).json({ error: "Student not found" });

        await studentsCollection.updateOne(query, {
          $set: { status, updatedAt: new Date() }
        });

        // Sync with users collection
        if (student.email) {
          await usersCollection.updateOne(
            { email: student.email },
            { $set: { status, updatedAt: new Date() } }
          );
        }

        res.json({ success: true, message: `Student status updated to ${status}`, student: { ...student, status } });
      } catch (err) {
        console.error("Error updating student status:", err);
        res.status(500).json({ error: "Failed to update student status" });
      }
    });

    // ── TEACHERS SECTION ──────────────────────────────────────
    app.get('/api/teachers', async (req, res) => {
      try {
        const { search, designation } = req.query;
        const query = {};

        if (designation) query.designation = designation;
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { teacherId: { $regex: search, $options: 'i' } }
          ];
        }

        const teachers = await teachersCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, count: teachers.length, teachers });
      } catch (err) {
        console.error("Error fetching teachers:", err);
        res.status(500).json({ error: "Failed to fetch teachers" });
      }
    });

    app.get('/api/teachers/email/:email', async (req, res) => {
      try {
        const teacher = await teachersCollection.findOne({ email: req.params.email });
        if (!teacher) return res.status(404).json({ error: "Teacher not found" });
        res.json(teacher);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch teacher" });
      }
    });

    app.get('/api/teachers/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = { $or: [{ userId: id }, { teacherId: id }] };
        try { query.$or.push({ _id: new ObjectId(id) }); } catch (e) {}

        const teacher = await teachersCollection.findOne(query);
        if (!teacher) return res.status(404).json({ error: "Teacher not found" });
        res.json(teacher);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch teacher" });
      }
    });

    // ── EMPLOYEES SECTION ─────────────────────────────────────
    app.get('/api/employees', async (req, res) => {
      try {
        const { search, department } = req.query;
        const query = {};

        if (department) query.department = department;
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } }
          ];
        }

        const employees = await employeesCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, count: employees.length, employees });
      } catch (err) {
        console.error("Error fetching employees:", err);
        res.status(500).json({ error: "Failed to fetch employees" });
      }
    });

    app.get('/api/employees/email/:email', async (req, res) => {
      try {
        const employee = await employeesCollection.findOne({ email: req.params.email });
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        res.json(employee);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch employee" });
      }
    });

    // ── ADMIN & STATS SECTION ─────────────────────────────────
    app.get('/api/admin/pending-students', async (req, res) => {
      try {
        const pending = await studentsCollection.find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, count: pending.length, students: pending });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch pending students" });
      }
    });

    app.get('/api/admin/stats', async (req, res) => {
      try {
        const totalStudents = await studentsCollection.countDocuments();
        const pendingStudents = await studentsCollection.countDocuments({ status: 'pending' });
        const approvedStudents = await studentsCollection.countDocuments({ status: 'approved' });
        const totalTeachers = await teachersCollection.countDocuments();
        const totalEmployees = await employeesCollection.countDocuments();
        const totalUsers = await usersCollection.countDocuments();

        res.json({
          totalStudents,
          pendingStudents,
          approvedStudents,
          totalTeachers,
          totalEmployees,
          totalUsers,
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
      }
    });

    // ── USERS UNIFIED LOOKUP ──────────────────────────────────
    app.get('/api/users/:email', async (req, res) => {
      try {
        const user = await usersCollection.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ error: "User not found" });

        let profile = null;
        if (user.role === 'student') {
          profile = await studentsCollection.findOne({ email: user.email });
        } else if (user.role === 'teacher') {
          profile = await teachersCollection.findOne({ email: user.email });
        } else if (user.role === 'employee') {
          profile = await employeesCollection.findOne({ email: user.email });
        }

        res.json({ user, profile });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch user details" });
      }
    });

    // ── NOTICES SECTION ───────────────────────────────────────
    app.get('/api/notices', async (req, res) => {
      try {
        const notices = await noticesCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, count: notices.length, notices });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch notices" });
      }
    });

    app.post('/api/notices', async (req, res) => {
      try {
        const { title, category, audience, content, priority } = req.body;
        if (!title || !content) {
          return res.status(400).json({ error: "Title and content are required" });
        }
        const newNotice = {
          title,
          category: category || "General",
          audience: audience || "All Members",
          content,
          priority: priority || "Normal",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          createdAt: new Date(),
        };
        const result = await noticesCollection.insertOne(newNotice);
        res.status(201).json({ success: true, notice: { ...newNotice, _id: result.insertedId } });
      } catch (err) {
        res.status(500).json({ error: "Failed to create notice" });
      }
    });

    app.delete('/api/notices/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await noticesCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ error: "Notice not found" });
        res.json({ success: true, message: "Notice deleted successfully" });
      } catch (err) {
        res.status(500).json({ error: "Failed to delete notice" });
      }
    });

    // ── COURSES SECTION ───────────────────────────────────────
    app.get('/api/courses', async (req, res) => {
      try {
        const { semester, search } = req.query;
        const query = {};

        if (semester) {
          const semNumMatch = String(semester).match(/\d+/);
          const semNum = semNumMatch ? parseInt(semNumMatch[0], 10) : null;
          query.$or = [
            { semester: semester },
            { semester: { $regex: semester, $options: 'i' } }
          ];
          if (semNum) {
            query.$or.push({ semesterNum: semNum });
            query.$or.push({ semester: `${semNum}st Semester` });
            query.$or.push({ semester: `${semNum}nd Semester` });
            query.$or.push({ semester: `${semNum}rd Semester` });
            query.$or.push({ semester: `${semNum}th Semester` });
          }
        }

        if (search) {
          const searchCondition = [
            { code: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } }
          ];
          if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchCondition }];
            delete query.$or;
          } else {
            query.$or = searchCondition;
          }
        }

        const courses = await coursesCollection.find(query).sort({ semesterNum: 1, code: 1 }).toArray();
        res.json({ success: true, count: courses.length, courses });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
      }
    });

    app.post('/api/courses/seed-all', async (req, res) => {
      try {
        let count = 0;
        for (const [semNum, list] of Object.entries(SEMESTER_COURSES)) {
          const semLabel = SEMESTER_LABELS[semNum] || `${semNum}th Semester`;
          for (const course of list) {
            await coursesCollection.updateOne(
              { code: course.code },
              {
                $set: {
                  code: course.code,
                  title: course.title,
                  credits: Number(course.credits),
                  semester: semLabel,
                  semesterNum: Number(semNum),
                  updatedAt: new Date()
                },
                $setOnInsert: {
                  faculty: "Dept Faculty Member",
                  createdAt: new Date()
                }
              },
              { upsert: true }
            );
            count++;
          }
        }
        res.json({ success: true, count, message: "Curriculum successfully synced for Semesters 1 to 8!" });
      } catch (err) {
        console.error("Error seeding curriculum:", err);
        res.status(500).json({ error: "Failed to seed curriculum" });
      }
    });

    app.post('/api/courses', async (req, res) => {
      try {
        const { code, title, credits, semester, faculty } = req.body;
        if (!code || !title) {
          return res.status(400).json({ error: "Course code and title are required" });
        }
        const semNumMatch = String(semester || "").match(/\d+/);
        const semNum = semNumMatch ? parseInt(semNumMatch[0], 10) : 1;
        const newCourse = {
          code: code.toUpperCase().trim(),
          title: title.trim(),
          credits: Number(credits) || 3.0,
          semester: semester || `${semNum}th Semester`,
          semesterNum: semNum,
          faculty: faculty || "Dept Faculty Member",
          createdAt: new Date(),
        };
        const result = await coursesCollection.insertOne(newCourse);
        res.status(201).json({ success: true, course: { ...newCourse, _id: result.insertedId } });
      } catch (err) {
        res.status(500).json({ error: "Failed to add course" });
      }
    });

    app.delete('/api/courses/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await coursesCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ error: "Course not found" });
        res.json({ success: true, message: "Course removed successfully" });
      } catch (err) {
        res.status(500).json({ error: "Failed to delete course" });
      }
    });

    // ── ADMIN BULK & MEMBER MANAGEMENT ────────────────────────
    app.post('/api/admin/students/approve-all', async (req, res) => {
      try {
        const result = await studentsCollection.updateMany(
          { status: 'pending' },
          { $set: { status: 'approved', updatedAt: new Date() } }
        );
        await usersCollection.updateMany(
          { role: 'student', status: 'pending' },
          { $set: { status: 'approved', updatedAt: new Date() } }
        );
        res.json({ success: true, modifiedCount: result.modifiedCount, message: `Approved ${result.modifiedCount} pending students.` });
      } catch (err) {
        res.status(500).json({ error: "Failed to approve all students" });
      }
    });

    app.delete('/api/students/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = { $or: [{ userId: id }, { studentId: id }, { email: id }] };
        try {
          if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
        } catch (e) {}

        const student = await studentsCollection.findOne(query);
        if (!student) return res.status(404).json({ error: "Student not found" });

        await studentsCollection.deleteOne(query);
        await usersCollection.deleteOne({ email: student.email });
        res.json({ success: true, message: "Student record deleted successfully" });
      } catch (err) {
        res.status(500).json({ error: "Failed to delete student" });
      }
    });

    // Seed initial notices and courses if empty
    const noticeCount = await noticesCollection.countDocuments();
    if (noticeCount === 0) {
      await noticesCollection.insertMany([
        {
          title: "Semester Final Examination Seating & Schedule",
          category: "Examination",
          audience: "All Students",
          content: "The 6th & 8th Semester Final Examinations are scheduled to commence from November 15, 2026. Detailed room seating will be posted on the portal.",
          priority: "High",
          date: "Oct 11, 2026",
          createdAt: new Date(),
        },
        {
          title: "Annual Department Programming Contest & Techfest 2026",
          category: "Events",
          audience: "All Members",
          content: "Registration for the Inter-University Programming Contest (IUPC) 2026 is now open. Interested teams should register by Oct 25.",
          priority: "Normal",
          date: "Oct 08, 2026",
          createdAt: new Date(),
        },
        {
          title: "Software & Hardware Lab Maintenance Schedule",
          category: "Infrastructure",
          audience: "Staff & Faculty",
          content: "Routine operating system and toolchain upgrade will be executed on Software Lab 1 workstations this weekend.",
          priority: "Normal",
          date: "Oct 05, 2026",
          createdAt: new Date(),
        }
      ]);
    }

    const courseCount = await coursesCollection.countDocuments();
    if (courseCount < 70) {
      for (const [semNum, list] of Object.entries(SEMESTER_COURSES)) {
        const semLabel = SEMESTER_LABELS[semNum] || `${semNum}th Semester`;
        for (const course of list) {
          await coursesCollection.updateOne(
            { code: course.code },
            {
              $set: {
                code: course.code,
                title: course.title,
                credits: Number(course.credits),
                semester: semLabel,
                semesterNum: Number(semNum),
                updatedAt: new Date(),
              },
              $setOnInsert: {
                faculty: "Dept Faculty Member",
                createdAt: new Date(),
              }
            },
            { upsert: true }
          );
        }
      }
      console.log('Seeded complete curriculum courses for Semesters 1 to 8 into MongoDB!');
    }

    console.log('Successfully connected to MongoDB!');
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Department Server is running!');
});

app.listen(port, () => {
  console.log(`Department Server listening on port ${port}`);
});
