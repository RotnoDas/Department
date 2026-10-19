'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// Ensure upload directory exists
const materialsDir = path.join(__dirname, '..', 'uploads', 'materials');
fs.mkdirSync(materialsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, materialsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `material-${uniqueSuffix}-${sanitizedBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ── GET /api/materials ────────────────────────────────────────
// Query: ?semester=7&course=CSE4201&search=...
router.get('/', async (req, res) => {
  try {
    const { materials } = getCollections();
    const { semester, course, search } = req.query;

    const query = {};
    if (semester && semester !== 'all') {
      const semNum = String(semester).replace(/[^0-9]/g, '');
      query.$or = [
        { semester: semester },
        { semester: semNum },
        { semester: `${semNum}th Semester` },
      ];
    }
    if (course && course !== 'all') {
      query.course = { $regex: course, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ];
    }

    const list = await materials.find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: list.length, materials: list });
  } catch (err) {
    console.error('Error fetching materials:', err);
    res.status(500).json({ error: 'Failed to fetch study materials' });
  }
});

// ── POST /api/materials (Teacher Uploads Study Material) ───────
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { materials } = getCollections();
    const { title, course, type, semester, teacherName, teacherEmail } = req.body;

    if (!title || !course) {
      return res.status(400).json({ error: 'Title and Course are required.' });
    }

    let filePath = null;
    let originalName = null;
    let fileMime = null;
    let fileSize = 0;

    if (req.file) {
      filePath = `/uploads/materials/${req.file.filename}`;
      originalName = req.file.originalname;
      fileMime = req.file.mimetype;
      fileSize = req.file.size;
    }

    const doc = {
      title: title.trim(),
      course: course.trim(),
      type: type || 'Lecture Slides (PDF)',
      semester: String(semester || '1').trim(),
      teacherName: teacherName || 'Faculty Instructor',
      teacherEmail: teacherEmail || '',
      filePath,
      originalName,
      fileMime,
      fileSize,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await materials.insertOne(doc);
    res.status(201).json({
      success: true,
      message: 'Study material uploaded successfully!',
      material: { ...doc, _id: result.insertedId, id: String(result.insertedId) },
    });
  } catch (err) {
    console.error('Error uploading material:', err);
    res.status(500).json({ error: 'Failed to upload study material' });
  }
});

// ── DELETE /api/materials/:id ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { materials } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid material ID' });
    }

    const material = await materials.findOne({ _id: new ObjectId(id) });
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    if (material.filePath) {
      const diskPath = path.join(__dirname, '..', material.filePath.replace(/^\//, ''));
      try {
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      } catch (e) {
        console.warn('Could not delete material file from disk:', e.message);
      }
    }

    await materials.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: 'Study material deleted successfully.' });
  } catch (err) {
    console.error('Error deleting material:', err);
    res.status(500).json({ error: 'Failed to delete study material' });
  }
});

module.exports = router;
