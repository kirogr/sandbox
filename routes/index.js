const { Router } = require("express");
const multer = require('multer');
const Submission = require("../models/Submission");
const Snapshots = require("../models/Snapshots");
const { processMetaDataFile } = require("../controllers/staticAnalysisController");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = Router();
const authenticationMw = require('../middleware/authentication');
const { AcquireTicket } = require("../utils/AcquireTicket")

const tmpStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tmpDir = path.join(__dirname, '../uploads/tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        cb(null, tmpDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: tmpStorage });

router.get('/dashboard', authenticationMw.authenticateJWT, async (req, res) => {

    const totalFiles = await Submission.countDocuments();
    const totalVms = await Snapshots.countDocuments({powerState: "on"});
    const totalPending = await Submission.countDocuments({status: "waiting_for_input"});
    const totalConfirmed = await Submission.countDocuments({status: "behavioral_results"});


    res.render('submit', {
        user: req.user,
        totalFiles,
        totalVms,
        totalPending,
        totalConfirmed
    });
});

router.get("/analysis/:id", authenticationMw.authenticateJWT, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).send("Submission not found.");
        }
        
        if(String(submission.user) != req.user._id)
            return res.status(403).send("Forbidden");

        res.render('analysis', {
            user: req.user,
            id: req.params.id
        });
    } catch(err) {
        console.error(err);
    }
});

router.get("/recent", authenticationMw.authenticateJWT, async (req, res) => {
    res.render("recent", { user: req.user });
});

router.get("/search", authenticationMw.authenticateJWT, async (req, res) => {
    res.render("search", { user: req.user });
});

router.get('/settings', authenticationMw.authenticateJWT, async(req,res) => {
    res.render("settings", { user: req.user });
})

router.post('/submit', authenticationMw.authenticateJWT, upload.single('file'), async (req, res) => {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    try {
        const newSubmission = new Submission({ originalName: req.file.originalname, user: req.user._id });
        const submissionDir = path.join(__dirname, '../uploads', newSubmission._id.toString());
        fs.mkdirSync(submissionDir, { recursive: true });
        const newFilePath = path.join(submissionDir, req.file.originalname);
        fs.renameSync(filePath, newFilePath);


        newSubmission.filePath = newFilePath;
        newSubmission.checksum = checksum;
        newSubmission.status = "pending";
        await newSubmission.save();

        newSubmission.staticData = await processMetaDataFile(newSubmission);
        newSubmission.status = "waiting_for_input";
        await newSubmission.save();

        if(newSubmission.staticData['error']) {
            newSubmission.status = "error";
            await newSubmission.save();
        }

        res.json({
            message: "File uploaded successfully",
            submissionId: newSubmission._id,
            filePath: newSubmission.filePath,
            url: '/analysis/' + newSubmission._id
        });
    } catch (err) {
        console.error("Error during file processing:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
