const { spawn } = require('child_process');

class TaskQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    addTask(task) {
        this.queue.push(task);
        console.log(`Task added. Queue size: ${this.queue.length}`);
        if (!this.processing) {
            console.log("Starting task processing...");
            this.processing = true;
            this.processTask();
        }
    }

    processTask() {
        if (this.queue.length === 0) {
            this.processing = false;
            console.log("No more tasks. Stopping processing.");
            return;
        }

        const { filePath, callback } = this.queue.shift();
        console.log(`Processing task. Remaining queue size: ${this.queue.length}`);
        const pythonProcess = spawn(process.env.PYTHON_RUNTIME_TASK, [process.env.TASK_PYTHON_STATIC_TOOL_PATH, filePath]);

        let output = '';
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                callback('Python script failed', null);
            } else {
                callback(null, output);
            }
            // Process the next task regardless of the current one's outcome
            this.processTask();
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            callback('Failed to start Python process', null);
            // Continue processing to prevent queue stall
            this.processTask();
        });
    }
}

module.exports = TaskQueue;
