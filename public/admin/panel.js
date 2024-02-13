const sessionID = localStorage.getItem("sessionID");
const userNameSession = localStorage.getItem("userNameSession");
const userList = document.querySelector(".user-list");
const msg = document.querySelector(".msg");
const send = document.querySelector(".send");
const sendImage = document.querySelector(".sendImage");
const message_box = document.querySelector(".message_box");
const user_name = document.querySelector("#user_name");
const pre_define = document.querySelector("#predefine_admin_id");
let predefine_admin_id = "12345";
//let predefine_admin_id = pre_define.textContent;

//connect to socket server
// const socket = io("https://socket-ie16.onrender.com/" + predefine_admin_id, {
//   transports: ["websocket"],
//   autoConnect: true,
// });

const socket = io("http://localhost:4000/" + predefine_admin_id, {
  autoConnect: true,
});

if (sessionID) {
  socket.auth = {
    sessionID: sessionID,
    name: userNameSession,
    adminId: predefine_admin_id,
  };
} else {
  socket.auth = { adminId: predefine_admin_id };
}

////////////////////////////////////emit from server //////////////////////////////////////////////
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

//show user list
socket.on("users", (users) => {
  users.forEach((user) => {
    userList.innerHTML += `<div
              class="d-flex justify-content-between mt-2 mx-2 border-2  rounded ${user.connected}"
            >
              <h6 id="${user.userID}" class="fw-bold specific_user ">${user.userName}</h6>

            </div>`;
  });
});

//show update user list
socket.on("user list update", (users) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    userList.innerHTML += `<div
    class="d-flex justify-content-between mt-2 mx-2 border-2  rounded ${user.connected}"
  >
    <h6 id="${user.userID}" class="fw-bold specific_user ">${user.userName}</h6>

  </div>`;
  });
});

/////////////////////////emit to server////////////////////////////////////////////////
userList.addEventListener("click", (e) => {
  if (e.target.classList.contains("specific_user")) {
    send.setAttribute("id", e.target.id);
    sendImage.setAttribute("id", e.target.id);
    message_box.setAttribute("id", "id" + e.target.id);
    user_name.innerHTML = e.target.textContent;
  }
  socket.emit("get message", e.target.id);
});

send.addEventListener("click", (e) => {
  const data = {
    msg: msg.value,
  };
  socket.emit("admin to client", {
    data: data,
    to: e.target.id,
  });
  msg.value = "";
});

///////////////////////////////////////////////emit from server//////////////////////////////////////////////////
socket.on("chat history", (messages) => {
  message_box.innerHTML = "";
  messages.forEach((message) => {
    message_box.innerHTML += `
     
    <div class="p-6 max-w-sm mx-2  rounded-xl shadow-lg my-2 items-start space-x-5 border-2">
    <div class="flex">
    <h6 class="text-slate-500 font-bold">${
      message.user_name == null ? "You" : message.user_name
    }</h6>
    </div>
    
    <p class="text-slate-500">
          ${message.data}
    </p>
   </div>`;
  });
});

//get self send message to append on chat window
socket.on("admin to client", (message) => {
  message_box.innerHTML += `
     
  <div class="p-6 max-w-sm mx-2  rounded-xl shadow-lg my-2 items-start space-x-5 border-2">
  <div class="flex">
  <h6 class="text-slate-500 font-bold">${
    message.user_name == null ? "You" : message.user_name
  }</h6>
  </div>
  
  <p class="text-slate-500">
        ${message.data}
  </p>
 </div>`;
});

////////////////////////////

//accept private message
socket.on("user to admin", (message) => {
  socket.emit("user list update");
  const panel_id = "#id" + message.from;
  const panel = document.querySelector(panel_id);

  if (panel) {
    panel.innerHTML += `
     
    <div class="p-6 max-w-sm mx-2 rounded-xl shadow-lg my-2 items-start space-x-5 border-2">
    <div class="flex">
    <h6 class="text-slate-500 font-bold">${
      message.user_name == null ? "You" : message.user_name
    }</h6>
    </div>
    
    <p class="text-slate-500">
          ${message.data}
    </p>
   </div>`;
  }
});

socket.on("emit image", (data) => {
  alert("emit received by admin");
  socket.emit("user list update");
  const panel_id = "#id" + data.panel;
  const panel = document.querySelector(panel_id);

  const blob = new Blob([data.file], { type: data.mime });
  const imageUrl = URL.createObjectURL(blob);
  console.log(imageUrl);
  if (panel) {
    panel.innerHTML += `
     
    <div class="p-6 max-w-sm mx-2 rounded-xl shadow-lg my-2 items-start space-x-5 border-2">
    <div class="flex">
    <h6 class="text-slate-500 font-bold">${
      data.userName == null ? "You" : data.userName
    }</h6>
    </div>
    
    <div>
        <img src=" ${imageUrl}">
    </div>
   </div>`;
  } else {
    console.log("no panel found");
  }
});

function upload(files, id) {
  const file = files[0];
  const mime = file.type;
  const name = file.name;
  const from = socket.userID;
  const userName = "Admin";
  const panel = id;
  const to = id;
  const data = { file, mime, name, to, from, userName, panel };

  socket.emit("upload", data, (status) => {
    console.log(status);
  });
}
