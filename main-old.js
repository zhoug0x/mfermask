// if enabled, box will display around face detection area and debug data will print in UI
let DEBUG_MODE = true

// magic numbers
const FACE_DETECT_THRESHOLD = 0.5

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

			const locationArgs = [
				faceCoords.x,
				faceCoords.y,
				faceCoords.w,
				faceCoords.h,
			]

			// clear previous draw
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// draw image element on face location
			// ctx.drawImage(el_HeadImg, ...locationArgs)

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
