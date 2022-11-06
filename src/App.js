import React, { useEffect, useState, createRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3030");

function App() {
  const [messages, setMessages] = useState([]);
  const [currMessage, setCurrMessage] = useState("");
  const [isConnected, setIsConnected] = useState(socket.connected);

  const messagesEndRef = createRef();

  useEffect(() => {
    socket.on("connect", () => {
      setMessages([...messages, `You connected! ID: ${socket.id}`]);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("pong");
    };
  }, []);

  // received a message from socket
  socket.on("receive-message", (receivedMessage) => {
    setMessages([...messages, receivedMessage]);
  });

  const handleMessageChange = (event) => {
    setCurrMessage(event.target.value);
  };

  const handleSendClick = (event) => {
    sendMessage();
  };

  const sendMessage = () => {
    setMessages([...messages, "You: " + currMessage]);
    socket.emit("send-message", currMessage);
    setCurrMessage("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendEnter = (event) => {
    if (event.key === "Enter" || event.code === "NumpadEnter") {
      sendMessage();
    }
  };

  return (
    <div id="App" className="App">
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
    </div>
  );
}

export default App;
