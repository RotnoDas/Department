const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET all students (with filters)
router.get('/', async (req, res) => {
  try {
    const { students } = getCollections();
    const { status, semester, batch, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (semester) query.semester = semester;
    if (batch) query.batch = isNaN(Number(batch)) ? batch : Number(batch);
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const studentList = await students.find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: studentList.length, students: studentList });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// GET student by email
router.get('/email/:email', async (req, res) => {
  try {
    const { students } = getCollections();
    const student = await students.findOne({ email: req.params.email });
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student by email" });
  }
});

// GET student by ID
router.get('/:id', async (req, res) => {
  try {
    const { students } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { studentId: id }] };
    try { query.$or.push({ _id: new ObjectId(id) }); } catch (e) {}

    const student = await students.findOne(query);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
});

// PATCH student status (approved / rejected / pending)
router.patch('/status/:id', async (req, res) => {
  try {
    const { students, users } = getCollections();
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const query = {
      $or: [
        { userId: id },
        { studentId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const student = await students.findOne(query);
    if (!student) return res.status(404).json({ error: "Student not found" });

    await students.updateOne(query, {
      $set: { status, updatedAt: new Date() }
    });

    if (student.email) {
      await users.updateOne(
        { email: student.email },
        { $set: { status, updatedAt: new Date() } }
      );
    }

    res.json({ success: true, message: `Student status updated to ${status}`, student: { ...student, status } });
  } catch (err) {
    console.error("Error updating student status:", err);
    res.status(500).json({ error: "Failed to update student status" });
  }
});

// Shared Student Profile Update Handler
const handleStudentProfileUpdate = async (req, res) => {
  try {
    const { students, users } = getCollections();
    let identifier = req.params.email || req.params.id;
    if (!identifier) {
      return res.status(400).json({ error: "Student identifier (email or ID) is required" });
    }
    let decodedIdentifier = identifier;
    try {
      decodedIdentifier = decodeURIComponent(identifier);
    } catch (e) {}

    const query = {
      $or: [
        { email: decodedIdentifier },
        { email: identifier },
        { userId: decodedIdentifier },
        { userId: identifier },
        { studentId: decodedIdentifier },
        { studentId: identifier }
      ]
    };
    try {
      if (ObjectId.isValid(identifier)) {
        query.$or.push({ _id: new ObjectId(identifier) });
      }
    } catch (e) {}

    const student = await students.findOne(query);
    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const {
      name,
      phone,
      studentId,
      batch,
      semester,
      session,
      bloodGroup,
      address,
      bio,
      emergencyContact,
      guardianName,
      github,
      linkedin,
      image,
      avatar,
      photo
    } = req.body;

    const updateFields = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateFields.name = typeof name === 'string' ? name.trim() : name;
    if (phone !== undefined) updateFields.phone = typeof phone === 'string' ? phone.trim() : phone;
    if (studentId !== undefined) updateFields.studentId = typeof studentId === 'string' ? studentId.trim() : studentId;
    if (batch !== undefined) {
      const numBatch = Number(batch);
      updateFields.batch = !isNaN(numBatch) && String(batch).trim() !== "" ? numBatch : batch;
    }
    if (semester !== undefined) updateFields.semester = String(semester).trim();
    if (session !== undefined) updateFields.session = typeof session === 'string' ? session.trim() : session;
    if (bloodGroup !== undefined) updateFields.bloodGroup = typeof bloodGroup === 'string' ? bloodGroup.trim() : bloodGroup;
    if (address !== undefined) updateFields.address = typeof address === 'string' ? address.trim() : address;
    if (bio !== undefined) updateFields.bio = typeof bio === 'string' ? bio.trim() : bio;
    if (emergencyContact !== undefined) updateFields.emergencyContact = typeof emergencyContact === 'string' ? emergencyContact.trim() : emergencyContact;
    if (guardianName !== undefined) updateFields.guardianName = typeof guardianName === 'string' ? guardianName.trim() : guardianName;
    if (github !== undefined) updateFields.github = typeof github === 'string' ? github.trim() : github;
    if (linkedin !== undefined) updateFields.linkedin = typeof linkedin === 'string' ? linkedin.trim() : linkedin;

    const profileImage = image !== undefined ? image : (avatar !== undefined ? avatar : photo);
    if (profileImage !== undefined) {
      updateFields.image = typeof profileImage === 'string' ? profileImage.trim() : profileImage;
    }

    await students.updateOne({ _id: student._id }, { $set: updateFields });

    // Synchronize core fields with usersCollection for Better Auth session consistency
    const targetEmail = student.email || identifier;
    if (targetEmail) {
      const userSyncFields = { updatedAt: new Date() };
      if (updateFields.name !== undefined) userSyncFields.name = updateFields.name;
      if (updateFields.phone !== undefined) userSyncFields.phone = updateFields.phone;
      if (updateFields.studentId !== undefined) userSyncFields.studentId = updateFields.studentId;
      if (updateFields.batch !== undefined) userSyncFields.batch = updateFields.batch;
      if (updateFields.semester !== undefined) userSyncFields.semester = updateFields.semester;
      if (updateFields.session !== undefined) userSyncFields.session = updateFields.session;
      if (updateFields.bloodGroup !== undefined) userSyncFields.bloodGroup = updateFields.bloodGroup;
      if (updateFields.address !== undefined) userSyncFields.address = updateFields.address;
      if (updateFields.image !== undefined) userSyncFields.image = updateFields.image;

      await users.updateOne(
        { email: targetEmail },
        { $set: userSyncFields }
      );
    }

    const updatedStudent = await students.findOne({ _id: student._id });
    res.json({
      success: true,
      message: "Profile updated successfully!",
      student: updatedStudent
    });
  } catch (err) {
    console.error("Error updating student profile:", err);
    res.status(500).json({ error: "Failed to update student profile" });
  }
};

router.put('/profile/:email', handleStudentProfileUpdate);
router.patch('/profile/:email', handleStudentProfileUpdate);
router.put('/:id', handleStudentProfileUpdate);
router.patch('/:id', handleStudentProfileUpdate);
router.post('/profile-picture/:email', handleStudentProfileUpdate);
router.patch('/profile-picture/:email', handleStudentProfileUpdate);
router.put('/profile-picture/:email', handleStudentProfileUpdate);

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const { students, users } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { studentId: id }, { email: id }] };
    try {
      if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    } catch (e) {}

    const student = await students.findOne(query);
    if (!student) return res.status(404).json({ error: "Student not found" });

    await students.deleteOne(query);
    await users.deleteOne({ email: student.email });
    res.json({ success: true, message: "Student record deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete student" });
  }
});

module.exports = router;
