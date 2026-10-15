const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET all employees
router.get('/', async (req, res) => {
  try {
    const { employees } = getCollections();
    const { search, department, status } = req.query;
    const query = {};

    if (department) query.department = department;
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
        { employeeId: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const employeeList = await employees.find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: employeeList.length, employees: employeeList });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// GET employee by email
router.get('/email/:email', async (req, res) => {
  try {
    const { employees } = getCollections();
    const employee = await employees.findOne({ email: req.params.email });
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// PATCH employee status (approved / rejected / pending)
router.patch('/status/:id', async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const query = {
      $or: [
        { userId: id },
        { employeeId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const employee = await employees.findOne(query);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await employees.updateOne(query, {
      $set: { status, updatedAt: new Date() }
    });

    if (employee.email) {
      await users.updateOne(
        { email: employee.email },
        { $set: { status, updatedAt: new Date() } }
      );
    }

    res.json({ success: true, message: `Employee status updated to ${status}`, employee: { ...employee, status } });
  } catch (err) {
    console.error("Error updating employee status:", err);
    res.status(500).json({ error: "Failed to update employee status" });
  }
});

// POST bulk approve all pending employees
router.post('/approve-all', async (req, res) => {
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
    console.error("Error bulk approving employees:", err);
    res.status(500).json({ error: "Failed to approve all employees" });
  }
});

// DELETE employee record
router.delete('/:id', async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const { id } = req.params;
    const query = {
      $or: [
        { userId: id },
        { employeeId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const employee = await employees.findOne(query);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await employees.deleteOne(query);
    if (employee.email) {
      await users.deleteOne({ email: employee.email });
    }
    res.json({ success: true, message: "Employee record deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// GET employee by id
router.get('/:id', async (req, res) => {
  try {
    const { employees } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { employeeId: id }] };
    try { query.$or.push({ _id: new ObjectId(id) }); } catch (e) {}

    const employee = await employees.findOne(query);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

module.exports = router;
