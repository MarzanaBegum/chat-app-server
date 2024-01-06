const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config();
const app = require("./app");

process.on("uncaughtException", (err) => {
  console.log(err, "Uncaught exception.Shutting down...");
  process.exit(1);
});

const server = http.createServer(app);

//DB connection
mongoose
  .connect(`${process.env.MONGODB_CONNECTION_URL}`)
  .then(() => console.log("DB connection is successful"))
  .catch((err) => console.log(err));

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandle Rejection.Shutting down...", err);
  server.close(() => {
    process.exit(1);
  });
});
