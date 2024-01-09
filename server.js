const express = require("express");
const socket = require("socket.io");
var path = require("path");

/**create express app */
const app = express();

app.use(express.static(path.join(__dirname, "public")));
/**create express server */
const server = app.listen("3000", () => {
  console.log("server run on port 3000");
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

const dynamicNsp = io.of(/^\/dynamic-\d+$/);

dynamicNsp.on("connection", (socket) => {
  console.log("User connected on dynamic namespace " + socket.nsp.name);

  const nameSpace = socket.nsp;

  socket.on("message", function (data) {
    console.log("A message was received from a client: ", data);

    nameSpace.emit("chat", data);
  });

  socket.on("typing", (name) => {
    console.log("tyoing");
    socket.broadcast.emit("typing", name);
  });
});
