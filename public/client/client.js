//to close and open form
function openForm() {
  document.getElementById("myForm").style.display = "block";
}

function closeForm() {
  document.getElementById("myForm").style.display = "none";
}

//get dom
const form = document.querySelector("form");
const userName = document.querySelector("#name");
const msg = document.querySelector("#msg");
const chat = document.querySelector(".chat-text");
const typing = document.querySelector(".typing");
const userList = document.querySelector(".user-list");
const sessionID = localStorage.getItem("sessionID");
const userNameSession = localStorage.getItem("userNameSession");

//check first session
if (sessionID) {
  socket.connect();
  userName.style.display = "none";
  socket.auth = { sessionID: sessionID, name: userNameSession };
}

//catch form submit event
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (sessionID) {
    const data = {
      name: userNameSession,
      msg: msg.value,
    };
    socket.emit("message", data);
  } else {
    socket.connect();
    socket.auth = { name: userName.value };
    const data = {
      name: userName.value,
      msg: msg.value,
    };
    socket.emit("message", data);
  }
});

msg.addEventListener("keypress", () => {
  if (sessionID) {
    socket.emit("typing", userNameSession);
  } else {
    socket.emit("typing", userName.value);
  }
});

//get reply from server
socket.on("chat", (data) => {
  (userName.value = ""), (msg.value = "");
  chat.innerHTML += `<p>${data.name} : ${data.msg}</p>`;
  typing.innerHTML = "";
});

//get typing emit from server
socket.on("typing", (name) => {
  typing.innerHTML = `<em>${name} is typing</em>`;
  setTimeout(() => {
    typing.innerHTML = "";
  }, 3000);
});

//error handle
socket.on("connect_error", (err) => {
  console.log(err.message); // prints the message associated with the error
});

//show user list
socket.on("users", (users) => {
  users.forEach((user) => {
    userList.innerHTML += `<button id='${user.userID}' class='specific-user'>${user.userName}</button>`;
  });
});

//handle session data
socket.on("session", ({ sessionID, userID, userName }) => {
  // attach the session ID to the next reconnection attempts
  //
  socket.auth = { sessionID: sessionID };

  // store it in the localStorage
  localStorage.setItem("sessionID", sessionID);
  localStorage.setItem("userNameSession", userName);
  // save the ID of the user
  socket.userID = userID;
});

//emit private message
userList.addEventListener("click", function (e) {
  if (e.target.classList.contains("specific-user")) {
    const data = {
      msg: msg.value,
    };
    socket.emit("private message", {
      data: data,
      to: e.target.id,
    });
  }
});

//accept private message
socket.on("private message", (message) => {
  (userName.value = ""), (msg.value = "");
  chat.innerHTML += `${message.data}</p>`;
  typing.innerHTML = "";
});

//accept private message
socket.on("admin to client", (message) => {
  (userName.value = ""), (msg.value = "");
  chat.innerHTML += `Private message from ${message.from} => ${message.data}</p>`;
  typing.innerHTML = "";
});
