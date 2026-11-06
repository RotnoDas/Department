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

    // Enrich with biometric face enrollment status
    const { faceProfiles } = getCollections();
    const profileMap = new Map();
    if (faceProfiles) {
      try {
        const profiles = await faceProfiles.find({}, { projection: { userId: 1, email: 1, studentId: 1, enrolledAt: 1 } }).toArray();
        profiles.forEach((p) => {
          if (p.userId) profileMap.set(String(p.userId), p);
          if (p.email) profileMap.set(String(p.email).toLowerCase(), p);
          if (p.studentId) profileMap.set(String(p.studentId), p);
        });
      } catch (profileErr) {
        console.warn("[students] Warning querying face profiles:", profileErr.message);
      }
    }

    const enrichedList = studentList.map((s) => {
      const p =
        (s.userId && profileMap.get(String(s.userId))) ||
        (s.email && profileMap.get(String(s.email).toLowerCase())) ||
        (s.studentId && profileMap.get(String(s.studentId))) ||
        null;
      return {
        ...s,
        faceEnrolled: Boolean(p),
        faceEnrolledAt: p?.enrolledAt || null,
      };
    });

    res.json({ success: true, count: enrichedList.length, students: enrichedList });
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

    const { faceProfiles } = getCollections();
    let profile = null;
    if (faceProfiles) {
      const identifiers = [student.userId, student.email, student.studentId].filter(Boolean);
      profile = await faceProfiles.findOne({
        $or: [
          { userId: { $in: identifiers } },
          { email: { $in: [student.email, student.email?.toLowerCase()].filter(Boolean) } },
          { studentId: student.studentId },
        ],
      });
    }

    res.json({
      ...student,
      faceEnrolled: Boolean(profile),
      faceEnrolledAt: profile?.enrolledAt || null,
    });
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

    const { faceProfiles } = getCollections();
    let profile = null;
    if (faceProfiles) {
      const identifiers = [student.userId, student.email, student.studentId, id].filter(Boolean);
      profile = await faceProfiles.findOne({
        $or: [
          { userId: { $in: identifiers } },
          { email: { $in: [student.email, student.email?.toLowerCase()].filter(Boolean) } },
          { studentId: student.studentId },
        ],
      });
    }

    res.json({
      ...student,
      faceEnrolled: Boolean(profile),
      faceEnrolledAt: profile?.enrolledAt || null,
    });
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

// POST reset student face enrollment (enables re-enrollment)
router.post('/:id/reset-face', async (req, res) => {
  try {
    const { students, faceProfiles, faceChallenges, attendanceAttempts } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { studentId: id }, { email: id }] };
    try {
      if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    } catch (e) {}

    const student = await students.findOne(query);
    const identifiers = [
      id,
      student?.userId,
      student?.email,
      student?.email?.toLowerCase(),
      student?.studentId,
    ].filter(Boolean);

    let deletedCount = 0;
    if (faceProfiles && identifiers.length > 0) {
      const delRes = await faceProfiles.deleteMany({
        $or: [
          { userId: { $in: identifiers } },
          { email: { $in: identifiers } },
          { studentId: { $in: identifiers } },
        ],
      });
      deletedCount = delRes.deletedCount;
    }

    if (faceChallenges && identifiers.length > 0) {
      await faceChallenges.deleteMany({ userId: { $in: identifiers } }).catch(() => {});
    }
    if (attendanceAttempts && identifiers.length > 0) {
      await attendanceAttempts.deleteMany({ userId: { $in: identifiers } }).catch(() => {});
    }

    const studentName = student?.name || student?.email || id;
    console.log(`[face-reset] Reset face biometric enrollment for ${studentName} (removed ${deletedCount} profiles)`);

    res.json({
      success: true,
      reset: true,
      deletedCount,
      message: deletedCount > 0
        ? `Biometric face enrollment successfully reset for ${studentName}. They can now re-enroll.`
        : `${studentName} did not have an active face profile. Face re-enrollment is available.`,
    });
  } catch (err) {
    console.error("Error resetting student face profile:", err);
    res.status(500).json({ error: "Failed to reset face biometric enrollment" });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const { students, users, faceProfiles, faceChallenges, attendanceAttempts } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { studentId: id }, { email: id }] };
    try {
      if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    } catch (e) {}

    const student = await students.findOne(query);
    if (!student) return res.status(404).json({ error: "Student not found" });

    await students.deleteOne(query);
    await users.deleteOne({ email: student.email });
    if (faceProfiles) {
      const cleanIds = [student.userId, student.email, student.studentId, id].filter(Boolean);
      await faceProfiles.deleteMany({ $or: [{ userId: { $in: cleanIds } }, { email: { $in: cleanIds } }, { studentId: { $in: cleanIds } }] }).catch(() => {});
      if (faceChallenges) await faceChallenges.deleteMany({ userId: { $in: cleanIds } }).catch(() => {});
      if (attendanceAttempts) await attendanceAttempts.deleteMany({ userId: { $in: cleanIds } }).catch(() => {});
    }
    res.json({ success: true, message: "Student record deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete student" });
  }
});

module.exports = router;
