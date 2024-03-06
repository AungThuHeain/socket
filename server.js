const express = require("express");
const socket = require("socket.io");
const path = require("path");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
const { InMemorySessionStore } = require("./sessionStore");
const { InMemoryMessageStore } = require("./messageStore");
const messageStore = new InMemoryMessageStore();
const sessionStore = new InMemorySessionStore();

/**create express app */
const app = express();

app.use(express.static(path.join(__dirname, "public")));

/**create express server */
const server = app.listen("4000", () => {
  console.log("server running on port 4000");
});

// app.get("/admin", (res, req) => {
//   req.sendFile(__dirname + "/public/admin/panel.html");
// });
// app.get("/client", (res, req) => {
//   req.sendFile(__dirname + "/public/client/client.html");
// });

/**create socket */
const io = socket(server, {
  transports: ["websocket"],
  maxHttpBufferSize: 20e6, //to increase max upload size for image upload,default upload max size is 1 mb(1e6)
  cors: {
    origins: "*",
  },
});

const tenant = io.of(/^\/\w+$/); //create namespace for multiple organization (io.of('org_one'),io.of('org_two)).In this case we need to accept random namespace so we used regex

//middleware
tenant.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  const userName = socket.handshake.auth.name;
  const sessionStoreID = socket.handshake.auth.sessionStoreID;

  if (sessionStoreID) {
    // find existing session from server
    const server_session = sessionStore.findSession(sessionStoreID);

    if (server_session) {
      socket.sessionID = sessionID;
      socket.userID = server_session.userID;
      socket.username = server_session.userName;
      return next();
    } else {
      if (!socket.handshake.auth.adminId) {
        //if user try to connect the server with local-storage session after server down, it will return error
        return next(new Error("No session on server"));
      }
      console.log("server session", new Date().toLocaleTimeString());
    }
  }

  // create new session
  if (socket.handshake.auth.adminId) {
    socket.sessionID = socket.handshake.auth.adminId;
    socket.userID = socket.handshake.auth.adminId;
    socket.username = "Admin";
  } else if (socket.handshake.auth.userID) {
    socket.userID = socket.handshake.auth.userID;
    socket.sessionID = sessionID;
    socket.username = userName;
  } else {
    console.log("new session", new Date().toLocaleTimeString());
    if (!userName) {
      socket.connect();
      return next(
        new Error("User name required" + new Date().toLocaleTimeString())
      );
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

  console.log("All session users", sessionStore.findAllSessions());

  //save session data on server's storage
  const oldSession = sessionStore.findSession(socket.userID);
  if (oldSession) {
    console.log(socket.userID);
    sessionStore.saveSession(socket.userID, {
      tenantID: socket.nsp.name,
      userID: socket.userID,
      userName: socket.username,
      connected: "active",
      status: oldSession.status,
      sessionID: socket.sessionID,
      agentID: oldSession.agentID,
    });
  } else {
    console.log(socket.userID);
    sessionStore.saveSession(socket.userID, {
      tenantID: socket.nsp.name,
      userID: socket.userID,
      userName: socket.username,
      connected: "active",
      status: "waiting",
      sessionID: socket.sessionID,
      agentID: "",
    });
  }

  //emit session detail  to store on browser's local storage
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    userName: socket.username,
  });

  // user join room by his userID
  socket.join(socket.userID);

  //store session on server side and show when admin initiate

  sessionStore.findAllSessions().forEach((session) => {
    //remove admin user of tenant and filter 'waiting' status users to show admin panel
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
        sessionID: session.sessionID,
        agentID: session.agentID,
      });
    }
  });

  //emit user list to admin
  socket.emit("initial user list", users);

  //get chat history
  socket.on("get message", (id) => {
    const message = messageStore.findMessagesForUser(id);

    messageStore.saveMessage(message);
    socket.emit("chat history", message);
  });

  //send message to user
  socket.on("admin to client", ({ data, to }) => {
    const message = {
      type: "text",
      sender: "admin",
      data: data.msg,
      from: socket.userID,
      to: to,
      time: new Date(),
    };

    //emit to specific user and admin
    tenant.to(to).to(socket.userID).emit("admin to client", message);
    messageStore.saveMessage(message);
  });

  //get chat history to show in user widget
  socket.on("get old message", () => {
    const messages = messageStore.findMessagesForUser(socket.userID);
    socket.emit("get old message", messages);
  });

  socket.on("user to admin", function (data) {
    const message = {
      type: "text",
      sender: "user",
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
          agentID: session.agentID,
        });
      }
    });
    socket.emit("waiting user list update", users);
  });

  socket.on("queue user list update", (agent_id) => {
    users.length = 0;
    sessionStore.findAllSessions().forEach((session) => {
      if (
        session.tenantID == socket.nsp.name &&
        "/" + session.userID != socket.nsp.name &&
        session.status == "queue" &&
        session.agentID == agent_id
      ) {
        users.push({
          tenantID: socket.nsp.name,
          userID: session.userID,
          status: session.status,
          userName: session.userName,
          connected: session.connected,
          agentID: session.agentID,
        });
      }
    });
    socket.emit("queue user list update", users);
  });

  //handle typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  // connection disconnected
  socket.on("disconnect", async (reason, details) => {
    console.log(
      ` '${socket.username}' disconnected from room '${socket.userID}'`
    );

    sessionStore.updateConnectedStatus(socket.userID, "inactive");

    const error = {
      reason: reason,
      details: details,
    };
    tenant.to(socket.userID).emit("disconnect event", error);
  });

  //image upload
  socket.on("upload", (data) => {
    tenant.to(data.to).to(socket.userID).emit("upload file", data);

    const message = {
      type: "image",
      user_name: data.userName,
      data: data.url,
      from: data.from,
      to: data.to,
      time: new Date(),
    };

    messageStore.saveMessage(message);
  });

  socket.on("take message", (takeChatData) => {
    const message = {
      type: "message",
      to: takeChatData.room_id,
      from: socket.userID,
      time: new Date(),
    };
    messageStore.saveMessage(message);
    tenant.to(takeChatData.room_id).to(socket.userID).emit("take message");

    let update_data = {
      agent_id: takeChatData.user_id,
      session_status: "queue",
    };
    sessionStore.updateStatus(takeChatData.room_id, update_data);
  });

  socket.on("transfer agent", (transferChatData) => {
    let update_data = {
      agent_id: transferChatData.user_id,
      session_status: "queue",
    };

    sessionStore.updateStatus(transferChatData.room_id, update_data);
  });

  socket.on("end chat", () => {
    console.log("hit end chat button", socket.userID);

    sessionStore.deleteSession(socket.userID);
  });
});
