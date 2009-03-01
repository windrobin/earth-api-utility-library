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
 * Converts between various color formats, i.e. '#rrggbb', to the KML color
 * format ('aabbggrr')
 * @param {string} arg The source color value.
 * @type {string}
 * @return A string in KML color format, i.e. 'aabbggrr'
 */
GEarthExtensions.parseColor = function(arg) {
  // detect #rrggbb and convert to kml color aabbggrr
  // TODO: also accept rgb(0,0,0) format using regex, maybe even hsl?
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
    if (arg.length > 7) {
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
function test_parseColor() {
  assertEquals('ff000000', GEarthExtensions.parseColor([0, 0, 0]));
  assertEquals('ffff8000', GEarthExtensions.parseColor([0, 128, 255]));
  assertEquals('80ff8000', GEarthExtensions.parseColor([0, 128, 255, 128]));
  assertEquals('ffff8800', GEarthExtensions.parseColor('#0088FF'));
  assertEquals('ffff8800', GEarthExtensions.parseColor('0088FF'));
  assertEquals('ffccbbaa', GEarthExtensions.parseColor('#abc'));
  assertEquals('ffccbbaa', GEarthExtensions.parseColor('abc'));
  assertEquals('7faeaeae', GEarthExtensions.parseColor('7faeaeae'));
}
/***IGNORE_END***/

/**
 * Inline merges default values into a provided object literal (hash).
 */
/*
GEarthExtensions.mergeDefaults = function(explicitOptions, defaults) {
  // shallow copy explicitOptions
  var finalOptions = {};
  for (member in (explicitOptions || {})) {
    finalOptions[member] = explicitOptions[member];
  }
  
  // copy in defaults
  for (member in (defaults || {})) {
    if (!(member in finalOptions)) {
      finalOptions[member] = defaults[member];
    }
  }
  
  return finalOptions;
};
*/
// TODO: unit test

/** @private */
GEarthExtensions.AUTO = Infinity; // for dom builder (auto property setters)

/** @private */
GEarthExtensions.ALLOWED = null;

/** @private */
GEarthExtensions.REQUIRED = undefined;

/**
 * Checks a given parameters object against an parameter spec,
 * throwing exceptions as necessary, and returning the resulting options object
 * with defaults filled in.
 * @param {object} explicitParams The parameters object to check.
 * @param {boolean} allowAll Whether or not to allow all parameters, or limit
 *     allowed parameters to those listed in the parameter spec.
 * @param {object} paramSpec The parameter spec, which should be an object whose
 *     properties are the properties expected in the given parameters object and
 *     whose property values are GEarthExtensions.REQUIRED if the property is
 *     required or some other value to set a default value.
 * @return Returns a shallow copy of the given parameters object, cleaned up
 *     according to the parameters spec and with default values filled in.
 */
GEarthExtensions.checkParameters = function(explicitParams,
                                            allowAll, paramSpec) {
  // shallow copy explicitParameters
  var finalParams = {};
  
  explicitParams = explicitParams || {};
  paramSpec = paramSpec || {};
  
  for (member in explicitParams) {
    // if not allowing all, check that it's in the param spec
    if (!allowAll && !(member in paramSpec)) {
      var allowed = [];
      for (m in paramSpec) {
        allowed.push(m);
      }
      
      throw new Error(
        'Unexpected parameter \'' + member + '\'. ' +
        'Allowed parameters are: ' + allowed.join(', ') + '.');
    }
    
    finalParams[member] = explicitParams[member];
  }
  
  // copy in defaults
  for (member in paramSpec) {
    if (!(member in finalParams)) {
      // if member was required, throw an exception
      if (paramSpec[member] === GEarthExtensions.REQUIRED) {
        throw new Error(
            'Required parameter \'' + member + '\' was not passed.');
      }
      
      if (paramSpec[member] != GEarthExtensions.ALLOWED &&
          paramSpec[member] != GEarthExtensions.AUTO) {
        // GEarthExtensions.ALLOWED and GEarthExtensions.AUTO are placeholders,
        // not default values
        finalParams[member] = paramSpec[member];
      }
    }
  }
  
  return finalParams;
};

/**
 * Creates a new 'class' from the provided constructor function and mixes in
 * members of provided mixin classes.
 * @private
 */
GEarthExtensions.createClass_ = function() {
  var mixins = [];
  var constructorFn = null;
  
  if (geo.util.isArray(arguments[0])) {
    mixins = arguments[0];
    constructorFn = arguments[1];
  } else {
    constructorFn = arguments[0];
  }
  
  constructorFn.isclass_ = true;
  
  for (var i = 0; i < mixins.length; i++) {
    for (var k in mixins[i].prototype) {
      constructorFn.prototype[k] = mixins[i].prototype[k];
    }
  }
  
  return constructorFn;
};

/**
 * Determines whether or not the object is a GEarthExtensions namespace.
 * @param {object} object The object to test.
 * @private
 */
GEarthExtensions.isExtensionsNamespace_ = function(object) {
  return object !== null && typeof object == 'object' &&
      'isnamespace_' in object && member.isnamespace_;
};

/**
 * Determines whether or not the given object is directly an instance
 * of the specified Earth API type.
 * @param {object} object The object to test.
 * @param {string} type The Earth API type string, i.e. 'KmlPlacemark'
 */
GEarthExtensions.isInstanceOfEarthInterface = function(object, type) {
  // TODO: double check that all earth interfaces are typeof 'function'
  return object !== null && typeof object == 'function' &&
      'getType' in object && object.getType() == type;
};
