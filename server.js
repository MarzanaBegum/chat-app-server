const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();
const app = require("./app");
const { UserModel } = require("./models/userModel");
const { FriendRequestModel } = require("./models/friendRequest");
const path = require("path");
const OneToOneMessageModel = require("./models/oneToOneMessage");

process.on("uncaughtException", (err) => {
  console.log(err, "Uncaught exception.Shutting down...");
  process.exit(1);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

//DB connection
mongoose
  .connect(`${process.env.MONGODB_CONNECTION_URL}`)
  .then(() => console.log("DB connection is successful"))
  .catch((err) => console.log(err));

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

io.on("connection", async (socket) => {
  // console.log(socket, "socket....");
  const user_id = socket.handshake.query.user_id;
  const socket_id = socket.id;

  console.log(`Socket connected ${socket_id}`, user_id);

  if (Boolean(user_id)) {
    const user = await UserModel.findByIdAndUpdate(user_id, {
      socket_id,
      status: "Online",
    });
  }

  //friend request
  socket.on("friend_request", async (data) => {
    const to = await UserModel.findById(data.to).select("socket_id");
    const from = await UserModel.findById(data.from).select("socket_id");

    await FriendRequestModel.create({ sender: data.from, recipient: data.to });

    io.to(to.socket_id).emit("new_friend_request", {
      message: "New friend request received",
    });

    io.to(from.socket_id).emit("request_sent", {
      message: "Friend request sent successfully",
    });
  });

  socket.on("get_direct_conversation", async ({ user_id }, callback) => {
    const existing_conversation = await OneToOneMessageModel.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName email status avatar _id");

    callback(existing_conversation);
  });

  //start conversation
  socket.on("start_conversation", async (data) => {
    const existing_conversation = await OneToOneMessageModel.find({
      participants: { $size: 2, $all: [data.to, data.from] },
    }).populate("participants", "firstName lastName email status avatar _id");

    if (existing_conversation.length === 0) {
      let new_chat = await OneToOneMessageModel.create({
        participants: [data.to, data.from],
      });
      new_chat = await OneToOneMessageModel.findById(new_chat._id).populate(
        "participants",
        "firstName lastName email status avatar _id"
      );
      socket.emit("start_chat", new_chat);
    } else {
      socket.emit("start_chat", existing_conversation[0]);
    }
  });

  //accept request
  socket.on("accept_request", async (data) => {
    const request_doc = await FriendRequestModel.findById(data.request_id);

    const sender = await UserModel.findById(request_doc.sender);
    const receiver = await UserModel.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequestModel.findByIdAndDelete(data.request_id);

    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend request accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend request accepted",
    });
  });

  socket.on("get_messages", async (data, callback) => {
    const all_messages = await OneToOneMessageModel.findById(
      data.conversation_id
    ).select("messages");

    const unread_messages_id = [];
    all_messages.messages.forEach((message, index) => {
      if (
        message.message_status !== "read" &&
        message.from.toString() === data.to.toString()
      ) {
        all_messages.messages[index].message_status = "read";
        unread_messages_id.push(message._id);
      }
    });

    await OneToOneMessageModel.updateMany(
      {
        _id: data.conversation_id,
        "messages._id": { $in: unread_messages_id },
      },
      { $set: { "messages.$.message_status": "read" } },
      { new: true }
    );

    callback(all_messages.messages);
  });

  //text message
  socket.on("text_message", async (data) => {
    const { to, from, conversation_id, type, text } = data;
    const to_user = await UserModel.findById(to);
    const from_user = await UserModel.findById(from);
    const new_message = {
      to,
      from,
      type,
      text,
      message_status: to_user?.status === "Online" ? "delivered" : "sent",
      date: Date.now(),
    };
    const chat = await OneToOneMessageModel.findById(conversation_id);
    chat.messages.push(new_message);
    await chat.save();

    const message_data = {
      _id: chat.messages[chat.messages.length - 1]._id,
      from,
      to,
      type,
      text,
      message_status: chat.messages[chat.messages.length - 1].message_status,
      date: chat.messages[chat.messages.length - 1].date,
    };
    io.to(to_user.socket_id).emit("new_message", message_data);

    io.to(from_user.socket_id).emit("new_message", message_data);
  });

  //file message
  socket.on("file_message", async (data) => {
    console.log("Received message", data);

    const fileExtension = path.extname(data.file.name);
    const fileName = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;
    console.log(fileName);
  });

  socket.on("end", async (data) => {
    if (data.user_id) {
      await UserModel.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }
    console.log("Closing connection");
    socket.disconnect(0);
  });
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandle Rejection.Shutting down...", err);
  server.close(() => {
    process.exit(1);
  });
});
