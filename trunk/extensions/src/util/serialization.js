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
// modified base64 for url
// http://en.wikipedia.org/wiki/Base64
var ALPHABET_ =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// These algorithms are based on the Maps aPI polyline encoding algorithm:
// http://code.google.com/apis/maps/documentation/include/polyline.js

/**
 * Encodes an array of signed numbers into a string.
 * @param {Number[]} arr An array of signed numbers.
 * @type String
 * @return An encoded string representing the array of numbers.
 */
GEarthExtensions.prototype.util.encodeArray = function(arr) {
  var s = '';
  for (var i = 0; i < arr.length; i++) {
    var sgn_num = arr[i] << 1;
    sgn_num = (arr[i] < 0) ? ~sgn_num : sgn_num;

    while (sgn_num >= 0x20) {
      s += ALPHABET_.charAt(0x20 | (sgn_num & 0x1f));
      sgn_num >>= 5;
    }

    s += ALPHABET_.charAt(sgn_num);
  }

  return s;
};

/**
 * Decodes a string representing an array of signed numbers encoded with
 * GEarthExtensions#util.encodeArray.
 * @param {String} str The encoded string.
 * @type Number[]
 */
GEarthExtensions.prototype.util.decodeArray = function(str) {
  var len = str.length;
  var index = 0;
  var array = [];

  while (index < len) {
    var b;
    var shift = 0;
    var result = 0;
    do {
      b = ALPHABET_.indexOf(str.charAt(index++));
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    array.push(((result & 1) ? ~(result >> 1) : (result >> 1)));
  }

  return array;
};
//#BEGIN_TEST
function test_util_encodeArray() {
  var arr = [1, 5, 15, -10, 0, 5e20, -5e20];
  
  var str = testext_.util.encodeArray(arr);
  // TODO: check for string length and used characters
  var arr2 = testext_.util.decodeArray(str);
  
  assertEquals(arr.lat, arr2.lat);
  assertEquals(arr.lng, arr2.lng);
  assertEquals(arr.altitude, arr2.altitude);
  assertEquals(arr.heading, arr2.heading);
  assertEquals(arr.tilt, arr2.tilt);
  assertEquals(arr.roll, arr2.roll);
}
//#END_TEST