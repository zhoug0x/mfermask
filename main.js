// if enabled, box will display around face detection area and debug data will print in UI
let DEBUG_MODE = false

// magic numbers
const FACE_DETECT_THRESHOLD = 0.5
const FACE_SIZE = 0.55
const FACE_HEIGHT_OFFSET = 0.35

const el_HeadImg = document.querySelector('#head-img')
const el_DebugDisplay = document.querySelector('#debug-display')


// ~*~*~ IT STARTS HERE ~*~*~
function main() {
	let canvasHelper

	// runs on facefilter initialization
	const callbackReady = (error, spec) => {
		if (error) {
			console.error(error)
			return
		}

		canvasHelper = JeelizCanvas2DHelper(spec)
		console.log('ready!')
	}

	// runs on each facefilter draw loop iteration
	const callbackTrack = detectState => {
		// if face detected in the frame
		if (detectState.detected > FACE_DETECT_THRESHOLD) {
			const { getCoordinates, ctx, canvas, update_canvasTexture } = canvasHelper

			// get location of face on screen
			const faceCoords = getCoordinates(detectState)

			// calculate width/height
			let { width, height } = canvas
			width = width * FACE_SIZE
			height = height * FACE_SIZE

			// apply width/height offsets to the detected face coordinates
			const locationArgs = [
				faceCoords.x - width * 0.5, // center the image on the face
				faceCoords.y - height * FACE_HEIGHT_OFFSET, // adjust vertical placement

				// TODO: the below two values determine the width/height based on the *distance* of the
				//       face from the camera. unforunately, the way it is calculated below is not accurate
				//       at extreme distances, since it's always the same static value being added to the dynamic `faceCoords`
				faceCoords.w + width,
				faceCoords.h + height,
			]

			// draw image element on face location
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.drawImage(el_HeadImg, ...locationArgs)

			if (DEBUG_MODE) {
				ctx.strokeStyle = 'yellow'
				ctx.strokeRect(...locationArgs)
				el_DebugDisplay.innerText = JSON.stringify(
					{ faceCoords, locationArgs },
					null,
					2
				)
			}

			// flag the `canvasHelper` to trigger a canvas update on the next `canvasHelper.draw()`
			update_canvasTexture()
		}

		canvasHelper.draw()
	}

	// initialize jeeliz face filter
	// options: https://github.com/jeeliz/jeelizFaceFilter#optional-init-arguments
	JEELIZFACEFILTER.init({
		canvasId: 'output-canvas',
		NNCPath: './jeeliz/NN_4EXPR_1.json', // path to the neural network model json
		animateDelay: 1,
		callbackReady,
		callbackTrack,
	})
}

window.addEventListener('load', main)
