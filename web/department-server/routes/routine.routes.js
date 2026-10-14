const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');
const { buildSampleRoutinesList } = require('../utils/seed');
const { SEMESTER_COURSES } = require('../data/courses');

const router = express.Router();

// GET all routines with query filters
router.get('/', async (req, res) => {
  try {
    const { routines } = getCollections();
    const { semester, day, teacherId, search } = req.query;
    const query = {};

    if (semester && semester !== "all") {
      const semNumMatch = String(semester).match(/\d+/);
      const semNum = semNumMatch ? parseInt(semNumMatch[0], 10) : null;
      if (semNum) {
        query.semester = semNum;
      }
    }

    if (day && day !== "all") {
      query.day = day;
    }

    if (teacherId) {
      query.teacherId = teacherId;
    }

    if (search) {
      query.$or = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseTitle: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
        { room: { $regex: search, $options: 'i' } }
      ];
    }

    const routineList = await routines.find(query).sort({ day: 1, semester: 1, timeSlot: 1 }).toArray();
    res.json({ success: true, count: routineList.length, routines: routineList });
  } catch (err) {
    console.error("Error fetching routines:", err);
    res.status(500).json({ error: "Failed to fetch routines" });
  }
});

// GET /api/admin/routine alias (returns raw array)
const handleAdminGetRoutine = async (req, res) => {
  try {
    const { routines } = getCollections();
    const { semester } = req.query;
    const query = {};
    if (semester && semester !== "all") {
      const semNumMatch = String(semester).match(/\d+/);
      if (semNumMatch) query.semester = parseInt(semNumMatch[0], 10);
    }
    const routineList = await routines.find(query).sort({ day: 1, semester: 1, timeSlot: 1 }).toArray();
    res.json(routineList);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch routines" });
  }
};

// GET /api/student/routine alias (returns raw array)
const handleStudentGetRoutine = async (req, res) => {
  try {
    const { routines } = getCollections();
    const { semester } = req.query;
    const query = {};
    if (semester) {
      const semNumMatch = String(semester).match(/\d+/);
      if (semNumMatch) query.semester = parseInt(semNumMatch[0], 10);
    }
    const routineList = await routines.find(query).sort({ day: 1, timeSlot: 1 }).toArray();
    res.json(routineList);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student routine" });
  }
};

// Shared Save/Update Routine Slot handler
const handleSaveRoutineSlot = async (req, res) => {
  try {
    const { routines, courses, teachers } = getCollections();
    const { day, semester, timeSlot, courseCode, courseTitle, teacherId, teacherName, room } = req.body;
    if (!day || semester === undefined || semester === null || !timeSlot) {
      return res.status(400).json({ error: "Day, semester, and time slot are required." });
    }

    const semNumMatch = String(semester).match(/\d+/);
    const semNum = semNumMatch ? parseInt(semNumMatch[0], 10) : Number(semester);
    const normalizedSlot = String(timeSlot).trim();

    // If courseCode is empty or 'CLEAR', vacate the slot
    if (!courseCode || courseCode.trim() === "" || courseCode.toUpperCase() === "CLEAR") {
      await routines.deleteOne({ day, semester: semNum, timeSlot: normalizedSlot });
      return res.json({ success: true, message: "Class slot removed/cleared successfully." });
    }

    let finalCourseTitle = courseTitle || "";
    let finalTeacherName = teacherName || "";

    // Resolve course title if empty
    if (!finalCourseTitle && SEMESTER_COURSES[semNum]) {
      const foundCourse = SEMESTER_COURSES[semNum].find(c => c.code.toUpperCase() === courseCode.trim().toUpperCase());
      if (foundCourse) finalCourseTitle = foundCourse.title;
    }
    if (!finalCourseTitle) {
      const dbCourse = await courses.findOne({ code: courseCode.trim().toUpperCase() });
      if (dbCourse) finalCourseTitle = dbCourse.title;
    }

    // Resolve teacher name if teacherId given
    if (teacherId && !finalTeacherName) {
      const dbTeacher = await teachers.findOne({
        $or: [{ teacherId: teacherId }, { email: teacherId }]
      });
      if (dbTeacher) finalTeacherName = dbTeacher.name;
    }

    await routines.updateOne(
      { day, semester: semNum, timeSlot: normalizedSlot },
      {
        $set: {
          day,
          semester: semNum,
          timeSlot: normalizedSlot,
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: finalCourseTitle || "Academic Lecture",
          teacherId: teacherId || null,
          teacherName: finalTeacherName || "Faculty Instructor",
          room: room ? String(room).trim() : "401",
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const savedSlot = await routines.findOne({ day, semester: semNum, timeSlot: normalizedSlot });
    res.json({ success: true, message: "Routine updated successfully.", routine: savedSlot });
  } catch (err) {
    console.error("Error saving routine slot:", err);
    res.status(500).json({ error: "Failed to update routine slot." });
  }
};

router.post('/', handleSaveRoutineSlot);
router.put('/', handleSaveRoutineSlot);

// DELETE routine slot by query
router.delete('/slot', async (req, res) => {
  try {
    const { routines } = getCollections();
    const { day, semester, timeSlot } = req.query;
    if (!day || !semester || !timeSlot) {
      return res.status(400).json({ error: "Day, semester, and time slot are required" });
    }
    const semNum = parseInt(String(semester).match(/\d+/)?.[0] || semester, 10);
    const result = await routines.deleteOne({ day, semester: semNum, timeSlot: String(timeSlot).trim() });
    res.json({ success: true, message: "Routine slot deleted successfully", deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete routine slot" });
  }
});

// DELETE routine slot by ObjectId
router.delete('/:id', async (req, res) => {
  try {
    const { routines } = getCollections();
    const { id } = req.params;
    const result = await routines.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Routine slot not found" });
    res.json({ success: true, message: "Routine slot deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete routine slot" });
  }
});

// POST seed sample routines
router.post('/seed-sample', async (req, res) => {
  try {
    const { routines, teachers } = getCollections();
    const teachersList = await teachers.find({}).toArray();
    const sampleRoutines = buildSampleRoutinesList(teachersList);
    await routines.deleteMany({});
    const result = await routines.insertMany(sampleRoutines);
    res.json({
      success: true,
      count: result.insertedCount,
      message: `Successfully seeded ${result.insertedCount} routine slots for Semesters 1 to 8!`
    });
  } catch (err) {
    console.error("Error seeding sample routines:", err);
    res.status(500).json({ error: "Failed to seed sample routines" });
  }
});

module.exports = router;
module.exports.handleAdminGetRoutine = handleAdminGetRoutine;
module.exports.handleStudentGetRoutine = handleStudentGetRoutine;
module.exports.handleSaveRoutineSlot = handleSaveRoutineSlot;
