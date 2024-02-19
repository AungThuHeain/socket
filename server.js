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
  maxHttpBufferSize: 2e8,
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

  sessionStore.saveSession(socket.sessionID, {
    tenantID: socket.nsp.name,
    userID: socket.userID,
    userName: socket.username,
    connected: "active",
    status: "waiting",
    sessionID: socket.sessionID,
  });

  //store session on server side and show when admin initiate

  sessionStore.findAllSessions().forEach((session) => {
    // socket.nsp.nam is socket namespace(organization_slug)

    if (
      session.tenantID == socket.nsp.name &&
      "/" + session.userID != socket.nsp.name &&
      session.status == "waiting"
    ) {
      users.push({
        connected: session.connected,
        status: session.status,
        tenantID: socket.nsp.name,
        userID: session.userID,
        userName: session.userName,
      });
    }
  });

  // join the "userID" room
  socket.join(socket.userID);

  //////////////////////emit from server ///////////////////////////////////////////

  //emit session detail to admin and user to store on local storage
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    userName: socket.username,
  });

  //emit user list to admin
  socket.emit("waiting users", users);

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
      time: new Date(),
    };
    //emit to user and admin to append new message on chat window
    tenant.to(to).to(socket.userID).emit("admin to client", message);
    messageStore.saveMessage(message);

    console.log("not change user", users);
    let user = users.filter((user) => {
      return user.userID == to;
    });
    let session_id = user[0].sessionID;
    sessionStore.updateStatus(session_id, "queue");

    console.log("update session", sessionStore.findAllSessions());
  });

  ////////////////emit from user//////////////////////////////////////////////////////////////////////////////
  socket.on("get old message", () => {
    const messages = messageStore.findMessagesForUser(socket.userID);

    //emit to user to show old message on chat widget
    socket.emit("get old message", messages);
  });

  socket.on("user to admin", function (data) {
    const message = {
      user_name: data.name,
      data: data.msg,
      from: socket.userID,
      to: data.to,
      time: new Date(),
    };
    tenant.to(data.to).to(socket.userID).emit("user to admin", message);
    messageStore.saveMessage(message);
  });

  socket.on("waiting user list update", () => {
    users.length = 0;

    sessionStore.findAllSessions().forEach((session) => {
      if (
        session.tenantID == socket.nsp.name &&
        "/" + session.userID != socket.nsp.name &&
        session.status == "waiting"
      ) {
        users.push({
          tenantID: socket.nsp.name,
          userID: session.userID,
          status: session.status,
          userName: session.userName,
          connected: session.connected,
        });
      }
    });
    socket.emit("waiting user list update", users);
  });

  socket.on("queue user list update", () => {
    users.length = 0;

    sessionStore.findAllSessions().forEach((session) => {
      if (
        session.tenantID == socket.nsp.name &&
        "/" + session.userID != socket.nsp.name &&
        session.status == "queue"
      ) {
        users.push({
          tenantID: socket.nsp.name,
          userID: session.userID,
          status: session.status,
          userName: session.userName,
          connected: session.connected,
        });
      }
    });
    socket.emit("queue user list update", users);
  });

  //handle typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    console.log(
      ` '${socket.username}' disconnected from room '${socket.userID}'`
    );

    sessionStore.updateConnectedStatus(socket.sessionID, "inactive");

    users.length = 0;
    sessionStore.findAllSessions().forEach((session) => {
      if (
        session.tenantID == socket.nsp.name &&
        "/" + session.userID != socket.nsp.name
      ) {
        users.push({
          tenantID: socket.nsp.name,
          userID: session.userID,
          status: session.status,
          userName: session.userName,
          connected: session.connected,
        });
      }
    });
    tenant.emit("user list update", users);
  });

  //file upload
  socket.on("upload", (data) => {
    console.log(data);
    tenant.to(data.to).to(socket.userID).emit("upload file", data);

    const message = {
      user_name: data.userName,
      data: data.url,
      from: data.from,
      to: data.to,
      time: new Date(),
    };

    messageStore.saveMessage(message);
  });
});
