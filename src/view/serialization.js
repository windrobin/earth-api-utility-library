//#REQUIRE "../util/_header.js"
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
var ENC_OVERFLOW_ = 1073741824;

function encodeCamera_(extInstance, cam) {
  var alt = Math.floor(cam.altitude * 1e1);
  return extInstance.util.encodeArray([
    Math.floor(geo.math.constrainValue(cam.lat, [-90, 90]) * 1e5),
    Math.floor(geo.math.wrapValue(cam.lng, [-180, 180]) * 1e5),
    Math.floor(alt / ENC_OVERFLOW_),
    (alt >= 0) ? alt % ENC_OVERFLOW_
               : (ENC_OVERFLOW_ - Math.abs(alt) % ENC_OVERFLOW_),
    Math.floor(geo.math.wrapValue(cam.heading, [0, 360]) * 1e1),
    Math.floor(geo.math.wrapValue(cam.tilt, [0, 180]) * 1e1),
    Math.floor(geo.math.wrapValue(cam.roll, [-180, 180]) * 1e1)
  ]);
}

function decodeCamera_(extInstance, str) {
  var arr = extInstance.util.decodeArray(str);
  return {
    lat: geo.math.constrainValue(arr[0] * 1e-5, [-90, 90]),
    lng: geo.math.wrapValue(arr[1] * 1e-5, [-180, 180]),
    altitude: (ENC_OVERFLOW_ * arr[2] + arr[3]) * 1e-1,
    heading: geo.math.wrapValue(arr[4] * 1e-1, [0, 360]),
    tilt: geo.math.wrapValue(arr[5] * 1e-1, [0, 180]),
    roll: geo.math.wrapValue(arr[6] * 1e-1, [-180, 180])
  };
}

/**
 * Serializes the current plugin viewport into a modified base64 alphabet
 * string. This method is platform and browser agnostic, and is safe to
 * store and distribute to others.
 * @return {String} A string representing the current viewport.
 * @see http://code.google.com/apis/maps/documentation/include/polyline.js
 *     for inspiration.
 */
GEarthExtensions.prototype.view.serialize = function() {
  var camera = this.pluginInstance.getView().copyAsCamera(
      this.pluginInstance.ALTITUDE_ABSOLUTE);
  return '0' + encodeCamera_(this, {
    lat: camera.getLatitude(),
    lng: camera.getLongitude(),
    altitude: camera.getAltitude(),
    heading: camera.getHeading(),
    tilt: camera.getTilt(),
    roll: camera.getRoll()
  });
};

/**
 * Sets the current plugin viewport to the view represented by the given
 * string.
 * @param {String} viewString The modified base64 alphabet string representing
 *     the view to fly to. This string should've previously been calculated
 *     using GEarthExtensions#view.serialize.
 */
GEarthExtensions.prototype.view.deserialize = function(s) {
  if (s.charAt(0) != '0') {  // Magic number.
    throw new Error('Invalid serialized view string.');
  }

  var cameraProps = decodeCamera_(this, s.substr(1));
  var camera = this.pluginInstance.createCamera('');
  
  // TODO: isFinite checks
  camera.set(cameraProps.lat, cameraProps.lng, cameraProps.altitude,
      this.pluginInstance.ALTITUDE_ABSOLUTE, cameraProps.heading,
      cameraProps.tilt, cameraProps.roll);
  this.pluginInstance.getView().setAbstractView(camera);
};

// Backwards compatibility.
GEarthExtensions.prototype.util.serializeView =
    GEarthExtensions.prototype.view.serialize;
GEarthExtensions.prototype.util.deserializeView =
    GEarthExtensions.prototype.view.deserialize;
