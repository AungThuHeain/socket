const sessionID = localStorage.getItem("sessionID");
const userNameSession = localStorage.getItem("userNameSession");
const userList = document.querySelector(".user-list");
const msg = document.querySelector(".msg");
const send = document.querySelector(".send");
const message_box = document.querySelector(".message_box");
userList.addEventListener("click", (e) => {
  if (e.target.classList.contains("specific_user")) {
    send.setAttribute("id", e.target.id);
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
});

if (sessionID) {
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

//show user list
socket.on("users", (users) => {
  console.log(users);
  users.forEach((user) => {
    userList.innerHTML += `<div id="${user.userID}"
              class="d-flex justify-content-between mt-2 p-2 bg-secondary rounded specific_user"
            >
              <h6 class="fw-bold">${user.userName}</h6>
              <small class="fw-semibold">1:50</small>
            </div>`;
  });
});

socket.on("chat message", (messages) => {
  console.log(messages);
  messages.forEach((message) => {
    message_box.innerHTML = ` 
     <div>
     <div class="col-6 m-2 rounded bg-info p-3 text-left float-start">
     <p class="text-break">
          ${message.data}
     </p>
     <h6 class="text-muted float-end">1:6</h6>
   </div>
     </div>`;
  });
});
