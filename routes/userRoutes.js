const { protect } = require("../controllers/authController");
const {
  updateUserInfo,
  getFriends,
  getRequests,
  getUsers,
  getUserInfo,
} = require("../controllers/userController");

const router = require("express").Router();

router.patch("/update-me", protect, updateUserInfo);
router.get("/user-info/:user_id", protect, getUserInfo);
router.get("/get-users", protect, getUsers);
router.get("/get-friends", protect, getFriends);
router.get("/get-friend-request", protect, getRequests);

module.exports = router;
