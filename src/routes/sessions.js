const express = require('express');
const router  = express.Router();
const {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessions,
  finalizeSession,
} = require('../controllers/sessionController');

// List all sessions (paginated)
router.get('/', listSessions);

// Create a new session
router.post('/', createSession);

// Get a single session by shareId
router.get('/:shareId', getSession);

// Update answers / orgName for a session
router.put('/:shareId', updateSession);

// Delete a session
router.delete('/:shareId', deleteSession);

// Finalize (mark complete) a session
router.post('/:shareId/finalize', finalizeSession);

module.exports = router;
