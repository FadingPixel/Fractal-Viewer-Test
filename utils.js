const DOM = x => document.querySelector(x);
const DOMs = x => document.querySelectorAll(x);
const sidebar = DOM("#sidebar"),
      clickbar = DOM("#clickbar"),
      canvasContainer = DOM("#canvas-container"),
      glCanvas = DOM("#canvas"),
      overCanvas = DOM("#overlay-canvas");



const MODE = {
    COLORS: 0,
    MANDELBROT: 1,
    SMOOTH_MANDELBROT: 2,
    MY_FRACTAL: 3
};

const COLOR_MODE = {
    RAINBOW: 0,
    BLACK_AND_WHITE: 1
};