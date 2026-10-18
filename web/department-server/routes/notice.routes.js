'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getCollections } = require('../config/db');

const router = express.Router();

// ── UPLOAD STORAGE CONFIGURATION ───────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'notices');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `notice-${uniqueSuffix}-${sanitizedBase || 'attachment'}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max per file
    files: 12,
  },
});

// Middleware supporting multiple file attachments and one audio note
const noticeUpload = upload.fields([
  { name: 'attachments', maxCount: 10 },
  { name: 'file', maxCount: 1 }, // Backwards compatibility with single file
  { name: 'audio', maxCount: 1 },
]);

// ── UTILITIES ─────────────────────────────────────────────────────────────
const classifyFileType = (mime = '', name = '') => {
  const m = String(mime).toLowerCase();
  const n = String(name).toLowerCase();
  if (m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(n)) return 'image';
  if (m.includes('pdf') || /\.pdf$/i.test(n)) return 'pdf';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm|aac|flac)$/i.test(n)) return 'audio';
  if (m.includes('word') || m.includes('document') || /\.(doc|docx|rtf|odt|txt)$/i.test(n)) return 'document';
  if (m.includes('sheet') || m.includes('excel') || /\.(xls|xlsx|csv)$/i.test(n)) return 'spreadsheet';
  if (m.includes('presentation') || m.includes('powerpoint') || /\.(ppt|pptx)$/i.test(n)) return 'presentation';
  if (m.includes('zip') || m.includes('compressed') || /\.(zip|rar|7z|tar|gz)$/i.test(n)) return 'archive';
  return 'other';
};

const formatFileMetadata = (file) => ({
  filePath: `/uploads/notices/${file.filename}`,
  originalName: file.originalname,
  fileMime: file.mimetype,
  fileSize: file.size,
  fileType: classifyFileType(file.mimetype, file.originalname),
  uploadedAt: new Date(),
});

const removeDiskFile = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return;
  try {
    const relative = filePath.replace(/^\/+/, '');
    const fullPath = path.resolve(__dirname, '..', relative);
    if (fullPath.startsWith(uploadsDir) && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn('[notice] Could not remove uploaded file:', filePath, err.message);
  }
};

// ── ROUTES ────────────────────────────────────────────────────────────────

// GET /api/notices - List notices with role-based filtering, categories, and search
router.get('/', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { audience, category, priority, search, limit } = req.query;

    const query = {};

    // Filter by audience (case-insensitive mapping)
    if (audience && audience !== 'all' && audience !== 'admin') {
      const aud = audience.toLowerCase();
      if (aud === 'student') {
        query.audience = {
          $in: ['All Members', 'All Students', 'Students Only', 'student', 'all'],
        };
      } else if (aud === 'teacher' || aud === 'faculty') {
        query.audience = {
          $in: ['All Members', 'Faculty Only', 'Teachers Only', 'teacher', 'all'],
        };
      } else if (aud === 'staff' || aud === 'employee') {
        query.audience = {
          $in: ['All Members', 'Staff Only', 'Employees Only', 'staff', 'all'],
        };
      } else {
        query.audience = { $regex: new RegExp(audience, 'i') };
      }
    }

    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (priority && priority !== 'All') {
      query.priority = { $regex: new RegExp(`^${priority}$`, 'i') };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { content: { $regex: s, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } },
      ];
    }

    const maxItems = Math.min(Math.max(Number(limit) || 100, 1), 200);

    // Pinned notices first, then newest first
    const noticeList = await notices
      .find(query)
      .sort({ pinned: -1, createdAt: -1 })
      .limit(maxItems)
      .toArray();

    res.json({
      success: true,
      count: noticeList.length,
      notices: noticeList,
    });
  } catch (err) {
    console.error('[GET /api/notices] Error fetching notices:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch notices.' });
  }
});

// GET /api/notices/:id - Get single notice details
router.get('/:id', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid notice ID.' });
    }
    const notice = await notices.findOne({ _id: new ObjectId(id) });
    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found.' });
    }
    res.json({ success: true, notice });
  } catch (err) {
    console.error('[GET /api/notices/:id] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve notice.' });
  }
});

// POST /api/notices - Create new notice (with optional file attachments and voice message)
router.post('/', (req, res) => {
  noticeUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('[POST /api/notices] Multer error:', uploadErr);
      return res.status(400).json({ success: false, error: uploadErr.message });
    }

    try {
      const { notices } = getCollections();
      const {
        title,
        content = '',
        category = 'General',
        audience = 'All Members',
        priority = 'Normal',
        pinned = false,
        authorName,
        audioDuration,
      } = req.body;

      if (!title || !title.trim()) {
        // Clean up any uploaded files if validation fails
        if (req.files?.attachments) req.files.attachments.forEach((f) => removeDiskFile(`/uploads/notices/${f.filename}`));
        if (req.files?.audio?.[0]) removeDiskFile(`/uploads/notices/${req.files.audio[0].filename}`);
        if (req.files?.file?.[0]) removeDiskFile(`/uploads/notices/${req.files.file[0].filename}`);
        return res.status(400).json({ success: false, error: 'Notice title is required.' });
      }

      // Collect attachments
      const attachments = [];
      if (req.files?.attachments && req.files.attachments.length > 0) {
        req.files.attachments.forEach((file) => attachments.push(formatFileMetadata(file)));
      }
      if (req.files?.file && req.files.file.length > 0) {
        req.files.file.forEach((file) => attachments.push(formatFileMetadata(file)));
      }

      // Process voice message / audio note
      let audio = null;
      if (req.files?.audio && req.files.audio.length > 0) {
        const audioFile = req.files.audio[0];
        audio = {
          filePath: `/uploads/notices/${audioFile.filename}`,
          originalName: audioFile.originalname || 'voice-announcement.webm',
          fileMime: audioFile.mimetype,
          fileSize: audioFile.size,
          duration: Number(audioDuration) || null,
          uploadedAt: new Date(),
        };
      }

      const isPinned = pinned === true || pinned === 'true' || pinned === '1';
      const now = new Date();

      const newNotice = {
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || 'General',
        audience: audience.trim() || 'All Members',
        priority: priority.trim() || 'Normal',
        pinned: isPinned,
        attachments,
        audio,
        // Legacy fields for backward compatibility with older components
        filePath: attachments[0]?.filePath || null,
        originalName: attachments[0]?.originalName || null,
        fileMime: attachments[0]?.fileMime || null,
        fileSize: attachments[0]?.fileSize || null,
        author: {
          name: (authorName || 'Department Administration').trim(),
          role: 'admin',
        },
        date: now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        createdAt: now,
        updatedAt: now,
      };

      const result = await notices.insertOne(newNotice);
      res.status(201).json({
        success: true,
        message: 'Notice published successfully!',
        notice: { ...newNotice, _id: result.insertedId },
      });
    } catch (err) {
      console.error('[POST /api/notices] Creation error:', err);
      res.status(500).json({ success: false, error: 'Failed to publish notice.' });
    }
  });
});

// PUT /api/notices/:id - Edit existing notice
router.put('/:id', (req, res) => {
  noticeUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, error: uploadErr.message });
    }

    try {
      const { notices } = getCollections();
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid notice ID.' });
      }

      const existing = await notices.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Notice not found.' });
      }

      const {
        title,
        content,
        category,
        audience,
        priority,
        pinned,
        removedAttachmentPaths,
        removeAudio,
        audioDuration,
      } = req.body;

      // Handle removed attachments
      let removedList = [];
      if (removedAttachmentPaths) {
        if (Array.isArray(removedAttachmentPaths)) {
          removedList = removedAttachmentPaths;
        } else {
          try {
            removedList = JSON.parse(removedAttachmentPaths);
          } catch {
            removedList = [removedAttachmentPaths];
          }
        }
      }

      // Delete removed files from disk
      removedList.forEach((fp) => removeDiskFile(fp));

      // Keep unremoved existing attachments
      const existingAttachments = Array.isArray(existing.attachments)
        ? existing.attachments.filter((att) => !removedList.includes(att.filePath))
        : [];

      // Add newly uploaded attachments
      const newAttachments = [];
      if (req.files?.attachments && req.files.attachments.length > 0) {
        req.files.attachments.forEach((file) => newAttachments.push(formatFileMetadata(file)));
      }
      if (req.files?.file && req.files.file.length > 0) {
        req.files.file.forEach((file) => newAttachments.push(formatFileMetadata(file)));
      }

      const updatedAttachments = [...existingAttachments, ...newAttachments];

      // Handle audio updates
      let updatedAudio = existing.audio || null;
      if (removeAudio === true || removeAudio === 'true' || removeAudio === '1') {
        if (existing.audio?.filePath) removeDiskFile(existing.audio.filePath);
        updatedAudio = null;
      }
      if (req.files?.audio && req.files.audio.length > 0) {
        if (existing.audio?.filePath) removeDiskFile(existing.audio.filePath);
        const audioFile = req.files.audio[0];
        updatedAudio = {
          filePath: `/uploads/notices/${audioFile.filename}`,
          originalName: audioFile.originalname || 'voice-announcement.webm',
          fileMime: audioFile.mimetype,
          fileSize: audioFile.size,
          duration: Number(audioDuration) || null,
          uploadedAt: new Date(),
        };
      }

      const updateFields = {
        updatedAt: new Date(),
      };
      if (title !== undefined) updateFields.title = title.trim();
      if (content !== undefined) updateFields.content = content.trim();
      if (category !== undefined) updateFields.category = category.trim();
      if (audience !== undefined) updateFields.audience = audience.trim();
      if (priority !== undefined) updateFields.priority = priority.trim();
      if (pinned !== undefined) updateFields.pinned = pinned === true || pinned === 'true' || pinned === '1';

      updateFields.attachments = updatedAttachments;
      updateFields.audio = updatedAudio;
      updateFields.filePath = updatedAttachments[0]?.filePath || null;
      updateFields.originalName = updatedAttachments[0]?.originalName || null;
      updateFields.fileMime = updatedAttachments[0]?.fileMime || null;
      updateFields.fileSize = updatedAttachments[0]?.fileSize || null;

      await notices.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
      const updatedNotice = await notices.findOne({ _id: new ObjectId(id) });

      res.json({
        success: true,
        message: 'Notice updated successfully!',
        notice: updatedNotice,
      });
    } catch (err) {
      console.error('[PUT /api/notices/:id] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to update notice.' });
    }
  });
});

// PATCH /api/notices/:id/pin - Toggle pin status
router.patch('/:id/pin', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid notice ID.' });
    }

    const existing = await notices.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Notice not found.' });
    }

    const nextPinned = req.body.pinned !== undefined ? Boolean(req.body.pinned) : !existing.pinned;
    await notices.updateOne(
      { _id: new ObjectId(id) },
      { $set: { pinned: nextPinned, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      pinned: nextPinned,
      message: nextPinned ? 'Notice pinned to the top of boards.' : 'Notice unpinned.',
    });
  } catch (err) {
    console.error('[PATCH /api/notices/:id/pin] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to update pin state.' });
  }
});

// DELETE /api/notices/:id - Delete notice and all attached files from disk
router.delete('/:id', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid notice ID.' });
    }

    const notice = await notices.findOne({ _id: new ObjectId(id) });
    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found.' });
    }

    // Unlink all attachments from disk
    if (Array.isArray(notice.attachments)) {
      notice.attachments.forEach((att) => removeDiskFile(att.filePath));
    }
    if (notice.filePath) removeDiskFile(notice.filePath);
    if (notice.audio?.filePath) removeDiskFile(notice.audio.filePath);

    await notices.deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Notice and all attachments deleted successfully.' });
  } catch (err) {
    console.error('[DELETE /api/notices/:id] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete notice.' });
  }
});

module.exports = router;
