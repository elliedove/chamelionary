function Canvas(socket, canvasRef, selectedColorIdx) {
  const allColors = ["blue", "green", "yellow", "red", "purple", "magenta"];

  const canvas = canvasRef.current;
  // do nothing if canvas undefined
  if (canvas === null || canvas === undefined) {
    return;
  }

  const context = canvas.getContext("2d");
  // set the current color
  // TODO: adjust color depending on chosen color/color given
  const current = {
    color: allColors[selectedColorIdx],
  };

  let drawing = false;

  // ------------------------------- create the drawing ----------------------------

  const drawLine = (x0, y0, x1, y1, color, emit) => {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    context.closePath();

    if (!emit) {
      return;
    }
    const w = canvas.width;
    const h = canvas.height;

    socket.emit("drawing", {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color,
    });
  };

  // ---------------- mouse movement --------------------------------------

  const onMouseDown = (e) => {
    drawing = true;
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  };

  const onMouseMove = (e) => {
    if (!drawing) {
      return;
    }
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      // TODO: this will have to be the variable representing the proper color
      current.color,
      true
    );
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  };

  const onMouseUp = (e) => {
    if (!drawing) {
      return;
    }
    drawing = false;
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      true
    );
  };

  // ----------- limit the number of events per second -----------------------

  const throttle = (callback, delay) => {
    let previousCall = new Date().getTime();
    return function () {
      const time = new Date().getTime();

      if (time - previousCall >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  };

  // -----------------add event listeners to our canvas ----------------------

  canvas.addEventListener("mousedown", onMouseDown, false);
  canvas.addEventListener("mouseup", onMouseUp, false);
  canvas.addEventListener("mouseout", onMouseUp, false);
  canvas.addEventListener("mousemove", onMouseMove, false);

  // Touch support for mobile devices
  canvas.addEventListener("touchstart", onMouseDown, false);
  canvas.addEventListener("touchend", onMouseUp, false);
  canvas.addEventListener("touchcancel", onMouseUp, false);
  canvas.addEventListener("touchmove", onMouseMove, false);

  // -------------- make the canvas fill its parent component -----------------

  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  window.addEventListener("resize", onResize, false);
  onResize();

  // ----------------------- socket.io connection ----------------------------
  const onDrawingEvent = (data) => {
    const w = canvas.width;
    const h = canvas.height;
    drawLine(
      data.x0 * w,
      data.y0 * h,
      data.x1 * w,
      data.y1 * h,
      allColors[data.color]
    );
  };

  socket.on("drawing", onDrawingEvent);
}

export default Canvas;
