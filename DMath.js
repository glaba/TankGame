// Description: namespace for "deterministic" math functions (up to floating point error)
var DMath = {
	randomSeed: 0,

	setRandomSeed: function(seed) {
		this.randomSeed = seed;
	},

	random: function() {
		// Robert Jenkins’ 32 bit integer hash function
		this.randomSeed = ((this.randomSeed + 0x7ED55D16) + (this.randomSeed << 12))  & 0xFFFFFFFF;
		this.randomSeed = ((this.randomSeed ^ 0xC761C23C) ^ (this.randomSeed >>> 19)) & 0xFFFFFFFF;
		this.randomSeed = ((this.randomSeed + 0x165667B1) + (this.randomSeed << 5))   & 0xFFFFFFFF;
		this.randomSeed = ((this.randomSeed + 0xD3A2646C) ^ (this.randomSeed << 9))   & 0xFFFFFFFF;
		this.randomSeed = ((this.randomSeed + 0xFD7046C5) + (this.randomSeed << 3))   & 0xFFFFFFFF;
		this.randomSeed = ((this.randomSeed ^ 0xB55A4F09) ^ (this.randomSeed >>> 16)) & 0xFFFFFFFF;
		return (this.randomSeed & 0xFFFFFFF) / 0x10000000;
	},

	sqrt: function(num) {
		return Math.sqrt(num);
	},

	sin: function(theta) {
		var t = theta % (2 * Math.PI);
		if (t > Math.PI) {
			t = Math.PI - t;
		} else if (t < -Math.PI) {
			t = -Math.PI - t;
		}
		return (t - Math.pow(t, 3) / 6.0 + Math.pow(t, 5) / 120.0 - Math.pow(t, 7) / 5040.0 + Math.pow(t, 9) / 362880.0);
	},

	cos: function(theta) {
		var t = theta % (2 * Math.PI);
		if (t > Math.PI) {
			t -= 2 * Math.PI;
		} else if (t < -Math.PI) {
			t += 2 * Math.PI;
		}
		return 1 - Math.pow(t, 2) / 2.0 + Math.pow(t, 4) / 24.0 - Math.pow(t, 6) / 720.0 + Math.pow(t, 8) / 40320.0 - Math.pow(t, 10) / 3628800.0;
	},

	sign: function(n1) {
		if (n1 === 0)
			return 0;
		else if (n1 > 0)
			return 1;
		else 
			return -1;
	},

	// Description: Picks the value with the higher absolute value
	// Parameters: [sign]: the sign that the final value must be casted to
	maxPreserveSign: function(n1, n2, sign = 0) {
		if (sign != 0) {
			n1 /= this.sign(n1);
			n1 *= sign;
			n2 /= this.sign(n2);
			n2 *= sign;
		}
		return (Math.abs(n1) > Math.abs(n2)) ? n1 : n2;
	},

	atan2: function(x, y) {
		if (x === 0)
			return this.sign(y) * Math.PI / 2;
		if (y === 0) 
			return Math.PI / 2 * (1 - this.sign(x));
		var a = Math.min(Math.abs(x), Math.abs(y)) / Math.max(Math.abs(x), Math.abs(y));
		var s = a * a;
		var r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
		if (Math.abs(y) > Math.abs(x))
			r = Math.PI / 2 - r;
		if (x < 0)
			r = Math.PI - r;
		if (y < 0)
			r = -r;
		return r;
	},

	// Description: adjusts an angle to be between 0 and 2PI
	// Parameters: theta: the angle
	adjustAngle: function(theta) {
		var t = theta;
		while (t < 0)
			t += 2 * Math.PI;
		while (t >= 2 * Math.PI)
			t -= 2 * Math.PI;
		return t;
	},

	// Description: returns the angle between two angles 
	// Parameters: t1: angle 1
	//             t2: angle 2
	angleBetween: function(t1, t2) {
		var t1o = this.adjustAngle(t1);
		var t2o = this.adjustAngle(t2);
		if (Math.abs(t1o - t2o) > Math.PI) {
			return 2 * Math.PI - Math.max(t1o, t2o) + Math.min(t1o, t2o);
		} else
			return Math.abs(t1o - t2o);
	},

	// Description: returns true if a point is within a rectangle
	// Parameters: p: the object containing the point
	//             a: the first vertex of the rectangle (center of the three)
	//             b: the second vertex of the rectangle
	//             d: the third vertex of the rectangle
	pointInRectangle: function(p, a, b, d) {
		var ap = {x: p.x - a.x, y: p.y - a.y};
		var ab = {x: b.x - a.x, y: b.y - a.y};
		var ad = {x: d.x - a.x, y: d.y - a.y};
		var dp1 = ap.x * ab.x + ap.y * ab.y;
		var lenAB = ab.x * ab.x + ab.y * ab.y;
		var dp2 = ap.x * ad.x + ap.y * ad.y;
		var lenAD = ad.x * ad.x + ad.y * ad.y;
		
		return dp1 >= 0 && dp1 <= lenAB && dp2 >= 0 && dp2 <= lenAD;
	},

	// Description: returns the dot product of two vectors
	// Parameters: a: the first vector
	//             b: the second vector
	dot: function(a, b) {
		return a.x * b.x + a.y * b.y;
	},

	len: function(a) {
		return distance(a.x, a.y, 0, 0);
	},

	constrain: function(num, lim1, lim2) {
		if (num < Math.min(lim1, lim2))
			return Math.min(lim1, lim2);
		if (num > Math.max(lim1, lim2))
			return Math.max(lim1, lim2);
		return num;
	},

	// Description: returns true if a line segment intersects a circle
	// Parameters: start: the start point of the line segment
	//             end: the end point of the line segment
	//             center: the center point of the circle
	//             radius: the radius of the circle
	segmentIntersectsCircle: function(start, end, center, radius) {
		var A = start;
		var AB = {x: end.x - start.x, y: end.y - start.y};
		var R = radius;
		var C = center;
		var x1 = (-2*(this.dot(A, AB)) + this.len(AB)*this.sqrt(this.len(A)*this.len(A) - 4*(this.len(A)*this.len(A) - this.dot(C, AB) - this.dot(C, A)))) / (2 * this.len(AB)*this.len(AB));
		var x2 = (-2*(this.dot(A, AB)) - this.len(AB)*this.sqrt(this.len(A)*this.len(A) - 4*(this.len(A)*this.len(A) - this.dot(C, AB) - this.dot(C, A)))) / (2 * this.len(AB)*this.len(AB));
		if ((x1 >= 0 && x1 <= 1) || (x2 >= 0 && x2 <= 1))
			return true;
		return false;
	},

	segmentIntersectsSegment: function(start1, end1, start2, end2) {
		var dir1 = {x: end1.x - start1.x, y: end1.y - start1.y};
		var dir2 = {x: end2.x - start2.x, y: end2.y - start2.y};
		var determinant = (dir1.x * -dir2.y) - (-dir2.x * dir1.y);

		if (determinant == 0) {
			return false;
		} else {
			var t1 = 1 / determinant * (-dir2.y * (start2.x - start1.x) + dir2.x * (start2.y - start1.y));
			var t2 = 1 / determinant * (-dir1.y * (start2.x - start1.x) + dir1.x * (start2.y - start1.y));

			if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
				return true;
			} else {
				return false;
			}
		}
	}
};