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

// GET /api/notices - List all notices for all members
router.get('/', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { search, limit } = req.query;

    const query = {};
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { content: { $regex: s, $options: 'i' } },
      ];
    }

    const maxItems = Math.min(Math.max(Number(limit) || 100, 1), 200);

    const rawList = await notices
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(maxItems)
      .toArray();

    const noticeList = rawList.map((n) => {
      const isPublic = n.isPublic !== undefined 
        ? Boolean(n.isPublic) 
        : (n.visibility === 'public' || n.category === 'Event' || n.category === 'Public' || String(n.title).toLowerCase().includes('contest') || String(n.title).toLowerCase().includes('greetings') || String(n.title).toLowerCase().includes('hackathon'));
      return {
        ...n,
        id: n._id.toString(),
        isPublic,
        authorName: n.authorName || n.author?.name || 'Department Admin',
      };
    });

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
    const isPublic = notice.isPublic !== undefined 
      ? Boolean(notice.isPublic) 
      : (notice.visibility === 'public' || notice.category === 'Event' || notice.category === 'Public' || String(notice.title).toLowerCase().includes('contest') || String(notice.title).toLowerCase().includes('greetings') || String(notice.title).toLowerCase().includes('hackathon'));
    res.json({ success: true, notice: { ...notice, id: notice._id.toString(), isPublic } });
  } catch (err) {
    console.error('[GET /api/notices/:id] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve notice.' });
  }
});

// POST /api/notices - Create new notice for all members (with optional file and audio message)
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
        authorName,
        audioDuration,
      } = req.body;

      if (!title || !title.trim()) {
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

      // Process audio note
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

      const now = new Date();
      const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true || req.body.visibility === 'public';

      const newNotice = {
        title: title.trim(),
        content: content.trim(),
        isPublic: Boolean(isPublic),
        attachments,
        audio,
        filePath: attachments[0]?.filePath || null,
        originalName: attachments[0]?.originalName || null,
        fileMime: attachments[0]?.fileMime || null,
        fileSize: attachments[0]?.fileSize || null,
        authorName: (authorName || 'Department Admin').trim(),
        createdAt: now,
        updatedAt: now,
      };

      const result = await notices.insertOne(newNotice);
      res.status(201).json({
        success: true,
        message: 'Notice published successfully.',
        notice: { ...newNotice, _id: result.insertedId, id: result.insertedId.toString() },
      });
    } catch (err) {
      console.error('[POST /api/notices] Creation error:', err);
      res.status(500).json({ success: false, error: 'Failed to publish notice.' });
    }
  });
});

// PUT /api/notices/:id - Admin edits existing notice
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
        removeFile,
        removedAttachmentPaths,
        removeAudio,
        audioDuration,
      } = req.body;

      // Handle removed attachments
      let removedList = [];
      if (removeFile === true || removeFile === 'true' || removeFile === '1') {
        if (existing.filePath) removedList.push(existing.filePath);
      }
      if (removedAttachmentPaths) {
        if (Array.isArray(removedAttachmentPaths)) {
          removedList.push(...removedAttachmentPaths);
        } else {
          try {
            removedList.push(...JSON.parse(removedAttachmentPaths));
          } catch {
            removedList.push(removedAttachmentPaths);
          }
        }
      }

      removedList.forEach((fp) => removeDiskFile(fp));

      const existingAttachments = Array.isArray(existing.attachments)
        ? existing.attachments.filter((att) => !removedList.includes(att.filePath))
        : existing.filePath && !removedList.includes(existing.filePath)
        ? [{
            filePath: existing.filePath,
            originalName: existing.originalName,
            fileMime: existing.fileMime,
            fileSize: existing.fileSize,
          }]
        : [];

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
      if (req.body.isPublic !== undefined || req.body.visibility !== undefined) {
        updateFields.isPublic = req.body.isPublic === 'true' || req.body.isPublic === true || req.body.visibility === 'public';
      }

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
        message: 'Notice updated successfully.',
        notice: { ...updatedNotice, id: updatedNotice._id.toString() },
      });
    } catch (err) {
      console.error('[PUT /api/notices/:id] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to update notice.' });
    }
  });
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
