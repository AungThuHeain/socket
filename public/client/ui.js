document.addEventListener("DOMContentLoaded", function () {
    // Create main elements
    const button = document.createElement("button");
    const divPopup = document.createElement("div");

    // Set attributes and content for the elements
    button.setAttribute("class", "open-button");
    button.setAttribute("onclick", "openForm()");
    button.innerHTML =
        '<img src="./img/chat_ico.png" alt="Chat Box Image" width="50" >'; // Add the path to your chat box image

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
    <div class="chat-text"></div>
    <div class="flex mb-10">
    <input type="text" id="name" class="mb-10" placeholder="Type name.." name="name" />
    <input type="hidden" name="orgId" value="dTeARt3EzLSTbhjTyJaCGHDp7knqnqHw1mEJObJZ" />
    </div>
    <div class="flex mb-10">
    <input type="text" id="msg" required placeholder="Type message.." name="msg" />
    <div class="">
    <input type="file"  onchange="upload(this.files,this.id)"   id="file" class="input_file"/>
    <label for="file" style="margin-top:20px;"><svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 18.999a.974.974 0 0 0 .196.563l-1.79 1.81a5.5 5.5 0 1 1-7.778-7.78L15.185 2.159a4 4 0 0 1 5.63 5.685L10.259 18.276a2.5 2.5 0 0 1-3.526-3.545l8-7.999.706.707-8 8a1.5 1.5 0 0 0 2.116 2.126L20.111 7.132a3 3 0 1 0-4.223-4.263L4.332 14.304a4.5 4.5 0 1 0 6.364 6.364L13 18.338zM19 14h-1v4h-4v.999h4V23h1v-4.001h4V18h-4z"/><path fill="none" d="M0 0h24v24H0z"/></svg></label>
    </div>
    <button type="submit" class="send-btn"><svg alt="Send" class="p-1" xmlns="http://www.w3.org/2000/svg" height="22" width="22">
    <path d="M3 20V4L22 12ZM5 17 16.85 12 5 7V10.5L11 12L5 13.5ZM5 17V12V7V10.5V13.5Z" ></path></svg></button>
    </div>
    <div class="end"><button type="button" class="end-btn">End Chat</button></div>
    <p class="footer-txt">Powered by 360TimeSheet</p>
    </form>`;

    // Append elements to the document
    document.body.appendChild(button);
    document.body.appendChild(divPopup);

    //image view
    const imagePopup = document.createElement("div");
    imagePopup.setAttribute("id", "image_popup");
    document.body.appendChild(imagePopup);
    imagePopup.innerHTML = `
    <div style="display:flex;justify-content:space-around;align-items: center;margin-block:10px;">
        <div></div>
        <div>
            <a download="360chat-${new Date().toLocaleString()}" id="download_btn">
               <img src="http://localhost:8000/images/downloading.png" style="width:20px;height:20px;"></img>
            </a>
        </div>
        <div id="close_btn">
              <img src="http://localhost:8000/images/close.png" style="width:20px;height:20px;"></img>
        </div>
    </div>
    <div><img id="pop_image"></img></div>
    `;

    document.getElementById("close_btn").addEventListener("click", () => {
        document.getElementById("image_popup").style.display = "none";
    });
});

// add style for widget
var link = document.createElement("link");
link.rel = "stylesheet";
link.href = "http://localhost:8000/js/client-chat-js/style.css";
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

//get org_id and add as socket-server namespace
let predefine_admin_id = "NRlo0oyhvTobHvuJSPAjgDKE8u3NaTNFsddj62pl";

//global variable for local storage
let session_id, user_name_session, user_id;

setTimeout(function () {
    //get dom
    const form = document.querySelector("form");
    const userName = document.querySelector("#name");
    const msg = document.querySelector("#msg");
    const chat = document.querySelector(".chat-text");
    const typing = document.querySelector(".typing");
    const userList = document.querySelector(".user-list");
    var sessionID = localStorage.getItem("sessionID");
    const userNameSession = localStorage.getItem("userNameSession");
    const endBtn = document.querySelector(".end-btn");

    const socket = io(
        "https://socket-ie16.onrender.com/" + predefine_admin_id,
        {
            transports: ["websocket"],
            autoConnect: false,
        }
    );

    //handle session data
    socket.on("session", ({ sessionID, userID, userName }) => {
        // attach the session ID to the next reconnection attempts
        socket.auth = { sessionID: sessionID };
        socket.userID = userID;

        //assign with global variable
        session_id = sessionID;
        user_name_session = userName;
        user_id = userID;
    });

    //check first session
    if (sessionID) {
        socket.connect();
        socket.emit("get old message");
        userName.style.display = "none";
        endBtn.style.display = "inline";
        socket.auth = {
            sessionID: sessionID,
            name: userNameSession,
            userID: localStorage.getItem("userID"),
        };
    }

    //handle connection error
    socket.on("connect_error", (err) => {
        // the reason of the error, for example "xhr poll error"
        console.log(err.message);
    });

    //catch form submit event
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        endBtn.style.display = "inline";
        socket.connect();
        socket.auth = { name: userName.value };

        let data = {
            name: userName.value,
            msg: msg.value,
            to: predefine_admin_id,
        };

        if (localStorage.getItem("sessionID")) {
            data = {
                name: localStorage.getItem("userNameSession"),
                msg: msg.value,
                to: predefine_admin_id,
            };
        }

        socket.emit("user to admin", data);
        (userName.value = ""), (msg.value = "");
        userName.style.display = "none";
    });

    //show old message when old user reconnect
    socket.on("get old message", (messages) => {
        console.log(messages);
        messages.forEach((message) => {
            if (message.type == "text") {
                if (message.sender == "user") {
                    chat.innerHTML += `<p class="to"><span class="message-content">
                    ${message.data}
                    <small class="text-primary">${new Date(
                        message.time
                    ).toLocaleTimeString()}:  </small>
                    </span></p>`;
                } else {
                    chat.innerHTML += `<p><span class="message-content">
                    ${message.data}
                    <small class="text-primary">${new Date(
                        message.time
                    ).toLocaleTimeString()}:  </small>
                    </span></p>`;
                }
            } else if (message.type == "message") {
                chat.innerHTML += `<p class='taking-message'>Admin talking with you</p>`;
            } else {
                if (message.user_name == "Admin") {
                    chat.innerHTML += `
                    <div class=""> <img src="${message.data}" alt="image" class="media-image object-cover mx-auto" style="width:150px;height:150px;max-width:100%;object-fit: contain;display:block;"></div>
                   `;
                } else {
                    chat.innerHTML += `
                    <div class="to-image"> <img src="${message.data}" alt="image" class="media-image object-cover mx-auto" style="width:150px;height:150px;max-width:100%;object-fit: contain;display:block;"></div>
                    `;
                }

                const media_image = document.querySelectorAll(".media-image");
                media_image.forEach((image) => {
                    image.addEventListener("click", (e) => {
                        document
                            .getElementById("pop_image")
                            .setAttribute("src", e.target.src);
                        document.getElementById("download_btn").href =
                            e.target.src;
                        document.getElementById("image_popup").style.display =
                            "block";
                    });
                });
            }
        });
    });

    //accept private message
    socket.on("user to admin", (message) => {
        console.log(message);
        chat.innerHTML += `<p class="to"><span class="message-content">
        ${message.data}
        <small class="text-primary">${new Date(
            message.time
        ).toLocaleTimeString()}:  </small>
        </span></p>`;

        //call api
        if (localStorage.getItem("sessionID")) {
            setTimeout(async () => {
                const liveChatData = {
                    msg: message.data,
                    room_id: message.from,
                    user_id: null,
                };

                const res = await axios.post(
                    "http://localhost:8000/api/live-chat",
                    liveChatData
                );
                console.log("Live Chat Response:", res.data);
            }, 1000);
        } else {
            // store it in the localStorage
            localStorage.setItem("sessionID", session_id);
            localStorage.setItem("userNameSession", user_name_session);
            localStorage.setItem("userID", user_id);

            setTimeout(async () => {
                //call api to save chat data
                const chatData = {
                    name: message.user_name,
                    msg: message.data,
                    orgId: predefine_admin_id,
                    room_id: message.from,
                };
                const initialChatApi = "http://localhost:8000/api/initial-chat";
                const response = await axios.post(initialChatApi, chatData);
                console.log("Response from API:", response.data);
            }, 1000);
        }
    });

    //accept private message
    socket.on("admin to client", (message) => {
        chat.innerHTML += `<p><span class="message-content">
        ${message.data}
        <small class="text-primary">${new Date(
            message.time
        ).toLocaleTimeString()}:  </small>
        </span></p>`;
    });

    //accept file upload
    socket.on("upload file", (data) => {
        console.log("file", data);
        document.querySelector(".input_file").value = "";

        if (data.userName == "Admin") {
            chat.innerHTML += `
            <div class=""> <img src="${data.url}" alt="image" class="object-cover mx-auto media-image" style="width:150px;height:150px;max-width:100%;object-fit: contain;display:block;"></div>
           `;
        } else {
            chat.innerHTML += `
            <div class="to-image"> <img src="${data.url}" alt="image" class="object-cover mx-auto media-image" style="width:150px;height:150px;max-width:100%;object-fit: contain;display:block;"></div>
            `;
        }

        const media_image = document.querySelectorAll(".media-image");
        media_image.forEach((image) => {
            image.addEventListener("click", (e) => {
                document
                    .getElementById("pop_image")
                    .setAttribute("src", e.target.src);
                document.getElementById("download_btn").href = e.target.src;
                document.getElementById("image_popup").style.display = "block";
            });
        });
    });

    socket.on("take message", () => {
        console.log("user receive take message from server");
        chat.innerHTML += `<p class='taking-message'>Admin talking with you</p>`;
    });

    // end chat
    endBtn.addEventListener("click", async () => {
        const endChatData = {
            room_id: socket.userID,
        };

        const res = await axios.post(
            "http://localhost:8000/api/end-chat",
            endChatData
        );
        console.log("End Chat Response:", res.data);
        socket.emit("end chat");
        localStorage.removeItem("sessionID");
        localStorage.removeItem("userNameSession");
        localStorage.removeItem("userID");
        location.reload();
    });
}, 1000);

//to close and open form
function openForm() {
    document.getElementById("myForm").style.display = "block";
}

function closeForm() {
    document.getElementById("myForm").style.display = "none";
}

function upload(files) {
    const reader = new FileReader();

    reader.readAsDataURL(files[0]);

    reader.onload = function (event) {
        imageUrl = event.target.result;

        setTimeout(function () {
            const userNameSession = localStorage.getItem("userNameSession");
            var sessionID = localStorage.getItem("sessionID");
            const userID = localStorage.getItem("userID");
            const socket = io(
                "https://socket-ie16.onrender.com/" + predefine_admin_id,
                {
                    transports: ["websocket"],
                    autoConnect: true,
                    maxHttpBufferSize: 2e8,
                }
            );
            if (sessionID) {
                socket.connect();
                socket.auth = { sessionID: sessionID, name: userNameSession };
            }
            socket.on("connect_error", (err) => {
                // the reason of the error, for example "xhr poll error"
                console.log(err.message);

                // some additional description, for example the status code of the initial HTTP response
                console.log(err.description);

                // some additional context, for example the XMLHttpRequest object
                console.log(err.context);
            });

            const data = {
                url: imageUrl,
                to: predefine_admin_id,
                from: userID,
                userName: userNameSession,
                panel: userID,
            };

            socket.emit("upload", data, (response) => {
                console.log(response);
            });
        }, 1000);
    };
    reader.onerror = function (event) {
        console.error("Image upload error", event.target.error);
    };
}