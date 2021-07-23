/******************************* Shader helpers *******************************/

function radians(angle) {
    return angle*Math.PI/180;
}

function initializeWebGL(canvas) {
        // Getting WebGL context the right way
        var gl = null;
        try {
            gl = canvas.getContext("experimental-webgl");
            if (!gl) {
                gl = canvas.getContext("webgl");
            }
        } catch (error) {
            // NO-OP
        }
        if (!gl) {
            alert("Could not get WebGL context!");
            throw new Error("Could not get WebGL context!");
        }
        return gl;
}

function createShader(gl, shaderScriptId) {
    // Step 1: Get the shader source.
    var shaderScript = $("#" + shaderScriptId);
    var shaderSource = shaderScript[0].text;
    // Step 2: Confirm the type of the shader you want to create.
    var shaderType = null;
    if (shaderScript[0].type == "x-shader/x-vertex") {
        shaderType = gl.VERTEX_SHADER;
    } else if (shaderScript[0].type == "x-shader/x-fragment") {
        shaderType = gl.FRAGMENT_SHADER;
    } else {
        throw new Error("Invalid shader type: " + shaderScript[0].type)
    }
    // Step 3: Create the shader.
    var shader = gl.createShader(shaderType);
    // Step 4: Set the shader source.
    gl.shaderSource(shader, shaderSource);
    // Step 5: Compile the shader.
    gl.compileShader(shader);
    // Step 6: Check for errors.
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var infoLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("An error occurred compiling the shader: " + infoLog);
    } else {
        return shader;
    }
}

function createGlslProgram(gl, vertexShaderId, fragmentShaderId) {
    // Step 1: Create a program object.
    var program = gl.createProgram();
    // Step 2: Attach the shaders.
    gl.attachShader(program, createShader(gl, vertexShaderId));
    gl.attachShader(program, createShader(gl, fragmentShaderId));
    // Step 3: Link the program.
    gl.linkProgram(program);
    // Step 4: Validate the program.
    gl.validateProgram(program);
    // Step 5: Check for errors.
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var infoLog = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error("An error occurred linking the program: " + infoLog);
    } else {
        return program;
    }
}

function createTexture(image) {
    // Step 1: Create the texture object.
    texture = gl.createTexture();
    // Step 2: Bind the texture object to the "target" TEXTURE_2D
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Step 3: (Optional) Tell WebGL that pixels are flipped vertically,
    //         so that we don't have to deal with flipping the y-coordinate.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Step 4: Download the image data to the GPU.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // Step 5: (Optional) Create a mipmap so that the texture can be anti-aliased.
    gl.generateMipmap(gl.TEXTURE_2D);
    // Step 6: Clean up.  Tell WebGL that we are done with the target.
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
}

function createShape(gl, data) {
    var shape = {};
    shape.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    shape.lineIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape.lineIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.lineInd), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    shape.triIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape.triIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.triInd), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    shape.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.uvs), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    shape.lineLen = data.lineInd.length;
    shape.triLen = data.triInd.length;
    shape.lineColor = data.lineColor;
    shape.fillColor = data.fillColor;
    return shape;
}

function drawShape(gl, shape, program, xf, texture) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.vertexBuffer);
    var positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 4 * 3, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, shape.uvBuffer);
    var texLocation = gl.getAttribLocation(program, "vert_texCoord");
    gl.enableVertexAttribArray(texLocation);
    gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 4 * 2, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "toWorld"), false, xf);
    // gl.uniform3fv(gl.getUniformLocation(program, "color"), shape.fillColor);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape.triIndexBuffer);

    if (gl.getUniformLocation(program, "texture") != null) {
        // Step 1: Activate a "texture unit" of your choosing.
        gl.activeTexture(gl.TEXTURE0);
        // Step 2: Bind the texture you want to use.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Step 3: Set the uniform to the "index" of the texture unit you just activated.
        var textureLocation = gl.getUniformLocation(program, "texture");
        gl.uniform1i(textureLocation, 0);
    }
    
    gl.drawElements(gl.TRIANGLES, shape.triLen, gl.UNSIGNED_SHORT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    // gl.uniform3fv(gl.getUniformLocation(program, "color"), shape.lineColor);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape.lineIndexBuffer);
    gl.drawElements(gl.LINES, shape.lineLen, gl.UNSIGNED_SHORT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.useProgram(null);
}


const ANIM_DURATION = 350;

let anim = {
    left : 0,
    last_time: 0,
    last_state: {}
}

const theta = d => -(d * Math.PI / 2) - Math.PI/2

function updateWebGl(time) {
    // Draw sky
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    var perspective = mat4.create();
    mat4.perspective(perspective, getFov(), 800.0 / 600.0, 0.1, 100.0);

    let current_x;
    let current_y;
    let current_t;

    if (anim.left - (time - anim.last_time) > 0) {
        anim.left -= (time - anim.last_time)
        const nu = anim.left / ANIM_DURATION
        const u = (1 - nu)

        current_x = anim.last_state.x + u * (state.x - anim.last_state.x)
        current_y = anim.last_state.y + u * (state.y - anim.last_state.y)

        const curr_d = (anim.last_state.d === 3 && state.d === 0) ? 4 : state.d
        const prev_d = (anim.last_state.d === 0 && state.d === 3) ? 4 : anim.last_state.d

        current_t = theta(prev_d) + u * (theta(curr_d) - theta(prev_d))

    } else {
        anim.left = 0
        current_x = state.x
        current_y = state.y
        current_t = theta(state.d)
    }

    // TODO current camera location
    var cameraLoc = mat4.create();
    mat4.rotate(cameraLoc, cameraLoc, current_t, Y_AXIS);
    mat4.translate(cameraLoc, cameraLoc, vec3.fromValues(1*current_x-0.5, -1*getEyeHeight(), -1*current_y-0.5));
    // mat4.translate(cameraLoc, cameraLoc, vec3.fromValues(3, -1.5, 6));

    // TODO multiply transform by perspective matrix
    for (var r=0; r<room.length; r++){
        for (var c=0; c<room[r].length; c++){
            for (var i=0; i<5; i++){
                // first 4 are walls, last is floor
                if (i==4 && room[r][c][i] != null){
                    var xf = mat4.create();
                    mat4.multiply(xf, perspective, cameraLoc);
                    mat4.multiply(xf, xf, room[r][c][i]);
                    drawShape(gl, floor, program, xf, floorTexture);
                } else if (room[r][c][i] != null){
                    var xf = mat4.create();
                    mat4.multiply(xf, perspective, cameraLoc);
                    mat4.multiply(xf, xf, room[r][c][i]);
                    drawShape(gl, wall, program, xf, wallTexture);
                }
            }
        }
    }

    sky.forEach(function(row){
        row.forEach(function(col){
            var xf = mat4.create()
            mat4.multiply(xf, perspective, cameraLoc);
            mat4.multiply(xf, xf, col);
            drawShape(gl, skyTile, program, xf, skyTexture);
        })
    })

    gl.useProgram(null);
    window.requestAnimationFrame(updateWebGl);

    anim.last_time = time
}

/******************************* end shader helpers *********************************/
var X_AXIS = vec3.fromValues(1,0,0);
var Y_AXIS = vec3.fromValues(0,1,0);
var Z_AXIS = vec3.fromValues(0,0,1);

var canvas = $("#webglCanvas")[0]
var gl = initializeWebGL(canvas);
var program = createGlslProgram(gl, "vertexShader", "fragmentShader");
var wallTexture

function runWebGL(){

    gl.depthFunc(gl.LESS);
    gl.enable(gl.DEPTH_TEST);

    var wallData = {
        vertices: [
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
        ],
        lineInd: [
            0, 1, 0, 3, 1, 2, 3, 2 
        ],
        uvs: [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ],
        triInd: [
            0, 1, 2,
            0, 2, 3,
        ],
        lineColor: [0.0, 0.0, 1.0],
        fillColor: [1.0, 0.0, 0.0]
    };

    var floorData = {
        vertices: [
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
        ],
        lineInd: [
            0, 1, 0, 3, 1, 2, 3, 2 
        ],
        uvs: [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ],
        triInd: [
            0, 1, 2,
            0, 2, 3,
        ],
        lineColor: [1.0, 1.0, 0.0],
        fillColor: [0.0, 1.0, 0.0]
    };

    var skyData = {
        vertices: [
            0.0, 3.0, 0.0,
            3.0, 3.0, 0.0,
            3.0, 3.0, 3.0,
            0.0, 3.0, 3.0,
        ],
        lineInd: [
            0, 1, 0, 3, 1, 2, 3, 2 
        ],
        uvs: [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ],
        triInd: [
            0, 2, 1,
            0, 3, 2,
        ],
        lineColor: [1.0, 1.0, 0.0],
        fillColor: [0.0, 1.0, 0.0]
    };

    // Init textures
    wallTexture = createTexture(wallImage);
    floorTexture = createTexture(floorImage);
    skyTexture = createTexture(skyImage);

    wall = createShape(gl, wallData);
    floor = createShape(gl, floorData);
    skyTile = createShape(gl, skyData);

    room = createGlMaze();
    sky = createSkyBox();
    window.requestAnimationFrame(updateWebGl);
}

var wallImage = new Image();
var floorImage = new Image();
var skyImage =  new Image();

floorImage.onload = function() {
    wallImage.onload = function() {
        skyImage.onload = function(){
            runWebGL();
        };
        skyImage.src = "data/stars.png";
    };
    wallImage.src = "data/wall.jpg";
};
floorImage.src = "data/floor.jpg";
