const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendSGMail = async ({ to, sender, subject, html, attachments, text }) => {
  try {
    const from = sender || `${process.env.SENDER_EMAIL}`;
    const msg = {
      from,
      to,
      subject,
      html,
      attachments,
      //   text
    };
    await sgMail.send(msg);
  } catch (error) {
    console.log("error...", error);
  }
};

exports.sendEmail = async (args) => {
  if (process.env.NODE_ENV !== "development") {
    return Promise.resolve();
  } else {
    return sendSGMail(args);
  }
};
