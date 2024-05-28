const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    status: { type: String, required: true},
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSessionAuthKey: { type: String },
    checksum: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    startTime: { type: Number },
    endTime: { type: Number },
    snapshotTask: { type: mongoose.Schema.Types.ObjectId, ref: 'SnapshotTask'},
    staticData: { type: Object, default: {} },
    staticScore: { type: Number, default: 0 },
    behavioralScore: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now},
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true}
});

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;