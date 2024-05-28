
// Global Functions
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// GET
module.exports.getLogin = (req, res) => {
    res.render('login', { title: 'Login' });
}

module.exports.getSignup = (req, res) => {
    res.render('signup', { title: 'Signup' });
}

// POST

module.exports.postSignup = async (req,res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).send("User already exists");
        }

        const user = await User.create({ username, email, password });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_TOKEN, { expiresIn: 999999 });
        res.cookie("jwt", token, { httpOnly: true, maxAge: 999999999 });
        res.status(201).json({message: "SUCCESS", token: token});
    } catch( err ) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
}

module.exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        if (!user) {
            return res.status(400).send("Incorrect username/e-mail address");
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_TOKEN, { expiresIn: 999999 });
            res.cookie("jwt", token, { httpOnly: true, maxAge: 999999999 });
            res.status(200).json({message: "SUCCESS", token: token});
        }
        
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
}

module.exports.logout = async (req, res) => {
    try {
        const token = req.cookies.jwt;

        if(!token) {
            return res.redirect("/");
        }

        res.cookie("jwt", "", { maxAge: 1});
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
}