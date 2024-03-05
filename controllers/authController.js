const {
  loginValidation,
  UserModel,
  signupValidation,
} = require("../models/userModel");
const { generateToken } = require("../utils/Auth");
const CreateError = require("../utils/CreateError");
const otpGenerator = require("otp-generator");
const CryptoJS = require("crypto-js");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../services/mailer");

const register = async (req, res, next) => {
  try {
    const { value, error } = await signupValidation(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const existing_user = await UserModel.findOne({ email: req.body.email });

    if (existing_user && existing_user.verified) {
      throw CreateError("Email is already in use.Please login", 400);
    } else if (existing_user) {
      throw CreateError(
        "An Email sent to your account please check your email",
        400
      );
    } else {
      const new_user = await UserModel.create(req.body);

      //generate otp and send email
      req.userId = new_user._id;
      next();
    }
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

//send opt
const sendOtp = async (req, res, next) => {
  try {
    const user_id = req.userId;
    const new_otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    const otp_expiry_time = Date.now() + 10 * 60 * 1000; //10 minutes after sent otp

    const user = await UserModel.findByIdAndUpdate(
      user_id,
      { otp_expiry_time },
      { new: true, validateModifiedOnly: true }
    );
    user.otp = new_otp.toString();
    await user.save({ new: true, validateModifiedOnly: true });
    console.log("otp", new_otp.toString());
    //send mail
    // sendEmail({
    //   from: `${process.env.SENDER_EMAIL}`,
    //   to: user.email,
    //   subject: "Verification OTP",
    //   html: "",
    //   attachments: [],
    // });

    res.status(200).send({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

//verify otp
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await UserModel.findOne({
      email,
      otp_expiry_time: { $gt: Date.now() },
    });
    if (!user) throw CreateError("Email is invalid or OTP is expired");

    const isValidOtp = await user.compareOtp(otp, user.otp);
    if (!isValidOtp) throw CreateError("OTP is not valid", 400);

    user.verified = true;
    user.otp = undefined;
    await user.save({ new: true, validateModifiedOnly: true });

    const token = generateToken(user._id);
    res.status(200).send({
      message: "OTP is verified successfully",
      token: token,
      userId: user._id,
    });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

const login = async (req, res, next) => {
  try {
    const { value, error } = await loginValidation(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) {
      throw CreateError("Invalid credentials", 401);
    }
    const isPasswordValid = await user.comparePassword(
      req.body.password,
      user.password
    );
    if (!isPasswordValid) throw CreateError("Invalid credentials", 401);

    const token = generateToken(user._id);
    res
      .status(200)
      .send({ token, userId: user._id, message: "Logged in successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).send({ message: error.message });
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user)
    throw CreateError("There is no user with given email address", 404);

  try {
    const resetToken = await user.createResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${process.env.CLIENT_URL}/auth/new-password?token=${resetToken}`;
    //send reset password email
    // mailService.sendEmail({
    //   from: "shreyanshshah242@gmail.com",
    //   to: user.email,
    //   subject: "Reset Password",
    //   html: resetPassword(user.firstName, resetURL),
    //   attachments: [],
    // });
    console.log(resetPasswordUrl);
    res.status(200).send({ message: "An email has been sent to your account" });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).send({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password, token } = req.body;

    const user = await UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) throw CreateError("Token is invalid or expired");

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save();

    //send email
    // sendEmail({
    //   from: "shreyanshshah242@gmail.com",
    //   to: user.email,
    //   subject: "Reset Password",
    //   html: resetPassword(user.firstName, resetURL),
    //   attachments: [],
    // });

    const new_token = generateToken(user._id);
    res
      .status(200)
      .send({ new_token, message: "Password Reseted Successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      res.status(401).send({ message: "You are not logged in.Please log in" });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const this_user = await UserModel.findById(decoded.userId);
    if (!this_user)
      throw CreateError(
        "The user belonging to this token does no longer exists.",
        401
      );

    if (this_user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        message: "User recently changed password! Please log in again.",
      });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = this_user;
    next();
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
module.exports = {
  login,
  register,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  protect,
};
