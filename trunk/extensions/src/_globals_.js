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
 * @param {Object} explicitParams The parameters object to check.
 * @param {Boolean} allowAll Whether or not to allow all parameters, or limit
 *     allowed parameters to those listed in the parameter spec.
 * @param {Object} paramSpec The parameter spec, which should be an object whose
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
  
  for (var member in explicitParams) {
    // if not allowing all, check that it's in the param spec
    if (!allowAll && !(member in paramSpec)) {
      var allowed = [];
      for (var m in paramSpec) {
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
 * @param {Object} object The object to test.
 * @private
 */
GEarthExtensions.isExtensionsNamespace_ = function(object) {
  return object !== null && typeof object == 'object' &&
      'isnamespace_' in object && object.isnamespace_;
};

/**
 * Determines whether or not the given object is directly an instance
 * of the specified Earth API type.
 * @param {Object} object The object to test.
 * @param {String} type The Earth API type string, i.e. 'KmlPlacemark'
 */
GEarthExtensions.isInstanceOfEarthInterface = function(object, type) {
  // TODO: double check that all earth interfaces are typeof 'function'
  return object !== null && typeof object == 'function' &&
      'getType' in object && object.getType() == type;
};
