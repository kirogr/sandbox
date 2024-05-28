
// "snapshots" also known as virtual machine that are registered on the project.

const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
    virtualMachineName: { type: String, required: true },
    virtualMachineId: { type: String, required: true, unique: true},
    snapshotMemId: { type: String, required: true},
    vcenterId: { type: String, required: true, unique: true},
    snapshot: { type: String, required: true },
    guestOS: { type: String, required: true },
    powerState: { type: String, required: true },
    isAttached: { type: Boolean, default: false },
    attachedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission'}
});

const Snapshot = mongoose.model('Snapshots', snapshotSchema);

module.exports = Snapshot;