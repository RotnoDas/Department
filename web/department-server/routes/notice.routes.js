const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// GET all notices
router.get('/', async (req, res) => {
  try {
    const { notices } = getCollections();
    const noticeList = await notices.find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: noticeList.length, notices: noticeList });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notices" });
  }
});

// POST new notice
router.post('/', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { title, category, audience, content, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    const newNotice = {
      title,
      category: category || "General",
      audience: audience || "All Members",
      content,
      priority: priority || "Normal",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      createdAt: new Date(),
    };
    const result = await notices.insertOne(newNotice);
    res.status(201).json({ success: true, notice: { ...newNotice, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ error: "Failed to create notice" });
  }
});

// DELETE notice
router.delete('/:id', async (req, res) => {
  try {
    const { notices } = getCollections();
    const { id } = req.params;
    const result = await notices.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Notice not found" });
    res.json({ success: true, message: "Notice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notice" });
  }
});

module.exports = router;
