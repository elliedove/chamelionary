const colorNames = require("daisyui/src/colors/colorNames");

const io = require("socket.io")(3030, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

const fs = require("fs");
const readline = require("readline");
const readFile = require("readFile");

// associates socket IDs with names and colors
var gameInfo = {
  names: {},
  colors: {},
  ready: {},
};

var gameStarted = false;
var linesDrawn = [];
var numberReady = 0;

function chooseWord(filename) {
  // read in words from file line-by-line
  try {
    const contents = fs.readFileSync(filename, "UTF-8");
    const arr = contents.split(/\r?\n/);
    //console.log(arr);

    // get random word from array
    const word = arr[Math.floor(Math.random() * arr.length)];
    //console.log(word);

    // return the word
    return word;
  } catch (err) {
    console.log(err);
  }
}

io.on("connection", (socket) => {
  console.log(socket.id);
  // add their ID to ready list
  gameInfo["ready"][socket.id] = false;

  var totalConnected = Object.keys(gameInfo["ready"]).length;
  io.sockets.emit("lobby-not-ready", [numberReady, totalConnected]);

  if (gameStarted) {
    // skip the 'join' screen - the game has already started
    io.to(socket.id).emit("lobby-ready");
  }

  // ready up received
  socket.on("ready-up", () => {
    console.log(socket.id + " has readied up");
    // add their ready up to the list
    gameInfo["ready"][socket.id] = true;

    console.log("checking if everone is ready...");
    // if all clients connected are ready, tell clients to start the game
    var someoneNotReady = false;
    var totalConnected = Object.keys(gameInfo["ready"]).length;
    var countReady = 0;

    for (var id in gameInfo["ready"]) {
      if (gameInfo["ready"][id] === false) {
        someoneNotReady = true;
      } else {
        countReady++;
      }
    }

    numberReady = countReady;

    // everyone is ready
    if (!someoneNotReady) {
      console.log("everyone is ready, starting game...");

      // choose a random word
      wordToSend = chooseWord("animals.txt");

      // emit start game message
      io.sockets.emit("lobby-ready", [wordToSend]);
      gameStarted = true;
    } else {
      io.sockets.emit("lobby-not-ready", [numberReady, totalConnected]);
      console.log("not everyone is ready, not starting game...");
    }
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

  socket.on("drawing", (data) => {
    linesDrawn.push(data);
    socket.broadcast.emit("drawing", data);
  });
});
