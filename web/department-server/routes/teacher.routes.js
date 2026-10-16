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

// Shared Teacher Profile Update Handler
const handleTeacherProfileUpdate = async (req, res) => {
  try {
    const { teachers, users, routines } = getCollections();
    let identifier = req.params.email || req.params.id;
    if (!identifier) {
      return res.status(400).json({ error: "Teacher identifier (email or ID) is required" });
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
        { teacherId: decodedIdentifier },
        { teacherId: identifier }
      ]
    };
    try {
      if (ObjectId.isValid(identifier)) {
        query.$or.push({ _id: new ObjectId(identifier) });
      }
    } catch (e) {}

    const teacher = await teachers.findOne(query);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    const {
      name,
      phone,
      teacherId,
      designation,
      specialization,
      officeRoom,
      joiningDate,
      bio,
      address,
      bloodGroup,
      education,
      researchInterests,
      github,
      linkedin,
      googleScholar,
      website,
      image,
      avatar,
      photo
    } = req.body;

    const updateFields = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateFields.name = typeof name === 'string' ? name.trim() : name;
    if (phone !== undefined) updateFields.phone = typeof phone === 'string' ? phone.trim() : phone;
    if (teacherId !== undefined) updateFields.teacherId = typeof teacherId === 'string' ? teacherId.trim() : teacherId;
    if (designation !== undefined) updateFields.designation = typeof designation === 'string' ? designation.trim() : designation;
    if (specialization !== undefined) updateFields.specialization = typeof specialization === 'string' ? specialization.trim() : specialization;
    if (officeRoom !== undefined) updateFields.officeRoom = typeof officeRoom === 'string' ? officeRoom.trim() : officeRoom;
    if (joiningDate !== undefined) updateFields.joiningDate = typeof joiningDate === 'string' ? joiningDate.trim() : joiningDate;
    if (bio !== undefined) updateFields.bio = typeof bio === 'string' ? bio.trim() : bio;
    if (address !== undefined) updateFields.address = typeof address === 'string' ? address.trim() : address;
    if (bloodGroup !== undefined) updateFields.bloodGroup = typeof bloodGroup === 'string' ? bloodGroup.trim() : bloodGroup;
    if (education !== undefined) updateFields.education = typeof education === 'string' ? education.trim() : education;
    if (researchInterests !== undefined) updateFields.researchInterests = typeof researchInterests === 'string' ? researchInterests.trim() : researchInterests;
    if (github !== undefined) updateFields.github = typeof github === 'string' ? github.trim() : github;
    if (linkedin !== undefined) updateFields.linkedin = typeof linkedin === 'string' ? linkedin.trim() : linkedin;
    if (googleScholar !== undefined) updateFields.googleScholar = typeof googleScholar === 'string' ? googleScholar.trim() : googleScholar;
    if (website !== undefined) updateFields.website = typeof website === 'string' ? website.trim() : website;

    const profileImage = image !== undefined ? image : (avatar !== undefined ? avatar : photo);
    if (profileImage !== undefined) {
      updateFields.image = typeof profileImage === 'string' ? profileImage.trim() : profileImage;
    }

    await teachers.updateOne({ _id: teacher._id }, { $set: updateFields });

    // Sync with users collection for Better Auth session consistency
    const targetEmail = teacher.email || identifier;
    if (targetEmail) {
      const userSyncFields = { updatedAt: new Date() };
      if (updateFields.name !== undefined) userSyncFields.name = updateFields.name;
      if (updateFields.phone !== undefined) userSyncFields.phone = updateFields.phone;
      if (updateFields.teacherId !== undefined) userSyncFields.teacherId = updateFields.teacherId;
      if (updateFields.designation !== undefined) userSyncFields.designation = updateFields.designation;
      if (updateFields.specialization !== undefined) userSyncFields.specialization = updateFields.specialization;
      if (updateFields.officeRoom !== undefined) userSyncFields.officeRoom = updateFields.officeRoom;
      if (updateFields.image !== undefined) userSyncFields.image = updateFields.image;

      await users.updateOne(
        { email: targetEmail },
        { $set: userSyncFields }
      );
    }

    // Sync routine timetable teacher name / teacher ID if updated
    if (routines && (updateFields.name !== undefined || updateFields.teacherId !== undefined)) {
      const routineMatch = {
        $or: [
          { teacherId: teacher.teacherId || String(teacher._id) },
          { teacherName: teacher.name }
        ]
      };
      const routineUpdate = { $set: { updatedAt: new Date() } };
      if (updateFields.name) routineUpdate.$set.teacherName = updateFields.name;
      if (updateFields.teacherId) routineUpdate.$set.teacherId = updateFields.teacherId;
      await routines.updateMany(routineMatch, routineUpdate);
    }

    const updatedTeacher = await teachers.findOne({ _id: teacher._id });
    res.json({
      success: true,
      message: "Faculty profile updated successfully!",
      teacher: updatedTeacher
    });
  } catch (err) {
    console.error("Error updating teacher profile:", err);
    res.status(500).json({ error: "Failed to update faculty profile" });
  }
};

// Mount profile update routes
router.put('/profile/:email', handleTeacherProfileUpdate);
router.patch('/profile/:email', handleTeacherProfileUpdate);
router.put('/:id', handleTeacherProfileUpdate);
router.patch('/:id', handleTeacherProfileUpdate);

module.exports = router;
