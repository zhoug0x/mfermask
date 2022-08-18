const el_HeadImg = document.querySelector('#head-img')
const el_DebugDisplay = document.querySelector('#debug-display')

const DEBUG_MODE = false
const FACE_DETECT_THRESHOLD = 0.5
const FACE_SIZE = 0.55
const FACE_HEIGHT_OFFSET = 0.3

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

			// TODO: incorporate expressions
			// const { expressions: expr } = detectState
			// const expressions = {
			// 	mouthOpen: expr[0],
			// 	mouthSmile: expr[1],
			// 	eyebrowFrown: expr[2],
			// 	eyebrowRaised: expr[3],
			// }

			// calculate width/height offsets
			let { width, height } = canvas
			width = width * FACE_SIZE
			height = height * FACE_SIZE

			
			const locationArgs = [
				faceCoords.x - width * 0.5,
				faceCoords.y - height * FACE_HEIGHT_OFFSET,
				faceCoords.w + width,
				faceCoords.h + height,
			]
			
			// draw image element on face location
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.drawImage(el_HeadImg, ...locationArgs)

			if (DEBUG_MODE) {
				ctx.strokeStyle = 'yellow'
				ctx.strokeRect(...locationArgs)
				el_DebugDisplay.innerText = JSON.stringify({ locationArgs }, null, 2)
			}

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
