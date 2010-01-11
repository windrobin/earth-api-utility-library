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
 * Creates an orthonormal orientation matrix for a given set of object direction
 * and up vectors. The matrix rows will each be unit length and orthogonal to
 * each other. If the dir and up vectors are collinear, this function will fail
 * and return null.
 * @param {geo.linalg.Vector} dir The object direction vector.
 * @param {geo.linalg.Vector} up The object up vector.
 * @return {geo.linalg.Matrix} Returns the orthonormal orientation matrix,
 *     or null if none is possible.
 */
GEarthExtensions.prototype.math3d.makeOrthonormalFrame = function(dir, up) {
  var newRight = dir.cross(up).toUnitVector();
  if (newRight.eql(geo.linalg.Vector.Zero(3))) {
    // dir and up are collinear.
    return null;
  }
  
  var newDir = up.cross(newRight).toUnitVector();
  var newUp = newRight.cross(newDir);
  return new geo.linalg.Matrix([newRight.elements,
                                newDir.elements,
                                newUp.elements]);
};

/**
 * Creates a local orientation matrix that can transform direction vectors
 * local to a given point to global direction vectors. The transpose of the
 * returned matrix performs the inverse transformation.
 * @param {geo.Point} point The world point at which local coordinates are to
 *     be transformed.
 * @return {geo.linalg.Matrix} An orientation matrix that can transform local
 *     coordinate vectors to global coordinate vectors.
 */
GEarthExtensions.prototype.math3d.makeLocalToGlobalFrame = function(point) {
  var vertical = point.toCartesian().toUnitVector();
  var east = new geo.linalg.Vector([0, 1, 0]).cross(vertical).toUnitVector();
  var north = vertical.cross(east).toUnitVector();
  return new geo.linalg.Matrix([east.elements,
                                north.elements,
                                vertical.elements]);
};
