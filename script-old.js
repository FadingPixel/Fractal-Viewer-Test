const ID = id => document.getElementById(id);
const MQ = MathQuill.getInterface(2);
const inputField = MQ.MathField(ID("eq"), {autoCommands: "pi theta sqrt sum"});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Initialization

const glCanv = ID("canvas");
glCanv.displayWidth = 0;
glCanv.displayHeight = 0;
glCanv.immediateResize = false;
const overCanv = ID("overlay-canvas");
overCanv.displayWidth = 0;
overCanv.displayHeight = 0;
overCanv.immediateResize = true;
const ctx = overCanv.getContext('2d');

const sidesidebar = ID("sidesidebar");

sidesidebar.addEventListener("click", () => {
    sidebar.classList.toggle("sbactive");
    glCanv.classList.toggle("sbactive");
    overCanv.classList.toggle("sbactive");
});

const MODE = {
    MANDELBROT: 0,
    EZ6: 1,
    MAND_PERT: 2
};

const rendererValues = {
    centerX: 0,
    centerY: 0,
    minWidth: 4,
    minHeight: 4,
    forceSquare: true,
    drawAxes: true,
    drawOrbit: true,
    mode: MODE.MANDELBROT,
    maxIterations: 500,
    bailoutRadius: 400
};

const onResizeCanvas = (entries) => {
    for (const entry of entries) {
        let width;
        let height;
        let dpr = window.devicePixelRatio;
        if (entry.devicePixelContentBoxSize) {
            // NOTE: Only this path gives the correct answer
            // The other 2 paths are an imperfect fallback
            // for browsers that don't provide anyway to do this
            width = entry.devicePixelContentBoxSize[0].inlineSize;
            height = entry.devicePixelContentBoxSize[0].blockSize;
            dpr = 1; // it's already in width and height
        } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
                width = entry.contentBoxSize[0].inlineSize;
                height = entry.contentBoxSize[0].blockSize;
            } else {
                // legacy
                width = entry.contentBoxSize.inlineSize;
                height = entry.contentBoxSize.blockSize;
            }
        } else {
            // legacy
            width = entry.contentRect.width;
            height = entry.contentRect.height;
        }
        entry.target.displayWidth = Math.round(width * dpr);
        entry.target.displayHeight = Math.round(height * dpr);
        if (entry.target.immediateResize) {
            entry.target.width = entry.target.displayWidth;
            entry.target.height = entry.target.displayHeight;
        }
    }
}
const resizeObserver = new ResizeObserver(onResizeCanvas);
resizeObserver.observe(glCanv, {box: 'content-box'});
resizeObserver.observe(overCanv, {box: 'content-box'});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Overlay

const getActualWidth = (canv, useClient) => {
    let {minWidth, minHeight, forceSquare} = rendererValues;
    
    const w = useClient ? canv.clientWidth : canv.width
    const h = useClient ? canv.clientHeight : canv.height;
    const ratio = minWidth / minHeight;
    let resRatio = w / h;
    
    if (forceSquare && resRatio > ratio) {
        return minWidth * resRatio / ratio;
    } else {
        return minWidth;
    }
};

const getActualHeight = (canv, useClient) => {
    let {minWidth, minHeight, forceSquare} = rendererValues;
    
    const w = useClient ? canv.clientWidth : canv.width
    const h = useClient ? canv.clientHeight : canv.height;
    const ratio = minHeight / minWidth;
    let resRatio = h / w;
    
    if (forceSquare && resRatio > ratio) {
        return minHeight * resRatio / ratio;
    } else {
        return minHeight;
    }
};

const pixelToCoordSpace = (x, y, canv, useClient) => {
    const {centerX, centerY} = rendererValues;

    const w = useClient ? canv.clientWidth : canv.width
    const h = useClient ? canv.clientHeight : canv.height;
    const width = getActualWidth(canv, useClient);
    const height = getActualHeight(canv, useClient);

    return [x * width / w + centerX - width / 2,
            (1 - y / h) * height + centerY - height / 2];
};

const coordToPixelSpace = (x, y, canv, useClient) => {
    const {centerX, centerY} = rendererValues;

    const w = useClient ? canv.clientWidth : canv.width
    const h = useClient ? canv.clientHeight : canv.height;
    const width = getActualWidth(canv, useClient);
    const height = getActualHeight(canv, useClient);

    return [(x - centerX + width/ 2)  * w / width,
            (1 - (y - centerY + height / 2) / height) * h];
};

let mouseDownCoords = [0,0];
let mouseDownCenter = [0,0];
let mouseDown = false;
let rMouseDown = false;
let mouseCoords = [0,0];

overCanv.addEventListener("mousedown", (e) => {
    if (e.button == 0) {
        mouseDownCoords = pixelToCoordSpace(e.offsetX, e.offsetY, overCanv, true);
        console.log(mouseDownCoords);
        mouseDownCenter = [rendererValues.centerX, rendererValues.centerY];
        mouseDown = true;
    } else if (e.button == 2) {
        rMouseDown = true;
    }
});

overCanv.addEventListener("mouseup", (e) => {
    if (e.button == 0) {
        mouseDown = false;
    } else if (e.button == 2) {
        rMouseDown = false;
    }
});

overCanv.addEventListener("mousemove", (e) => {
    mouseCoords = pixelToCoordSpace(e.offsetX, e.offsetY, overCanv, true);
    if (mouseDown) {
        rendererValues.centerX -= mouseCoords[0] - mouseDownCoords[0];
        rendererValues.centerY -= mouseCoords[1] - mouseDownCoords[1];
    }
});

overCanv.addEventListener("wheel", (e) => {
    e.preventDefault();
    let amt = e.deltaY / 100;
    if (amt == 0) return;
    amt = amt > 0 ? amt : -1 / amt;
    const coord = pixelToCoordSpace(e.offsetX, e.offsetY, overCanv, true);
    const ratio = rendererValues.minWidth / rendererValues.minHeight;
    rendererValues.minWidth *= amt
    rendererValues.minHeight *= amt;
    rendererValues.centerX = coord[0] + amt * (rendererValues.centerX - coord[0]);
    rendererValues.centerY = coord[1] + amt * (rendererValues.centerY - coord[1]);
    const threshold = 0.000000000001;
    if (rendererValues.minWidth < threshold || rendererValues.minHeight < threshold) {
        if (ratio > 1) {
            rendererValues.minHeight = threshold;
            rendererValues.minWidth = threshold * ratio;
        } else {
            rendererValues.minWidth = threshold;
            rendererValues.minHeight = threshold / ratio;
        }
    }
}, false);

const drawMandelbrotOrbit = (c) => {
    let zr = 0, zi = 0, cr = c[0], ci = c[1];
    let x, y;
    let [px, py] = coordToPixelSpace(cr, ci, overCanv, false);
    ctx.fillRect(px - 5, py - 5, 10, 10);
    for (let i = 0; i < rendererValues.maxIterations; i++) {
        [zr, zi] = [zr * zr - zi * zi + cr, 2 * zr * zi + ci];
        [x, y] = coordToPixelSpace(zr, zi, overCanv, false);
        ctx.fillRect(x - 5, y - 5, 10, 10);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        [px, py] = [x, y];
        if (zr * zr + zi * zi > 4) {
            return;
        }
    }
}

const runOverlay = () => {
    ctx.clearRect(0, 0, overCanv.width, overCanv.height);
    /*ctx.lineWidth = 4;
    ctx.strokeStyle = "#FFF";
    const [ox, oy] = coordToPixelSpace(0, 0, overCanv, false);
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(overCanv.width, oy);
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, overCanv.height);
    ctx.stroke();*/
    if (rendererValues.drawOrbit && rMouseDown) {
        ctx.fillStyle = "#FFF";
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 4;
        switch (rendererValues.mode) {
            case MODE.MANDELBROT:
                drawMandelbrotOrbit(mouseCoords);
                break;
        }
    }
};
const endOverlay = () => {

};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// WebGL

const gl = glCanv.getContext('webgl');

const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return false;
}

const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return false;
}

const resizeCanvasToDisplaySize = (canvas) => {
    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== canvas.displayWidth ||
                    canvas.height !== canvas.displayHeight;

    if (needResize) {
        // Make the canvas the same size
        canvas.width  = canvas.displayWidth;
        canvas.height = canvas.displayHeight;
    }

    return needResize;
}

const vertexShaderCodeClipToCoordSpace = () => {
    
    if (rendererValues.forceSquare) {
        return `
        vec2 clipToCoord(vec2 coord) {
            coord = (coord + vec2(1.0, 1.0)) * 0.5;
            float ratio = u_viewsize.y / u_viewsize.x;
            float resRatio = u_resolution.y / u_resolution.x;
            
            if (resRatio > ratio) {
                resRatio /= ratio;
                return vec2(coord.x * u_viewsize.x + u_viewcenter.x - u_viewsize.x * 0.5,
                            coord.y * u_viewsize.y * resRatio + u_viewcenter.y - u_viewsize.y * resRatio * 0.5);
            } else {
                resRatio = ratio / resRatio;
                return vec2(coord.x * u_viewsize.x * resRatio + u_viewcenter.x - u_viewsize.x * resRatio * 0.5,
                            coord.y * u_viewsize.y + u_viewcenter.y - u_viewsize.y * 0.5);
            }
        }
        `;
    } else {
        return `
        vec2 clipToCoord(vec2 coord) {
            coord = (coord + vec2(1.0, 1.0)) * 0.5;
            return vec2(coord.x * u_viewsize.x + u_viewcenter.x - u_viewsize.x * 0.5,
                        coord.y * u_viewsize.y + u_viewcenter.y - u_viewsize.y * 0.5);
        }
        `;
    }
}

const complexNumFuncs = `vec2 cPowN( vec2 c, float n ) {
    float t = atan(c.y, c.x) * n;
    float r = sqrt(c.x * c.x + c.y * c.y);
    return pow(r,n) * vec2(cos(t), sin(t));
}

vec2 ePowC( vec2 c ) {
    return exp(c.x) * vec2(cos(c.y), sin(c.y));
}

vec2 cMul( vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 cPowC( vec2 a, vec2 b ) {
    float r = sqrt(a.x * a.x + a.y * a.y);
    float lnr = log(r) * b.y;
    return pow(r, b.x) * cMul(
            ePowC(vec2(-b.y, b.x) * atan(a.y, a.x)),
            vec2(cos(lnr), sin(lnr))
           );
}

vec2 cPMul( vec2 a, vec2 b) {
    return vec2(a.x * b.x, a.y * b.y);
}

vec2 cPSq( vec2 z ) {
    return vec2(z.x * z.x, z.y * z.y);
}

vec2 cInv( vec2 x ) {
    return vec2(x.x, -x.y) / (x.x * x.x + x.y * x.y);
}

vec2 cDiv( vec2 a, vec2 b ) {
    return cMul(a, cInv(b));
}

vec2 cSq( vec2 x ) {
    return vec2(x.x * x.x - x.y * x.y, 2.0 * x.x * x.y);
}`;

const runGL = () => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
    attribute vec4 a_position;
    varying vec2 v_position;
    uniform vec2 u_resolution;
    uniform vec2 u_viewcenter;
    uniform vec2 u_viewsize;
    ${vertexShaderCodeClipToCoordSpace()}
    void main() {
        v_position = clipToCoord(a_position.xy);
        gl_Position = a_position;
    }
    `);
    if (!vertexShader) {
        alert('Vertex shader error (sorry)');
        return;
    }

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 v_position;
    uniform float u_time;
    uniform vec2 u_pxsz;
    uniform vec2 u_mouse;

    ${complexNumFuncs}

    // ~~~

    int myCoolThing( vec2 z ) {
        vec2 c = vec2(-1.1842105263157894, 0.905263157894737);
        for (int i = 0; i < ${rendererValues.maxIterations.toFixed(0)}; i++) {
            //z = ePowC(cPowN(z, 6.0)) + c;
            z = ePowC(vec2(z.x * z.x * z.x * z.x * z.x * z.x - 
                    15.0 * z.x * z.x * z.x * z.x * z.y * z.y + 
                    15.0 * z.x * z.x * z.y * z.y * z.y * z.y - 
                        z.y * z.y * z.y * z.y * z.y * z.y,
                        
                    6.0 * z.x * z.x * z.x * z.x * z.x * z.y - 
                    20.0 * z.x * z.x * z.x * z.y * z.y * z.y + 
                    6.0 * z.x * z.y * z.y * z.y * z.y * z.y)) + c;
            
            if (z.x * z.x + z.y * z.y >= ${rendererValues.bailoutRadius.toFixed(3)}) {
                return i;
            }
        }
        return -1;
    }

    int mand(vec2 c) {
        vec2 z = vec2(0.0);
        for (int i = 0; i < ${rendererValues.maxIterations.toFixed(0)}; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z,z) > 4.0) return i;
        }
        return -1;
    }

    int mand_pert(vec2 c, vec2 dc) {
        vec2 z = vec2(0.0);
        vec2 dz = vec2(0.0);
        for (int i = 0; i < ${rendererValues.maxIterations.toFixed(0)}; i++) {
            // z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            dz = cMul(2.0*z + dz, dz) + dc; // https://www.shadertoy.com/view/ttVSDW
            z = cSq(z) + c;
            if (/*dot(z,z) > 4.0 || */dot(dz,dz) > 4.0) return i;
        }
        return -1;
    }

    // ~~~

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        int m = ${
            (() => {
                switch (rendererValues.mode) {
                    case MODE.EZ6:
                        return "myCoolThing(v_position)";
                    default:
                        return "mand(v_position)";
                }
            })()
        };
        if (m == -1) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            float k = sqrt(float(m)) / 10.0;
            gl_FragColor = vec4(hsv2rgb(vec3(k, 1.0, 1.0)), 1.0);
        }
        //vec2 pos = (v_position + 1.0) * 0.5;
        //gl_FragColor = vec4(0.5 + 0.5*cos(u_time+pos.xyx+vec3(0,2,4)), 1.0);
        ${ rendererValues.drawAxes ? 
        `if (min(abs(v_position.x)/u_pxsz.x, abs(v_position.y)/u_pxsz.y) < 2.0 || 
            ((abs(fract(v_position.x + 0.5) - 0.5) / u_pxsz.x < 2.0) && (abs(v_position.y)/u_pxsz.y < 10.0)) ||
            ((abs(fract(v_position.y + 0.5) - 0.5) / u_pxsz.y < 2.0) && (abs(v_position.x)/u_pxsz.x < 10.0))) {
            gl_FragColor = vec4(vec3(1.0) - gl_FragColor.xyz, gl_FragColor.w);
        }` : ""}
    }
    `);
    if (!fragmentShader) {
        alert('Fragment shader error (sorry)');
        return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        alert('Program linking error (sorry)');
        return;
    }

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    
    const positions = [
        -1,-1,  -1,1,   1,1,
        -1,-1,  1,1,    1,-1
    ];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    let clipWidth, clipHeight;
    const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

    const viewcenterUniformLocation = gl.getUniformLocation(program, "u_viewcenter");
    const viewsizeUniformLocation = gl.getUniformLocation(program, "u_viewsize");

    const startTime = Date.now();
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");
    
    const pxszUniformLocation = gl.getUniformLocation(program, "u_pxsz");

    const mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");

    let animFrame = -1;
    const drawGL = () => {
        resizeCanvasToDisplaySize(glCanv);
        gl.viewport(0, 0, glCanv.width, glCanv.height);
        //clipHeight = glCanv.height > glCanv.width ? glCanv.height / glCanv.width : 1;
        //clipWidth = glCanv.width > glCanv.height ? glCanv.width / glCanv.height : 1;
        clipHeight = glCanv.height;
        clipWidth = glCanv.width;


        gl.clearColor(0.2, 0.2, 0.2, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

 
        let size = 2;          // 2 components per iteration
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer

        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(
            positionAttributeLocation, size, type, normalize, stride, offset);

        gl.uniform2f(resolutionUniformLocation, clipWidth, clipHeight);
        gl.uniform1f(timeUniformLocation, (Date.now() - startTime) * 0.001);
        let [x, y] = pixelToCoordSpace(0, 0, glCanv, false);
        gl.uniform2f(pxszUniformLocation, 
            Math.abs(pixelToCoordSpace(glCanv.width, 0, glCanv, false)[0] - x) / glCanv.width, 
            Math.abs(pixelToCoordSpace(0, glCanv.height, glCanv, false)[1] - y) / glCanv.height);
        gl.uniform2f(viewcenterUniformLocation, rendererValues.centerX, rendererValues.centerY);
        gl.uniform2f(viewsizeUniformLocation, rendererValues.minWidth, rendererValues.minHeight);
        
        gl.uniform2f(mouseUniformLocation, mouseCoords[0], mouseCoords[1]);
        
        gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
        runOverlay();
        animFrame = requestAnimationFrame(drawGL);
    }
    animFrame = requestAnimationFrame(drawGL);

    const endGL = function() {
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteProgram(program);
        gl.deleteBuffer(positionBuffer);
        endOverlay();
        cancelAnimationFrame(animFrame);
    };
    return endGL;
};

let endGL;
if (!gl) {
    alert('WebGL not supported :-(');
} else {
    endGL = runGL();
}