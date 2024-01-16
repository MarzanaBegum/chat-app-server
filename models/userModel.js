const Joi = require("joi");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const passwordComplexity = require("joi-password-complexity");
const CryptoJS = require("crypto-js");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    about: { type: String },
    avatar: {
      type: String,
    },
    otp: { type: String },
    otp_expiry_time: { type: Date },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    status: { type: String, enum: ["Online,Offline"] },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  //hash password
  this.password = await bcrypt.hash(this.password.toString(), 12);
  next();
});

//compare password
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("otp") || !this.otp) return next();
  //hash otp
  this.otp = await bcrypt.hash(this.otp.toString(), 12);
  next();
});

// compare OTP
userSchema.methods.compareOtp = async function (candidateOtp, userOtp) {
  return await bcrypt.compare(candidateOtp, userOtp);
};

//reset password token
userSchema.methods.createResetPasswordToken = async function () {
  //Encrypt
  const resetToken = CryptoJS.AES.encrypt(
    "sha256",
    process.env.CRYPTO_SALT
  ).toString();

  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }

  // FALSE MEANS NOT CHANGED
  return false;
};

const UserModel = mongoose.model("User", userSchema);

const signupValidation = async (data) => {
  const schema = Joi.object({
    firstName: Joi.string().required().label("First Name"),
    lastName: Joi.string().required().label("Last Name"),
    email: Joi.string().email().required().label("Email"),
    about: Joi.string().label("About"),
    avatar: Joi.string(),
    password: passwordComplexity()
      .label("Password")
      .required()
      .error(
        new Error(
          "Your password must be at least 8 characters long, contain a mixture of number,symbol,uppercase and lowercase letters."
        )
      ),
    verified: Joi.boolean(),
    status: Joi.string().valid("Online", "Offline"),
    otp: Joi.string(),
    passwordResetToken: Joi.string(),
    passwordChangedAt: Joi.date(),
    passwordResetExpires: Joi.date(),
    otp_expiry_time: Joi.date(),
  });
  return await schema.validateAsync(data);
};

const loginValidation = async (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email"),
    password: passwordComplexity()
      .label("Password")
      .required()
      .error(
        new Error(
          "Your password must be at least 8 characters long, contain a mixture of number,symbol,uppercase and lowercase letters."
        )
      ),
  });
  return await schema.validateAsync(data);
};

const updateUserInfoValidation = async (data) => {
  const schema = Joi.object({
    firstName: Joi.string().label("First Name"),
    lastName: Joi.string().label("Last Name"),
    about: Joi.string().label("About"),
    avatar: Joi.string(),
  });
  return await schema.validateAsync(data);
};

module.exports = {
  UserModel,
  signupValidation,
  loginValidation,
  updateUserInfoValidation,
};
