// global settings
const SETTINGS = {
  headImgSrc: 'images/plain-head.png',
  rotationOffsetX: 0, // negative -> look upper. in radians
  cameraFOV: 40, // in degrees, 3D camera FOV
  pivotOffsetYZ: [0.2, 0.2], // XYZ of the distance between the center of the mfer img and the pivot
  detectionThreshold: 0.75, // AI sensitivity, between 0 and 1, less = more sensitive
  detectionHysteresis: 0.05,
  scale: [2.65, 2.65], // scale of the mfer img along horizontal and vertical 2D axis
  offsetYZ: [-0.05, -0.2], // offset of the mfer img along vertical and depth 3D axis
  canvasSizeResolution: 500, // 2D resolution quality of mfer img (in pixels)
}

// matrix algebra math utils
const {
  create_mat4Identity,
  set_mat4Position,
  set_mat4RotationXYZ,
  inverse_mat4MoveMatrix,
  multiply_matVec4,
  get_mat4Pos,
} = MATRIX_HELPERS

// globals
let CV = null,
  CANVAS2D = null,
  CTX = null,
  GL = null,
  CANVASTEXTURE = null,
  CANVASTEXTURENEEDSUPDATE = false

let PROJMATRIX = null,
  PROJMATRIXNEEDSUPDATE = true

let VBO_VERTEX = null,
  VBO_FACES = null,
  SHADERCANVAS = null

let SHADERVIDEO = null,
  VIDEOTEXTURE = null,
  VIDEOTRANSFORMMAT2 = null

let MOVMATRIX = create_mat4Identity(),
  MOVMATRIXINV = create_mat4Identity()

let ZPLANE = 0,
  YPLANE = 0
let ISDETECTED = false

// flags canvas for update on next draw
function update_canvasTexture() {
  CANVASTEXTURENEEDSUPDATE = true
}

// ------------------- BEGIN WEBGL HELPERS
// TODO: these functions mutate the GL global, but move them to an external js file somehow - switch to modules?
// compile a shader:
function compile_shader(source, glType, typeString) {
  const glShader = GL.createShader(glType)
  GL.shaderSource(glShader, source)
  GL.compileShader(glShader)
  if (!GL.getShaderParameter(glShader, GL.COMPILE_STATUS)) {
    alert(
      'ERROR IN ' + typeString + ' SHADER: ' + GL.getShaderInfoLog(glShader)
    )
    console.log('Buggy shader source: \n', source)
    return null
  }
  return glShader
}

// helper function to build the shader program:
function build_shaderProgram(shaderVertexSource, shaderFragmentSource, id) {
  // compile both shader separately:
  const glShaderVertex = compile_shader(
    shaderVertexSource,
    GL.VERTEX_SHADER,
    'VERTEX ' + id
  )
  const glShaderFragment = compile_shader(
    shaderFragmentSource,
    GL.FRAGMENT_SHADER,
    'FRAGMENT ' + id
  )

  const glShaderProgram = GL.createProgram()
  GL.attachShader(glShaderProgram, glShaderVertex)
  GL.attachShader(glShaderProgram, glShaderFragment)

  // start the linking stage:
  GL.linkProgram(glShaderProgram)
  return glShaderProgram
}

// helper function to create the projection matrix:
function update_projMatrix() {
  const tan = Math.tan((0.5 * SETTINGS.cameraFOV * Math.PI) / 180),
    zMax = 100,
    zMin = 0.1,
    a = CV.width / CV.height

  const A = -(zMax + zMin) / (zMax - zMin),
    B = (-2 * zMax * zMin) / (zMax - zMin)

  PROJMATRIX = [1.0 / tan, 0, 0, 0, 0, a / tan, 0, 0, 0, 0, A, -1, 0, 0, B, 0]

  GL.uniformMatrix4fv(SHADERCANVAS.projMatrix, false, PROJMATRIX)
  PROJMATRIXNEEDSUPDATE = false
} // -------------------- END WEBGL HELPERS

// build 3D scene
function init_scene(spec) {
  // mutate globals
  GL = spec.GL
  CV = spec.canvasElement
  VIDEOTEXTURE = spec.videoTexture
  VIDEOTRANSFORMMAT2 = spec.videoTransformMat2

  // create and size the 2D canvas and its drawing context:
  CANVAS2D = document.createElement('canvas')
  CANVAS2D.width = SETTINGS.canvasSizeResolution
  CANVAS2D.height = Math.round(
    (SETTINGS.canvasSizeResolution * SETTINGS.scale[1]) / SETTINGS.scale[0]
  )

  CTX = CANVAS2D.getContext('2d')

  const headImage = new Image()
  headImage.src = SETTINGS.headImgSrc
  headImage.onload = () => {
    CTX.drawImage(
      headImage,
      0,
      0,
      headImage.width,
      headImage.height,
      0,
      0,
      CANVAS2D.width,
      CANVAS2D.height
    )
    update_canvasTexture()
  }

  // create the WebGL texture with the canvas:
  CANVASTEXTURE = GL.createTexture()
  GL.bindTexture(GL.TEXTURE_2D, CANVASTEXTURE)
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, CANVAS2D)
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR)
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR)
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE)
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)

  // create the face plane:
  const sx = SETTINGS.scale[0],
    sy = SETTINGS.scale[1] // scale
  YPLANE = SETTINGS.offsetYZ[0] + SETTINGS.pivotOffsetYZ[0] // offset
  ZPLANE = SETTINGS.offsetYZ[1] + SETTINGS.pivotOffsetYZ[1]
  VBO_VERTEX = GL.createBuffer()
  GL.bindBuffer(GL.ARRAY_BUFFER, VBO_VERTEX)
  GL.bufferData(
    GL.ARRAY_BUFFER,
    new Float32Array([
      //format of each vertex: x,y,z,  u,v
      -sx,
      -sy + YPLANE,
      ZPLANE,
      1,
      1,
      sx,
      -sy + YPLANE,
      ZPLANE,
      0,
      1,
      sx,
      sy + YPLANE,
      ZPLANE,
      0,
      0,
      -sx,
      sy + YPLANE,
      ZPLANE,
      1,
      0,
    ]),
    GL.STATIC_DRAW
  )

  // FACES:
  VBO_FACES = GL.createBuffer()
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, VBO_FACES)
  GL.bufferData(
    GL.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2, 0, 2, 3]),
    GL.STATIC_DRAW
  )

  // create the shaders:
  const copyCropVertexShaderSource =
    'attribute vec2 position;\n\
     uniform mat2 videoTransformMat2;\n\
     varying vec2 vUV;\n\
     void main(void){\n\
      gl_Position = vec4(position, 0., 1.);\n\
      vUV = vec2(0.5,0.5) + videoTransformMat2 * position;\n\
     }'

  const copyFragmentShaderSource =
    'precision lowp float;\n\
     uniform sampler2D samplerImage;\n\
     varying vec2 vUV;\n\
     \n\
     void main(void){\n\
      gl_FragColor = texture2D(samplerImage, vUV);\n\
     }'
  const shpVideo = build_shaderProgram(
    copyCropVertexShaderSource,
    copyFragmentShaderSource,
    'VIDEO'
  )
  SHADERVIDEO = {
    program: shpVideo,
    videoTransformMat2: GL.getUniformLocation(shpVideo, 'videoTransformMat2'),
  }
  let uSampler = GL.getUniformLocation(shpVideo, 'samplerImage')
  GL.useProgram(shpVideo)
  GL.uniform1i(uSampler, 0)

  const shpCanvas = build_shaderProgram(
    //basic 3D projection shader
    'attribute vec3 position;\n\
    attribute vec2 uv;\n\
    uniform mat4 projMatrix, movMatrix;\n\
    varying vec2 vUV;\n\
    void main(void){\n\
      gl_Position = projMatrix*movMatrix*vec4(position, 1.);\n\
      vUV = uv;\n\
    }',
    copyFragmentShaderSource,
    'CANVAS'
  )

  SHADERCANVAS = {
    program: shpCanvas,
    projMatrix: GL.getUniformLocation(shpCanvas, 'projMatrix'),
    movMatrix: GL.getUniformLocation(shpCanvas, 'movMatrix'),
    position: GL.getAttribLocation(shpCanvas, 'position'),
    uv: GL.getAttribLocation(shpCanvas, 'uv'),
  }
  uSampler = GL.getUniformLocation(shpCanvas, 'samplerImage')
  GL.useProgram(shpCanvas)
  GL.uniform1i(uSampler, 0)
  GL.disableVertexAttribArray(shpCanvas, SHADERCANVAS.position)
  GL.disableVertexAttribArray(shpCanvas, SHADERCANVAS.uv)
}

// runs on facefilter initialization
const callbackReady = (error, spec) => {
  if (error) {
    console.error(error)
    return
  }

  console.log('ready...')
  init_scene(spec)
}

// runs on each facefilter draw loop iteration
const callbackTrack = detectState => {
  if (
    ISDETECTED &&
    detectState.detected <
      SETTINGS.detectionThreshold - SETTINGS.detectionHysteresis
  ) {
    // DETECTION LOST
    ISDETECTED = false
  } else if (
    !ISDETECTED &&
    detectState.detected >
      SETTINGS.detectionThreshold + SETTINGS.detectionHysteresis
  ) {
    // FACE DETECTED
    ISDETECTED = true
  }

  // render the video screen:
  GL.viewport(0, 0, CV.width, CV.height)
  GL.useProgram(SHADERVIDEO.program)
  GL.uniformMatrix2fv(SHADERVIDEO.videoTransformMat2, false, VIDEOTRANSFORMMAT2)
  GL.bindTexture(GL.TEXTURE_2D, VIDEOTEXTURE)
  GL.drawElements(GL.TRIANGLES, 3, GL.UNSIGNED_SHORT, 0)

  if (ISDETECTED) {
    const aspect = CV.width / CV.height

    // move the cube in order to fit the head:
    const tanFOV = Math.tan((aspect * SETTINGS.cameraFOV * Math.PI) / 360) // tan(FOV/2), in radians
    const W = detectState.s // relative width of the detection window (1-> whole width of the detection window)
    const D = 1 / (2 * W * tanFOV) // distance between the front face of the cube and the camera

    // coords in 2D of the center of the detection window in the viewport:
    const xv = detectState.x
    const yv = detectState.y

    // coords in 3D of the center of the cube (in the view coordinates system):
    const z = -D - 0.5 // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
    const x = xv * D * tanFOV
    const y = (yv * D * tanFOV) / aspect

    // move and rotate the cube:
    set_mat4Position(
      MOVMATRIX,
      x,
      y + SETTINGS.pivotOffsetYZ[0],
      z + SETTINGS.pivotOffsetYZ[1]
    )
    set_mat4RotationXYZ(
      MOVMATRIX,
      detectState.rx + SETTINGS.rotationOffsetX,
      detectState.ry,
      detectState.rz
    )

    // render the canvas above:
    GL.clear(GL.DEPTH_BUFFER_BIT)
    GL.enable(GL.BLEND)
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA)
    GL.useProgram(SHADERCANVAS.program)
    GL.enableVertexAttribArray(SHADERCANVAS.position)
    GL.enableVertexAttribArray(SHADERCANVAS.uv)
    GL.uniformMatrix4fv(SHADERCANVAS.movMatrix, false, MOVMATRIX)
    if (PROJMATRIXNEEDSUPDATE) {
      update_projMatrix()
    }
    GL.bindTexture(GL.TEXTURE_2D, CANVASTEXTURE)
    if (CANVASTEXTURENEEDSUPDATE) {
      GL.texImage2D(
        GL.TEXTURE_2D,
        0,
        GL.RGBA,
        GL.RGBA,
        GL.UNSIGNED_BYTE,
        CANVAS2D
      )
      CANVASTEXTURENEEDSUPDATE = false
    }
    GL.bindBuffer(GL.ARRAY_BUFFER, VBO_VERTEX)
    GL.vertexAttribPointer(SHADERCANVAS.position, 3, GL.FLOAT, false, 20, 0)
    GL.vertexAttribPointer(SHADERCANVAS.uv, 2, GL.FLOAT, false, 20, 12)
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, VBO_FACES)
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0)
    GL.disableVertexAttribArray(SHADERCANVAS.uv)
    GL.disableVertexAttribArray(SHADERCANVAS.position)
    GL.disable(GL.BLEND)
  }
}

// ~*~*~*~ the entry point ~*~*~*~
const main = () => {
  // fill viewport of device with canvas
  const outputCanvas = document.querySelector('#output-canvas')
  outputCanvas.width = window.innerWidth > 425 ? 425 : window.innerWidth
  outputCanvas.height = window.innerHeight

  // initialize jeeliz face filter
  // options: https://github.com/jeeliz/jeelizFaceFilter#optional-init-arguments
  JEELIZFACEFILTER.init({
    canvasId: 'output-canvas',
    NNCPath: './lib/NN_4EXPR_1.json',
    callbackReady,
    callbackTrack,
  })
}

window.addEventListener('load', main)
