import React, { useEffect, useState, createRef, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Canvas from "./Canvas";

const socket = io("http://localhost:3030");
const TIMEOUT_AMT = 15;

const USERNAME_LENGTH = 15;

function App() {
  const [messages, setMessages] = useState([]);
  const [currMessage, setCurrMessage] = useState("");
  const [lobbyReady, setLobbyReady] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [readyInfo, setReadyInfo] = useState([0, 0]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [word, setWord] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [drawerInfo, setDrawerInfo] = useState(0);

  const canvasRef = useRef(null);
  const messagesEndRef = createRef();

  useEffect(() => {
    socket.on("connect", () => {
      setMessages([`You connected! ID: ${socket.id}`]);
    });

    return () => {
      socket.off("connect");
      socket.off("drawer-check");
      socket.off("disconnect");
      socket.off("drawing");
    };
  }, []);

  // re-render canvas when lobby fully readies up
  useEffect(() => {
    if (lobbyReady) {
      Canvas(socket, canvasRef, selectedColor, drawerInfo, handleDrawerInfo);
    }

    return () => {
      socket.off("drawing");
    };
  }, [lobbyReady, selectedColor]);

  // chatbox scroll to bottom effect
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    scrollToBottom();
  }, [messages, messagesEndRef]);

  socket.on("receive-message", (receivedMessage) => {
    setMessages([...messages, receivedMessage]);
  });

  // receive signal from server that everyone is ready
  socket.on("lobby-ready", (wordSent) => {
    setLobbyReady(true);
    setWord(wordSent);
  });

  socket.on("lobby-not-ready", (data) => {
    setReadyInfo([data[0], data[1]]);
  });

  // receive "color approved" message from server
  socket.on("select-color", (btnIdx) => {
    setSelectedColor(btnIdx);
  });

  const handleDrawerInfo = (data) => {
    setDrawerInfo(data);
  };

  const handleMessageChange = (event) => {
    setCurrMessage(event.target.value);
  };

  const handleSendClick = (event) => {
    sendMessage();
  };

  const handleSendEnter = (event) => {
    if (event.key === "Enter" || event.code === "NumpadEnter") {
      sendMessage();
    }
  };

  const handleReadyClick = () => {
    // do nothing if color not selected
    if (selectedColor === -1 || selectedColor === null) {
      return;
    }

    // ready up
    if (!clientReady) {
      setClientReady(true);
      // truncate name
      var sentName = nameInput.slice(0, USERNAME_LENGTH);
      // tell server we are ready
      socket.emit("ready-up", sentName);
    }
    // unready
    else {
      setClientReady(false);
      socket.emit("unready");
    }
  };

  const sendMessage = () => {
    setMessages([...messages, "You: " + currMessage]);
    socket.emit("send-message", currMessage);
    setCurrMessage("");
  };

  const readyButtonText = () => {
    if (clientReady) {
      return "waiting on others...";
    } else {
      return "ready?";
    }
  };

  // request selected color
  const handleColorClick = (btnIdx) => {
    socket.emit("select-color", btnIdx);
  };

  const handleNameChange = (e) => {
    setNameInput(e.target.value);
  };

  return (
    <div id="App" className="App">
      {!lobbyReady && (
        <div className="flex items-center justify-center min-h-screen w-full">
          <div>
            <button className="btn" onClick={handleReadyClick}>
              {readyButtonText()}
            </button>
            <p>
              {readyInfo[0]}/{readyInfo[1]} players are ready
            </p>
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Name"
                className="mt-5 input input-md min-w-max input-bordered"
                value={nameInput}
                onChange={handleNameChange}
              />
            </div>
            <div className="flex-1">
              <div className="mt-5">
                <div className="colors">
                  <button
                    className={`btn btn-lg btn-outline btn-info ${selectedColor === 0 ? "btn-active" : ""}`}
                    onClick={() => handleColorClick(0)}
                  ></button>
                  <button
                    className={`btn btn-lg btn-outline btn-success ${selectedColor === 1 ? "btn-active" : ""}`}
                    onClick={() => handleColorClick(1)}
                  ></button>
                  <button
                    className={`btn btn-lg btn-outline btn-warning ${selectedColor === 2 ? "btn-active" : ""}`}
                    onClick={() => handleColorClick(2)}
                  ></button>
                  <button
                    className={`btn btn-lg btn-outline btn-error ${selectedColor === 3 ? "btn-active" : ""}`}
                    onClick={() => handleColorClick(3)}
                  ></button>
                  <button
                    className={`btn btn-lg btn-outline btn-primary ${selectedColor === 4 ? "btn-active" : ""}`}
                    onClick={() => handleColorClick(4)}
                  ></button>
                  <button
                    className={`btn btn-lg btn-outline btn-secondary ${selectedColor === 5 ? "btn-active" : ""}`}
                    onClick={() => handleColorClick(5)}
                  ></button>
                  {selectedColor === -1 && <div>Someone else is using this color!</div>}
                  {selectedColor === null && <div>Select a color and ready up</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {lobbyReady && (
        <div>
          <canvas ref={canvasRef} className="whiteboard" />
          <div className="bg-gray-200 absolute inset-y-24 right-10 w-1/4 max-w-sm rounded shadow-lg overflow-scroll">
            <ul id="chat-container" className="text-left">
              {messages.map((msg, i) => (
                <li className="ml-2" key={i}>
                  {msg}
                </li>
              ))}
            </ul>
            <div ref={messagesEndRef}></div>
            <div className="bg-gray-200 relative bottom-0 max-w-sm rounded shadow-lg">
              <input
                className="input input-sm input-bordered fixed bottom-14 right-32"
                onChange={handleMessageChange}
                value={currMessage}
                onKeyDown={handleSendEnter}
              ></input>
              <button
                className="btn btn-sm fixed bottom-14 right-12 bg-blue-500 hover:bg-blue-700 text-white py-1 rounded"
                onClick={handleSendClick}
              >
                send
              </button>
            </div>
          </div>

          <div className="flex flex-row items-center justify-center gap-4">
            <h1 className="">
              {word} {drawerInfo ? "drawer" : "spectator"}
            </h1>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
