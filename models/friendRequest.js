const Joi = require("joi");
const mongoose = require("mongoose");

const friendRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});
const FriendRequestModel = mongoose.model("FriendRequest", friendRequestSchema);

const friendRequestValidation = async (data) => {
  const schema = Joi.object({
    sender: Joi.string().required(),
    recipient: Joi.string().required(),
    createdAt: Joi.date(),
  });
  return await schema.validateAsync(data);
};

module.exports = { FriendRequestModel, friendRequestValidation };
