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

// GET pending teachers
router.get('/pending-teachers', async (req, res) => {
  try {
    const { teachers } = getCollections();
    const pending = await teachers.find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: pending.length, teachers: pending });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending teachers" });
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
    const pendingTeachers = await teachers.countDocuments({ status: 'pending' });
    const approvedTeachers = await teachers.countDocuments({ status: { $ne: 'pending' } });
    const totalEmployees = await employees.countDocuments();
    const pendingEmployees = await employees.countDocuments({ status: 'pending' });
    const approvedEmployees = await employees.countDocuments({ status: { $ne: 'pending' } });
    const totalUsers = await users.countDocuments();

    res.json({
      totalStudents,
      pendingStudents,
      approvedStudents,
      totalTeachers,
      pendingTeachers,
      approvedTeachers,
      totalEmployees,
      pendingEmployees,
      approvedEmployees,
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

// Bulk approve all pending teachers
router.post('/teachers/approve-all', async (req, res) => {
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
    res.status(500).json({ error: "Failed to approve all teachers" });
  }
});

// Bulk approve all pending employees
router.post('/employees/approve-all', async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const result = await employees.updateMany(
      { status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    await users.updateMany(
      { role: 'employee', status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount, message: `Approved ${result.modifiedCount} pending employees.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve all employees" });
  }
});

module.exports = router;
