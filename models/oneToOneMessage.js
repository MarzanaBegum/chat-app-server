const mongoose = require("mongoose");

const oneToOneMessageSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  messages: [
    {
      to: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      from: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      type: {
        type: String,
        enum: ["Text", "Media", "Document", "Link"],
      },
      text: {
        type: String,
      },
      message_status: {
        type: String,
        default: "sent",
      },
      file: {
        type: String,
      },
      date: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
});

const OneToOneMessageModel = mongoose.model(
  "oneToOneMessage",
  oneToOneMessageSchema
);

module.exports = OneToOneMessageModel;
