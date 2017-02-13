"use strict";

let program, canvas, gl, ctm, width, height;
let modelView, projection, instanceMatrix;


let xAxis = 0;
let yAxis = 1;
let zAxis = 2;
let axis = 0;
let theta = [100, 0, 0];
let thetaLoc;

let flag = true;

let numVertices = 36;
let pointsArray = [];

// Buffer for readPixels
let framebuffer, renderbuffer;
let color = new Uint8Array(4);


// Antall kuber å tegne
let numberOfElements = 10;
let randomTranslations = [];
let randomColors = [];
let isGameFinished = false;


let red = new Float32Array([1, 0, 0, 1]);
let yellow = new Float32Array([1, 1, 0, 1])
let white = new Float32Array([1, 1, 1, 1]);
let green = new Float32Array([0, 1, 0, 1]);
let blue = new Float32Array([0, 0, 1, 1]);



/************************************************************************
 * INIT
 **********************************************************************/
window.onload = () => {

    setupWebGL();

// Generer noen tilfeldige farger og transformasjonskoeffisienter
    generateRandoms();


// Init picking texture
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);


// Init Render Buffer
    renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);


// Allokerer framebuffer objekt
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0); // Attach color buffer
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);


// Clean up
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


// Sjekk status på framebuffer
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) alert('Frame Buffer Not Complete');


// Last shadere og initialiser attributt buffere
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    colorCube();


    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        alert("this combination of attachments does not work");
        return;
    }

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    thetaLoc = gl.getUniformLocation(program, "theta");


    //viewerPos = vec3(0.0, 0.0, -100.0);
    projection = ortho(-1, 1, -1, 1, -100, 100);


    gl.useProgram(program);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"),
        false, flatten(projection));


    // Canvas eventlistener
    canvas.addEventListener("mousedown", changeColor);


    render();
}


/**
 * 1) Bind framebuffer
 * 2) Nullstill dybdebuffer og fargebuffer
 * 3) Kall drawCubes som tegner kubene
 * 4) Unbinder framebuffer
 * 5) Nullstiller buffere igjen
 * 6) Kall drawCubes som tegner kubene
 * 7) Request animframe med callback til render()
 *
 */
let render = () => {

    if (isGameFinished) {
        //alert("GAME OVER");
        isGameFinished = false;
    }

    if (flag) {
        //theta[axis] += 1.0;
        for (let i = 0; i < 3; i++) {
            theta[i] += 1.0;
        }
    }

    if (theta[axis] > 500) {
        theta[axis] = 50;
    }


    gl.clearColor(0, 0, 0, 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    drawCubes();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    drawCubes();

    requestAnimFrame(render);
}


/**
 * Tegn kuber
 */

let drawCubes = () => {

    for (let i = 0; i < numberOfElements; i++) {

        let x =  -2 + i * 1.4;
        let y = 5 - theta[axis] / 50;
        let z = (i == 0) ? numberOfElements + 1 : 0; // Sørg for at den røde kuben blir lagt fremst, sånn at det blir mulig å klikke på den

        let translationMatrix = makeTranslationMatrix(x,y,z);

        // Bruk translasjonsmatrise
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "translate"),
            false, translationMatrix);

        // Tilfeldig farge
        gl.uniform4fv(gl.getUniformLocation(program, "vColor"), randomColors[i]);

        // Tilfeldig skalering
        instanceMatrix = mult(translate(0.0, 0.0, 0.0), scale4(randomTranslations[i], randomTranslations[i], randomTranslations[i]));

        modelView = mat4()
        modelView = mult(modelView, instanceMatrix);
        // modelView = mult(modelView, rotate(theta[xAxis], [1, 0, 0]));
        // modelView = mult(modelView, rotate(theta[yAxis], [0, 1, 0]));
        // modelView = mult(modelView, rotate(theta[zAxis], [0, 0, 1]));

        // Bruk modelView-matrise
        gl.uniformMatrix4fv(gl.getUniformLocation(program,
            "modelViewMatrix"), false, flatten(modelView));

        // Tegn
        gl.drawArrays(gl.TRIANGLES, 0, numVertices);
    }

}


/***
 * Eventlistener for canvas
 * @param event
 */
let changeColor = function (event) {

    var x = event.clientX;
    var y = canvas.height - event.clientY;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);

    console.log(color)

    // Hvis framebufferen har lest fargen rød så avsluttes spillet
    if (isRed(color)) {
        isGameFinished = true;
        document.getElementById("message").classList.add("red");
        document.getElementById("message").textContent = "Hurra! Du vant!";
    }
    else if (isBlue(color)) {
        document.getElementById("message").classList.add("blue");
        document.getElementById("message").textContent = "Du fikk en blå kube!";
    }

    else if (isYellow(color)) {
        document.getElementById("message").classList.add("yellow");
        document.getElementById("message").textContent = "Du fikk en gul kube!";
    }

    else if (isGreen(color)) {
        document.getElementById("message").classList.add("green");
        document.getElementById("message").textContent = "Du fikk en grønn kube!";
    }
    else if (isWhite(color)) {
        document.getElementById("message").classList.add("white");
        document.getElementById("message").textContent = "Du fikk en hvit kube!";
    }


    else {
        // Bakgrunn
    }
}



/* Genererer en array av tilfeldige farger og translasjonsfaktorer ved init
 */
function generateRandoms() {

    for (let i = 0; i < numberOfElements; i++) {

        let rand = Math.random();

        // Legger alltid den røde kuben først...
        if (i == 0) {
            randomColors[i] = red;
        } else {
            if (rand > 0.1 && rand < 0.3) {
                randomColors[i] = yellow;
            }
            else if (rand > 0.3 && rand < 0.5) {
                randomColors[i] = blue;
            }
            else if (rand > 0.5 && rand < 0.7) {
                randomColors[i] = green;
            }
            else if (rand > 0.7 && rand < 0.9) {
                randomColors[i] = white;
            }
            else {
                randomColors[i] = blue;
            }
        }

        // Retter litt på størrelse
        // Vil ikke ha for store / små kuber
        if (rand > 0.6 || rand < 0.15) {
            //rand = rand*(-1);
            rand = 0.4;
        }
        randomTranslations[i] = rand;
    }

}

function isRed(color) {
    if (color.length < 3) return false;
    return color[0] == 255 && color[1] == 0 && color[2] == 0;
}

function isBlue(color) {
    if (color.length < 3) return false;
    return color[0] == 0 && color[1] == 0 && color[2] == 255;
}

function isGreen(color) {
    if (color.length < 3) return false;
    return color[0] == 0 && color[1] == 255 && color[2] == 0;
}

function isYellow(color) {
    if (color.length < 3) return false;
    return color[0] == 255 && color[1] == 255 && color[2] == 0;
}

function isWhite(color) {
    if (color.length < 3) return false;
    return color[0] == 255 && color[1] == 255 && color[2] == 255;
}








/********************************************************************
 *          Funksjoner som ikke har med spillogikken                *
 ********************************************************************/


/**
 * Returnerer en translasjonsmatrise
 * @param x
 * @param y
 * @param z
 * @returns {number[]}
 */

function makeTranslationMatrix(x, y, z) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}


function setupWebGL() {

    canvas = document.getElementById("gl-canvas");

    var ctx = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    width = canvas.width;
    height = canvas.height;

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}


// Remove when scale in MV.js supports scale matrices

function scale4(a, b, c) {
    var result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}

function quad(a, b, c, d) {

    let vertices = [
        vec4(-0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, 0.5, 0.5, 1.0),
        vec4(0.5, 0.5, 0.5, 1.0),
        vec4(0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4(-0.5, 0.5, -0.5, 1.0),
        vec4(0.5, 0.5, -0.5, 1.0),
        vec4(0.5, -0.5, -0.5, 1.0)
    ];

    pointsArray.push(vertices[a]);
    pointsArray.push(vertices[b]);
    pointsArray.push(vertices[c]);
    pointsArray.push(vertices[a]);
    pointsArray.push(vertices[c]);
    pointsArray.push(vertices[d]);

}


function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

