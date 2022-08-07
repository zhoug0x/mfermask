const DETECT_THRESHOLD = 0.8

function main() {
	let CVD = null // return of Canvas2DDisplay

	JEELIZFACEFILTER.init({
		canvasId: 'output-canvas',
		NNCPath: './dist/', // root directory containing NN_DEFAULT.json neural network model
		callbackReady: (error, spec) => {
			if (error) {
				console.error(error)
				return
			}

			console.log('jeelizFaceFilter ready...')
			CVD = JeelizCanvas2DHelper(spec)
			CVD.ctx.strokeStyle = 'cyan'
		},

		// called at each render iteration
		callbackTrack: function (detectState) {
			// if face detected, draw border around face
			if (detectState.detected > DETECT_THRESHOLD) {
				const faceCoo = CVD.getCoordinates(detectState)
				CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height)
				CVD.ctx.strokeRect(faceCoo.x, faceCoo.y, faceCoo.w, faceCoo.h)
				CVD.update_canvasTexture()
			}
			CVD.draw()
		},
	})
}

window.addEventListener('load', main)
