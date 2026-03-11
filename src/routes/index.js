const express = require('express');
const router  = express.Router();

const sessionRoutes = require('./sessions');

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Session routes
router.use('/sessions', sessionRoutes);

module.exports = router;
