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

let predefine_admin_id = 12345;

//check first session
if (sessionID) {
  socket.connect();
  socket.emit("get old message");
  userName.style.display = "none";
  socket.auth = { sessionID: sessionID, name: userNameSession };
}

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

//catch form submit event
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (sessionID) {
    const data = {
      name: userNameSession,
      msg: msg.value,
      to: predefine_admin_id,
    };
    socket.emit("user to admin", data);
    (userName.value = ""), (msg.value = "");
    userName.style.display = "none";
  } else {
    socket.connect();
    socket.auth = { name: userName.value };
    const data = {
      name: userName.value,
      msg: msg.value,
      to: predefine_admin_id,
    };
    socket.emit("user to admin", data);
    (userName.value = ""), (msg.value = "");
    userName.style.display = "none";
  }
});

// msg.addEventListener("keypress", () => {
//   if (sessionID) {
//     socket.emit("typing", userNameSession);
//   } else {
//     socket.emit("typing", userName.value);
//   }
// });

//get reply from server
// socket.on("chat", (data) => {
//   (userName.value = ""), (msg.value = "");
//   chat.innerHTML += `<p>${data.name} : ${data.msg}</p>`;
//   typing.innerHTML = "";
// });

//get typing emit from server
// socket.on("typing", (name) => {
//   typing.innerHTML = `<em>${name} is typing</em>`;
//   setTimeout(() => {
//     typing.innerHTML = "";
//   }, 3000);
// });

//error handle
// socket.on("connect_error", (err) => {
//   console.log(err.message); // prints the message associated with the error
// });

//show old message when old user reconnect
socket.on("get old message", (messages) => {
  messages.forEach((message) => {
    chat.innerHTML += `<p>${message.data}</p>`;
  });
});
//accept private message
socket.on("user to admin", (message) => {
  chat.innerHTML += `<p>${message.data}</p>`;
  typing.innerHTML = "";
});

//accept private message
socket.on("admin to client", (message) => {
  chat.innerHTML += `<p>${message.data}</p>`;
  typing.innerHTML = "";
});
