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

const tenant = io.of(/^\/\w+$/);

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

  // create new session

  if (socket.handshake.auth.adminId) {
    socket.sessionID = randomId();
    socket.userID = socket.handshake.auth.adminId;
    socket.username = "Admin";
  } else {
    if (!userName) {
      return next(new Error("Invalid username"));
    }
    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = userName;
  }

  next();
});

tenant.on("connection", (socket) => {
  const users = [];
  console.log(
    `User '${socket.username}-${socket.userID}' connected on organization '${socket.nsp.name}' server`
  );

  //save session data on server local storage

  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    userName: socket.username,
  });

  //emit session detail to store on local storage
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    userName: socket.username,
  });

  //store session on server side
  sessionStore.findAllSessions().forEach((session) => {
    users.push({
      userID: session.userID,
      userName: session.userName,
    });
  });

  const nameSpace = socket.nsp;

  // join the "userID" room
  socket.join(socket.userID);

  socket.emit("users", users);

  socket.emit("chat list");
  socket.on("message", function (data) {
    //nameSpace.emit("chat", data);
    const message = {
      data: data.msg,
      from: socket.userID,
      to: "12345",
    };
    tenant.to("12345").to(socket.userID).emit("private message", message);

    messageStore.saveMessage(message);
  });

  //handle typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  //handle private message
  socket.on("private message", ({ data, to }) => {
    console.log("admin rec id", to);
    const message = {
      data: data.msg,
      from: socket.userID,
      to: to,
    };

    tenant.to(to).to(socket.userID).emit("private message", message);

    messageStore.saveMessage(message);

    console.log(
      "store message for private chat",
      messageStore.findMessagesForUser(socket.userID)
    );
  });

  socket.on("admin to client", ({ data, to }) => {
    const message = {
      data: data.msg,
      from: socket.userID,
      to: to,
    };
    tenant.to(to).to(socket.userID).emit("private message", message);

    messageStore.saveMessage(message);

    const old_mes = messageStore.findMessagesForUser(to);
    socket.emit("chat message", old_mes);
    // console.log(
    //   "store message for private chat",
    //   messageStore.findMessagesForUser(socket.userID)
    // );
  });

  socket.on("get message", (id) => {
    // console.log(id);
    const message = messageStore.findMessagesForUser(id);
    socket.emit("chat message", message);
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    console.log(
      ` '${socket.username}' disconnected from room '${socket.userID}'`
    );
  });
});
