const { MATURITY, AREAS, DEPENDENCY_QS } = require('./data');

/**
 * Calculate per-area scores from a map of answers.
 * @param {Object} answers - plain object: { questionId: value }
 * @param {Array}  areas   - AREAS array
 */
function calcAreaScores(answers, areas) {
  return areas.map(area => {
    const maturityQs = area.questions.filter(q => q.type === 'maturity');
    const bottleneckQ = area.questions.find(q => q.type === 'bottleneck');

    let mTotal = 0;
    let mMax = 0;
    maturityQs.forEach(q => {
      if (answers[q.id] !== undefined) {
        mTotal += Number(answers[q.id]);
        mMax += 4;
      }
    });

    const maturityScore = mMax > 0 ? Math.round((mTotal / mMax) * 100) : null;

    const bVal = bottleneckQ ? answers[bottleneckQ.id] : undefined;
    const bottleneckScore = bVal !== undefined ? Math.round((Number(bVal) / 4) * 100) : null;
    const bottleneckSeverity = bottleneckScore !== null ? 100 - bottleneckScore : null;

    const priorityIndex =
      maturityScore !== null && bottleneckSeverity !== null
        ? Math.round(bottleneckSeverity * (1 - maturityScore / 100) * area.impactWeight)
        : null;

    return {
      id: area.id,
      maturityScore,
      bottleneckScore,
      bottleneckSeverity,
      priorityIndex,
    };
  });
}

/**
 * Tally dependency question votes by area.
 * @param {Object} answers
 * @param {Array}  areas
 * @param {Array}  dependencyQs
 */
function calcDepVotes(answers, areas, dependencyQs) {
  const v = {};
  areas.forEach(a => { v[a.id] = 0; });
  dependencyQs.forEach(q => {
    const a = answers[q.id];
    if (a) v[a] = (v[a] || 0) + 1;
  });
  return v;
}

/**
 * Build a ranked priority matrix.
 * @param {Array}  areaScores
 * @param {Object} depVotes
 * @param {Array}  areas
 */
function buildMatrix(areaScores, depVotes, areas) {
  return areas
    .map(area => {
      const sc = areaScores.find(a => a.id === area.id);
      const depBoost = (depVotes[area.id] || 0) * 15;
      return {
        ...area,
        ...sc,
        depVotes: depVotes[area.id] || 0,
        rawPriority: (sc?.priorityIndex ?? 0) + depBoost,
      };
    })
    .sort((a, b) => b.rawPriority - a.rawPriority);
}

/**
 * Look up the maturity level metadata for a given score (0–100).
 * @param {number} s
 */
function getMaturity(s) {
  if (s < 20) return MATURITY[0];
  if (s < 40) return MATURITY[1];
  if (s < 60) return MATURITY[2];
  if (s < 80) return MATURITY[3];
  return MATURITY[4];
}

/**
 * Compute overall maturity score from all completed area maturity scores.
 * Returns null if no areas have been scored.
 * @param {Array} areaScores
 */
function calcOverallMaturity(areaScores) {
  const scored = areaScores.filter(a => a.maturityScore !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, a) => acc + a.maturityScore, 0);
  return Math.round(sum / scored.length);
}

/**
 * Determine which area IDs are fully completed (all 5 questions answered).
 * @param {Object} answers
 * @param {Array}  areas
 */
function calcCompletedAreaIds(answers, areas) {
  return areas
    .filter(area => area.questions.every(q => answers[q.id] !== undefined))
    .map(area => area.id);
}

module.exports = {
  calcAreaScores,
  calcDepVotes,
  buildMatrix,
  getMaturity,
  calcOverallMaturity,
  calcCompletedAreaIds,
};
