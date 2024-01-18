const express = require("express");
const socket = require("socket.io");
var path = require("path");

const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();
const { InMemoryMessageStore } = require("./messageStore");
const { emit } = require("process");
const messageStore = new InMemoryMessageStore();
/**create express app */
const app = express();

app.use(express.static(path.join(__dirname, "public")));
/**create express server */
const server = app.listen("4000", () => {
  console.log("server run on port 4000");
});

// app.get("/admin", (res, req) => {
//   req.sendFile(__dirname + "/public/admin/panel.html");
// });
// app.get("/client", (res, req) => {
//   req.sendFile(__dirname + "/public/client/client.html");
// });

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
    socket.sessionID = socket.handshake.auth.adminId;
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

  sessionStore.saveSession(socket.userID, {
    tenantID: socket.nsp.name,
    userID: socket.userID,
    userName: socket.username,
  });

  //store session on server side
  //console.log(sessionStore.findSession(socket.nsp.name));
  console.log(sessionStore.findAllSessions());

  sessionStore.findAllSessions().forEach((session) => {
    if (session.tenantID == "/" + socket.nsp.name) {
      users.push({
        tenantID: socket.nsp.name,
        userID: session.userID,
        userName: session.userName,
      });
    }
  });

  //const nameSpace = socket.nsp;

  // join the "userID" room
  socket.join(socket.userID);

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    console.log(
      ` '${socket.username}' disconnected from room '${socket.userID}'`
    );
  });

  //////////////////////emit from server ///////////////////////////////////////////

  //emit session detail to admin and user to store on local storage
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    userName: socket.username,
  });

  //emit user list to admin
  socket.emit("users", users);

  /////////////////////emit from admin///////////////////////////////////////////////////////////

  //init chat history when click on user name
  socket.on("get message", (id) => {
    const message = messageStore.findMessagesForUser(id);
    //emit to admin to show chat history
    socket.emit("chat history", message);
  });

  //send message to specific user from admin
  socket.on("admin to client", ({ data, to }) => {
    const message = {
      data: data.msg,
      from: socket.userID,
      to: to,
    };
    //emit to user and admin to append new message on chat window
    tenant.to(to).to(socket.userID).emit("admin to client", message);
    messageStore.saveMessage(message);
  });

  ////////////////emit from user//////////////////////////////////////////////////////////////////////////////
  socket.on("get old message", () => {
    const messages = messageStore.findMessagesForUser(socket.userID);
    //emit to user to show old message on chat widget
    socket.emit("get old message", messages);
  });

  socket.on("user to admin", function (data) {
    const message = {
      data: data.msg,
      from: socket.userID,
      to: data.to,
    };
    tenant.to(data.to).to(socket.userID).emit("user to admin", message);

    messageStore.saveMessage(message);
  });

  socket.on("user list update", () => {
    const update_users = [];
    sessionStore.findAllSessions().forEach((session) => {
      update_users.push({
        userID: session.userID,
        userName: session.userName,
      });
    });
    socket.emit("user list update", update_users);
  });

  //handle typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });
});
