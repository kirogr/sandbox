const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: [true, 'Please provide username.'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an e-mail address.'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide password.'],
    },
    avatar: {
        type: String,
        required: true,
        default: "https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/no-profile-picture-icon.png"
    }
});

userSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('users', userSchema);

module.exports = User;