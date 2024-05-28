const readline = require('readline');
const fs = require('fs');
const path = require('path');
const Indicator = require('../models/Indicator'); 

module.exports.MakeUniqueEvents = (analogPath, uploadDir) => {
    const uniqueObjects = new Map();
  
    function parseJSONLine(line) {
      try {
        const jsonObject = JSON.parse(line);
        const { time, ...rest } = jsonObject;
        return { time, uniqueKey: JSON.stringify(rest) };
      } catch (error) {
        return null;
      }
    }
  
    const readInterface = readline.createInterface({
      input: fs.createReadStream(analogPath),
      crlfDelay: Infinity
    });
  
    readInterface.on('line', (line) => {
      const parsedLine = parseJSONLine(line);
      if (parsedLine) {
        const { time, uniqueKey } = parsedLine;
        if (!uniqueObjects.has(uniqueKey)) {
          uniqueObjects.set(uniqueKey, time);
        }
      }
    });
  
    readInterface.on('close', () => {
      const timestamp = Date.now();
      const uniqueFilename = path.join(uploadDir, `unique_events`);
  
      const outputStream = fs.createWriteStream(uniqueFilename);
      uniqueObjects.forEach((time, uniqueKey) => {
        const jsonObject = JSON.parse(uniqueKey);
        jsonObject.time = time;
        outputStream.write(JSON.stringify(jsonObject) + '\n');
      });
      outputStream.end(() => {
        console.log('Unique JSON objects exported to:', uniqueFilename);
      });
    });
};
  

module.exports.parseFile = (filename, res, start = 0, stop = Infinity, limit = Infinity) => {
    try {
        if (!fs.existsSync(filename)) {
            return res.status(500).json({message:"Log not found"});
        }

        const readStream = fs.createReadStream(filename);
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });

        let lineNumber = 0;
        const responseArray = [];

        rl.on('line', (line) => {
            lineNumber++;

            if (lineNumber >= start && lineNumber <= stop && responseArray.length < limit) {
                try {
                    const jsonObject = JSON.parse(line);
                    responseArray.push(jsonObject);
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                }
            }

            if (responseArray.length >= limit) {
                rl.close();
            }
        });

        rl.on('close', () => {
            res.json(responseArray);
        });
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
}

module.exports.processLogFile = async (filename) => {
    const fileStream = fs.createReadStream(filename);
    let insertedCount = 0;
    let totalCount = 0;

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        let jsonData;
        try {
            jsonData = JSON.parse(line);

            delete jsonData.pid;

            const existingIndicator = await Indicator.findOne({
                cmd: jsonData.cmd,
                displayName: jsonData.displayName,
                eventType: jsonData.eventType,
                image: jsonData.image,
                operation: jsonData.operation,
                path: jsonData.path,
                process: jsonData.process
            });

            if (!existingIndicator) {
                await Indicator.create(jsonData);
                insertedCount++;
            }
            totalCount++;
            console.log(`[+] Indicator inserted successfully ${insertedCount}/${totalCount}`);
        } catch (error) {
            console.error('Error processing line:', error);
            console.log('Error occurred while processing line, jsonData:', jsonData);
            break;
        }
    }
}

module.exports.checkIndicatorsInDatabase = async (filename, outputFilename) => {
    const missingIndicators = [];

    const lines = fs.readFileSync(filename, 'utf8').split('\n');

    for (const line of lines) {
        try {
            const jsonData = JSON.parse(line);

            if(jsonData.cmd.startsWith('C:\\Windows\\System32\\')) {
                if (jsonData.process.includes('\u0000') ||
                jsonData.process.includes('\u0010') ||
                jsonData.parent_pid == 0
            ) {
                    continue;
                }
            }

            console.log('[!]');
            const filter = {
                cmd: jsonData.cmd,
                displayName: jsonData.displayName,
                image: jsonData.image,
                operation: jsonData.operation,
                path: jsonData.path,
                process: jsonData.process
            };

            const existingIndicators = await Indicator.find(filter);

            if (existingIndicators.length === 0) {
                missingIndicators.push(jsonData);
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    }

    fs.writeFileSync(outputFilename, missingIndicators.map(indicator => JSON.stringify(indicator)).join('\n'));
};