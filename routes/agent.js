const { Router } = require("express");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Submission = require('../models/Submission');
const EventLog = require("../utils/EventLog");

const router = Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const session = req.query.session;
      if (!session) {
        throw new Error('Missing auth_key parameter');
      }

      const localSubmission = await Submission.findOne({fileSessionAuthKey: session});
      if(!localSubmission) {
        throw new Error("Unauthorized");
      }

      const submissionId = localSubmission._id.toString();

      const uploadDir = path.join(__dirname, '../uploads', submissionId);
      if (!uploadDir) {
            return res.status(400).send('No file uploaded');
    }
    
      if (file.originalname !== "events.gz") {
        throw new Error("File is not recognized");
      }

      fs.mkdir(uploadDir, { recursive: true }, (err) => {
        if (err) {
          throw err; 
        }

        cb(null, uploadDir);
      });
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});


const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const uploadDir =  path.dirname(req.file.path); 
    const compressedFile = path.join(uploadDir, 'events.gz');
    console.log(compressedFile)
    const decompressedFile = path.join(uploadDir, 'sum_events');

    const readStream = fs.createReadStream(compressedFile);
    const unzip = zlib.createGunzip();
    const writeStream = fs.createWriteStream(decompressedFile);

    readStream
    .pipe(unzip)
    .on('error', (err) => {
      console.error('Decompression error:', err);
      return res.status(304).send("INVALID");
    })
    .pipe(writeStream)
    .on('finish', () => {
      console.log('Decompression finished!');
      fs.unlink(compressedFile, (err) => {
        if (err) {
          console.error('Error deleting compressed file:', err);
          return res.status(304).send("INVALID");
        }
      });
  
      EventLog.MakeUniqueEvents(uploadDir + `/sum_events`, uploadDir);
  
      res.status(200).send("EVENTS_COLLECTED");
    });  
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
