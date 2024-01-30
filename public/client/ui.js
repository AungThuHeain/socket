document.addEventListener("DOMContentLoaded", function () {
    // Create main elements
    const button = document.createElement("button");
    const divPopup = document.createElement("div");
  
    // Set attributes and content for the elements
    button.setAttribute("class", "open-button");
    button.setAttribute("onclick", "openForm()");
    button.innerHTML = '<img src="./img/chat_ico.png" alt="Chat Box Image" width="50" >'; // Add the path to your chat box image
  
    divPopup.setAttribute("class", "chat-popup");
    divPopup.setAttribute("id", "myForm");
    divPopup.innerHTML = `<div class="user-list"></div>
    <div class="traingle-inner">
    <div class="traingle"></div></div>
    <form class="form-container">
    <div class="nav">
    <h4 style="margin: 5px">Chat</h4>
    <button class="close-btn" type="button" onclick="closeForm()">
    <img src="./img/close_ico.jpeg" alt="Close" width="20" >
    </button>
    </div>
    <div class="chat-text">
    <p></p></div>
    <p class="typing"></p>
    <div class="flex mb-10">
    <input type="text" id="name" class="mb-10" placeholder="Type name.." name="name" />
    <input type="hidden" name="orgId" value="dTeARt3EzLSTbhjTyJaCGHDp7knqnqHw1mEJObJZ" />
    </div>
    <div class="flex mb-10">
    <input type="text" id="msg" required placeholder="Type message.." name="msg" />
    <button type="submit" class="send-btn"><svg alt="Send" class="p-1" xmlns="http://www.w3.org/2000/svg" height="22" width="22">
    <path d="M3 20V4L22 12ZM5 17 16.85 12 5 7V10.5L11 12L5 13.5ZM5 17V12V7V10.5V13.5Z" ></path></svg></button>
    </div>
    <p class="footer-txt">Powered by 360TimeSheet</p>
    </form>`;
  
    // Append elements to the document
    document.body.appendChild(button);
    document.body.appendChild(divPopup);
});

// add style for widget
var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'style.css';
document.head.appendChild(link);

//add script cdn for axio
const axioScript = document.createElement("script");
axioScript.setAttribute(
  "src",
  "https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.6/axios.min.js"
);
document.head.appendChild(axioScript);

//connect to socket server
const socketScript = document.createElement("script");
socketScript.setAttribute(
  "src",
  "https://cdn.socket.io/4.7.2/socket.io.min.js"
);
document.head.appendChild(socketScript);


setTimeout(function () {
  //get org_id and add as socket-server namespace
  let predefine_admin_id = "dTeARt3EzLSTbhjTyJaCGHDp7knqnqHw1mEJObJZ";

  const socket = io(
      "https://socket-ie16.onrender.com/" + predefine_admin_id,
      {
          transports: ["websocket"],
          autoConnect: false,
      }
  );
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
  form.addEventListener("submit", async (e) => {
        e.preventDefault();

        socket.connect();
        socket.auth = { name: userName.value };
        const data = {
            name: userName.value,
            msg: msg.value,
            to: predefine_admin_id,
        };


        if (sessionID) {
            data = {
                name: userNameSession,
                msg: msg.value,
                to: predefine_admin_id,
            };
        }

        socket.emit("user to admin", data);
        (userName.value = ""), (msg.value = "");
        userName.style.display = "none";

        //call api to save chat data
        const chatData = {
            name: data.name,
            msg: data.msg,
            orgId: predefine_admin_id
        };

        // Make Axios POST request
        const initialChatApi = "http://localhost:8000/api/initial-chat";
        const response = await axios.post(initialChatApi, chatData);
        console.log("Response from API:", response.data);
  });

  //show old message when old user reconnect
  socket.on("get old message", (messages) => {
      messages.forEach((message) => {
          chat.innerHTML += `<p><span class="text-primary">${message.user_name ?? 'Admin'}:  </span>${message.data}</p>`;
      });
  });
  //accept private message
  socket.on("user to admin", (message) => {
        console.log("message",message)
      chat.innerHTML += `<p><span class="text-primary">${message.user_name}:  </span>${message.data}</p>`;
  });

  //accept private message
  socket.on("admin to client", (message) => {
      chat.innerHTML += `<p><span class="text-primary">Admin:  </span>${message.data}</p>`;
  });
}, 3000);

//to close and open form
function openForm() {
  document.getElementById("myForm").style.display = "block";
}

function closeForm() {
  document.getElementById("myForm").style.display = "none";
}