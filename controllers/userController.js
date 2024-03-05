const { FriendRequestModel } = require("../models/friendRequest");
const { updateUserInfoValidation, UserModel } = require("../models/userModel");
const CreateError = require("../utils/CreateError");

const updateUserInfo = async (req, res, next) => {
  const { user } = req;
  const { value, error } = await updateUserInfoValidation(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  try {
    const updated_user = await UserModel.findByIdAndUpdate(user._id, req.body);

    res
      .status(200)
      .send({ message: "User updated successfully", updated_user });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

const getUserInfo = async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) throw CreateError("Required parameter not provided", 400);
  const user = await UserModel.findById(user_id).select(
    "firstName lastName email _id avatar about"
  );
  res.status(200).send(user);
};

const getUsers = async (req, res, next) => {
  try {
    const allUsers = await UserModel.find({ verified: true }).select(
      "firstName lastName status email _id avatar"
    );

    const this_user = req.user;

    const remaining_user = allUsers.filter(
      (user) =>
        !this_user.friends.includes(user._id) &&
        user._id.toString() !== this_user._id.toString()
    );

    res
      .status(200)
      .send({ message: "User found successfully", data: remaining_user });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

const getRequests = async (req, res, next) => {
  try {
    const request = await FriendRequestModel.find({ recipient: req.user._id })
      .populate("sender")
      .select("firstName lastName status email _id avatar");
    res
      .status(200)
      .send({ message: "Friend request found successfully", data: request });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

const getFriends = async (req, res, next) => {
  try {
    const this_user = await UserModel.findById(req.user._id).populate(
      "friends",
      "firstName lastName status email _id avatar"
    );

    res
      .status(200)
      .send({ message: "Friends found successfully", data: this_user.friends });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

module.exports = {
  updateUserInfo,
  getUsers,
  getRequests,
  getFriends,
  getUserInfo,
};
