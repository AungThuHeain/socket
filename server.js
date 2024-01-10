const express = require("express");
const socket = require("socket.io");
var path = require("path");

const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();
const { InMemoryMessageStore } = require("./messageStore");
const messageStore = new InMemoryMessageStore();
/**create express app */
const app = express();

app.use(express.static(path.join(__dirname, "public")));
/**create express server */
const server = app.listen("4000", () => {
  console.log("server run on port 4000");
});

app.get("/:dynamic", (res, req) => {
  req.sendFile(__dirname + "/public/client.html");
});

/**create socket */
const io = socket(server, {
  cors: {
    origins: "*",
  },
});

const tenant = io.of(/^\/dynamic-\d+$/);

//middleware
tenant.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  const userName = socket.handshake.auth.name;

  if (sessionID) {
    // find existing session
    const session = sessionStore.findSession(sessionID);

    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.userName;
      return next();
    }
  }

  if (!userName) {
    return next(new Error("Invalid username"));
  }

  // create new session

  socket.sessionID = randomId();
  socket.userID = randomId();
  socket.username = userName;

  next();
});

tenant.on("connection", (socket) => {
  console.log(
    `User '${socket.username}' connected on organization '${socket.nsp.name}' server`
  );

  //save session data on server local storage

  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    userName: socket.username,
  });

  const nameSpace = socket.nsp;

  // join the "userID" room
  socket.join(socket.userID);

  const users = [];

  const messagesPerUser = new Map();

  console.log(
    "store message for private chat",
    messageStore.findMessagesForUser(socket.userID)
  );

  messageStore.findMessagesForUser(socket.userID).forEach((message) => {
    const { from, to } = message;
    const otherUser = socket.userID === from ? to : from;
    if (messagesPerUser.has(otherUser)) {
      messagesPerUser.get(otherUser).push(message);
    } else {
      messagesPerUser.set(otherUser, [message]);
    }
  });

  sessionStore.findAllSessions().forEach((session) => {
    users.push({
      userID: session.userID,
      userName: session.userName,
    });
  });

  socket.emit("users", users);

  //emit session detail

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    userName: socket.username,
  });

  socket.on("message", function (data) {
    nameSpace.emit("chat", data);
  });

  //handle typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  //handle private message
  socket.on("private message", ({ data, to }) => {
    const message = {
      data: data.msg,
      from: socket.userID,
      to: to,
    };

    tenant.to(to).to(socket.userID).emit("private message", message);

    messageStore.saveMessage(message);
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    console.log(
      ` '${socket.username}' disconnected from room '${socket.userID}'`
    );
  });
});
