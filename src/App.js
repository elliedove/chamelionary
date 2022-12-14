import React, { useEffect, useState, createRef, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Canvas from "./Canvas";

const socket = io("http://localhost:3030");

const USERNAME_LENGTH = 15;
const GAME_END_WAIT_SEC = 10;

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
  const [drawingOver, setDrawingOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sideBarColors, setSideBarColors] = useState([]);
  const [playerIds, setPlayerIds] = useState([]);
  const [playerInfo, setPlayerInfo] = useState({});
  const [voted, setVoted] = useState("");
  const [votingDone, setVotingDone] = useState(false);
  const [votes, setVotes] = useState({});
  const [gameFinished, setGameFinished] = useState(false);
  const [blufWin, setBlufWin] = useState(false);

  const canvasRef = useRef(null);
  const messagesEndRef = createRef();

  useEffect(() => {
    socket.on("connect", () => {
      setMessages([`You connected! ID: ${socket.id}`]);
    });

    // receive names and colors
    socket.on("names-colors", (data) => {
      setSideBarColors([...data]);
    });

    socket.on("game-finished", (blufferFound) => {
      setGameFinished(true);
      setBlufWin(blufferFound);

      // wait 15 seconds
      let timer = GAME_END_WAIT_SEC;
      let interval = setInterval(function () {
        if (timer == -1) {
          resetAllState();
          clearInterval(interval);
        }
        timer -= 1;
      }, 1000);
    });

    return () => {
      socket.off("connect");
      socket.off("drawer-check");
      socket.off("disconnect");
      socket.off("names-colors");
      socket.off("game-finished");
    };
  }, []);

  // re-render canvas when lobby fully readies up
  useEffect(() => {
    if (lobbyReady) {
      Canvas(
        socket,
        canvasRef,
        selectedColor,
        drawerInfo,
        drawingOver,
        handleDrawerInfo,
        handleTimerState
      );
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

  // receive signal that everyone is done drawing
  socket.on("game-over", (data) => {
    setDrawingOver(true);
    setPlayerInfo(data[0]);
    setPlayerIds(data[1]);
  });

  // new turn is starting, need to get rid of voting HTML stuff
  socket.on("reset-drawingOver", () => {
    setDrawingOver(false);
    setVotingDone(false);
    setVoted("");
  });

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

  socket.on("voting-complete", (voteDict) => {
    setVotingDone(true);
    setVotes(voteDict);
  });

  const handleDrawerInfo = (data) => {
    setDrawerInfo(data);
  };

  const handleTimerState = (data) => {
    setTimeRemaining(data);
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

  const handleVoteClick = (playerId) => {
    setVoted(playerInfo[playerId]);
    socket.emit("vote-cast", playerId);
  };

  // request selected color
  const handleColorClick = (btnIdx) => {
    socket.emit("select-color", btnIdx);
  };

  const handleNameChange = (e) => {
    setNameInput(e.target.value);
  };

  const handleContinueClick = () => {
    socket.emit("next-round");
  };

  const resetAllState = () => {
    // reset everything
    setLobbyReady(false);
    setClientReady(false);
    setSelectedColor(false);
    setGameFinished(false);
    setTimeRemaining(0);
    setVotingDone(false);
    setVoted(false);
    setVotes({});
    setDrawingOver(false);
    setBlufWin(false);
  };

  return (
    <div id="App" className="App">
      {!lobbyReady && (
        <div className="flex items-center justify-center min-h-screen w-full">
          <div className="mt-5">
            <div className="text-6xl mt-5">
              {"Welcome to Chamelionary!"}
            </div>
            <div className="text-3xl mt-5">
              {"A bluffing game"}
            </div>
            <div className="text-xl mt-5">
              When you start the game, you will be chosen as the bluffer or be given a word. <br></br>If you see a word, draw a line to create a collaborative image. <br></br>If you are the bluffer, try to blend in!
              When the voting screen pops up, vote for whoever seems the most suspicious! <br></br>The game will end after two turns, or once the bluffer is found.<br></br>
            </div>
            <button className="btn mt-5" onClick={handleReadyClick}>
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
                disabled={clientReady}
              />
            </div>

            <div className="flex-1">
              <div className="mt-5">
                <div className="colors">
                  <button
                    className={`btn btn-lg btn-outline btn-info ${
                      selectedColor === 0 ? "btn-active" : ""
                    }`}
                    onClick={() => handleColorClick(0)}
                  ></button>

                  <button
                    className={`btn btn-lg btn-outline btn-success ${
                      selectedColor === 1 ? "btn-active" : ""
                    }`}
                    onClick={() => handleColorClick(1)}
                  ></button>

                  <button
                    className={`btn btn-lg btn-outline btn-warning ${
                      selectedColor === 2 ? "btn-active" : ""
                    }`}
                    onClick={() => handleColorClick(2)}
                  ></button>

                  <button
                    className={`btn btn-lg btn-outline btn-error ${
                      selectedColor === 3 ? "btn-active" : ""
                    }`}
                    onClick={() => handleColorClick(3)}
                  ></button>

                  <button
                    className={`btn btn-lg btn-outline btn-primary ${
                      selectedColor === 4 ? "btn-active" : ""
                    }`}
                    onClick={() => handleColorClick(4)}
                  ></button>

                  <button
                    className={`btn btn-lg btn-outline btn-secondary ${
                      selectedColor === 5 ? "btn-active" : ""
                    }`}
                    onClick={() => handleColorClick(5)}
                  ></button>

                  {selectedColor === -1 && (
                    <div>Someone else is using this color!</div>
                  )}
                  {selectedColor === null && (
                    <div>Select a color and ready up</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {lobbyReady && !gameFinished && (
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

          <div className="text-2xl">
            {word === "" ? "you're bluffing!" : "draw: " + word}
          </div>

          <div className="text-2xl">
            {drawerInfo ? "drawing" : "spectating"}
          </div>

          <div>{timeRemaining === 0 ? "waiting..." : timeRemaining}</div>

          <div>
            <div className="bg-gray-200 absolute max-h-96 inset-y-24 left-10 w-1/4 max-w-sm rounded shadow-lg">
              {drawingOver && !voted && (
                <div>
                  <h1 className="text-2xl">{"Time to vote!"}</h1>
                  <h2 className="text-xl">{"Players:"}</h2>
                  {sideBarColors.map((triplet) => {
                    if (socket.id !== triplet[2]) {
                      return (
                        <div className="flex justify-center items-center mt-2">
                          <button
                            className={`btn-sm btn-${triplet[1]} hover:bg-blue-700 text-white`}
                            onClick={() => handleVoteClick(triplet[2])}
                          >
                            {triplet[0]}
                          </button>
                        </div>
                      );
                    }
                  })}
                </div>
              )}

              {voted && !votingDone && (
                <div>
                  <h1 className="text-2xl">{"You voted for " + voted + "!"}</h1>
                  <h2 className="text-xl">
                    {"Please wait for others to vote"}
                  </h2>
                </div>
              )}

              {votingDone && (
                <div>
                  <h1 className="text-2xl">{"Results:"}</h1>
                  <ul>
                    {playerIds.map((player) => (
                      <li>{playerInfo[player] + ": " + votes[player]}</li>
                    ))}
                  </ul>
                  <button
                    className="btn-md bg-blue-500 hover:bg-blue-700 text-white"
                    onClick={() => handleContinueClick()}
                  >
                    {"Continue"}
                  </button>
                </div>
              )}

              {!drawingOver && sideBarColors.length && (
                <div className="">
                  <div>
                    {sideBarColors.map((triplet) => {
                      if (socket.id === triplet[2]) {
                        return (
                          <div className="flex items-center justify-center mt-2">
                            <div>
                              <span style={{ fontWeight: "bold" }}>
                                {triplet[0]}
                              </span>
                            </div>
                            <div
                              className={`box-content rounded btn-${triplet[1]} ml-4 h-8 w-8`}
                            ></div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center mt-2">
                            <div>{triplet[0]}</div>
                            <div
                              className={`box-content rounded btn-${triplet[1]} ml-4 h-8 w-8`}
                            ></div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gameFinished && (
        <div>
          {blufWin && word === "" && (
            <div>
              <div className="text-2xl"> {"You lose!"} </div>
              <div className="text-xl">
                {" "}
                {"The bluffer was found - Players win!"}{" Please wait for game to restart."}
              </div>
            </div>
          )}

          {!blufWin && word === "" && (
            <div>
              <div className="text-2xl"> {"You win!"} </div>
              <div className="text-xl">
                {" "}
                {"The bluffer was not found - Bluffer wins!"}{" Please wait for game to restart."}
              </div>
            </div>
          )}

          {blufWin && word !== "" && (
            <div>
              <div className="text-2xl"> {"You win!"} </div>
              <div className="text-xl">
                {" "}
                {"The bluffer was found - Players win!"}{" Please wait for game to restart."}
              </div>
            </div>
          )}

          {!blufWin && word !== "" && (
            <div>
              <div className="text-2xl"> {"You lose!"} </div>
              <div className="text-xl">
                {" "}
                {"The bluffer was not found - Bluffer wins!"}{" Please wait for game to restart."}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
