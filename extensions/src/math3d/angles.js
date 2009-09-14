/*
Copyright 2009 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * Converts heading, tilt, and roll (HTR) to a local orientation matrix
 * that transforms global direction vectors to local direction vectors.
 * @param {Number[]} htr A heading, tilt, roll array, where each angle is in
 *     degrees.
 * @return {geo.linalg.Matrix} A local orientation matrix.
 */
GEarthExtensions.prototype.math3d.htrToLocalFrame = function(htr) {
  return eulerAnglesToMatrix_([
      htr[0].toRadians(), htr[1].toRadians(), htr[2].toRadians()]);
};

/**
 * Converts a local orientation matrix (right, dir, up vectors) in local
 * cartesian coordinates to heading, tilt, and roll.
 * @param {geo.linalg.Matrix} matrix A local orientation matrix.
 * @return {Number[]} A heading, tilt, roll array, where each angle is in
 *     degrees.
 */
GEarthExtensions.prototype.math3d.localFrameToHtr = function(matrix) {
  var htr = matrixToEulerAngles_(matrix);
  return [htr[0].toDegrees(), htr[1].toDegrees(), htr[2].toDegrees()];
};

/**
 * Converts an array of 3 Euler angle rotations to matrix form.
 * NOTE: Adapted from 'Graphics Gems IV', Chapter III.5,
 * "Euler Angle Conversion" by Ken Shoemake.
 * @see http://vered.rose.utoronto.ca/people/spike/GEMS/GEMS.html
 * @param {Number[]} eulerAngles An array of 3 frame-relative Euler rotation
 *     angles, each in radians.
 * @return {geo.linalg.Matrix} A matrix representing the transformation.
 * @private
 */
function eulerAnglesToMatrix_(eulerAngles) {
  var I = 2; // used for roll, in radians
  var J = 0; // heading, in radians
  var K = 1; // tilt

  var m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

  var cos_ti = Math.cos(eulerAngles[0]);
  var cos_tj = Math.cos(eulerAngles[1]);
  var cos_th = Math.cos(eulerAngles[2]);

  var sin_ti = Math.sin(eulerAngles[0]);
  var sin_tj = Math.sin(eulerAngles[1]);
  var sin_th = Math.sin(eulerAngles[2]);

  var cos_c = cos_ti * cos_th;
  var cos_s = cos_ti * sin_th;
  var sin_c = sin_ti * cos_th;
  var sin_s = sin_ti * sin_th;

  m[I][I] = cos_tj * cos_th;
  m[I][J] = sin_tj * sin_c - cos_s;
  m[I][K] = sin_tj * cos_c + sin_s;

  m[J][I] = cos_tj * sin_th;
  m[J][J] = sin_tj * sin_s + cos_c;
  m[J][K] = sin_tj * cos_s - sin_c;

  m[K][I] = -sin_tj;
  m[K][J] = cos_tj * sin_ti;
  m[K][K] = cos_tj * cos_ti;

  return new geo.linalg.Matrix(m);
}

/**
 * Converts a matrix to an array of 3 Euler angle rotations.
 * NOTE: Adapted from 'Graphics Gems IV', Chapter III.5,
 * "Euler Angle Conversion" by Ken Shoemake.
 * @see http://vered.rose.utoronto.ca/people/spike/GEMS/GEMS.html
 * @param {geo.linalg.Matrix} matrix A homogenous matrix representing a
 *     transformation.
 * @return {Number[]} An array of 3 frame-relative Euler rotation angles
 *     representing the transformation, each in radians.
 * @private
 */
function matrixToEulerAngles_(matrix) {
  var I = 2 + 1; // + 1 because Sylvester uses 1-based indices.
  var J = 0 + 1;
  var K = 1 + 1;
  var FLT_EPSILON = 1e-6;

  var cy = Math.sqrt(matrix.e(I, I) * matrix.e(I, I) +
                     matrix.e(J, I) * matrix.e(J, I));

  if (cy <= 16 * FLT_EPSILON) {
    return [Math.atan2(-matrix.e(J, K), matrix.e(J, J)),
            Math.atan2(-matrix.e(K, I), cy),
            0];
  }

  return [Math.atan2( matrix.e(K, J), matrix.e(K, K)),
          Math.atan2(-matrix.e(K, I), cy),
          Math.atan2( matrix.e(J, I), matrix.e(I, I))];
}