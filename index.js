const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser')
const app = express();
const port = process.env.PORT || 3000;
const defaultRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const agentRoutes = require("./routes/agent");
dotenv.config();

// Server setup
const server = app.listen(port, () => {
    console.log("Server is running at port:" + port);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.set('view engine', 'ejs');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("[+] Connected to MongoDB!");
});

// Routes
app.use(defaultRoutes);
app.use(authRoutes);
app.use("/api", apiRoutes)
app.use('/agent/', agentRoutes)

app.get('/', (req, res) => {
    res.redirect('/dashboard');
})


// todo: checking for expired submissions.
// setInterval(async () => {
//     const current_time = Math.floor(Date.now() / 1000);

//     const submissions = await Submission.find({}).exec();
//     submissions.forEach(async sub => {
//         if(sub['endTime'] <= current_time) {
//             // find the virtual machine
//             const snapshot = await Snapshot.findOne({ attachedTo: sub });
//             if(snapshot) {
//                 console.log('we need to turn off : ' + snapshot['virtualMachineId'])
//             }
//         }
//     });
// }, 1000);