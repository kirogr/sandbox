const { json } = require('express');
const TaskQueue = require('../utils/TaskQueue');
const taskQueue = new TaskQueue();

module.exports.processMetaDataFile = function(submission) {
    const filePath = submission.filePath;
    return new Promise((resolve, reject) => {
        taskQueue.addTask({
            filePath,
            callback: (err, result) => {
                if (err) {
                    console.error("[!] Error: " + err);
                    reject("{'error': 'runtime failed'}"); // Reject the promise on error
                } else {
                    console.log(result);
                    console.log("\n================================================\n\n")
                    const jsonData = JSON.parse(result);
                    resolve(jsonData);
                }
            }
        });
    });
};