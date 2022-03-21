clickbar.addEventListener("click", e => {
    sidebar.classList.toggle("sidebar-active");
    canvasContainer.classList.toggle("sidebar-active");
});

resizeObserver.observe(glCanvas, {box: 'content-box'});

// ~~~

let options = {
    forceSquare: true,
    showAxes: false,
    width: 4,
    height: 4,
    centerX: 0,
    centerY: 0,
    mode: MODE.SMOOTH_MANDELBROT,
    colorMode: COLOR_MODE.RAINBOW,
    modeSpecific: {}
};

// ~~~

const mouse = {
    x: 0,
    y: 0,
    downX: 0,
    downY: 0,
    rDownX: 0,
    rDownY: 0,
    downCenterX: 0,
    downCenterY: 0,
    down: false,
    rDown: false
};

overCanvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
});

overCanvas.addEventListener("mousedown", (e) => {
    const coords = normToCoordSpace(e.offsetX / overCanvas.clientWidth, e.offsetY / overCanvas.clientHeight, options);
    if (e.button == 0) {
        [mouse.downX, mouse.downY] = [coords.x, coords.y];
        [mouse.downCenterX, mouse.downCenterY] = [options.centerX, options.centerY];
        mouse.down = true;
        console.log(mouse.downX, mouse.downY);
    } else if (e.button == 2) {
        [mouse.rDownX, mouse.rDownY] = [coords.x, coords.y];
        mouse.rDown = true;
    }
});

overCanvas.addEventListener("mouseup", (e) => {
    if (e.button == 0) {
        mouse.down = false;
    } else if (e.button == 2) {
        mouse.rDown = false;
    }
});

overCanvas.addEventListener("mousemove", (e) => {
    const coords = normToCoordSpace(e.offsetX / overCanvas.clientWidth, e.offsetY / overCanvas.clientHeight, options);
    [mouse.x, mouse.y] = [coords.x, coords.y];
    if (mouse.down) {
        options.centerX -= mouse.x - mouse.downX;
        options.centerY -= mouse.y - mouse.downY;
    }
    if (mouse.rDown) {
        [mouse.rDownX, mouse.rDownY] = [coords.x, coords.y];
    }
});

overCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    let amt = e.deltaY / 100;
    if (amt == 0) return;
    amt = amt > 0 ? amt : -1 / amt;

    const coords = normToCoordSpace(e.offsetX / overCanvas.clientWidth, e.offsetY / overCanvas.clientHeight, options);
    const ratio = options.width / options.height;

    options.width *= amt
    options.height *= amt;
    options.centerX = coords.x + amt * (options.centerX - coords.x);
    options.centerY = coords.y + amt * (options.centerY - coords.y);
    const threshold = 0.000001;
    if (options.width < threshold || options.height < threshold) {
        if (ratio > 1) {
            options.height = threshold;
            options.width = threshold * ratio;
        } else {
            options.width = threshold;
            options.height = threshold / ratio;
        }
    }
}, false);

// ~~~

const runOverlay = () => {};
const endOverlay = () => {};
const gl = glCanvas.getContext('webgl');
let endGL = () => {};
if (!gl) {
    alert('WebGL not supported :-(');
}