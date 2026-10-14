const express = require('express');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET all employees
router.get('/', async (req, res) => {
  try {
    const { employees } = getCollections();
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

module.exports = router;
