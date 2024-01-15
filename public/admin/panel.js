const sessionID = localStorage.getItem("sessionID");
const userNameSession = localStorage.getItem("userNameSession");
const userList = document.querySelector(".user-list");
const msg = document.querySelector(".msg");
const send = document.querySelector(".send");
const message_box = document.querySelector(".message_box");
const user_name = document.querySelector("#user_name");
let predefine_admin_id = 12345;

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
  console.log(users);
  users.forEach((user) => {
    userList.innerHTML += `<div id="${user.userID}"
              class="d-flex justify-content-between mt-2 p-2 bg-secondary rounded specific_user"
            >
              <h6 class="fw-bold">${user.userName}</h6>
             
            </div>`;
  });
});

//show update user list
socket.on("user list update", (update_users) => {
  userList.innerHTML = "";
  update_users.forEach((user) => {
    userList.innerHTML += `<div id="${user.userID}"
              class="d-flex justify-content-between mt-2 p-2 bg-secondary rounded specific_user"
            >
              <h6 class="fw-bold">${user.userName}</h6>
             
            </div>`;
  });
});

/////////////////////////emit to server////////////////////////////////////////////////
userList.addEventListener("click", (e) => {
  if (e.target.classList.contains("specific_user")) {
    send.setAttribute("id", e.target.id);
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

     <div class="col-6 m-2 rounded bg-info p-3 text-left float-start">
      <p class="text-break">
            ${message.data}
      </p>
      <h6 class="text-muted float-end">1:6</h6>
     </div>`;
  });
});

//get self send message to append on chat window
socket.on("admin to client", (message) => {
  message_box.innerHTML += `

  <div class="col-6 m-2 rounded bg-info p-3 text-left float-start">
   <p class="text-break">
         ${message.data}
   </p>
   <h6 class="text-muted float-end">1:6</h6>
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

    <div class="col-6 m-2 rounded bg-info p-3 text-left float-start">
     <p class="text-break">
           ${message.data}
     </p>
     <h6 class="text-muted float-end">1:6</h6>
    </div>`;
  }
});
