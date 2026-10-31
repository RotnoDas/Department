'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// Ensure upload directories exist
const assignmentsDir = path.join(__dirname, '..', 'uploads', 'assignments');
fs.mkdirSync(assignmentsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, assignmentsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `assignment-${uniqueSuffix}-${sanitizedBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ── GET /api/assignments ──────────────────────────────────────
// Query: ?semester=7&courseCode=CSE4201&teacherEmail=...&studentEmail=...
router.get('/', async (req, res) => {
  try {
    const { assignments, assignmentSubmissions } = getCollections();
    const { semester, courseCode, teacherEmail, studentEmail } = req.query;

    const query = {};
    if (semester && semester !== 'all') {
      // Support matching "7", 7, "7th Semester", etc.
      const semNum = String(semester).replace(/[^0-9]/g, '');
      const semConditions = [
        { semester: semester },
        { semester: semNum },
        { semester: `${semNum}th Semester` },
      ];
      if (semNum && !isNaN(Number(semNum))) {
        semConditions.push({ semester: Number(semNum) });
      }
      query.$or = semConditions;
    }
    if (courseCode) {
      const clean = String(courseCode).replace(/[\s-]/g, '');
      query.courseCode = { $regex: clean.split('').join('\\s*'), $options: 'i' };
    }
    if (teacherEmail) query.teacherEmail = teacherEmail;

    const list = await assignments.find(query).sort({ createdAt: -1 }).toArray();

    // If studentEmail is supplied, attach their submission state
    let results = list;
    if (studentEmail) {
      const cleanEmail = String(studentEmail).trim();
      const mySubmissions = await assignmentSubmissions
        .find({ studentEmail: { $regex: `^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: 'i' } })
        .toArray();
      const submissionMap = new Map();
      mySubmissions.forEach((sub) => {
        submissionMap.set(String(sub.assignmentId), sub);
      });

      results = list.map((a) => {
        const sub = submissionMap.get(String(a._id));
        return {
          ...a,
          mySubmission: sub || null,
        };
      });
    } else {
      // If teacher viewing, get submission counts
      const counts = await assignmentSubmissions
        .aggregate([
          { $group: { _id: '$assignmentId', count: { $sum: 1 } } },
        ])
        .toArray();
      const countMap = new Map();
      counts.forEach((c) => countMap.set(String(c._id), c.count));

      results = list.map((a) => ({
        ...a,
        submissionCount: countMap.get(String(a._id)) || 0,
      }));
    }

    res.json({ success: true, count: results.length, assignments: results });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// ── POST /api/assignments (Teacher Creates Assignment) ────────
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { assignments } = getCollections();
    const {
      title,
      description,
      courseCode,
      courseTitle,
      semester,
      teacherId,
      teacherName,
      teacherEmail,
      deadline,
      totalMarks,
    } = req.body;

    if (!title || !courseCode || !deadline) {
      return res.status(400).json({ error: 'Title, Course Code, and Deadline are required.' });
    }

    let filePath = null;
    let originalName = null;
    let fileMime = null;
    let fileSize = 0;

    if (req.file) {
      filePath = `/uploads/assignments/${req.file.filename}`;
      originalName = req.file.originalname;
      fileMime = req.file.mimetype;
      fileSize = req.file.size;
    }

    const doc = {
      title: title.trim(),
      description: (description || '').trim(),
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: (courseTitle || '').trim(),
      semester: String(semester || '1').trim(),
      teacherId: teacherId || '',
      teacherName: teacherName || 'Department Faculty',
      teacherEmail: teacherEmail || '',
      deadline: new Date(deadline),
      totalMarks: Number(totalMarks) || 20,
      filePath,
      originalName,
      fileMime,
      fileSize,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await assignments.insertOne(doc);
    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment: { ...doc, _id: result.insertedId },
    });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// ── DELETE /api/assignments/:id ──────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { assignments, assignmentSubmissions } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const assignment = await assignments.findOne({ _id: new ObjectId(id) });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Delete attachment file if exists
    if (assignment.filePath) {
      const diskPath = path.join(__dirname, '..', assignment.filePath.replace(/^\//, ''));
      try {
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      } catch (e) {
        console.warn('Could not delete assignment file from disk:', e.message);
      }
    }

    // Delete all submissions & files
    const subs = await assignmentSubmissions.find({ assignmentId: new ObjectId(id) }).toArray();
    for (const sub of subs) {
      if (sub.filePath) {
        const subDiskPath = path.join(__dirname, '..', sub.filePath.replace(/^\//, ''));
        try {
          if (fs.existsSync(subDiskPath)) fs.unlinkSync(subDiskPath);
        } catch (e) {}
      }
    }

    await assignmentSubmissions.deleteMany({ assignmentId: new ObjectId(id) });
    await assignments.deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Assignment and related submissions deleted successfully' });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// ── POST /api/assignments/:id/submit (Student Submits or Resubmits Work) ───
router.post('/:id/submit', upload.single('file'), async (req, res) => {
  try {
    const { assignments, assignmentSubmissions } = getCollections();
    const { id } = req.params;
    const { studentId, studentName, studentEmail, batch, semester } = req.body;
    const notes = (req.body.notes || req.body.comment || '').trim();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    if (!studentEmail) {
      return res.status(400).json({ error: 'Student email is required.' });
    }

    const assignment = await assignments.findOne({ _id: new ObjectId(id) });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    let filePath = null;
    let originalName = null;
    let fileMime = null;
    let fileSize = 0;

    if (req.file) {
      filePath = `/uploads/assignments/${req.file.filename}`;
      originalName = req.file.originalname;
      fileMime = req.file.mimetype;
      fileSize = req.file.size;
    }

    const now = new Date();
    const isLate = now > new Date(assignment.deadline);

    // Check if previous submission exists
    const cleanStudentEmail = String(studentEmail).trim();
    const cleanStudentId = String(studentId || '').trim();
    const existing = await assignmentSubmissions.findOne({
      assignmentId: { $in: [new ObjectId(id), String(id)] },
      $or: [
        { studentEmail: { $regex: `^${cleanStudentEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: 'i' } },
        ...(cleanStudentId ? [{ studentId: cleanStudentId }] : []),
      ],
    });

    if (existing) {
      // If replacing file with new one, remove old one from disk
      if (filePath && existing.filePath) {
        const oldPath = path.join(__dirname, '..', existing.filePath.replace(/^\//, ''));
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {}
      }

      const updateData = {
        studentId: studentId || existing.studentId,
        studentName: studentName || existing.studentName,
        batch: batch || existing.batch,
        semester: semester || existing.semester,
        notes: notes !== '' ? notes : (existing.notes || ''),
        submittedAt: now,
        isLate,
        status: isLate ? 'late' : 'submitted',
        updatedAt: now,
      };
      if (filePath) {
        updateData.filePath = filePath;
        updateData.originalName = originalName;
        updateData.fileMime = fileMime;
        updateData.fileSize = fileSize;
      }

      await assignmentSubmissions.updateOne(
        { _id: existing._id },
        { $set: updateData }
      );

      const updated = await assignmentSubmissions.findOne({ _id: existing._id });
      return res.json({
        success: true,
        message: 'Assignment resubmitted successfully.',
        submission: updated,
      });
    }

    // New submission requires file or notes
    if (!filePath && !notes) {
      return res.status(400).json({ error: 'Please select a solution file or provide submission notes.' });
    }

    // New submission
    const newDoc = {
      assignmentId: new ObjectId(id),
      courseCode: assignment.courseCode,
      courseTitle: assignment.courseTitle,
      studentId: studentId || '',
      studentName: studentName || 'Student',
      studentEmail: studentEmail,
      batch: batch || '',
      semester: semester || assignment.semester,
      notes: (notes || '').trim(),
      filePath,
      originalName,
      fileMime,
      fileSize,
      submittedAt: now,
      isLate,
      status: isLate ? 'late' : 'submitted',
      marks: null,
      feedback: '',
      createdAt: now,
      updatedAt: now,
    };

    const result = await assignmentSubmissions.insertOne(newDoc);
    res.status(201).json({
      success: true,
      message: isLate
        ? 'Assignment submitted (marked as Late).'
        : 'Assignment submitted successfully!',
      submission: { ...newDoc, _id: result.insertedId },
    });
  } catch (err) {
    console.error('Error submitting assignment:', err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// ── GET /api/assignments/:id/submissions (Teacher views submissions roll-wise)
router.get('/:id/submissions', async (req, res) => {
  try {
    const { assignments, assignmentSubmissions, users } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const assignment = await assignments.findOne({ _id: new ObjectId(id) });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Fetch all submissions for this assignment
    const submissions = await assignmentSubmissions
      .find({ assignmentId: new ObjectId(id) })
      .toArray();

    // Query enrolled students for this assignment's semester
    let allStudents = [];
    try {
      const semNum = String(assignment.semester || '').replace(/[^0-9]/g, '');
      const semConditions = [
        { semester: assignment.semester },
        { semester: String(semNum) },
        { semester: `${semNum}th Semester` },
      ];
      if (semNum && !isNaN(Number(semNum))) {
        semConditions.push({ semester: Number(semNum) });
      }

      allStudents = await users
        .find({
          role: 'student',
          $or: semConditions,
        })
        .project({ name: 1, email: 1, studentId: 1, batch: 1, semester: 1 })
        .toArray();
    } catch (e) {
      console.warn('Could not query enrolled students for assignment roster:', e.message);
    }

    // Build submission map by email and by studentId
    const subByEmail = new Map();
    const subByRoll = new Map();
    submissions.forEach((sub) => {
      if (sub.studentEmail) {
        subByEmail.set(sub.studentEmail.toLowerCase().trim(), sub);
      }
      if (sub.studentId) {
        subByRoll.set(String(sub.studentId).trim(), sub);
      }
    });

    // Helper to extract numeric roll for natural sorting
    const getNumericRoll = (item) => {
      const raw = String(item.studentId || item.roll || '');
      const digits = raw.replace(/\D/g, '');
      return digits ? parseInt(digits, 10) : 99999999;
    };

    // Sort submissions roll-wise
    submissions.sort((a, b) => {
      const diff = getNumericRoll(a) - getNumericRoll(b);
      if (diff !== 0) return diff;
      return String(a.studentName || '').localeCompare(String(b.studentName || ''));
    });

    // Construct full class roster (enrolled students + their submission state)
    const roster = allStudents.map((stu) => {
      const email = (stu.email || '').toLowerCase().trim();
      const roll = String(stu.studentId || '').trim();
      const sub = subByEmail.get(email) || subByRoll.get(roll) || null;

      return {
        studentId: stu.studentId || roll || 'N/A',
        studentName: stu.name || 'Student',
        studentEmail: stu.email || '',
        batch: stu.batch || '',
        semester: stu.semester || assignment.semester,
        hasSubmitted: Boolean(sub),
        submissionId: sub ? sub._id : null,
        submittedAt: sub ? sub.submittedAt : null,
        isLate: sub ? sub.isLate : false,
        status: sub ? (sub.status || (sub.isLate ? 'late' : 'submitted')) : 'not_submitted',
        marks: sub && sub.marks !== undefined && sub.marks !== null ? sub.marks : null,
        feedback: sub ? sub.feedback || '' : '',
        filePath: sub ? sub.filePath : null,
        originalName: sub ? sub.originalName : null,
        notes: sub ? sub.notes || '' : '',
      };
    });

    // Also include any submissions whose student wasn't in the users list
    submissions.forEach((sub) => {
      const email = (sub.studentEmail || '').toLowerCase().trim();
      const alreadyInRoster = roster.some((r) => r.studentEmail.toLowerCase().trim() === email);
      if (!alreadyInRoster) {
        roster.push({
          studentId: sub.studentId || 'N/A',
          studentName: sub.studentName || 'Student',
          studentEmail: sub.studentEmail || '',
          batch: sub.batch || '',
          semester: sub.semester || assignment.semester,
          hasSubmitted: true,
          submissionId: sub._id,
          submittedAt: sub.submittedAt,
          isLate: sub.isLate,
          status: sub.status || (sub.isLate ? 'late' : 'submitted'),
          marks: sub.marks !== undefined && sub.marks !== null ? sub.marks : null,
          feedback: sub.feedback || '',
          filePath: sub.filePath,
          originalName: sub.originalName,
          notes: sub.notes || '',
        });
      }
    });

    // Sort full roster roll-wise
    roster.sort((a, b) => {
      const diff = getNumericRoll(a) - getNumericRoll(b);
      if (diff !== 0) return diff;
      return String(a.studentName || '').localeCompare(String(b.studentName || ''));
    });

    res.json({
      success: true,
      assignment,
      count: submissions.length,
      totalEnrolled: allStudents.length > 0 ? allStudents.length : submissions.length,
      submissions,
      roster,
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ── Shared Grading Function ───────────────────────────────────
async function performGrading(subId, marks, feedback) {
  const { assignmentSubmissions } = getCollections();
  if (!ObjectId.isValid(subId)) {
    throw new Error('Invalid submission ID');
  }

  const updateFields = {
    marks: marks !== undefined && marks !== null && marks !== '' ? Number(marks) : null,
    feedback: (feedback || '').trim(),
    status: 'graded',
    gradedAt: new Date(),
    updatedAt: new Date(),
  };

  await assignmentSubmissions.updateOne(
    { _id: new ObjectId(subId) },
    { $set: updateFields }
  );

  return await assignmentSubmissions.findOne({ _id: new ObjectId(subId) });
}

// ── POST /api/assignments/:id/submissions/:subId/grade ────────
router.post('/:id/submissions/:subId/grade', async (req, res) => {
  try {
    const { subId } = req.params;
    const { marks, feedback } = req.body;
    const updated = await performGrading(subId, marks, feedback);
    res.json({
      success: true,
      message: 'Submission graded successfully!',
      submission: updated,
    });
  } catch (err) {
    console.error('Error grading submission:', err);
    res.status(500).json({ error: err.message || 'Failed to grade submission' });
  }
});

// ── PATCH & POST /api/assignments/submissions/:subId/grade ────
// Support both PATCH and POST on /submissions/:subId/grade for course workspace compatibility
const handleDirectGrading = async (req, res) => {
  try {
    const { subId } = req.params;
    const { marks, feedback } = req.body;
    const updated = await performGrading(subId, marks, feedback);
    res.json({
      success: true,
      message: 'Submission graded successfully!',
      submission: updated,
    });
  } catch (err) {
    console.error('Error grading submission (direct):', err);
    res.status(500).json({ error: err.message || 'Failed to grade submission' });
  }
};

router.patch('/submissions/:subId/grade', handleDirectGrading);
router.post('/submissions/:subId/grade', handleDirectGrading);

// ── POST /api/assignments/:id/grade-student ───────────────────
// Allows teacher to award marks to any student directly by studentId/email (e.g., offline work or 0 for missing)
router.post('/:id/grade-student', async (req, res) => {
  try {
    const { assignments, assignmentSubmissions } = getCollections();
    const { id } = req.params;
    const { studentEmail, studentId, studentName, marks, feedback } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    if (!studentEmail && !studentId) {
      return res.status(400).json({ error: 'Student email or ID required' });
    }

    const assignment = await assignments.findOne({ _id: new ObjectId(id) });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const query = { assignmentId: new ObjectId(id) };
    if (studentEmail) query.studentEmail = studentEmail;
    else if (studentId) query.studentId = studentId;

    const existing = await assignmentSubmissions.findOne(query);
    const now = new Date();

    if (existing) {
      await assignmentSubmissions.updateOne(
        { _id: existing._id },
        {
          $set: {
            marks: marks !== undefined && marks !== null && marks !== '' ? Number(marks) : null,
            feedback: (feedback || '').trim(),
            status: 'graded',
            gradedAt: now,
            updatedAt: now,
          },
        }
      );
      const updated = await assignmentSubmissions.findOne({ _id: existing._id });
      return res.json({ success: true, message: 'Grade recorded successfully!', submission: updated });
    }

    // Create a record for student
    const newDoc = {
      assignmentId: new ObjectId(id),
      courseCode: assignment.courseCode,
      courseTitle: assignment.courseTitle,
      studentId: studentId || '',
      studentName: studentName || 'Student',
      studentEmail: studentEmail || '',
      batch: '',
      semester: assignment.semester,
      notes: '',
      filePath: null,
      originalName: null,
      submittedAt: now,
      isLate: now > new Date(assignment.deadline),
      status: 'graded',
      marks: marks !== undefined && marks !== null && marks !== '' ? Number(marks) : null,
      feedback: (feedback || '').trim(),
      gradedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await assignmentSubmissions.insertOne(newDoc);
    res.status(201).json({
      success: true,
      message: 'Grade recorded successfully!',
      submission: { ...newDoc, _id: result.insertedId },
    });
  } catch (err) {
    console.error('Error grading student:', err);
    res.status(500).json({ error: 'Failed to record student grade' });
  }
});

module.exports = router;
