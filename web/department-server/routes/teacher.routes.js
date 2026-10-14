const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET all teachers
router.get('/', async (req, res) => {
  try {
    const { teachers } = getCollections();
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

    const teacherList = await teachers.find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: teacherList.length, teachers: teacherList });
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

// GET teacher by email
router.get('/email/:email', async (req, res) => {
  try {
    const { teachers } = getCollections();
    const teacher = await teachers.findOne({ email: req.params.email });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teacher" });
  }
});

// GET teacher by id / teacherId
router.get('/:id', async (req, res) => {
  try {
    const { teachers } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { teacherId: id }] };
    try { query.$or.push({ _id: new ObjectId(id) }); } catch (e) {}

    const teacher = await teachers.findOne(query);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teacher" });
  }
});

module.exports = router;
