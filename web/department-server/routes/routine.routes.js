const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');
const { buildSampleRoutinesList } = require('../utils/seed');
const { SEMESTER_COURSES } = require('../data/courses');

const router = express.Router();

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to normalize and get time slot representation variants (e.g. "09:00 - 10:00" vs "9:00 - 10:00")
const getTimeSlotVariants = (slot) => {
  const normalized = String(slot).trim();
  const withoutLeadingZero = normalized.replace(/^0/, '');
  const withLeadingZero = normalized.startsWith('0') ? normalized : '0' + normalized;
  return Array.from(new Set([normalized, withoutLeadingZero, withLeadingZero]));
};

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
      query.$or = [
        { teacherId: teacherId },
        { teacherName: { $regex: escapeRegex(teacherId), $options: 'i' } }
      ];
    }

    if (req.query.teacherName) {
      query.teacherName = { $regex: escapeRegex(req.query.teacherName), $options: 'i' };
    }

    if (search) {
      const searchConditions = [
        { courseCode: { $regex: search, $options: 'i' } },
        { courseTitle: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
        { room: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const routineList = await routines.find(query).sort({ day: 1, semester: 1, timeSlot: 1 }).toArray();
    res.json({ success: true, count: routineList.length, routines: routineList });
  } catch (err) {
    console.error("Error fetching routines:", err);
    res.status(500).json({ error: "Failed to fetch routines" });
  }
});

// GET /api/routines/occupied - Check occupied rooms & busy teachers for day & timeSlot
router.get('/occupied', async (req, res) => {
  try {
    const { routines } = getCollections();
    const { day, timeSlot, excludeSemester } = req.query;
    if (!day || !timeSlot) {
      return res.status(400).json({ error: "Day and timeSlot are required" });
    }

    const slotVariants = getTimeSlotVariants(timeSlot);
    const query = {
      day: day,
      timeSlot: { $in: slotVariants }
    };

    if (excludeSemester !== undefined && excludeSemester !== null && excludeSemester !== "") {
      const exSem = parseInt(String(excludeSemester).match(/\d+/)?.[0] || excludeSemester, 10);
      if (!isNaN(exSem)) {
        query.semester = { $ne: exSem };
      }
    }

    const occupiedSlots = await routines.find(query).toArray();
    const occupiedRooms = occupiedSlots.map(s => ({
      room: s.room,
      semester: s.semester,
      courseCode: s.courseCode,
      courseTitle: s.courseTitle
    }));

    const busyTeachers = occupiedSlots
      .filter(s => s.teacherName && !s.teacherName.toLowerCase().includes("pool"))
      .map(s => ({
        teacherName: s.teacherName,
        teacherId: s.teacherId,
        semester: s.semester,
        courseCode: s.courseCode
      }));

    res.json({ success: true, count: occupiedSlots.length, occupiedRooms, busyTeachers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch occupied resources" });
  }
});

// GET /api/routines/conflicts - Detect any current conflicts in database
router.get('/conflicts', async (req, res) => {
  try {
    const { routines } = getCollections();
    const allRoutines = await routines.find({}).toArray();

    const roomMap = {};
    const teacherMap = {};
    const conflicts = [];

    for (const r of allRoutines) {
      if (r.room) {
        const roomKey = `${r.day}__${r.timeSlot?.trim()}__${r.room?.trim()}`.toLowerCase();
        if (roomMap[roomKey]) {
          conflicts.push({
            type: "room",
            room: r.room,
            day: r.day,
            timeSlot: r.timeSlot,
            slot1: roomMap[roomKey],
            slot2: r,
            message: `Room "${r.room}" is double-booked on ${r.day} at ${r.timeSlot} between Semester ${roomMap[roomKey].semester} (${roomMap[roomKey].courseCode}) and Semester ${r.semester} (${r.courseCode}).`
          });
        } else {
          roomMap[roomKey] = r;
        }
      }

      if (r.teacherName && !r.teacherName.toLowerCase().includes("faculty") && !r.teacherName.toLowerCase().includes("pool")) {
        const teacherKey = `${r.day}__${r.timeSlot?.trim()}__${r.teacherName?.trim()}`.toLowerCase();
        if (teacherMap[teacherKey]) {
          conflicts.push({
            type: "teacher",
            teacherName: r.teacherName,
            day: r.day,
            timeSlot: r.timeSlot,
            slot1: teacherMap[teacherKey],
            slot2: r,
            message: `Instructor "${r.teacherName}" is scheduled at the same time on ${r.day} at ${r.timeSlot} for Semester ${teacherMap[teacherKey].semester} and Semester ${r.semester}.`
          });
        } else {
          teacherMap[teacherKey] = r;
        }
      }
    }

    res.json({ success: true, count: conflicts.length, conflicts });
  } catch (err) {
    res.status(500).json({ error: "Failed to detect conflicts" });
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

// GET /api/teacher/routine alias (returns raw array of classes assigned to teacher)
const handleTeacherGetRoutine = async (req, res) => {
  try {
    const { routines, teachers } = getCollections();
    const { teacherId, teacherName, email, day } = req.query;
    const query = {};
    if (day && day !== "all") query.day = day;

    let resolvedTeacherDoc = null;
    if (email) {
      resolvedTeacherDoc = await teachers.findOne({ email });
    }
    if (!resolvedTeacherDoc && teacherId) {
      resolvedTeacherDoc = await teachers.findOne({
        $or: [
          { teacherId },
          ...(ObjectId.isValid(teacherId) ? [{ _id: new ObjectId(teacherId) }] : [])
        ]
      });
    }
    if (!resolvedTeacherDoc && teacherName) {
      resolvedTeacherDoc = await teachers.findOne({
        name: { $regex: `^${escapeRegex(teacherName.trim())}$`, $options: 'i' }
      });
    }

    const orConditions = [];
    if (teacherId) orConditions.push({ teacherId });
    if (teacherName && teacherName.trim()) {
      orConditions.push({ teacherName: { $regex: `^${escapeRegex(teacherName.trim())}$`, $options: 'i' } });
    }
    if (email) {
      orConditions.push({ teacherEmail: email });
    }

    if (resolvedTeacherDoc) {
      if (resolvedTeacherDoc.teacherId) {
        orConditions.push({ teacherId: resolvedTeacherDoc.teacherId });
      }
      if (resolvedTeacherDoc.name) {
        orConditions.push({ teacherName: { $regex: `^${escapeRegex(resolvedTeacherDoc.name.trim())}$`, $options: 'i' } });
      }
      if (resolvedTeacherDoc.email) {
        orConditions.push({ teacherEmail: resolvedTeacherDoc.email });
      }
      if (resolvedTeacherDoc._id) {
        orConditions.push({ teacherId: String(resolvedTeacherDoc._id) });
      }
    }

    // STRICT ISOLATION: If no valid teacher identity is provided, return [] immediately.
    // Never fallback to returning all routines!
    if (orConditions.length === 0) {
      return res.json([]);
    }

    query.$or = orConditions;

    const routineList = await routines.find(query).sort({ day: 1, timeSlot: 1 }).toArray();
    res.json(routineList);
  } catch (err) {
    console.error("Error fetching teacher routine:", err);
    res.status(500).json({ error: "Failed to fetch teacher routine" });
  }
};

// Shared Save/Update Routine Slot handler with Room & Teacher Conflict Validation
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
    const slotVariants = getTimeSlotVariants(normalizedSlot);

    // If courseCode is empty or 'CLEAR', vacate the slot
    if (!courseCode || courseCode.trim() === "" || courseCode.toUpperCase() === "CLEAR") {
      await routines.deleteOne({ day, semester: semNum, timeSlot: normalizedSlot });
      return res.json({ success: true, message: "Class slot removed/cleared successfully." });
    }

    const finalRoom = room ? String(room).trim() : `Room ${400 + semNum}`;

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

    // ── STRICT TEACHER ALLOWLIST VALIDATION (Only Teacher A, B, or C allowed) ──
    const ALLOWED_TEACHERS = ["A", "B", "C"];
    let resolvedTeacherId = teacherId || null;
    let resolvedTeacherEmail = req.body.teacherEmail || null;

    if (finalTeacherName && !finalTeacherName.toLowerCase().includes("pool") && !finalTeacherName.toLowerCase().includes("dept faculty")) {
      const dbTeacher = await teachers.findOne({
        $or: [
          ...(teacherId ? [{ teacherId: teacherId }, ...(ObjectId.isValid(teacherId) ? [{ _id: new ObjectId(teacherId) }] : [])] : []),
          { name: { $regex: `^${escapeRegex(finalTeacherName.trim())}$`, $options: 'i' } }
        ]
      });

      const teacherNameUpper = (dbTeacher?.name || finalTeacherName).trim().toUpperCase();
      const isAllowed = ALLOWED_TEACHERS.includes(teacherNameUpper) || 
                        ALLOWED_TEACHERS.some(t => teacherNameUpper === `TEACHER ${t}`);

      if (!isAllowed) {
        return res.status(400).json({
          error: "Teacher assignment error: Only Teacher A, Teacher B, or Teacher C can be assigned to a course. All other selections are not allowed."
        });
      }

      if (dbTeacher) {
        finalTeacherName = dbTeacher.name;
        resolvedTeacherEmail = dbTeacher.email;
        resolvedTeacherId = dbTeacher.teacherId || (dbTeacher._id ? String(dbTeacher._id) : null);
      }
    }

    // ── 1. ROOM CONFLICT VALIDATION ──────────────────────────────────────────
    // In a day and time slot, a room can ONLY host one class. Check other semesters!
    if (finalRoom) {
      const roomRegex = new RegExp(`^${escapeRegex(finalRoom)}$`, 'i');
      const existingRoomConflict = await routines.findOne({
        day: day,
        timeSlot: { $in: slotVariants },
        semester: { $ne: semNum },
        room: roomRegex
      });

      if (existingRoomConflict) {
        return res.status(409).json({
          error: `Room Conflict: "${finalRoom}" is already booked on ${day} at ${normalizedSlot} by Semester ${existingRoomConflict.semester} (${existingRoomConflict.courseCode}${existingRoomConflict.courseTitle ? ' - ' + existingRoomConflict.courseTitle : ''}). Another class cannot be held in this room at that time.`,
          conflictType: 'room',
          conflict: existingRoomConflict
        });
      }
    }

    // ── 2. TEACHER CONFLICT VALIDATION ───────────────────────────────────────
    // An instructor cannot teach two classes at the exact same day and time slot.
    if (finalTeacherName && !finalTeacherName.toLowerCase().includes("faculty") && !finalTeacherName.toLowerCase().includes("pool")) {
      const teacherRegex = new RegExp(`^${escapeRegex(finalTeacherName)}$`, 'i');
      const teacherQuery = {
        day: day,
        timeSlot: { $in: slotVariants },
        semester: { $ne: semNum },
        $or: [
          { teacherName: teacherRegex }
        ]
      };
      if (resolvedTeacherId) {
        teacherQuery.$or.push({ teacherId: resolvedTeacherId });
      }

      const existingTeacherConflict = await routines.findOne(teacherQuery);
      if (existingTeacherConflict) {
        return res.status(409).json({
          error: `Instructor Conflict: "${finalTeacherName}" is already scheduled to teach Semester ${existingTeacherConflict.semester} (${existingTeacherConflict.courseCode}${existingTeacherConflict.courseTitle ? ' - ' + existingTeacherConflict.courseTitle : ''}) on ${day} at ${normalizedSlot}. An instructor cannot teach two classes at the same time.`,
          conflictType: 'teacher',
          conflict: existingTeacherConflict
        });
      }
    }

    // ── 3. UPDATE / UPSERT ROUTINE SLOT ──────────────────────────────────────
    await routines.updateOne(
      { day, semester: semNum, timeSlot: normalizedSlot },
      {
        $set: {
          day,
          semester: semNum,
          timeSlot: normalizedSlot,
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: finalCourseTitle || "Academic Lecture",
          teacherId: resolvedTeacherId,
          teacherName: finalTeacherName || "Dept Faculty Member",
          teacherEmail: resolvedTeacherEmail || null,
          room: finalRoom,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // ── 4. AUTO-FILL ALL OTHER SLOTS OF THIS COURSE IN THIS SEMESTER ─────────
    let autoFilledCount = 0;
    if (finalTeacherName && ALLOWED_TEACHERS.includes(finalTeacherName.trim().toUpperCase())) {
      const cleanUpperCode = courseCode.trim().toUpperCase();
      const noSpaceCode = cleanUpperCode.replace(/\s+/g, '');

      // Automatically update all slots of this course in this semester with the assigned teacher
      const updateAllSlotsResult = await routines.updateMany(
        {
          semester: semNum,
          $or: [
            { courseCode: cleanUpperCode },
            { courseCode: new RegExp(`^${escapeRegex(cleanUpperCode)}$`, 'i') },
            { courseCode: new RegExp(`^${escapeRegex(noSpaceCode)}$`, 'i') }
          ]
        },
        {
          $set: {
            teacherName: finalTeacherName,
            teacherId: resolvedTeacherId,
            teacherEmail: resolvedTeacherEmail,
            updatedAt: new Date()
          }
        }
      );
      autoFilledCount = updateAllSlotsResult.modifiedCount || 0;

      // Keep course catalog faculty field in sync with assigned teacher (A, B, or C)
      await courses.updateMany(
        {
          $or: [
            { code: cleanUpperCode },
            { code: new RegExp(`^${escapeRegex(cleanUpperCode)}$`, 'i') },
            { code: new RegExp(`^${escapeRegex(noSpaceCode)}$`, 'i') }
          ]
        },
        {
          $set: {
            faculty: finalTeacherName,
            updatedAt: new Date()
          }
        }
      );
    }

    const savedSlot = await routines.findOne({ day, semester: semNum, timeSlot: normalizedSlot });
    res.json({
      success: true,
      message: `Routine updated successfully.${autoFilledCount > 1 ? ` Auto-filled ${autoFilledCount} class slots for ${courseCode.trim().toUpperCase()} with Teacher ${finalTeacherName}.` : ''}`,
      autoFilledCount,
      routine: savedSlot
    });
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

// POST seed sample routines (with 0 room and 0 teacher conflicts for Semesters 7 & 8)
router.post('/seed-sample', async (req, res) => {
  try {
    const { routines, teachers } = getCollections();
    const teachersList = await teachers.find({ status: { $ne: 'rejected' } }).toArray();
    const sampleRoutines = buildSampleRoutinesList(teachersList);
    await routines.deleteMany({});
    const result = await routines.insertMany(sampleRoutines);
    res.json({
      success: true,
      count: result.insertedCount,
      message: `Successfully generated ${result.insertedCount} conflict-free routine slots across all Semesters (1 to 8) distributed among registered faculty!`
    });
  } catch (err) {
    console.error("Error seeding sample routines:", err);
    res.status(500).json({ error: "Failed to seed sample routines" });
  }
});

module.exports = router;
module.exports.handleAdminGetRoutine = handleAdminGetRoutine;
module.exports.handleStudentGetRoutine = handleStudentGetRoutine;
module.exports.handleTeacherGetRoutine = handleTeacherGetRoutine;
module.exports.handleSaveRoutineSlot = handleSaveRoutineSlot;
