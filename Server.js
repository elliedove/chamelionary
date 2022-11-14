const io = require("socket.io")(3030, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

const fs = require("fs");
const { toUSVString } = require("util");

const NUM_COLORS = 5;

// associates socket IDs with names and colors
var gameInfo = {
  names: {},
  colors: {},
  ready: {},
  bluffer: {},
};

var playerOrder = [];
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
  const index = Math.floor(Math.random() * numberReady);

  // assign that index in the array of socket identifiers as the bluffer
  var allKeys = Object.keys(gameInfo["ready"]);
  var bluffer_id = allKeys[index];
  gameInfo["bluffer"][bluffer_id] = true;
  console.log("picked bluffer: " + bluffer_id);

  // choose a random word
  // TODO: this is slow, move it to server start-up
  currWord = chooseWord("animals.txt");

  // emit start game message
  for (i = 0; i < numberReady; i++) {
    if (gameInfo["bluffer"][allKeys[i]] === true) {
      io.to(allKeys[i]).emit("lobby-ready", "");
    } else {
      io.to(allKeys[i]).emit("lobby-ready", [currWord]);
    }
  }
  // start playing the game
  playGame(numberReady);
}

function playGame(numberReady) {
  // boolean to hold whether game is over or not
  var gameOver = false;
  // counter to loop over allKeys
  var i = 0;
  // list of all socket ids that are ready
  var allKeys = Object.keys(gameInfo["ready"]);
  // print player order
  console.log("player order: ", playerOrder);

  // loop over ready socket ids
  //do{
  // get current socket who will be drawer
  currDrawer = playerOrder[i % numberReady];
  // print the current drawer
  console.log("current drawer is: ", currDrawer);

  // loop over sockets and say you're drawer or spectator
  for (j = 0; j < numberReady; j++) {
    // you're the drawer
    if (allKeys[j] === currDrawer) {
      console.log("drawer: ", allKeys[j]);
      io.to(allKeys[j]).emit("drawer-check", 1);
    }
    // not the drawer
    else {
      console.log("spectator: ", allKeys[j]);
      io.to(allKeys[j]).emit("drawer-check", 0);
    }
  }

  // TODO: implement conditions for when a turn starts and is over
  //turn()

  i = i + 1;
  gameOver = checkGameOver();
  //} while(!gameOver);
}

function turn() {
  console.log("a turn is happening...");
}

function checkGameOver() {
  // TODO: implement condition to determine if game is over
  return false;
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
    // give them the first available color
    for (var i = 0; i <= NUM_COLORS; i++) {
      if (!Object.values(gameInfo["colors"]).includes(i)) {
        gameInfo["colors"][socket.id] = i;
        break;
      }
    }
    io.to(socket.id).emit("select-color", gameInfo["colors"][socket.id]);
  }

  // ready up received
  socket.on("ready-up", () => {
    console.log(socket.id + " has readied up");
    // add their ready up to the list
    gameInfo["ready"][socket.id] = true;
    // add socket to player order
    playerOrder.push(socket.id);

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
    // if player unreadies, remove them from player order list
    playerOrder.splice(playerOrder.indexOf(socket.id));
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
    if (numberReady === totalConnected && totalConnected > 1) {
      sendLobbyReady(numberReady);

      gameStarted = true;
    }
  });

  // client trying to select color
  socket.on("select-color", (colorIndex) => {
    // selected the color they already have -> do nothing
    if (gameInfo["colors"][socket.id] === colorIndex) {
      return;
    }

    // see if anyone else has picked this color + is valid
    if (
      Object.values(gameInfo["colors"]).includes(colorIndex) ||
      colorIndex > NUM_COLORS
    ) {
      // send -1 if invalid color
      gameInfo["colors"][socket.id] = -1;
      io.to(socket.id).emit("select-color", -1);
    } else {
      // successful color -> store it, send it back
      gameInfo["colors"][socket.id] = colorIndex;
      io.to(socket.id).emit("select-color", colorIndex);
      console.log(socket.id + " has been given color " + colorIndex);
    }
  });

  socket.on("drawing", (data) => {
    linesDrawn.push(data);
    // get this person's color
    var color = gameInfo["colors"][socket.id];
    data.color = color;
    socket.broadcast.emit("drawing", data);
  });
});
