const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');
const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

const router = express.Router();

// GET all courses
router.get('/', async (req, res) => {
  try {
    const { courses } = getCollections();
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

    const courseList = await courses.find(query).sort({ semesterNum: 1, code: 1 }).toArray();
    const formattedList = courseList.map(c => ({
      ...c,
      totalClasses: c.totalClasses !== undefined && c.totalClasses !== null
        ? Number(c.totalClasses)
        : null
    }));
    res.json({ success: true, count: formattedList.length, courses: formattedList });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// GET /api/courses/code/:code - Fetch single course details & schedule slots
router.get('/code/:code', async (req, res) => {
  try {
    const { courses, routines } = getCollections();
    const rawCode = decodeURIComponent(req.params.code).trim();
    const cleanCode = rawCode.replace(/[\s-]/g, '');

    // Search by exact code or regex variations (e.g. "CSE 3101", "CSE-3101", "CSE3101")
    let course = await courses.findOne({
      $or: [
        { code: { $regex: `^${rawCode}$`, $options: 'i' } },
        { code: { $regex: cleanCode, $options: 'i' } },
        { code: rawCode }
      ]
    });

    // If not in database collection, check SEMESTER_COURSES constants
    if (!course) {
      for (const [semNum, list] of Object.entries(SEMESTER_COURSES)) {
        const found = list.find(c => 
          c.code.toLowerCase() === rawCode.toLowerCase() ||
          c.code.replace(/[\s-]/g, '').toLowerCase() === cleanCode.toLowerCase()
        );
        if (found) {
          course = {
            ...found,
            semester: SEMESTER_LABELS[semNum] || `${semNum}th Semester`,
            semesterNum: Number(semNum),
            faculty: "Department Faculty Member",
            totalClasses: null
          };
          break;
        }
      }
    }

    // Fetch related routine slots
    const routineQuery = {
      $or: [
        { courseCode: { $regex: `^${rawCode}$`, $options: 'i' } },
        { courseCode: { $regex: cleanCode, $options: 'i' } },
        { courseCode: rawCode }
      ]
    };
    const routineSlots = await routines.find(routineQuery).sort({ day: 1, timeSlot: 1 }).toArray();

    if (!course && routineSlots.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const resultCourse = course ? {
      ...course,
      totalClasses: course.totalClasses !== undefined && course.totalClasses !== null
        ? Number(course.totalClasses)
        : null
    } : {
      code: rawCode.toUpperCase(),
      title: routineSlots[0]?.courseTitle || rawCode,
      credits: 3.0,
      semester: `Semester ${routineSlots[0]?.semester || 1}`,
      semesterNum: routineSlots[0]?.semester || 1,
      faculty: routineSlots[0]?.teacherName || "Assigned Faculty",
      totalClasses: null
    };

    res.json({
      success: true,
      course: resultCourse,
      routineSlots: routineSlots || []
    });
  } catch (err) {
    console.error("Error fetching course by code:", err);
    res.status(500).json({ error: "Failed to fetch course details" });
  }
});

// Seed all curriculum courses (Semesters 1-8)
router.post('/seed-all', async (req, res) => {
  try {
    const { courses } = getCollections();
    let count = 0;
    for (const [semNum, list] of Object.entries(SEMESTER_COURSES)) {
      const semLabel = SEMESTER_LABELS[semNum] || `${semNum}th Semester`;
      for (const course of list) {
        await courses.updateOne(
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

// POST new course
router.post('/', async (req, res) => {
  try {
    const { courses, teachers } = getCollections();
    const { code, title, credits, semester, faculty } = req.body;
    if (!code || !title) {
      return res.status(400).json({ error: "Course code and title are required" });
    }

    const ALLOWED_TEACHERS = ["A", "B", "C"];
    let finalFaculty = faculty?.trim() || "Dept Faculty Member";
    if (finalFaculty && !finalFaculty.toLowerCase().includes("faculty") && !finalFaculty.toLowerCase().includes("pool")) {
      const isAllowed = ALLOWED_TEACHERS.includes(finalFaculty.toUpperCase()) || 
                        ALLOWED_TEACHERS.some(t => finalFaculty.toUpperCase() === `TEACHER ${t}`);
      if (!isAllowed) {
        return res.status(400).json({
          error: "Teacher assignment error: Only Teacher A, Teacher B, or Teacher C can be assigned to a course. All other selections are not allowed."
        });
      }
      const dbTeacher = await teachers.findOne({
        name: { $regex: `^${finalFaculty.toUpperCase().replace(/^TEACHER\s+/i, '')}$`, $options: 'i' }
      });
      if (dbTeacher) finalFaculty = dbTeacher.name;
    }

    const semNumMatch = String(semester || "").match(/\d+/);
    const semNum = semNumMatch ? parseInt(semNumMatch[0], 10) : 1;
    const newCourse = {
      code: code.toUpperCase().trim(),
      title: title.trim(),
      credits: Number(credits) || 3.0,
      semester: semester || `${semNum}th Semester`,
      semesterNum: semNum,
      faculty: finalFaculty,
      createdAt: new Date(),
    };
    const result = await courses.insertOne(newCourse);
    res.status(201).json({ success: true, course: { ...newCourse, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ error: "Failed to add course" });
  }
});

// PATCH /api/courses/:id/faculty - Assign teacher (strictly A, B, or C) to course and sync related routine slots
router.patch('/:id/faculty', async (req, res) => {
  try {
    const { courses, routines, teachers } = getCollections();
    const { id } = req.params;
    const { faculty } = req.body;

    const courseDoc = await courses.findOne({ _id: new ObjectId(id) });
    if (!courseDoc) return res.status(404).json({ error: "Course not found" });

    const ALLOWED_TEACHERS = ["A", "B", "C"];
    let assignedTeacher = null;

    if (faculty && String(faculty).trim() !== "" && !String(faculty).toLowerCase().includes("unassigned") && !String(faculty).toLowerCase().includes("dept faculty")) {
      const cleanUpper = String(faculty).trim().toUpperCase().replace(/^TEACHER\s+/i, '');
      if (!ALLOWED_TEACHERS.includes(cleanUpper)) {
        return res.status(400).json({
          error: "Teacher assignment error: Only Teacher A, Teacher B, or Teacher C can be assigned to a course. All other selections are not allowed."
        });
      }

      assignedTeacher = await teachers.findOne({
        name: { $regex: `^${cleanUpper}$`, $options: 'i' }
      });
    }

    const finalFacultyName = assignedTeacher ? assignedTeacher.name : "Dept Faculty Member";
    const finalTeacherId = assignedTeacher ? (assignedTeacher.teacherId || String(assignedTeacher._id)) : null;
    const finalTeacherEmail = assignedTeacher ? assignedTeacher.email : null;

    await courses.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          faculty: finalFacultyName,
          updatedAt: new Date()
        }
      }
    );

    // Sync all existing routine slots for this course code
    const cleanUpper = courseDoc.code.trim().toUpperCase();
    const noSpace = cleanUpper.replace(/\s+/g, '');
    const routineSyncResult = await routines.updateMany(
      {
        $or: [
          { courseCode: cleanUpper },
          { courseCode: new RegExp(`^${cleanUpper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { courseCode: new RegExp(`^${noSpace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        ]
      },
      {
        $set: {
          teacherName: finalFacultyName,
          teacherId: finalTeacherId,
          teacherEmail: finalTeacherEmail,
          updatedAt: new Date()
        }
      }
    );

    const updatedCourse = await courses.findOne({ _id: new ObjectId(id) });
    res.json({
      success: true,
      message: `Course ${courseDoc.code} assigned to ${finalFacultyName}. Synchronized ${routineSyncResult.modifiedCount} routine slot(s).`,
      course: updatedCourse
    });
  } catch (err) {
    console.error("Error updating course faculty:", err);
    res.status(500).json({ error: "Failed to assign teacher to course" });
  }
});

// PATCH /api/courses/code/:code/classes - Edit how many classes will be held for this course
router.patch('/code/:code/classes', async (req, res) => {
  try {
    const { courses } = getCollections();
    const rawCode = decodeURIComponent(req.params.code).trim();
    const cleanCode = rawCode.replace(/[\s-]/g, '');
    const { totalClasses } = req.body;

    const parsedCount = parseInt(totalClasses, 10);
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 300) {
      return res.status(400).json({ error: "Please enter a valid planned classes count between 1 and 300." });
    }

    const filter = {
      $or: [
        { code: { $regex: `^${rawCode}$`, $options: 'i' } },
        { code: { $regex: cleanCode, $options: 'i' } },
        { code: rawCode }
      ]
    };

    let course = await courses.findOne(filter);
    if (!course) {
      // Upsert course document with totalClasses
      await courses.updateOne(
        { code: rawCode.toUpperCase() },
        {
          $set: {
            code: rawCode.toUpperCase(),
            totalClasses: parsedCount,
            updatedAt: new Date()
          },
          $setOnInsert: {
            title: rawCode.toUpperCase(),
            credits: 3.0,
            faculty: "Dept Faculty Member",
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    } else {
      await courses.updateOne(
        { _id: course._id },
        {
          $set: {
            totalClasses: parsedCount,
            updatedAt: new Date()
          }
        }
      );
    }

    const updated = await courses.findOne({
      $or: [
        { code: { $regex: `^${rawCode}$`, $options: 'i' } },
        { code: rawCode.toUpperCase() }
      ]
    });

    res.json({
      success: true,
      message: `Planned classes for ${rawCode.toUpperCase()} updated to ${parsedCount}.`,
      totalClasses: parsedCount,
      course: updated
    });
  } catch (err) {
    console.error("Error updating course total classes by code:", err);
    res.status(500).json({ error: "Failed to update total classes count" });
  }
});

// PATCH /api/courses/:id/classes - Edit how many classes will be held by course ID
router.patch('/:id/classes', async (req, res) => {
  try {
    const { courses } = getCollections();
    const { id } = req.params;
    const { totalClasses } = req.body;

    const parsedCount = parseInt(totalClasses, 10);
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 300) {
      return res.status(400).json({ error: "Please enter a valid planned classes count between 1 and 300." });
    }

    const result = await courses.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { totalClasses: parsedCount, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ error: "Course not found" });

    res.json({
      success: true,
      message: `Planned classes updated to ${parsedCount}.`,
      totalClasses: parsedCount,
      course: result
    });
  } catch (err) {
    console.error("Error updating course total classes by ID:", err);
    res.status(500).json({ error: "Failed to update total classes" });
  }
});

// DELETE course
router.delete('/:id', async (req, res) => {
  try {
    const { courses } = getCollections();
    const { id } = req.params;
    const result = await courses.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Course not found" });
    res.json({ success: true, message: "Course removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete course" });
  }
});

module.exports = router;
