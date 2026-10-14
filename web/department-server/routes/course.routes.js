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
    res.json({ success: true, count: courseList.length, courses: courseList });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
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
    const { courses } = getCollections();
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
    const result = await courses.insertOne(newCourse);
    res.status(201).json({ success: true, course: { ...newCourse, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ error: "Failed to add course" });
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
