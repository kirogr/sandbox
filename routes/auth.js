const { Router } = require("express");
const authController = require("../controllers/authController");
const authenticationMw = require("../middleware/authentication");
const router = Router();


// GET
router.get('/signup', authController.getSignup);
router.get('/login', authController.getLogin);
router.get('/logout', authController.logout);

// POST
router.post('/signup', authController.postSignup);
router.post('/login', authController.postLogin);

module.exports = router;