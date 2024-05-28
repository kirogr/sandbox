const jwt = require("jsonwebtoken");
const User = require('../models/User');

module.exports.authenticateJWT = (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if(!token) {
      return res.redirect('/login');
    }

    jwt.verify(token, process.env.JWT_SECRET_TOKEN, async (err, decodedToken) => {
      if(err) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const user = await User.findById(decodedToken.id);
      if(!user) {
        res.cookie("jwt", "", { maxAge: 1 });
        return res.redirect('/login');
      }

      req.user = user;

      next();
    });
  } catch ( err ) {
    console.error(err);
    return res.redirect('/login');
  }
}