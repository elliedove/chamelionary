const colorNames = require("daisyui/src/colors/colorNames");

const io = require("socket.io")(3030, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

// associates socket IDs with names and colors
var gameInfo = {
  names: {},
  colors: {},
};

io.on("connection", (socket) => {
  console.log(socket.id);

  // someone sent a message
  socket.on("send-message", (message) => {
    // send it to everyone connected
    if (message.startsWith("/name")) {
      var newName = message.slice(6);
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
});
