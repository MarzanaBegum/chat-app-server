const { protect } = require("../controllers/authController");
const updateUserInfo = require("../controllers/userController");

const router = require("express").Router();

router.patch("/update-me", protect, updateUserInfo);

module.exports = router;
