const DEBUG_MODE = true
const FACE_DETECT_THRESHOLD = 0.8
const el_HeadImg = document.querySelector('#head-img')
const el_DebugDisplay = document.querySelector('#debug-display')

const displayDebugData = data => {
	el_DebugDisplay.innerText = JSON.stringify(data, null, 2)
}

function main() {
	let canvasHelper

	// runs on initialization
	const callbackReady = (error, spec) => {
		if (error) {
			console.error(error)
			return
		}

		canvasHelper = JeelizCanvas2DHelper(spec)
		console.log('ready!')
	}

	// runs each draw loop iteration
	const callbackTrack = detectState => {
		// if face detected in the frame
		if (detectState.detected > FACE_DETECT_THRESHOLD) {
			const { getCoordinates, ctx, canvas, update_canvasTexture } = canvasHelper

			// get location of face on screen
			const faceCoords = getCoordinates(detectState)

			// parse detected facial expressions
			const { expressions: expr } = detectState
			const expressions = {
				mouthOpen: expr[0],
				mouthSmile: expr[1],
				eyebrowFrown: expr[2],
				eyebrowRaised: expr[3],
			}

			if (DEBUG_MODE) {
				displayDebugData({ faceCoords, expressions })

				ctx.strokeStyle = 'yellow'
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				ctx.strokeRect(faceCoords.x, faceCoords.y, faceCoords.w, faceCoords.h)
			}

			ctx.drawImage(el_HeadImg, faceCoords.x, faceCoords.y, faceCoords.w * 2, faceCoords.h * 2)

			// flag the `canvasHelper` to trigger a canvas update on the next `canvasHelper.draw()`
			update_canvasTexture()
		}

		canvasHelper.draw()
	}

	// options for jeeliz face filter:
	// https://github.com/jeeliz/jeelizFaceFilter#optional-init-arguments
	JEELIZFACEFILTER.init({
		canvasId: 'output-canvas',
		NNCPath: './jeeliz/NN_4EXPR_1.json', // path to the neural network model json
		animateDelay: 1,
		callbackReady,
		callbackTrack,
	})
}

window.addEventListener('load', main)
