const mongoose = require('mongoose');

const indicatorSchema = new mongoose.Schema({
    cmd: String,
    displayName: String,
    eventType: String,
    image: String,
    operation: String,
    path: String,
    process: String,
    score: { type: Number, default: 0 },
    is_process_root: { type: Boolean, default: false }
});

const Indicator = mongoose.model('indicators', indicatorSchema);

module.exports = Indicator;
