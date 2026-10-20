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

// ── POST /api/assignments/:id/submit (Student Submits Work) ───
router.post('/:id/submit', upload.single('file'), async (req, res) => {
  try {
    const { assignments, assignmentSubmissions } = getCollections();
    const { id } = req.params;
    const { studentId, studentName, studentEmail, batch, semester, notes } = req.body;

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
    const existing = await assignmentSubmissions.findOne({
      assignmentId: new ObjectId(id),
      studentEmail: { $regex: `^${cleanStudentEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existing) {
      // If replacing file, remove old one
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
        notes: notes !== undefined ? notes : existing.notes,
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
        message: 'Assignment submission updated successfully.',
        submission: updated,
      });
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

// ── GET /api/assignments/:id/submissions (Teacher views submissions)
router.get('/:id/submissions', async (req, res) => {
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

    const submissions = await assignmentSubmissions
      .find({ assignmentId: new ObjectId(id) })
      .sort({ submittedAt: -1 })
      .toArray();

    res.json({
      success: true,
      assignment,
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ── POST /api/assignments/:id/submissions/:subId/grade (Teacher grades submission)
router.post('/:id/submissions/:subId/grade', async (req, res) => {
  try {
    const { assignmentSubmissions } = getCollections();
    const { subId } = req.params;
    const { marks, feedback } = req.body;

    if (!ObjectId.isValid(subId)) {
      return res.status(400).json({ error: 'Invalid submission ID' });
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

    const updated = await assignmentSubmissions.findOne({ _id: new ObjectId(subId) });
    res.json({
      success: true,
      message: 'Submission graded successfully!',
      submission: updated,
    });
  } catch (err) {
    console.error('Error grading submission:', err);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

module.exports = router;
