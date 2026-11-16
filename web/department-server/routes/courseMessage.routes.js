'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getCollections } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { adminEmails } = require('../config/attendance');

const router = express.Router();

// Ensure upload directory exists for course messages (audio, video, documents, files)
const messagesUploadDir = path.join(__dirname, '..', 'uploads', 'course-messages');
fs.mkdirSync(messagesUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, messagesUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `msg-${uniqueSuffix}-${sanitizedBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max limit
});

function detectFileType(mimetype, filename) {
  const ext = path.extname(filename || '').toLowerCase();
  const mime = String(mimetype || '').toLowerCase();

  if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.webm'].includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
    return 'image';
  }
  if (mime.includes('pdf') || ext === '.pdf') {
    return 'pdf';
  }
  return 'file';
}

function getCourseCodeFilter(codeParam, fieldName = 'courseCode') {
  const raw = decodeURIComponent(String(codeParam || '')).trim();
  const clean = raw.replace(/[\s\-_]+/g, '');
  const letters = clean.replace(/[^A-Za-z]/g, '');
  const digits = clean.replace(/\D/g, '');

  const or = [
    { [fieldName]: raw },
    { [fieldName]: raw.toUpperCase() },
    { [fieldName]: clean },
    { [fieldName]: clean.toUpperCase() },
    { [fieldName]: { $regex: `^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { [fieldName]: { $regex: `^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
  ];

  if (letters && digits) {
    or.push({
      [fieldName]: {
        $regex: `^${letters}\\s*[-_]?\\s*${digits}$`,
        $options: 'i',
      },
    });
  }
  return { $or: or };
}

// Helper to look up assigned teacher for a course
async function resolveCourseTeacher(courseCode) {
  const { routines, courses, teachers } = getCollections();
  const rawCode = String(courseCode || '').trim();

  // 1. Check routines collection for assigned teacher
  const routine = await routines.findOne(getCourseCodeFilter(rawCode, 'courseCode'));
  if (routine?.teacherEmail || routine?.teacherName) {
    let designation = 'Course Instructor';
    if (routine.teacherEmail) {
      const tDoc = await teachers.findOne({ email: routine.teacherEmail });
      if (tDoc?.designation) designation = tDoc.designation;
    }
    return {
      teacherName: routine.teacherName || 'Course Instructor',
      teacherEmail: routine.teacherEmail || '',
      designation,
      courseTitle: routine.courseTitle || rawCode,
    };
  }

  // 2. Check courses collection
  const course = await courses.findOne(getCourseCodeFilter(rawCode, 'code'));
  if (course?.faculty) {
    const tDoc = await teachers.findOne({
      $or: [
        { name: { $regex: `^${course.faculty}$`, $options: 'i' } },
        { email: { $regex: `^${course.faculty}$`, $options: 'i' } },
      ],
    });
    return {
      teacherName: tDoc?.name || course.faculty,
      teacherEmail: tDoc?.email || '',
      designation: tDoc?.designation || 'Faculty Member',
      courseTitle: course.title || rawCode,
    };
  }

  return {
    teacherName: 'Course Instructor',
    teacherEmail: '',
    designation: 'Faculty Member',
    courseTitle: rawCode,
  };
}

// ── GET /api/course-messages/thread ─────────────────────────────────
// Retrieve all messages for a given (courseCode, studentEmail) conversation thread
router.get('/thread', verifyToken, async (req, res) => {
  try {
    const { courseMessages, students, teachers } = getCollections();
    const { courseCode, studentEmail } = req.query;

    if (!courseCode || !studentEmail) {
      return res.status(400).json({ error: 'courseCode and studentEmail are required.' });
    }

    const sEmail = String(studentEmail).trim().toLowerCase();
    const query = {
      ...getCourseCodeFilter(courseCode, 'courseCode'),
      studentEmail: sEmail,
    };

    const messages = await courseMessages.find(query).sort({ createdAt: 1 }).toArray();

    // Determine caller role and auto-mark incoming unread messages as read
    const callerEmail = (req.user?.email || '').trim().toLowerCase();
    const callerRole = req.user?.role || '';
    const isStudentCaller = callerEmail === sEmail;

    const unreadRoleToMark = isStudentCaller ? 'teacher' : 'student';
    await courseMessages.updateMany(
      {
        ...query,
        senderRole: unreadRoleToMark,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Fetch teacher & student profile metadata
    const teacherInfo = await resolveCourseTeacher(courseCode);
    const studentDoc = await students.findOne({
      $or: [{ email: sEmail }, { studentEmail: sEmail }],
    });

    res.json({
      success: true,
      courseCode: String(courseCode).toUpperCase(),
      student: {
        name: studentDoc?.name || messages[0]?.studentName || 'Student',
        email: sEmail,
        studentId: studentDoc?.studentId || messages[0]?.studentId || '',
        roll: studentDoc?.roll || studentDoc?.studentId || '',
        session: studentDoc?.session || '',
        semester: studentDoc?.semester || '',
        batch: studentDoc?.batch || '',
        avatar: studentDoc?.avatar || studentDoc?.profilePicture || '',
      },
      teacher: teacherInfo,
      messages: messages.map((m) => ({
        id: String(m._id),
        senderRole: m.senderRole,
        senderEmail: m.senderEmail,
        senderName: m.senderName,
        message: m.message || '',
        fileUrl: m.fileUrl || null,
        fileName: m.fileName || null,
        fileType: m.fileType || null,
        fileSize: m.fileSize || null,
        mimeType: m.mimeType || null,
        isRead: m.isRead,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error fetching course message thread:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// ── POST /api/course-messages/upload ────────────────────────────────
// Upload any attachment (audio, video, image, document, archive)
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const fileUrl = `/uploads/course-messages/${req.file.filename}`;
    const detectedType = detectFileType(req.file.mimetype, req.file.originalname);

    res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileType: detectedType,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    console.error('Error uploading message attachment:', err);
    res.status(500).json({ error: 'Failed to upload attachment.' });
  }
});

// ── POST /api/course-messages/send ──────────────────────────────────
// Send a message (text, audio, video, document, or any file)
router.post('/send', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { courseMessages, students, teachers } = getCollections();
    const payload = req.body || {};
    const {
      courseCode,
      studentEmail,
      studentName,
      studentId,
      teacherEmail,
      teacherName,
      senderRole,
    } = payload;

    const messageText = payload.message ? String(payload.message).trim() : '';

    let fileUrl = payload.fileUrl || null;
    let fileName = payload.fileName || null;
    let fileType = payload.fileType || null;
    let fileSize = payload.fileSize || null;
    let mimeType = payload.mimeType || null;

    // If file sent via multipart directly
    if (req.file) {
      fileUrl = `/uploads/course-messages/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
      fileType = detectFileType(req.file.mimetype, req.file.originalname);
    }

    if (!courseCode || !studentEmail) {
      return res.status(400).json({ error: 'courseCode and studentEmail are required.' });
    }

    if (!messageText && !fileUrl) {
      return res.status(400).json({ error: 'Either a text message or a file is required.' });
    }

    const callerEmail = (req.user?.email || '').trim().toLowerCase();
    const callerName = req.user?.name || '';
    const cleanCourseCode = String(courseCode).trim().toUpperCase();
    const sEmail = String(studentEmail).trim().toLowerCase();

    // Determine sender role
    const isTeacherSender =
      senderRole === 'teacher' ||
      req.user?.role === 'teacher' ||
      req.user?.role === 'admin' ||
      callerEmail !== sEmail;

    const actualSenderRole = isTeacherSender ? 'teacher' : 'student';

    // Resolve teacher metadata
    let finalTeacherEmail = teacherEmail ? String(teacherEmail).trim().toLowerCase() : '';
    let finalTeacherName = teacherName ? String(teacherName).trim() : '';

    if (!finalTeacherEmail || !finalTeacherName) {
      const resolved = await resolveCourseTeacher(cleanCourseCode);
      if (!finalTeacherEmail) finalTeacherEmail = resolved.teacherEmail;
      if (!finalTeacherName) finalTeacherName = resolved.teacherName;
    }

    // Resolve student metadata
    let finalStudentName = studentName ? String(studentName).trim() : '';
    let finalStudentId = studentId ? String(studentId).trim() : '';

    if (!finalStudentName || !finalStudentId) {
      const sDoc = await students.findOne({
        $or: [{ email: sEmail }, { studentEmail: sEmail }],
      });
      if (sDoc) {
        if (!finalStudentName) finalStudentName = sDoc.name || 'Student';
        if (!finalStudentId) finalStudentId = sDoc.studentId || '';
      }
    }

    const newDoc = {
      courseCode: cleanCourseCode,
      studentEmail: sEmail,
      studentName: finalStudentName || 'Student',
      studentId: finalStudentId,
      teacherEmail: finalTeacherEmail,
      teacherName: finalTeacherName || 'Course Instructor',
      senderRole: actualSenderRole,
      senderEmail: callerEmail,
      senderName: actualSenderRole === 'teacher' ? (finalTeacherName || callerName || 'Teacher') : (finalStudentName || callerName || 'Student'),
      message: messageText,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      mimeType,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    };

    const insertRes = await courseMessages.insertOne(newDoc);

    res.status(201).json({
      success: true,
      message: {
        ...newDoc,
        id: String(insertRes.insertedId),
      },
    });
  } catch (err) {
    console.error('Error sending course message:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ── GET /api/course-messages/teacher-conversations ───────────────────
// For course teacher: list all student conversation threads for this course
router.get('/teacher-conversations', verifyToken, async (req, res) => {
  try {
    const { courseMessages, students, courses, routines } = getCollections();
    const { courseCode } = req.query;

    if (!courseCode) {
      return res.status(400).json({ error: 'courseCode is required.' });
    }

    const cleanCourseCode = String(courseCode).trim().toUpperCase();
    const query = getCourseCodeFilter(cleanCourseCode, 'courseCode');

    // Aggregate threads by studentEmail
    const allMsgs = await courseMessages.find(query).sort({ createdAt: -1 }).toArray();

    const conversationMap = new Map();

    for (const msg of allMsgs) {
      const sEmail = (msg.studentEmail || '').toLowerCase();
      if (!sEmail) continue;

      if (!conversationMap.has(sEmail)) {
        conversationMap.set(sEmail, {
          studentEmail: sEmail,
          studentName: msg.studentName || 'Student',
          studentId: msg.studentId || '',
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          lastSenderRole: msg.senderRole,
          unreadCount: msg.senderRole === 'student' && !msg.isRead ? 1 : 0,
          totalMessages: 1,
        });
      } else {
        const item = conversationMap.get(sEmail);
        item.totalMessages += 1;
        if (msg.senderRole === 'student' && !msg.isRead) {
          item.unreadCount += 1;
        }
      }
    }

    // Enhance conversations with student details from students collection
    const studentEmails = Array.from(conversationMap.keys());
    if (studentEmails.length > 0) {
      const studentProfiles = await students.find({
        $or: [
          { email: { $in: studentEmails } },
          { studentEmail: { $in: studentEmails } },
        ],
      }).toArray();

      studentProfiles.forEach((s) => {
        const email = (s.email || s.studentEmail || '').toLowerCase();
        if (conversationMap.has(email)) {
          const item = conversationMap.get(email);
          item.studentName = s.name || item.studentName;
          item.studentId = s.studentId || s.roll || item.studentId;
          item.roll = s.roll || s.studentId || '';
          item.batch = s.batch || '';
          item.semester = s.semester || '';
          item.session = s.session || '';
          item.avatar = s.avatar || s.profilePicture || '';
        }
      });
    }

    // Sort by latest message date descending
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    // Also look up semester of course to get enrolled class roster
    let courseSem = null;
    const courseDoc = await courses.findOne(getCourseCodeFilter(cleanCourseCode, 'code'));
    if (courseDoc?.semesterNum) {
      courseSem = courseDoc.semesterNum;
    } else {
      const rDoc = await routines.findOne(getCourseCodeFilter(cleanCourseCode, 'courseCode'));
      if (rDoc?.semester) courseSem = rDoc.semester;
    }

    let classRoster = [];
    if (courseSem) {
      const semRegex = new RegExp(`^${courseSem}`, 'i');
      classRoster = await students
        .find({
          $or: [
            { semester: courseSem },
            { semester: semRegex },
            { currentSemester: courseSem },
          ],
          status: 'approved',
        })
        .project({ name: 1, email: 1, studentId: 1, roll: 1, batch: 1, session: 1 })
        .sort({ studentId: 1 })
        .toArray();
    }

    res.json({
      success: true,
      courseCode: cleanCourseCode,
      conversations,
      classRoster: classRoster.map((s) => ({
        name: s.name,
        email: (s.email || '').toLowerCase(),
        studentId: s.studentId || s.roll || '',
        roll: s.roll || s.studentId || '',
        batch: s.batch || '',
        session: s.session || '',
        hasConversation: conversationMap.has((s.email || '').toLowerCase()),
      })),
      totalUnread: conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    });
  } catch (err) {
    console.error('Error fetching teacher conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// ── POST /api/course-messages/mark-read ──────────────────────────────
// Explicitly mark messages as read
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const { courseMessages } = getCollections();
    const { courseCode, studentEmail, readerRole } = req.body || {};

    if (!courseCode || !studentEmail || !readerRole) {
      return res.status(400).json({ error: 'courseCode, studentEmail, and readerRole are required.' });
    }

    const sEmail = String(studentEmail).trim().toLowerCase();
    const unreadSenderRole = readerRole === 'teacher' ? 'student' : 'teacher';

    const updateRes = await courseMessages.updateMany(
      {
        ...getCourseCodeFilter(courseCode, 'courseCode'),
        studentEmail: sEmail,
        senderRole: unreadSenderRole,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({ success: true, updatedCount: updateRes.modifiedCount });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

// ── GET /api/course-messages/unread-count ───────────────────────────
// Check unread count for badge counters
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const { courseMessages } = getCollections();
    const { courseCode, studentEmail, role } = req.query;

    const query = {};
    if (courseCode) {
      Object.assign(query, getCourseCodeFilter(courseCode, 'courseCode'));
    }

    if (role === 'student' && studentEmail) {
      query.studentEmail = String(studentEmail).trim().toLowerCase();
      query.senderRole = 'teacher';
      query.isRead = false;
    } else if (role === 'teacher') {
      query.senderRole = 'student';
      query.isRead = false;
    }

    const count = await courseMessages.countDocuments(query);
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
});

// ── DELETE /api/course-messages/:id ─────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { courseMessages } = getCollections();
    const { id } = req.params;

    const result = await courseMessages.deleteOne({
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

module.exports = router;
