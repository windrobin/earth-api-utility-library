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
 * Creates an abstract view with the viewer at the given camera point, looking
 * towards the given look at point. For best results, use ALTITUDE_ABSOLUTE
 * camera and look at points.
 * @param {PointOptions|geo.Point} cameraPoint The viewer location.
 * @param {PointOptions|geo.Point} lookAtPoint The location to look at/towards.
 * @type KmlAbstractView
 */
GEarthExtensions.prototype.view.createVantageView = function(cameraPoint,
                                                             lookAtPoint) {
  // TODO: handle case where lookat point is directly below camera.
  cameraPoint = new geo.Point(cameraPoint);
  lookAtPoint = new geo.Point(lookAtPoint);
  
  var heading = cameraPoint.heading(lookAtPoint);
  var roll = 0;
  
  // Tilt is the hard part:
  // 
  // Put the positions in world space and get a local orientation matrix for the
  // camera position. The matrix is used to figure out the angle between the
  // upside up vector of the local frame and the direction towards the
  // placemark. This is used for tilt.
  // 
  // Tilt is complicated for two reasons:
  //   1. tilt = 0 is facing down instead of facing towards horizon. This is 
  //      opposite of KML model behavior.
  //   2. tilt is relative to the current position of the camera. Not relative
  //      to say, the North Pole or some other global axis. Tilt is *relative*.
  var cameraCartesian = cameraPoint.toCartesian();
  var lookAtCartesian = lookAtPoint.toCartesian();
  var frame = this.math3d.makeLocalToGlobalFrame(cameraPoint);

  // Create the unit direction vector from the camera to the look at point.
  var lookVec = lookAtCartesian.subtract(cameraCartesian).toUnitVector();

  // Take the angle from the negative upside down vector.
  // See tilt complication reason (1).
  var downVec = new geo.linalg.Vector(frame.elements[2]).multiply(-1);

  // Figure out the tilt angle in degrees.
  var tilt = Math.acos(downVec.dot(lookVec)).toDegrees();

  return this.dom.buildCamera(cameraPoint, {heading: heading, tilt: tilt});
};