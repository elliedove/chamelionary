# chamelionary

Chamelionary is a turn-based, drawing, and bluffing game.

## installation and running (local)

- Install all related packages

  `npm i`

- Start the server

  `npm run server`

  (This starts the Websocket server contained in `Server.js`)

  All local server logging is displayed wherever the server is run via nodemon

- Start the client

  `npm run start`

Of course, multiple instances of client can be opened at once with different tabs of your chosen browser.

## stack / packages used

### frontend

- react
- socket.io-client
- tailwindcss
- daisyui (predefined tailwind styling)
- [socket.io canvas demo](https://socket.io/demos/whiteboard/)
- (soon to be) hosted on netlify

### backend

- socket.io
- (soon to be) hosted on heroku
