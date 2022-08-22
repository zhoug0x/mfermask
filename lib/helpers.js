const MATRIX_HELPERS = {
	create_mat4Identity: () => {
		return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
	},

	// set the position part of a flattened transposed mat4:
	set_mat4Position: (m, x, y, z) => {
		m[12] = x
		m[13] = y
		m[14] = z
	},

	// set the rotation part of a flattened transposed mat4 - see https://en.wikipedia.org/wiki/Euler_angles
	set_mat4RotationXYZ: (m, rx, ry, rz) => {
		const c1 = Math.cos(rx),
			s1 = Math.sin(rx),
			c2 = Math.cos(ry),
			s2 = Math.sin(ry),
			c3 = Math.cos(rz),
			s3 = Math.sin(rz)
		// first line (not transposed)
		m[0] = c2 * c3
		m[4] = -c2 * s3
		m[8] = s2

		// second line (not transposed)
		m[1] = c1 * s3 + c3 * s1 * s2
		m[5] = c1 * c3 - s1 * s2 * s3
		m[9] = -c2 * s1

		// third line (not transposed)
		m[2] = s1 * s3 - c1 * c3 * s2
		m[6] = c3 * s1 + c1 * s2 * s3
		m[10] = c1 * c2
	},

	// inverse a mat4 move matrix m and put result to mat4 matrix r
	inverse_mat4MoveMatrix: (m, r) => {
		// rotation part: the inverse = the transpose
		r[0] = m[0]
		r[1] = m[4]
		r[2] = m[8]

		r[4] = m[1]
		r[5] = m[5]
		r[6] = m[9]

		r[8] = m[2]
		r[9] = m[6]
		r[10] = m[10]

		// translation part: = -tR.T where T=[m[12], m[13], m[14]]
		r[12] = -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14])
		r[13] = -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14])
		r[14] = -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14])
	},

	multiply_matVec4: (m, v) => {
		return [
			m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
			m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
			m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
			m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
		]
	},

	get_mat4Pos: m => {
		return [m[12], m[13], m[14]]
	},
}
