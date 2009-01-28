/*
Copyright 2008 Google Inc.

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
 * Creates a new lookat object with the given parameters.
 * @function
 * @param {PointSpec} [point] The point to look at.
 * @param {object} options The parameters of the lookat object to create.
 * @param {PointSpec} [options.point] The point to look at.
 * @param {boolean} [options.copy] Whether or not to copy parameters from the
 *     existing view if they aren't explicitly specified in the options.
 * @param {number} [options.heading] The lookat heading/direction.
 * @param {number} [options.tilt] The lookat tilt.
 * @param {number} [options.range] The range of the camera (distance from the
 *     lookat point).
 * @type KmlLookAt
 */
GEarthExtensions.prototype.dom.createLookAt = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlLookAt',
  apiFactoryFn: 'createLookAt',
  defaultProperty: 'point',
  propertySpec: {
    copy: GEarthExtensions.ALLOWED,
    point: GEarthExtensions.REQUIRED,
    heading: GEarthExtensions.ALLOWED,
    tilt: GEarthExtensions.ALLOWED,
    range: GEarthExtensions.ALLOWED
  },
  constructor: function(lookAtObj, options) {
    var point = new geo.Point(options.point);
  
    var defaults = {
      heading: 0,
      tilt: 0,
      range: 1000
    };
  
    if (options.copy) {
      var currentLookAt = this.util.getLookAt(defaults.altitudeMode);
      defaults.heading = currentLookAt.getHeading();
      defaults.tilt = currentLookAt.getTilt();
      defaults.range = currentLookAt.getRange();
    }
  
    options = GEarthExtensions.checkParameters(options, true, defaults);
  
    lookAtObj.set(
        point.lat,
        point.lng,
        point.altitude,
        point.altitudeMode,
        options.heading,
        options.tilt,
        options.range);
  }
});
// TODO: incrementLookAt

/**
 * Creates a new camera object with the given parameters.
 * @function
 * @param {PointSpec} [point] The point at which to place the camera.
 * @param {object} options The parameters of the camera object to create.
 * @param {PointSpec} [options.point] The point at which to place the camera.
 * @param {boolean} [options.copy] Whether or not to copy parameters from the
 *     existing view if they aren't explicitly specified in the options.
 * @param {number} [options.heading] The camera heading/direction.
 * @param {number} [options.tilt] The camera tilt.
 * @param {number} [options.range] The camera roll.
 * @type KmlCamera
 */
GEarthExtensions.prototype.dom.createCamera = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlCamera',
  apiFactoryFn: 'createCamera',
  defaultProperty: 'point',
  propertySpec: {
    copy: GEarthExtensions.ALLOWED,
    point: GEarthExtensions.REQUIRED,
    heading: GEarthExtensions.ALLOWED,
    tilt: GEarthExtensions.ALLOWED,
    roll: GEarthExtensions.ALLOWED
  },
  constructor: function(cameraObj, options) {
    var point = new geo.Point(options.point);
  
    var defaults = {
      heading: 0,
      tilt: 0,
      roll: 0
    };
  
    if (options.copy) {
      var currentCamera = this.util.getCamera(defaults.altitudeMode);
      defaults.heading = currentCamera.getHeading();
      defaults.tilt = currentCamera.getTilt();
      defaults.roll = currentCamera.getRoll();
    }
  
    options = GEarthExtensions.checkParameters(options, true, defaults);
  
    cameraObj.set(
        point.lat,
        point.lng,
        point.altitude,
        point.altitudeMode,
        options.heading,
        options.tilt,
        options.roll);
  }
});
// TODO: incrementLookAt