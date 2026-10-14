const express = require('express');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET unified user details & role profile
router.get('/:email', async (req, res) => {
  try {
    const { users, students, teachers, employees } = getCollections();
    const user = await users.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });

    let profile = null;
    if (user.role === 'student') {
      profile = await students.findOne({ email: user.email });
    } else if (user.role === 'teacher') {
      profile = await teachers.findOne({ email: user.email });
    } else if (user.role === 'employee') {
      profile = await employees.findOne({ email: user.email });
    }

    res.json({ user, profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

module.exports = router;
