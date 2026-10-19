'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// Helper to generate human-readable unique tracking ID
const generateTrackingId = (prefix = 'CMP') => {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timePart}-${randPart}`;
};

// ── 1. POST /api/support/complaint - Lodge a grievance / complaint ──────────
router.post('/complaint', async (req, res) => {
  try {
    const { complaints } = getCollections();
    const {
      title,
      description,
      category = 'academic',
      priority = 'Normal',
      isAnonymous = false,
      authorName,
      authorEmail,
      authorRole = 'guest',
      department = 'CSE',
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Complaint title/subject is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Detailed complaint description is required.' });
    }

    const trackingId = generateTrackingId('CMP');
    const now = new Date();

    const complaintDoc = {
      trackingId,
      type: 'complaint',
      title: title.trim(),
      description: description.trim(),
      category: String(category).toLowerCase().trim(),
      priority: ['Normal', 'Urgent', 'Critical'].includes(priority) ? priority : 'Normal',
      isAnonymous: Boolean(isAnonymous),
      authorName: isAnonymous ? 'Anonymous Member' : (authorName || 'Guest User').trim(),
      authorEmail: isAnonymous ? null : (authorEmail || '').trim().toLowerCase(),
      authorRole: isAnonymous ? 'anonymous' : authorRole,
      department: department || 'Computer Science & Engineering',
      status: 'Submitted', // Submitted -> Under Review -> Investigating -> Resolved -> Closed
      adminResponse: null,
      timeline: [
        {
          status: 'Submitted',
          note: 'Complaint securely lodged and logged into department records.',
          at: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result = await complaints.insertOne(complaintDoc);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      trackingId,
      data: {
        id: result.insertedId.toString(),
        trackingId,
        title: complaintDoc.title,
        category: complaintDoc.category,
        priority: complaintDoc.priority,
        status: complaintDoc.status,
        isAnonymous: complaintDoc.isAnonymous,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('[POST /api/support/complaint] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit complaint. Please try again.' });
  }
});

// ── 2. POST /api/support/ticket - Technical Helpdesk Support Ticket ──────────
router.post('/ticket', async (req, res) => {
  try {
    const { supportTickets } = getCollections();
    const {
      title,
      description,
      category = 'portal_login',
      priority = 'Medium',
      authorName,
      authorEmail,
      authorRole = 'student',
      deviceInfo,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Issue subject is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Issue description is required.' });
    }
    if (!authorEmail || !authorEmail.trim()) {
      return res.status(400).json({ success: false, error: 'Your email address is required for technical assistance.' });
    }

    const trackingId = generateTrackingId('IT');
    const now = new Date();

    const ticketDoc = {
      trackingId,
      type: 'technical_support',
      title: title.trim(),
      description: description.trim(),
      category: String(category).toLowerCase().trim(),
      priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
      authorName: (authorName || 'University Member').trim(),
      authorEmail: authorEmail.trim().toLowerCase(),
      authorRole: authorRole || 'student',
      deviceInfo: deviceInfo || null,
      status: 'Open', // Open -> In Progress -> Resolved -> Closed
      adminResponse: null,
      timeline: [
        {
          status: 'Open',
          note: 'Technical support ticket registered. IT Helpdesk assigned.',
          at: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result = await supportTickets.insertOne(ticketDoc);

    return res.status(201).json({
      success: true,
      message: 'Support ticket registered successfully.',
      trackingId,
      data: {
        id: result.insertedId.toString(),
        trackingId,
        title: ticketDoc.title,
        category: ticketDoc.category,
        status: ticketDoc.status,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('[POST /api/support/ticket] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create support ticket.' });
  }
});

// ── 3. POST /api/support/inquiry - General Office Inquiry ─────────────────────
router.post('/inquiry', async (req, res) => {
  try {
    const { supportTickets } = getCollections();
    const {
      name,
      email,
      phone,
      topic = 'general',
      message,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Inquiry message is required.' });
    }

    const trackingId = generateTrackingId('INQ');
    const now = new Date();

    const inquiryDoc = {
      trackingId,
      type: 'general_inquiry',
      title: `General Inquiry: ${topic}`,
      description: message.trim(),
      topic: String(topic).toLowerCase().trim(),
      authorName: name.trim(),
      authorEmail: email.trim().toLowerCase(),
      authorPhone: (phone || '').trim(),
      status: 'Received',
      adminResponse: null,
      timeline: [
        {
          status: 'Received',
          note: 'General inquiry forwarded to Department Administration Office.',
          at: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await supportTickets.insertOne(inquiryDoc);

    return res.status(201).json({
      success: true,
      message: 'Inquiry sent to Department Office. We will get back to you soon.',
      trackingId,
      data: {
        trackingId,
        topic: inquiryDoc.topic,
        status: inquiryDoc.status,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('[POST /api/support/inquiry] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit inquiry.' });
  }
});

// ── 4. GET /api/support/track/:trackingId - Query tracking status ─────────────
router.get('/track/:trackingId', async (req, res) => {
  try {
    const { complaints, supportTickets } = getCollections();
    const rawCode = (req.params.trackingId || '').trim();

    if (!rawCode) {
      return res.status(400).json({ success: false, error: 'Tracking ID is required.' });
    }

    const query = { trackingId: { $regex: `^${rawCode}$`, $options: 'i' } };

    // Search complaints first
    let doc = await complaints.findOne(query);

    // If not found in complaints, search supportTickets
    if (!doc) {
      doc = await supportTickets.findOne(query);
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        found: false,
        error: `No record found for tracking ID "${rawCode}". Please check your code and try again.`,
      });
    }

    // Mask sensitive author information if anonymous
    const safeData = {
      trackingId: doc.trackingId,
      type: doc.type,
      title: doc.title,
      category: doc.category || doc.topic || 'General',
      priority: doc.priority || 'Normal',
      status: doc.status,
      isAnonymous: Boolean(doc.isAnonymous),
      authorName: doc.isAnonymous ? 'Anonymous Member' : doc.authorName,
      timeline: doc.timeline || [
        { status: doc.status, note: 'Status recorded', at: doc.createdAt },
      ],
      adminResponse: doc.adminResponse || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return res.json({
      success: true,
      found: true,
      data: safeData,
    });
  } catch (err) {
    console.error('[GET /api/support/track/:trackingId] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to look up tracking status.' });
  }
});

// ── 5. GET /api/support/admin/all - Admin get all records ─────────────────────
router.get('/admin/all', async (_req, res) => {
  try {
    const { complaints, supportTickets } = getCollections();

    const [allComplaints, allTickets] = await Promise.all([
      complaints.find({}).sort({ createdAt: -1 }).limit(100).toArray(),
      supportTickets.find({}).sort({ createdAt: -1 }).limit(100).toArray(),
    ]);

    const combined = [...allComplaints, ...allTickets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      success: true,
      count: combined.length,
      items: combined.map((d) => ({ ...d, id: d._id.toString() })),
    });
  } catch (err) {
    console.error('[GET /api/support/admin/all] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve support records.' });
  }
});

// ── 6. PATCH /api/support/admin/:id - Update status & admin response ─────────
router.patch('/admin/:id', async (req, res) => {
  try {
    const { complaints, supportTickets } = getCollections();
    const { id } = req.params;
    const { status, adminResponse, note } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID.' });
    }

    const objId = new ObjectId(id);
    const now = new Date();

    const newTimelineEntry = {
      status: status || 'Updated',
      note: note || adminResponse || 'Administrative status update.',
      at: now,
    };

    const updateSpec = {
      $set: {
        updatedAt: now,
      },
      $push: {
        timeline: newTimelineEntry,
      },
    };

    if (status) updateSpec.$set.status = status;
    if (adminResponse !== undefined) updateSpec.$set.adminResponse = adminResponse;

    let updateRes = await complaints.updateOne({ _id: objId }, updateSpec);
    let updatedCollection = 'complaints';

    if (updateRes.matchedCount === 0) {
      updateRes = await supportTickets.updateOne({ _id: objId }, updateSpec);
      updatedCollection = 'support_tickets';
    }

    if (updateRes.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }

    return res.json({
      success: true,
      message: 'Status updated successfully.',
      updatedCollection,
    });
  } catch (err) {
    console.error('[PATCH /api/support/admin/:id] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update record.' });
  }
});

// ── 7. DELETE /api/support/admin/:id - Delete record ───────────────────────────
router.delete('/admin/:id', async (req, res) => {
  try {
    const { complaints, supportTickets } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID.' });
    }

    const objId = new ObjectId(id);
    let delRes = await complaints.deleteOne({ _id: objId });
    if (delRes.deletedCount === 0) {
      delRes = await supportTickets.deleteOne({ _id: objId });
    }

    if (delRes.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }

    return res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    console.error('[DELETE /api/support/admin/:id] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete record.' });
  }
});

// ── 8. POST /api/support/subscribe - Circular & Announcements Newsletter ────────
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const { supportTickets } = getCollections();
    const cleanEmail = email.trim().toLowerCase();

    const existing = await supportTickets.findOne({ type: 'newsletter_subscription', authorEmail: cleanEmail });
    if (existing) {
      return res.json({
        success: true,
        message: 'You are already registered for official departmental circulars and alerts.',
      });
    }

    await supportTickets.insertOne({
      type: 'newsletter_subscription',
      authorEmail: cleanEmail,
      status: 'Active',
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Subscribed successfully! You will receive official CSE circulars and emergency alerts.',
    });
  } catch (err) {
    console.error('[POST /api/support/subscribe] Error:', err);
    return res.status(500).json({ success: false, error: 'Subscription failed. Please try again later.' });
  }
});

module.exports = router;


