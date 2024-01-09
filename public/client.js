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
const allUser = [];
form.addEventListener("submit", (e) => {
  e.preventDefault();

  socket.connect();
  socket.auth = { name: userName.value };

  const data = {
    name: userName.value,
    msg: msg.value,
  };
  socket.emit("message", data);
});

msg.addEventListener("keypress", () => {
  socket.emit("typing", userName.value);
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
    userList.innerHTML += `<button id='${user.userId}' class='specific-user'>${user.userName}</button>`;
    allUser.push(user);
  });
});

//emit private message
userList.addEventListener("click", function (e) {
  if (e.target.classList.contains("specific-user")) {
    const data = {
      name: userName.value,
      msg: msg.value,
    };
    socket.emit("private message", {
      data: data,
      to: e.target.id,
    });
  }
});

//accept private message
socket.on("private message", ({ data, from }) => {
  (userName.value = ""), (msg.value = "");
  chat.innerHTML += `Private message => ${data.name} : ${data.msg}</p>`;
  typing.innerHTML = "";
});
