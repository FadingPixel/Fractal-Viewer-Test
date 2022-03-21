const glslFiles = {
    "uniforms": "",
    "spaceConversions": "",
    "complexMath": "",
    "vertMain": "",
    "fragMain": "",
    "fragColors": "",
    "axes": "",
    "fragEnd": "",
    "fragMandelbrot": "",
    "fragSmoothMandelbrot": "",
    "fragMyFractal": ""
};
for (let file in glslFiles) {
    console.log(file);
    glslFiles[file] = document.getElementById(file + ".glsl").innerHTML.replace(/\n|\s\s\s\s|\t/g,"");
}

const tokenReplace = (string, pairs) => {
    for (let pair of pairs) {
        const regex = new RegExp("\\[\\[\\[" + pair[0] + "\\]\\]\\]","g");
        string = string.replace(regex, pair[1]);
    }
    return string;
};

const createVertShaderFromOptions = (options) => {
    return glslFiles.uniforms + 
           glslFiles.spaceConversions + 
           glslFiles.vertMain;
};

const colorModes = {
    [COLOR_MODE.RAINBOW]: "color = colorRainbow(m);",
    [COLOR_MODE.BLACK_AND_WHITE]: "color = colorBlackWhite(m);"
};

const zcFromType = (type, x, y) => {
    if (type == "param") return "param";
    if (type == "mouse") return "u_rmdown";
    else return "vec2(" + x.toFixed(100) + ", " + y.toFixed(100) + ")";
};

const createFragShaderFromOptions = (options) => {
    let str = "#define PI 3.14159265358979323\nprecision highp float;" + 
                glslFiles.uniforms + glslFiles.complexMath;
    switch (options.mode) {
        case MODE.COLORS:
            str += glslFiles.fragColors;
            break;
        case MODE.MANDELBROT:
            str += tokenReplace(glslFiles.fragMandelbrot, [["ITERS", options.modeSpecific.iters.toFixed(0)],
                                                           ["C", zcFromType(options.modeSpecific.ctype, options.modeSpecific.cx, options.modeSpecific.cy)],
                                                           ["Z", zcFromType(options.modeSpecific.ztype, options.modeSpecific.zx, options.modeSpecific.zy)]]) 
                + colorModes[options.colorMode];
            break;
        case MODE.SMOOTH_MANDELBROT:
            str += tokenReplace(glslFiles.fragSmoothMandelbrot, [["ITERS", options.modeSpecific.iters.toFixed(0)],
                                                           ["C", zcFromType(options.modeSpecific.ctype, options.modeSpecific.cx, options.modeSpecific.cy)],
                                                           ["Z", zcFromType(options.modeSpecific.ztype, options.modeSpecific.zx, options.modeSpecific.zy)]]) 
                + colorModes[options.colorMode];
            break;
        case MODE.MY_FRACTAL:
            str += tokenReplace(glslFiles.fragMyFractal, [["ITERS", options.modeSpecific.iters.toFixed(0)]]) 
                + colorModes[options.colorMode];
            break;
    }
    if (options.showAxes) {
        str += glslFiles.axes;
    }
    str += glslFiles.fragEnd;
    return str;
}

