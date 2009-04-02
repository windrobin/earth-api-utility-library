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
GEarthExtensions.NAMED_COLORS = {
  'aqua': 'ffffff00',
  'black': 'ff000000',
  'blue': 'ffff0000',
  'fuchsia': 'ffff00ff',
  'gray': 'ff808080',
  'green': 'ff008000',
  'lime': 'ff00ff00',
  'maroon': 'ff000080',
  'navy': 'ff800000',
  'olive': 'ff008080',
  'purple': 'ff800080',
  'red': 'ff0000ff',
  'silver': 'ffc0c0c0',
  'teal': 'ff808000',
  'white': 'ffffffff',
  'yellow': 'ff00ffff'
};

/**
 * Converts between various color formats, i.e. '#rrggbb', to the KML color
 * format ('aabbggrr')
 * @param {String|Number[]} arg The source color value.
 * @type {String}
 * @return A string in KML color format, i.e. 'aabbggrr'
 */
GEarthExtensions.prototype.util.parseColor = function(arg) {
  // detect #rrggbb and convert to kml color aabbggrr
  // TODO: also accept 'rgb(0,0,0)' format using regex, maybe even hsl?
  if (geo.util.isArray(arg)) {
    // expected array as [r,g,b] or [r,g,b,a]

    var pad2 = function(s) {
      return ((s.length < 2) ? '0' : '') + s;
    };

    return pad2(((arg.length >= 4) ? arg[3].toString(16) : 'ff')) +
           pad2(arg[2].toString(16)) +
           pad2(arg[1].toString(16)) +
           pad2(arg[0].toString());
  } else if (typeof arg == 'string') {
    // parsing a string
    if (arg.toLowerCase() in GEarthExtensions.NAMED_COLORS) {
      return GEarthExtensions.NAMED_COLORS[arg.toLowerCase()];
    } if (arg.length > 7) {
      // if not stored as HTML color, assume it's stored as a
      // KML color and return as is
      // TODO: check for valid KML color using regex?
      return arg;
    } else if (arg.length > 4) {
      // stored as full HTML color
      return arg.replace(
          /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i,
          'ff$3$2$1').toLowerCase();
    } else {
      // stored as shorthand HTML/CSS color (#fff)
      return arg.replace(
          /#?([0-9a-f])([0-9a-f])([0-9a-f])/i,
          'ff$3$3$2$2$1$1').toLowerCase();
    }
  }
};
/***IGNORE_BEGIN***/
function test_util_parseColor() {
  assertEquals('ff000000', testext_.util.parseColor([0, 0, 0]));
  assertEquals('ffff8000', testext_.util.parseColor([0, 128, 255]));
  assertEquals('80ff8000', testext_.util.parseColor([0, 128, 255, 128]));
  assertEquals('ffff8800', testext_.util.parseColor('#0088FF'));
  assertEquals('ffff8800', testext_.util.parseColor('0088FF'));
  assertEquals('ffccbbaa', testext_.util.parseColor('#abc'));
  assertEquals('ffccbbaa', testext_.util.parseColor('abc'));
  assertEquals('7faeaeae', testext_.util.parseColor('7faeaeae'));
  assertEquals('ff0000ff', testext_.util.parseColor('red'));
  assertEquals('ffffffff', testext_.util.parseColor('White'));
  assertEquals('ff000000', testext_.util.parseColor('BLACK'));
}
/***IGNORE_END***/


// TODO: docs
GEarthExtensions.prototype.util.blendColors = function(color1, color2,
                                                       fraction) {
  if (geo.util.isUndefined(fraction) || fraction === null) {
    fraction = 0.5;
  }
  
  color1 = this.util.parseColor(color1);
  color2 = this.util.parseColor(color2);

  var pad2 = function(s) {
    return ((s.length < 2) ? '0' : '') + s;
  };

  var blendHexComponent_ = function(c1, c2) {
    c1 = parseInt(c1, 16);
    c2 = parseInt(c2, 16);

    return pad2(Math.floor((c2 - c1) * fraction + c1).toString(16));
  };

  return blendHexComponent_(color1.substr(0,2), color2.substr(0,2)) +
         blendHexComponent_(color1.substr(2,2), color2.substr(2,2)) +
         blendHexComponent_(color1.substr(4,2), color2.substr(4,2)) +
         blendHexComponent_(color1.substr(6,2), color2.substr(6,2));
};
// TODO: unit test