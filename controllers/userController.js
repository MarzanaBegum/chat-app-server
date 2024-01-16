const { updateUserInfoValidation, UserModel } = require("../models/userModel");

const updateUserInfo = async (req, res, next) => {
  const { user } = req;
  const { value, error } = await updateUserInfoValidation(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  const updated_user = await UserModel.findByIdAndUpdate(
    { _id: user._id },
    req.body
  );

  res.status(200).send({ message: "User updated successfully", updated_user });
};

module.exports = updateUserInfo;
