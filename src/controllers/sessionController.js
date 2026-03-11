const { customAlphabet } = require('nanoid');
const Session = require('../models/Session');
const { AREAS, DEPENDENCY_QS } = require('../utils/data');
const {
  calcAreaScores,
  calcDepVotes,
  buildMatrix,
  calcOverallMaturity,
  calcCompletedAreaIds,
} = require('../utils/scoring');

// 6-char alphanumeric share ID (lowercase + digits)
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

/**
 * Recompute all derived fields from raw answers and attach to a session document.
 * Mutates the session object in place.
 */
function recompute(session) {
  // Normalise answers: Map → plain object
  const answersRaw = session.answers instanceof Map
    ? Object.fromEntries(session.answers)
    : (session.answers || {});

  const areaScores = calcAreaScores(answersRaw, AREAS);
  const depVotes   = calcDepVotes(answersRaw, AREAS, DEPENDENCY_QS);
  const matrix     = buildMatrix(areaScores, depVotes, AREAS);
  const overallMaturity = calcOverallMaturity(areaScores);
  const completedAreaIds = calcCompletedAreaIds(answersRaw, AREAS);

  session.areaScores      = areaScores;
  session.depVotes        = depVotes;
  session.matrix          = matrix;
  session.overallMaturity = overallMaturity;
  session.completedAreaIds = completedAreaIds;
}

// POST /sessions
async function createSession(req, res, next) {
  try {
    const { orgName = '' } = req.body || {};

    const shareId = nanoid();

    const session = new Session({
      shareId,
      orgName: String(orgName).trim().slice(0, 200),
      answers: {},
      status: 'in-progress',
    });

    recompute(session);
    await session.save();

    return res.status(201).json({ success: true, data: session.toJSON() });
  } catch (err) {
    next(err);
  }
}

// GET /sessions/:shareId
async function getSession(req, res, next) {
  try {
    const { shareId } = req.params;
    const session = await Session.findOne({ shareId });

    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found', code: 'NOT_FOUND' } });
    }

    return res.json({ success: true, data: session.toJSON() });
  } catch (err) {
    next(err);
  }
}

// PUT /sessions/:shareId
async function updateSession(req, res, next) {
  try {
    const { shareId } = req.params;
    const { answers, orgName } = req.body || {};

    const session = await Session.findOne({ shareId });
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found', code: 'NOT_FOUND' } });
    }

    if (orgName !== undefined) {
      session.orgName = String(orgName).trim().slice(0, 200);
    }

    if (answers !== undefined && typeof answers === 'object' && !Array.isArray(answers)) {
      // Merge incoming answers into existing map
      const existing = session.answers instanceof Map
        ? Object.fromEntries(session.answers)
        : (session.answers || {});

      const merged = { ...existing, ...answers };
      session.answers = merged;
    }

    recompute(session);
    await session.save();

    return res.json({ success: true, data: session.toJSON() });
  } catch (err) {
    next(err);
  }
}

// DELETE /sessions/:shareId
async function deleteSession(req, res, next) {
  try {
    const { shareId } = req.params;
    const result = await Session.deleteOne({ shareId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { message: 'Session not found', code: 'NOT_FOUND' } });
    }

    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// GET /sessions  (paginated list)
async function listSessions(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Session.countDocuments(filter),
    ]);

    // Lean docs: convert Map-like objects for answers/depVotes
    const data = sessions.map(s => {
      if (s.answers && !(s.answers instanceof Array)) {
        // already plain object from lean
      }
      return s;
    });

    return res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /sessions/:shareId/finalize
async function finalizeSession(req, res, next) {
  try {
    const { shareId } = req.params;
    const session = await Session.findOne({ shareId });

    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found', code: 'NOT_FOUND' } });
    }

    // Ensure scores are up to date
    recompute(session);
    session.status = 'completed';
    await session.save();

    return res.json({ success: true, data: session.toJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessions,
  finalizeSession,
};
