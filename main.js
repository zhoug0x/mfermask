const FACE_DETECT_THRESHOLD = 0.8

function main() {
	let canvasHelper

	// options for jeeliz face filter:
	// https://github.com/jeeliz/jeelizFaceFilter#optional-init-arguments
	JEELIZFACEFILTER.init({
		canvasId: 'output-canvas',
		NNCPath: './dist/', // root directory containing NN_DEFAULT.json neural network model
		animateDelay: 1,

		// runs on initialization
		callbackReady: (error, spec) => {
			if (error) {
				console.error(error)
				return
			}

			console.log('neural net loaded...')
			canvasHelper = JeelizCanvas2DHelper(spec)
		},

		// runs each draw loop iteration
		callbackTrack: detectState => {
			// if face detected in the frame
			if (detectState.detected > FACE_DETECT_THRESHOLD) {
				
				// probability if mouth open or not - num between 0 & 1
				// console.log(detectState.expressions)

				const { getCoordinates, ctx, canvas, update_canvasTexture } =
					canvasHelper

				// get coordinates of face on screen
				const faceCoords = getCoordinates(detectState)
				ctx.strokeStyle = 'cyan'
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				ctx.strokeRect(faceCoords.x, faceCoords.y, faceCoords.w, faceCoords.h)
				update_canvasTexture()
			}
			canvasHelper.draw()
		},
	})
}

window.addEventListener('load', main)
