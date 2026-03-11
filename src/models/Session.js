const mongoose = require('mongoose');

const AreaScoreSchema = new mongoose.Schema({
  id: { type: String, required: true },
  maturityScore: { type: Number, default: null },
  bottleneckScore: { type: Number, default: null },
  bottleneckSeverity: { type: Number, default: null },
  priorityIndex: { type: Number, default: null },
}, { _id: false });

const SessionSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orgName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    answers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
    },
    areaScores: {
      type: [AreaScoreSchema],
      default: [],
    },
    depVotes: {
      type: Map,
      of: Number,
      default: {},
    },
    matrix: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    overallMaturity: {
      type: Number,
      default: null,
    },
    completedAreaIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Convert Maps to plain objects for JSON output
        if (ret.answers instanceof Map) {
          ret.answers = Object.fromEntries(ret.answers);
        } else if (ret.answers && typeof ret.answers === 'object' && !(ret.answers instanceof Array)) {
          // Already plain object (e.g. from lean queries)
        }
        if (ret.depVotes instanceof Map) {
          ret.depVotes = Object.fromEntries(ret.depVotes);
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        if (ret.answers instanceof Map) {
          ret.answers = Object.fromEntries(ret.answers);
        }
        if (ret.depVotes instanceof Map) {
          ret.depVotes = Object.fromEntries(ret.depVotes);
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for listing sessions by creation date
SessionSchema.index({ createdAt: -1 });
SessionSchema.index({ status: 1, createdAt: -1 });

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
