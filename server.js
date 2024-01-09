const express = require("express");
const socket = require("socket.io");
var path = require("path");
const { log } = require("console");

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
  const userName = socket.handshake.auth.name;

  if (!userName) {
    return next(new Error("Invalid username"));
  }
  socket.username = userName;
  next();
});

tenant.on("connection", async (socket) => {
  console.log(
    `User '${socket.username}' connected on organization '${socket.nsp.name}' server`
  );

  const nameSpace = socket.nsp;

  const users = [];
  for (let [id, socket] of nameSpace.sockets) {
    users.push({
      userId: id,
      userName: socket.username,
    });
  }

  socket.emit("users", users);

  socket.on("message", function (data) {
    // console.log("A message was received from a client: ", data);
    nameSpace.emit("chat", data);
  });

  //handle typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  //handle private message
  socket.on("private message", ({ data, to }) => {
    socket.to(to).emit("private message", {
      data: data,
      from: socket.id,
    });
  });
});
