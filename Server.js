const colorNames = require("daisyui/src/colors/colorNames");

const io = require("socket.io")(3030, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

const fs = require("fs");
const readline = require("readline");
const readFile = require("readFile");
const { send } = require("process");

// associates socket IDs with names and colors
var gameInfo = {
  names: {},
  colors: {},
  ready: {},
  bluffer: {},
};

var gameStarted = false;
var linesDrawn = [];
var numberReady = 0;
var currWord = "";

function chooseWord(filename) {
  // read in words from file line-by-line
  try {
    const contents = fs.readFileSync(filename, "UTF-8");
    const arr = contents.split(/\r?\n/);

    // get random word from array
    const word = arr[Math.floor(Math.random() * arr.length)];

    // return the word
    return word;
  } catch (err) {
    console.log(err);
  }
}

function sendLobbyReady(numberReady) {

  // pick random number between 0 and totalConnected
  console.log(numberReady);
  const index = Math.floor(Math.random() * numberReady);
  console.log(index);

  // assign that index in the array of socket identifiers as the bluffer
  var allKeys = Object.keys(gameInfo["ready"])
  var bluffer_id = allKeys[index];
  gameInfo["bluffer"][bluffer_id] = true;

  // choose a random word
  // TODO: this is slow, move it to server start-up
  currWord = chooseWord("animals.txt");

  // emit start game message
  for (i = 0; i < numberReady; i++){
    if (gameInfo["bluffer"][allKeys[i]] === true){
      io.to(allKeys[i]).emit("lobby-ready", "");
    }
    else{
      io.to(allKeys[i]).emit("lobby-ready", [currWord]);
    }
  }
  
}

io.on("connection", (socket) => {
  console.log(socket.id);
  // add their ID to ready list
  gameInfo["ready"][socket.id] = false;
  // default as not bluffer
  gameInfo["bluffer"][socket.id] = false;

  // give readied up info
  var totalConnected = Object.keys(gameInfo["ready"]).length;
  io.sockets.emit("lobby-not-ready", [numberReady, totalConnected]);

  // if joining an already started game
  if (gameStarted) {
    // skip lobby, give current word
    io.to(socket.id).emit("lobby-ready", [currWord]);
  }

  // ready up received
  socket.on("ready-up", () => {
    console.log(socket.id + " has readied up");
    // add their ready up to the list
    gameInfo["ready"][socket.id] = true;

    console.log("checking if everyone is ready...");

    // if all clients connected are ready, tell clients to start the game
    var totalConnected = Object.keys(gameInfo["ready"]).length;
    numberReady++;

    // everyone is ready
    if (numberReady === totalConnected) {
      console.log("everyone is ready, starting game, sending message...");

      sendLobbyReady(numberReady);

      gameStarted = true;
    } else {
      io.sockets.emit("lobby-not-ready", [numberReady, totalConnected]);
      console.log("not everyone is ready, not starting game...");
    }
  });

  socket.on("unready", () => {
    console.log(socket.id + " has unreadied");
    // add their ready up to the list
    gameInfo["ready"][socket.id] = false;
    numberReady--;
    var totalConnected = Object.keys(gameInfo["ready"]).length;
    io.sockets.emit("lobby-not-ready", [numberReady, totalConnected]);
  });

  // someone sent a message
  socket.on("send-message", (message) => {
    // send it to everyone connected
    if (message.startsWith("/name")) {
      var newName = message.slice(6);

      // TODO: length validate and check for special characters
      gameInfo["names"][socket.id] = newName;
      socket.broadcast.emit("receive-message", newName + " has joined!");
    } else if (message.startsWith("/color")) {
      // validate the color code
      var reg = /^#([0-9a-f]{3}){1,2}$/i;
      var newColor = message.slice(7);
      if (reg.test(newColor)) {
        gameInfo["colors"][socket.id] = newColor;
      }
    } else {
      if (gameInfo["names"][socket.id]) {
        socket.broadcast.emit(
          "receive-message",
          gameInfo["names"][socket.id] + ": " + message
        );
      } else {
        socket.broadcast.emit("receive-message", "Anon: " + message);
      }
    }
    console.log(gameInfo);
  });

  // client sent disconnect
  socket.on("disconnect", () => {
    console.log(socket.id + " has disconnected");
    // remove all related info
    if (socket.id in gameInfo["names"]) {
      delete gameInfo["names"][socket.id];
    }
    if (socket.id in gameInfo["ready"]) {
      // tell users to decement their 'ready' counts
      if (gameInfo["ready"][socket.id]) {
        numberReady--;
      }
      delete gameInfo["ready"][socket.id];
    }
    if (socket.id in gameInfo["colors"]) {
      delete gameInfo["colors"][socket.id];
    }
    var totalConnected = Object.keys(gameInfo["ready"]).length;
    socket.broadcast.emit("lobby-not-ready", [numberReady, totalConnected]);

    // must recheck if all are ready
    // this is in the case that the person who left was the only unready person
    if (numberReady === totalConnected) {
      
      sendLobbyReady(numberReady);

      gameStarted = true;
    }
  });

  socket.on("drawing", (data) => {
    linesDrawn.push(data);
    socket.broadcast.emit("drawing", data);
  });
});
