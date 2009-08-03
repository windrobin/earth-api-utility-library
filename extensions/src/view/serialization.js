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
(function() {
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
    return '0' + this.view.encodeCamera_({
      lat: camera.getLatitude(),
      lng: camera.getLongitude(),
      altitude: camera.getAltitude(),
      heading: camera.getHeading(),
      tilt: camera.getTilt(),
      roll: camera.getRoll() });
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

    var cameraProps = this.view.decodeCamera_(s.substr(1));
    var camera = this.pluginInstance.createCamera('');
    
    // TODO: isFinite checks
    camera.set(cameraProps.lat, cameraProps.lng, cameraProps.altitude,
        this.pluginInstance.ALTITUDE_ABSOLUTE, cameraProps.heading,
        cameraProps.tilt, cameraProps.roll);
    this.pluginInstance.getView().setAbstractView(camera);
  };
  
  // helper functions, most of which are from
  // http://code.google.com/apis/maps/documentation/include/polyline.js
  
  function wrap_(minValue, maxValue, value) {
    // Don't wrap minValue as maxValue.
    if (value === minValue)
      return minValue;
    
    // Normalize to min = 0.
    value -= minValue;
    
    value = value % (maxValue - minValue);
    if (value < 0)
      value += (maxValue - minValue);
    
    // Reverse normalization.
    value += minValue;
    
    // When ambiguous (min or max), return maxValue.
    return (value === minValue) ? maxValue : value;
  }
  
  /***IGNORE_BEGIN***/
  /* TODO: use these tests
  
  // 0-POS
  assertEquals(wrap_(0, 5, -9), 1);
  assertEquals(wrap_(0, 5, -1), 4);
  assertEquals(wrap_(0, 5, 0), 0);
  assertEquals(wrap_(0, 5, 5), 5);
  assertEquals(wrap_(0, 5, 23), 3);

  // POS-POS
  assertEquals(wrap_(8, 12, -5), 11);
  assertEquals(wrap_(8, 12, 0), 12);
  assertEquals(wrap_(8, 12, 7), 11);
  assertEquals(wrap_(8, 12, 8), 8);
  assertEquals(wrap_(8, 12, 11), 11);
  assertEquals(wrap_(8, 12, 12), 12);
  assertEquals(wrap_(8, 12, 13), 9);
  assertEquals(wrap_(8, 12, 37), 9);
  
  // NEG-POS
  assertEquals(wrap_(-5, 5, -17), 3);
  assertEquals(wrap_(-5, 5, -5), -5);
  assertEquals(wrap_(-5, 5, 0), 0);
  assertEquals(wrap_(-5, 5, 5), 5);
  assertEquals(wrap_(-5, 5, 15.1), -4.9);
  assertEquals(wrap_(-5, 5, 17), -3);

  // NEG-NEG
  assertEquals(wrap_(-10, -5, -15), -5);
  assertEquals(wrap_(-10, -5, -13), -8);
  assertEquals(wrap_(-10, -5, -10), -10);
  assertEquals(wrap_(-10, -5, -5), -5);
  assertEquals(wrap_(-10, -5, 0), -5);
  assertEquals(wrap_(-10, -5, 3), -7);
  assertEquals(wrap_(-10, -5, 27), -8);
  
  // Fractional min/max
  assertEquals(wrap_(-1.5, 1.5, 2.3), -0.7);
  */
  /***IGNORE_END***/

  function constrain_(minValue, maxValue, value) {
    return Math.max(minValue, Math.min(maxValue, value));
  }
  
  var ENC_OVERFLOW_ = 1073741824;
  
  GEarthExtensions.prototype.view.encodeCamera_ = function(cam) {
    var alt = Math.floor(cam.altitude * 1e1);
    return this.util.encodeArray([
      Math.floor(constrain_(-90, 90, cam.lat) * 1e5),
      Math.floor(wrap_(-180, 180, cam.lng) * 1e5),
      Math.floor(alt / ENC_OVERFLOW_),
      (alt >= 0) ? alt % ENC_OVERFLOW_ :
                   (ENC_OVERFLOW_ - Math.abs(alt) % ENC_OVERFLOW_),
      Math.floor(wrap_(0, 360, cam.heading) * 1e1),
      Math.floor(wrap_(0, 180, cam.tilt) * 1e1),
      Math.floor(wrap_(-180, 180, cam.roll) * 1e1)
    ]);
  };

  GEarthExtensions.prototype.view.decodeCamera_ = function(str) {
    var arr = this.util.decodeArray(str);
    return {
      lat: constrain_(-90, 90, arr[0] * 1e-5),
      lng: wrap_(-180, 180, arr[1] * 1e-5),
      altitude: (ENC_OVERFLOW_ * arr[2] + arr[3]) * 1e-1,
      heading: wrap_(0, 360, arr[4] * 1e-1),
      tilt: wrap_(0, 180, arr[5] * 1e-1),
      roll: wrap_(-180, 180, arr[6] * 1e-1)
    };
  };
  
  // Backwards compatibility.
  GEarthExtensions.prototype.util.serializeView =
      GEarthExtensions.prototype.view.serialize;
  GEarthExtensions.prototype.util.deserializeView =
      GEarthExtensions.prototype.view.deserialize;
}());
