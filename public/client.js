//to close and open form
function openForm() {
  document.getElementById("myForm").style.display = "block";
}

function closeForm() {
  document.getElementById("myForm").style.display = "none";
}

//connect to socket server
const socket = io("wss://websocket.onrender.com", {
  transports: ["websocket"],
});

//get dom
const form = document.querySelector("form");
const userName = document.querySelector("#name");
const msg = document.querySelector("#msg");
const chat = document.querySelector(".chat-text");
const typing = document.querySelector(".typing");

form.addEventListener("submit", (e) => {
  e.preventDefault();
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
