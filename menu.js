sidebar.addText = (text) => sidebar.appendChild(document.createTextNode(text));
sidebar.addElems = (els) => els.split("/").forEach(el => sidebar.appendChild(document.createElement(el)));

const createLabelFor = (text, name) => {
    const label = document.createElement("label");
    label.for = name;
    label.innerText = text;
    return label;
};

const createModeSelector = (container, text, name, modes, names, def) => {
    container.appendChild(createLabelFor(text, name));
    const select = document.createElement("select");
    select.name = name;
    for (let i = 0; i < modes.length; i++) {
        const option = document.createElement("option");
        option.value = modes[i].toString();
        option.innerText = names[i];
        if (i == def) option.selected = true;
        select.appendChild(option);
    }
    container.appendChild(select);
    return select;
};

const createTextInput = (container, text, name, isNumber, def) => {
    container.appendChild(createLabelFor(text, name));
    const input = document.createElement("input");
    input.type = isNumber ? "number" : "text";
    if (isNumber) input.step = "any";
    input.name = name;
    input.value = def;
    container.appendChild(input);
    return input;
};

const createSubmit = (container, text) => {
    const input = document.createElement("input");
    input.type = "submit";
    input.value = text;
    container.appendChild(input);
    return input;
}

const createCheckbox = (container, text, name, def) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    if (def) input.checked = true;
    container.appendChild(input);
    container.appendChild(createLabelFor(text, name));
    return input;
};

const modeSelector = createModeSelector(sidebar, "Choose mode: ", "mode", [MODE.MANDELBROT, MODE.SMOOTH_MANDELBROT, MODE.MY_FRACTAL], ["Mandelbrot", "Smooth Mandelbrot", "My Fractal"], 0);
sidebar.addElems("br/br/hr/br");

const createMenuFor = {};

createMenuFor.genericMandelbrotType = (subMenu, defIters) => {
    subMenu.addElems("br");
    const iters = createTextInput(subMenu, "Maximum Iterations (More = Lag): ", "modeSpecific.iters", true, defIters);
    iters.step = 1;
    iters.min = 1;
    subMenu.addElems("br/br");
};

createMenuFor.mandelbrotType = (subMenu, defIters) => {
    createMenuFor.genericMandelbrotType(subMenu, defIters);
    const cselect = createModeSelector(subMenu, "c is: ", "modeSpecific.ctype", ["const", "param", "mouse"], ["A constant number", "The point on the graph", "The mouse right click coordinate"], 1);
    subMenu.addElems("br");
    const cx = createTextInput(subMenu, "c x coord:", "modeSpecific.cx", true, 0);
    subMenu.addElems("br");
    const cy = createTextInput(subMenu, "c y coord:", "modeSpecific.cy", true, 0);
    subMenu.addElems("br");
    cx.disabled = cy.disabled = true;
    cselect.addEventListener("input", (e) => {
        cx.disabled = cy.disabled = (e.target.value != "const");
    });
    subMenu.addElems("br");
    const zselect = createModeSelector(subMenu, "Initial z is: ", "modeSpecific.ztype", ["const", "param", "mouse"], ["A constant number", "The point on the graph", "The mouse right click coordinate"], 0);
    subMenu.addElems("br");
    const zx = createTextInput(subMenu, "z x coord:", "modeSpecific.zx", true, 0);
    subMenu.addElems("br");
    const zy = createTextInput(subMenu, "z y coord:", "modeSpecific.zy", true, 0);
    subMenu.addElems("br");
    zselect.addEventListener("input", (e) => {
        zx.disabled = zy.disabled = (e.target.value != "const");
    });
    subMenu.addElems("br/br");
};

createMenuFor[MODE.MANDELBROT] = (subMenu) => {
    createMenuFor.mandelbrotType(subMenu, 500);
};

createMenuFor[MODE.SMOOTH_MANDELBROT] = (subMenu) => {
    createMenuFor.mandelbrotType(subMenu, 300);
};

createMenuFor[MODE.MY_FRACTAL] = (subMenu) => {
    createMenuFor.genericMandelbrotType(subMenu, 100);
};

const createSubMenu = (createSpecialMenu) => {
    (x => x == null ? "" : x.remove())(DOM("#sub-menu"));
    const subMenu = document.createElement("form");
    subMenu.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = new FormData(subMenu);
        const value = Object.fromEntries(data.entries());

        const checkboxes = subMenu.querySelectorAll("input[type=checkbox]");
        for (let input of checkboxes) {
            value[input.name] = value[input.name] == 'on' ? true : false;
        }

        const numbers = subMenu.querySelectorAll("input[type=number]");
        for (let input of numbers) {
            if (!input.disabled) {
                value[input.name] = parseFloat(value[input.name]);
                if (isNaN(value[input.name])) {
                    alert("Invalid number");
                    return false;
                }
            }
        }

        const keys = Object.keys(value);
        for (let key of keys) {
            const split = key.split('.');
            if (split.length > 1) {
                let obj = value;
                while (split.length > 1) {
                    if (!obj.hasOwnProperty(split[0])) obj[split[0]] = {};
                    obj = obj[split[0]];
                    split.shift();
                }
                obj[split[0]] = value[key];
                delete value[key];
            }
        }

        console.log(value);
        options = value;
        options.mode = parseInt(modeSelector.value);
        options.colorMode = COLOR_MODE.RAINBOW; // TODO: Remove color workaround
        endGL();
        endGL = runGL(gl, options, mouse, runOverlay, endOverlay);
    });
    subMenu.addText = (text) => subMenu.appendChild(document.createTextNode(text));
    subMenu.addElems = (els) => els.split("/").forEach(el => subMenu.appendChild(document.createElement(el)));
    subMenu.id = "sub-menu";
    sidebar.appendChild(subMenu);
    createTextInput(subMenu, "Center x: ", "centerX", true, 0);
    subMenu.addElems("br");
    createTextInput(subMenu, "Center y: ", "centerY", true, 0);
    subMenu.addElems("br");
    createTextInput(subMenu, "Width: ", "width", true, 4);
    subMenu.addElems("br");
    createTextInput(subMenu, "Height: ", "height", true, 4);
    subMenu.addElems("br/br");
    createCheckbox(subMenu, "Force Square Aspect Ratio", "forceSquare", true);
    subMenu.addElems("br");
    createCheckbox(subMenu, "Show Axes", "showAxes", false);
    subMenu.addElems("br");

    if (createSpecialMenu) createSpecialMenu(subMenu);

    createSubmit(subMenu, "Render");
};

createSubMenu(createMenuFor[MODE.MANDELBROT]);

modeSelector.addEventListener("input", (e) => {
    createSubMenu(createMenuFor[e.target.value]);
});