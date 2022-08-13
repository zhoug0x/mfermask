const FACE_DETECT_THRESHOLD = 0.8
const debugDisplay = document.querySelector('#debug-display')

function main() {
	let _canvasHelper

	const setCanvasHelper = helper => {
		_canvasHelper = helper
	}

	const getCanvasHelper = () => _canvasHelper

	// options for jeeliz face filter:
	// https://github.com/jeeliz/jeelizFaceFilter#optional-init-arguments
	JEELIZFACEFILTER.init({
		canvasId: 'output-canvas',
		NNCPath: './jeeliz/NN_4EXPR_1.json', // path to the neural network model json
		animateDelay: 1,

		// runs on initialization
		callbackReady: (error, spec) => {
			if (error) {
				console.error(error)
				return
			}

			console.log('neural net loaded...')
			setCanvasHelper(JeelizCanvas2DHelper(spec))
		},

		// runs each draw loop iteration
		callbackTrack: detectState => {
			const canvasHelper = getCanvasHelper()
			// if face detected in the frame
			if (detectState.detected > FACE_DETECT_THRESHOLD) {
				const { getCoordinates, ctx, canvas, update_canvasTexture } =
					canvasHelper

				// get coordinates of face on screen
				const faceCoords = getCoordinates(detectState)

				const expr = detectState.expressions
				const mouthOpen = expr[0]
				const mouthSmile = expr[1]
				const eyebrowFrown = expr[2]
				const eyebrowRaised = expr[3]

				// TODO: use expressions
				console.log({ mouthOpen, mouthSmile, eyebrowFrown, eyebrowRaised })

				// build thing to put on the face
				ctx.strokeStyle = 'cyan'
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				ctx.strokeRect(faceCoords.x, faceCoords.y, faceCoords.w, faceCoords.h)

				// flag the canvas helper to trigger a canvas update on the next draw()
				update_canvasTexture()
			}

			canvasHelper.draw()
		},
	})
}

window.addEventListener('load', main)
