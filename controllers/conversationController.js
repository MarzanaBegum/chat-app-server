const OneToOneMessageModel = require("../models/oneToOneMessage");

const getAllConversations = async (req, res) => {
  try {
    const this_user = req.user;
    const existing_conversations = await OneToOneMessageModel.find({
      participants: { $all: [this_user._id] },
    }).populate("participants", "_id firstName lastName email about status avatar");
    
    res.status(200).send(existing_conversations);
  } catch (error) {
    res.status(error.status || 500).send({ message: error.message });
  }
};

module.exports = getAllConversations;
