const { Router } = require("express");
const multer = require('multer');
const submissionController = require('../controllers/submissionController');
const Snapshots = require('../models/Snapshots');
const SnapshotsTask = require('../models/SnapshotsTask');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = Router();
const vmController = require("../controllers/vmController");
const { AcquireTicket } = require("../utils/AcquireTicket");
const Submission = require("../models/Submission");
const authenticationMw = require("../middleware/authentication");

function formatBytes(bytes) {
    const units = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Byte";
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}


router.get('/recent', authenticationMw.authenticateJWT, function(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    Submission.find({ user: req.user._id }, 'originalName staticScore behavioralScore createdAt checksum status')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(function(err, submissions) {
            if (err) return res.status(500).send(err);

            Submission.countDocuments({ user: req.user._id }, function(err, count) {
                if (err) return res.status(500).send(err);

                const formattedSubmissions = submissions.map(submission => ({
                    id: submission._id,
                    createdDate: submission.createdAt,
                    fileName: submission.originalName,
                    statusScore: submission.status,
                    sha256: submission.checksum
                }));

                res.status(200).json({ submissions: formattedSubmissions, totalPages: Math.ceil(count / limit) });
            });
        });
});

router.get('/search', authenticationMw.authenticateJWT, async (req, res) => {
    try {
        const { hash } = req.query;
        
        const submissions = await Submission.find({ checksum: hash }).limit(10);

        if (submissions.length === 0) {
            return res.status(200).json({ message: 'No submissions found with the provided SHA256 hash.' });
        }

        const formattedSubmissions = submissions.map(submission => ({
            id: submission._id,
            createdDate: submission.createdAt,
            fileName: submission.originalName,
            statusScore: submission.staticScore + submission.behavioralScore + "/10",
            sha256: submission.checksum
        }));

        // Assuming you have a function to calculate total pages based on total count and limit
        const totalCount = await Submission.countDocuments({ checksum: hash });
        const totalPages = Math.ceil(totalCount / 10);

        res.status(200).json({ results: formattedSubmissions, totalPages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/summary', authenticationMw.authenticateJWT, submissionController.getSubmissionData, function (req, res) {
    const submission = res.locals.submission;
    submission.staticData.App.size = formatBytes(submission.staticData.App.size);
    res.status(200).render('layouts/summary', { submission });
});

router.get('/static-analysis', authenticationMw.authenticateJWT, submissionController.getSubmissionData, function (req, res) {
    try {
        const submission = res.locals.submission;
        submission.staticData.App.size = formatBytes(submission.staticData.App.size);
        if(submission.staticData['Generic_File'] == "No specific analysis available")
            return res.status(200).send("No specific analysis available");

        res.status(200).render('layouts/static', { submission });
    } catch(err) {
        return res.status(200).send("There is insufficient analysis available for the file you have uploaded.");
    }
});

router.get('/behavioral-analysis', authenticationMw.authenticateJWT, submissionController.getSubmissionData, async function (req, res) {
    try {
        const submission = res.locals.submission;

        vmController.establishVirtualMachines();
        const snapshotTaskLocal = await SnapshotsTask.findById(submission['snapshotTask']);

        if (submission['status'] == "accepted_input_behavioral") {
            let retries = 0;
            const maxRetries = 3;
            const checkSnapshotInterval = setInterval(async () => {
                if (retries >= maxRetries) {
                    clearInterval(checkSnapshotInterval);
                    submission['status'] = 'waiting_for_input';
                    await res.locals.submission.save();
                    return res.status(200).send(`<div class="flex justify-center items-center w-full h-screen bg-gray-100">
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong class="font-bold">Error!</strong>
                        <span>We cannot establish your sandbox virtual machine. Something went wrong. Please reload the page.</span>
                    </div>
                </div>
                `);
                }
                const snapshotLocal = await Snapshots.findOne({ powerState: "on", attachedTo: submission });
                if (snapshotLocal) {
                    clearInterval(checkSnapshotInterval); // Stop checking once snapshot is found
                    const ticketSession = await AcquireTicket(snapshotTaskLocal['virtualMachineId']);
                    if(ticketSession && ticketSession.length != 16) {
                        if(ticketSession == "Ticket field not found in the response HTML") {
                            return res.status(200).send("The session is ended or expired. This might take a few minutes to analyze the behavioral.");
                        }
                        // vmController.turnOnVirtualMachine(snapshotTaskLocal['virtualMachineId']);
                        return res.status(200).send("Couldn't get session. Please try again.<script>loadCategoryData('behavioral-analysis');</script>");
                    }
                    vmController.establishVirtualMachines(); // establish again, some network issues can happen, and it might take few seconds in order to make an update.
                    const powerVm = snapshotTaskLocal['status'] == "vm_is_off";

                    res.status(200).render('layouts/behavioral-console', {
                        submission,
                        ticket: ticketSession,
                        powerVm,
                        startTime: parseInt(submission['startTime']),
                        endTime: parseInt(submission['endTime']),
                    });
                } else {
                    vmController.establishVirtualMachines();
                    console.log("Snapshot is still off");
                    retries++;
                }
            }, 3000);
        } else if(submission['status'] == "behavioral_results") {
            res.status(200).render('layouts/behavioral-results', {
                submission
            })
        } else {
            const snapshots = (await Snapshots.find({})).filter(snapshot => snapshot.powerState == "off");
            res.status(200).render('layouts/behavioral', { submission, snapshots });
        }
    } catch (err) {
        console.error(err);
        return res.status(404).send("Internal Server Error");
    }
});


router.get('/extracted-artifacts', authenticationMw.authenticateJWT, submissionController.getSubmissionData, async function(req, res) {
    res.send("welcome to extracted arts");
})

router.post('/create-snapshot', authenticationMw.authenticateJWT, submissionController.getSubmissionData, async function (req, res) {
    try {
        const {submissionId, snapshot, timeout} = req.body;

        // check if there is a connection.
        await require('../utils/RelayServer').getNumClients();

        const snapshotLocal = await Snapshots.findById(snapshot);

        res.locals.submission['status'] = "accepted_input_behavioral";
    
        res.locals.submission['fileSessionAuthKey'] = require("../utils/GenerateAuthKey").GenerateAuthKey();
    
        const task = new SnapshotsTask({
            submissionId,
            virtualMachineId: snapshotLocal['virtualMachineId'],
            snapshot: snapshotLocal['snapshot']
        });
    
        await task.save();

        res.locals.submission['snapshotTask'] = task;
    
        // set timeout in order to terminate the console after the user used.
    
        res.locals.submission['startTime'] = Math.floor(Date.now() / 1000);
        res.locals.submission['endTime'] = Math.floor(Date.now() / 1000) + parseInt(timeout);
    
        await res.locals.submission.save();
        vmController.turnOnVirtualMachine(snapshotLocal.virtualMachineId, snapshotLocal.snapshotMemId);
        
        res.status(200).json({message: "OK"});
    
        setTimeout(async () => {
            await Snapshots.findById(snapshot).updateOne({ isAttached: true, attachedTo: res.locals.submission}).exec();
        }, 5000);
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
});

router.post('/terminate', authenticationMw.authenticateJWT, submissionController.getSubmissionData, async function(req, res) {
    const submission = res.locals.submission;
    const snapshotLocal = await Snapshots.findOne({ powerState: "on", attachedTo: submission });

    const a = require('../utils/RelayServer').terminateAgent(snapshotLocal._id.toString());

    res.status(200).json({message: "TERMINATED"});

    setTimeout(async () => {        
        vmController.establishVirtualMachines();
        submission['status'] = "behavioral_results";
        submission['fileSessionAuthKey'] = null;
        
        await res.locals.submission.save();

        // todo: make the vmcontroller will turn off the machine, then recheck if the powerstate is off, then revert to prod snapshot.
        setTimeout(() => {
            vmController.revertVirtualMachineSnapshot(snapshotLocal['virtualMachineId'], snapshotLocal['snapshotMemId']);
        }, 3000);
    }, 3000);
})

router.get('/events', authenticationMw.authenticateJWT, submissionController.getSubmissionData, async (req, res) => {
    try {
        const submission = res.locals.submission;

        const fileDirectory = path.dirname(submission['filePath']);
    
        const start = parseInt(req.query.start) || 0;
        const stop = parseInt(req.query.stop) || Infinity;
        const limit = parseInt(req.query.limit) || Infinity;
    
        // res.setHeader('Content-Type', 'application/json');
    
        // res.status(200).send("Proccessed all events");
        require("../utils/EventLog").parseFile(`${fileDirectory}/unique_events`, res, start, stop, limit);    
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});


// router.get('/corp/create-sandbox', async function (req, res) {
//     const Snapshots = require("../models/Snapshots");

//     const snapshot = new Snapshots({
//         virtualMachineName: "sandbox",
//         virtualMachineId: "50",
//         vcenterId: "37",
//         snapshot: "Windows 10",
//         guestOS: "Microsoft Windows 8.x (64-bit)",
//         powerState: "off",
//         isAttached: false
//     })

//     await snapshot.save();

//     res.send("created :)");
    
// });



module.exports = router;
