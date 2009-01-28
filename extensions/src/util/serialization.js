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
(function() {
  // TODO: docs
  GEarthExtensions.prototype.util.serializeView = function() {
    var camera = this.pluginInstance.getView().copyAsCamera(
        this.pluginInstance.ALTITUDE_ABSOLUTE);
    return encodeCamera_({
      lat: camera.getLatitude(),
      lng: camera.getLongitude(),
      altitude: camera.getAltitude(),
      heading: camera.getHeading(),
      tilt: camera.getTilt(),
      roll: camera.getRoll() });
  };

  // TODO: docs
  GEarthExtensions.prototype.util.deserializeView = function(s) {
    var cameraProps = decodeCamera_(s);
    var camera = this.pluginInstance.createCamera('');
    
    // TODO: isFinite checks
    camera.set(cameraProps.lat, cameraProps.lng, cameraProps.altitude,
        this.pluginInstance.ALTITUDE_ABSOLUTE, cameraProps.heading,
        cameraProps.tilt, cameraProps.roll);
    this.pluginInstance.getView().setAbstractView(camera);
  };
  
  /***********
  helper functions, most of which are from
  http://code.google.com/apis/maps/documentation/include/polyline.js
  ************/
  
  GEarthExtensions.prototype.util.encodeCamera_ = function(cam) {
    var encOverflow = 1073741824;
    var alt = Math.floor(cam.altitude * 1e5);
    return encodeArray_([
      Math.floor(fit180_(cam.lat) * 1e5),
      Math.floor(fit180_(cam.lng) * 1e5),
      Math.floor(alt / encOverflow),
      alt % encOverflow,
      Math.floor(fit360_(cam.heading) * 1e5),
      Math.floor(fit360_(cam.tilt) * 1e5),
      Math.floor(fit360_(cam.roll) * 1e5)
    ]);
  }

  GEarthExtensions.prototype.util.decodeCamera_ = function(s) {
    var encOverflow = 1073741824;
    var arr = decodeArray_(s);
    return {
      lat: arr[0] * 1e-5,
      lng: arr[1] * 1e-5,
      altitude: (encOverflow * arr[2] + arr[3]) * 1e-5,
      heading: arr[4] * 1e-5,
      tilt: arr[5] * 1e-5,
      roll: arr[6] * 1e-5
    };
  }
  
  // modified base64 for url
  // http://en.wikipedia.org/wiki/Base64
  var ALPHABET_ =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  
  function encodeArray_(a) {
    var s = '';
    for (var i = 0; i < a.length; i++) {
      s += encodeSignedNumber_(a[i]);
    }

    return s;
  }

  function fit360_(a) {
    while (a < 0) {
      a += 360;
    }

    return a % 360;
  }

  function fit180_(a) {
    a = fit360_(a);
    return (a > 180) ? a - 360 : a;
  }
  
  // Encode a signed number in the encode format.
  function encodeSignedNumber_(num) {
    var sgn_num = num << 1;

    if (num < 0) {
      sgn_num = ~(sgn_num);
    }

    var encodeString = "";

    while (sgn_num >= 0x20) {
      encodeString += ALPHABET_[0x20 | (sgn_num & 0x1f)];
      sgn_num >>= 5;
    }

    encodeString += ALPHABET_[sgn_num];
    return encodeString;
  }
  
  function decodeArray_(encoded) {
    var len = encoded.length;
    var index = 0;
    var array = [];
    var lat = 0;
    var lng = 0;

    while (index < len) {
      var b;
      var shift = 0;
      var result = 0;
      do {
        b = ALPHABET_.indexOf(encoded.charAt(index++));
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      array.push(((result & 1) ? ~(result >> 1) : (result >> 1)));
    }

    return array;
  }

}());
/***IGNORE_BEGIN***/
window.test_encode_decode_camera = function() {
  var cam = {
    lat: 37.123,
    lng: -122.123,
    altitude: 12345678,
    heading: 12.3456,
    tilt: 45.12345,
    roll: 19.1552
  };
  
  var s = testext_.util.encodeCamera_(cam);
  // TODO: check for string length and used characters
  var cam2 = testext_.util.decodeCamera_(s);
  
  assertWithinThresholdPercent(0.01, cam.lat, cam2.lat);
  assertWithinThresholdPercent(0.01, cam.lng, cam2.lng);
  assertWithinThresholdPercent(0.01, cam.altitude, cam2.altitude);
  assertWithinThresholdPercent(0.01, cam.heading, cam2.heading);
  assertWithinThresholdPercent(0.01, cam.tilt, cam2.tilt);
  assertWithinThresholdPercent(0.01, cam.roll, cam2.roll);
  
  // TODO: test extremes of camera parameters
}
/***IGNORE_END***/