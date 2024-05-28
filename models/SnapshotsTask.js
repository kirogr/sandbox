const mongoose = require('mongoose');

const snapshotTaskSchema = new mongoose.Schema({
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot'},
    virtualMachineId: { type: String, required: true},
    //productionSnapshotId: { type: String, required: true},
    //client: @author
    snapshot: { type: String, required: true},
    status: { type: String, default: "vm_is_off"},
    metadata: { type: Object, default: {}},
});

const SnapshotTask = mongoose.model('snapshot_tasks', snapshotTaskSchema);

module.exports = SnapshotTask;