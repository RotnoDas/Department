const express = require('express');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET pending students
router.get('/pending-students', async (req, res) => {
  try {
    const { students } = getCollections();
    const pending = await students.find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: pending.length, students: pending });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending students" });
  }
});

// GET department statistics
router.get('/stats', async (req, res) => {
  try {
    const { students, teachers, employees, users } = getCollections();
    const totalStudents = await students.countDocuments();
    const pendingStudents = await students.countDocuments({ status: 'pending' });
    const approvedStudents = await students.countDocuments({ status: 'approved' });
    const totalTeachers = await teachers.countDocuments();
    const totalEmployees = await employees.countDocuments();
    const totalUsers = await users.countDocuments();

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

// Bulk approve all pending students
router.post('/students/approve-all', async (req, res) => {
  try {
    const { students, users } = getCollections();
    const result = await students.updateMany(
      { status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    await users.updateMany(
      { role: 'student', status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount, message: `Approved ${result.modifiedCount} pending students.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve all students" });
  }
});

module.exports = router;
