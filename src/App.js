import { useEffect, useState, useRef, createRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3030");

socket.on("connect", () => {});

function App() {
  const [messages, setMessages] = useState(["hello", "wut"]);

  const [currMessage, setCurrMessage] = useState("");
  const messagesEndRef = createRef();

  const handleMessageChange = (event) => {
    setCurrMessage(event.target.value);
  };

  const handleSendClick = (event) => {
    sendMessage();
  };

  const sendMessage = () => {
    setMessages([...messages, currMessage]);
    // need to send message to socket here
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
    <div className="App">
      <div className="grid grid-columns-10 gap-4">
        <div className="bg-gray-200 absolute inset-y-24 right-10 w-1/4 max-w-sm rounded shadow-lg overflow-scroll">
          <ul className="text-left ">
            {messages.map((msg, i) => (
              <li className="ml-2" key={i}>
                {msg}
              </li>
            ))}
          </ul>
          <div ref={messagesEndRef}></div>
          <div className="bg-gray-200 relative bottom-0 max-w-sm rounded shadow-lg">
            <input
              className="fixed bottom-14 right-24"
              onChange={handleMessageChange}
              value={currMessage}
              onKeyDown={handleSendEnter}
            ></input>
            <button
              className="fixed bottom-14 right-12 bg-blue-500 hover:bg-blue-700 text-white py-1 rounded"
              onClick={handleSendClick}
            >
              send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
