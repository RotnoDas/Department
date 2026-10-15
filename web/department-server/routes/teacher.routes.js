const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET all teachers
router.get('/', async (req, res) => {
  try {
    const { teachers } = getCollections();
    const { search, designation, status } = req.query;
    const query = {};

    if (designation) query.designation = designation;
    if (status) {
      if (status === 'approved') {
        query.status = { $ne: 'pending' };
      } else {
        query.status = status;
      }
    }
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

// PATCH teacher status (approved / rejected / pending)
router.patch('/status/:id', async (req, res) => {
  try {
    const { teachers, users } = getCollections();
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const query = {
      $or: [
        { userId: id },
        { teacherId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const teacher = await teachers.findOne(query);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    await teachers.updateOne(query, {
      $set: { status, updatedAt: new Date() }
    });

    if (teacher.email) {
      await users.updateOne(
        { email: teacher.email },
        { $set: { status, updatedAt: new Date() } }
      );
    }

    res.json({ success: true, message: `Teacher status updated to ${status}`, teacher: { ...teacher, status } });
  } catch (err) {
    console.error("Error updating teacher status:", err);
    res.status(500).json({ error: "Failed to update teacher status" });
  }
});

// POST bulk approve all pending teachers
router.post('/approve-all', async (req, res) => {
  try {
    const { teachers, users } = getCollections();
    const result = await teachers.updateMany(
      { status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    await users.updateMany(
      { role: 'teacher', status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount, message: `Approved ${result.modifiedCount} pending teachers.` });
  } catch (err) {
    console.error("Error bulk approving teachers:", err);
    res.status(500).json({ error: "Failed to approve all teachers" });
  }
});

// DELETE teacher record
router.delete('/:id', async (req, res) => {
  try {
    const { teachers, users } = getCollections();
    const { id } = req.params;
    const query = {
      $or: [
        { userId: id },
        { teacherId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const teacher = await teachers.findOne(query);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    await teachers.deleteOne(query);
    if (teacher.email) {
      await users.deleteOne({ email: teacher.email });
    }
    res.json({ success: true, message: "Teacher record deleted successfully" });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ error: "Failed to delete teacher" });
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
