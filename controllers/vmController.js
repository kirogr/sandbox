const Snapshot = require('../models/Snapshots');
const { Client } = require('ssh2');

function mapPowerState(sshPowerState) {
    switch (sshPowerState) {
        case 'Powered on':
            return 'on';
        case 'Powered off':
            return 'off';
        case 'Suspended':
            return 'suspended';
        default:
            return 'unknown';
    }
}

async function getPowerStateFromESXi(virtualMachineId, sshConfig) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
            finish([sshConfig.password]);
        });

        conn.on('ready', () => {
            conn.exec(`vim-cmd vmsvc/power.getstate ${virtualMachineId}`, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }
                let powerState = '';
                stream
                    .on('close', (code, signal) => {
                        conn.end();
                        if (code !== 0) {
                            reject(new Error(`Failed to get power state. Exit code: ${code}`));
                        } else {
                            resolve(powerState.trim());
                        }
                    })
                    .on('data', data => {
                        powerState += data.toString();
                    })
                    .stderr.on('data', data => {
                        // Handle error
                        reject(new Error(`Error getting power state: ${data.toString()}`));
                    });
            });
        }).connect({
            host: sshConfig.host,
            port: 22,
            username: sshConfig.username,
            tryKeyboard: true
        });
    });
}

async function establishVirtualMachines() {
    try {
        const virtualMachines = await Snapshot.find({}, 'virtualMachineId');

        const sshConfig = {
            host: process.env.ESXI_HOST,
            username: process.env.ESXI_USERNAME,
            password: process.env.ESXI_PASSWORD
        };

        for (const vm of virtualMachines) {
            // Query power state of the virtual machine from ESXi server
            var powerState = await getPowerStateFromESXi(vm.virtualMachineId, sshConfig);
            powerState = mapPowerState(powerState.split("\n")[1]);
            
            // clear the isAttached, attachedTo if something happens.
            if(powerState == "off") {
                await Snapshot.updateOne({ isAttached: false, attachedTo: null}).exec();
            }

            await Snapshot.updateOne({ virtualMachineId: vm.virtualMachineId }, { powerState });
        }

        // console.log('Virtual machine power states updated successfully.');
    } catch (error) {
        console.error('Error establishing virtual machines:', error);
    }
}

async function turnOnVirtualMachine(virtualMachineId, snapshotId) {
    revertVirtualMachineSnapshot(virtualMachineId, snapshotId);

    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
            finish([process.env.ESXI_PASSWORD]);
        });

        conn.on('ready', () => {
            conn.exec(`vim-cmd vmsvc/power.on ${virtualMachineId}`, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                stream.on('close', (code, signal) => {
                    conn.end();
                    if (code !== 0) {
                        reject(new Error(`Failed to turn on virtual machine. Exit code: ${code}`));
                    } else {
                        resolve('Virtual machine turned on successfully.');
                    }
                });
            });
        }).connect({
            host: process.env.ESXI_HOST,
            port: 22,
            username: process.env.ESXI_USERNAME,
            tryKeyboard: true
        });
    });
}

async function revertVirtualMachineSnapshot(vmId, snapshotId) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
            finish([process.env.ESXI_PASSWORD]);
        });

        conn.on('ready', () => {
            conn.exec(`vim-cmd vmsvc/snapshot.revert ${vmId} ${snapshotId} 1`, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                stream.on('close', (code, signal) => {
                    conn.end();
                    if (code !== 0) {
                        reject(new Error(`Failed to revert snapshot. Exit code: ${code}`));
                    } else {
                        resolve('Snapshot reverted successfully.');
                    }
                });
            });
        }).connect({
            host: process.env.ESXI_HOST,
            port: 22,
            username: process.env.ESXI_USERNAME,
            tryKeyboard: true
        });
    });
}

module.exports = { establishVirtualMachines, turnOnVirtualMachine, revertVirtualMachineSnapshot };