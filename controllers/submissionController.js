const Submission = require("../models/Submission");

module.exports.getSubmissionData = async (req, res, next) => {
    res.locals.submission = await Submission.findById(req.query.submission);
    
    next();
}