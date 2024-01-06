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

app.get("/", (res, req) => {
  req.sendFile(__dirname + "/public/index.html");
});

/**create socket */
const io = socket(server, {
  cors: {
    origin: ["https://socket-ie16.onrender.com/", "http://127.0.0.1:5500"],
  },
});
io.on("connection", (socket) => {
  console.log("connected to socket server with id : " + socket.id);

  //show incoming to all user
  socket.on("message", (data) => {
    io.sockets.emit("chat", data);
  });

  //show typing
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });
});
