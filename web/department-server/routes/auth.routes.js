const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/me', verifyToken, async (req, res) => {
  res.send({ user: req.user, message: "Secure data accessed successfully!" });
});

module.exports = router;
