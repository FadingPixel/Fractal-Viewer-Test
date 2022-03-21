let canvasWidth = 0,
    canvasHeight = 0;
const onResizeCanvas = (entries) => {
    for (const entry of entries) {
        let dpr = window.devicePixelRatio;
        if (entry.devicePixelContentBoxSize) {
            // NOTE: Only this path gives the correct answer
            // The other 2 paths are an imperfect fallback
            // for browsers that don't provide anyway to do this
            canvasWidth = entry.devicePixelContentBoxSize[0].inlineSize;
            canvasHeight = entry.devicePixelContentBoxSize[0].blockSize;
            dpr = 1; // it's already in width and height
        } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
                canvasWidth = entry.contentBoxSize[0].inlineSize;
                canvasHeight = entry.contentBoxSize[0].blockSize;
            } else {
                // legacy
                canvasWidth = entry.contentBoxSize.inlineSize;
                canvasHeight = entry.contentBoxSize.blockSize;
            }
        } else {
            // legacy
            canvasWidth = entry.contentRect.width;
            canvasHeight = entry.contentRect.height;
        }
        canvasWidth = Math.round(canvasWidth * dpr);
        canvasHeight = Math.round(canvasHeight * dpr);
    }
}
const resizeObserver = new ResizeObserver(onResizeCanvas);

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

const getActualDimensions = (options) => {
    if (options.forceSquare) {
        let {width, height} = options;
        const rw = options.width / canvasWidth,
              rh = options.height / canvasHeight;
        if (rh > rw) {
            width = rh * canvasWidth;
        } else {
            height = rw * canvasHeight;
        }
        return {width, height};
    } else {
        return {
            width: options.width,
            height: options.height
        };
    }
};

const normToCoordSpace = (x, y, options) => {
    const dims = getActualDimensions(options);
    return {
        x: (x - 0.5) * dims.width + options.centerX,
        y: (0.5 - y) * dims.height + options.centerY
    }
};

const coordToNormSpace = (x, y, options) => {
    const dims = getActualDimensions(options);
    return {
        x: (x - options.centerX) / dims.width + 0.5,
        y: 0.5 - (y - options.centerY) / dims.height
    }
}

const runGL = (gl, options, mouse, runOverlay, endOverlay) => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, createVertShaderFromOptions(options));
    if (!vertexShader) {
        alert('Vertex shader error (sorry)');
        return;
    }

    const fragmentShaderSource = createFragShaderFromOptions(options);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) {
        alert('Fragment shader error (sorry)');
        console.log(fragmentShaderSource);
        return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        alert('Program linking error (sorry)');
        return;
    }

    const positionAttributeLocation = gl.getAttribLocation(program, "a_pos");
    
    const positions = [
        -1,-1,  -1,1,   1,1,
        -1,-1,  1,1,    1,-1
    ];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const startTime = Date.now();
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");

    const viewUniformLocation = gl.getUniformLocation(program, "u_view");

    const pxszUniformLocation = gl.getUniformLocation(program, "u_pxsz");

    const mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
    const mouseDownUniformLocation = gl.getUniformLocation(program, "u_mdown");
    const rightMouseDownUniformLocation = gl.getUniformLocation(program, "u_rmdown");

    let animFrame = -1;
    const drawGL = () => {
        if (glCanvas.width != canvasWidth || glCanvas.height != canvasHeight) {
            glCanvas.width = canvasWidth;
            glCanvas.height = canvasHeight;
            overCanvas.width = canvasWidth;
            overCanvas.height = canvasHeight;
        }
        gl.viewport(0, 0, canvasWidth, canvasHeight);


        gl.clearColor(0.2, 0.2, 0.2, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        let size = 2;            // 2 components per iteration
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer

        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(
            positionAttributeLocation, size, type, normalize, stride, offset);

        gl.uniform1f(timeUniformLocation, (Date.now() - startTime) * 0.001);
        
        const display = getActualDimensions(options);
        gl.uniform4f(viewUniformLocation, options.centerX, options.centerY, display.width, display.height);
        
        gl.uniform2f(pxszUniformLocation, display.width / canvasWidth, display.height / canvasHeight);

        gl.uniform2f(mouseUniformLocation, mouse.x, mouse.y);
        gl.uniform2f(mouseDownUniformLocation, mouse.downX, mouse.downY);
        gl.uniform2f(rightMouseDownUniformLocation, mouse.rDownX, mouse.rDownY);
        
        gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
        runOverlay();
        animFrame = requestAnimationFrame(drawGL);
    }
    animFrame = requestAnimationFrame(drawGL);

    const endGL = function() {
        endOverlay();
        cancelAnimationFrame(animFrame);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteProgram(program);
        gl.deleteBuffer(positionBuffer);
    };
    return endGL;
};