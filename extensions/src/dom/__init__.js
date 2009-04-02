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
 * Contains DOM builder functions (buildXX) and DOM
 * manipulation/traversal functions.
 * @namespace
 */
GEarthExtensions.prototype.dom = {isnamespace_:true};

/**
 * This is a sort of parametrized decorator around a fundamental constructor
 * DOM builder function,
 * it calls GEPlugin's buildXX factory functions, allows for a type of
 * inheritance, provides extra functionality such as automatic property setters,
 * default arguments (i.e. fn('bar', {cat:'dog'}) == fn({foo:'bar', cat:'dog'}))
 * and checking if the parameter is an instance of the object we're constructing
 * @private
 */
GEarthExtensions.domBuilder_ = function(params) {
  if (params.apiInterface && !geo.util.isArray(params.apiInterface)) {
    params.apiInterface = [params.apiInterface];
  }
  
  // merge in base builder params
  // TODO: detect circular base builders
  var base = params.base;
  while (base) {
    // merge in propertyspec
    if ('propertySpec' in base.builderParams) {
      if (!('propertySpec' in params)) {
        params.propertySpec = [];
      }
      
      for (var member in base.builderParams.propertySpec) {
        if (!(member in params.propertySpec)) {
          params.propertySpec[member] =
              base.builderParams.propertySpec[member];
        }
      }
    }
    
    // set Earth API interface if none was set for this builder
    if (!params.apiInterface) {
      params.apiInterface = base.builderParams.apiInterface;
    }
    
    // set Earth API factory fn if none was set for this builder
    if (!params.apiFactoryFn) {
      params.apiFactoryFn = base.builderParams.apiFactoryFn;
    }
    
    base = base.builderParams.base;
  }
  
  // merge in root dom builder property spec (only id is universal to
  // all DOM objects)
  var rootPropertySpec = {
    id: ''
  };
  
  for (member in rootPropertySpec) {
    if (!(member in params.propertySpec)) {
      params.propertySpec[member] = rootPropertySpec[member];
    }
  }
  
  /** @ignore */
  var builderFn = function() {
    var options = {};
    var i;
    
    // construct options literal to pass to constructor function
    // from arguments
    if (arguments.length === 0) {
      throw new TypeError('Cannot create object without any arguments!');
    } else if (arguments.length == 1) {
      // the argument to the function may already be an instance of the
      // interface we're trying to create... if so, then simply return the
      // instance
      
      // TODO: maybe clone the object instead of just returning it
      for (i = 0; i < params.apiInterface.length; i++) {
        if (GEarthExtensions.isInstanceOfEarthInterface(
            arguments[0], params.apiInterface[i])) {
          return arguments[0];
        }
      }
      
      // find out if the first argument is the default property or the
      // options literal and construct the final options literal to
      // pass to the constructor function
      var arg = arguments[0];
      if (geo.util.isObjectLiteral(arg)) {
        // passed in only the options literal
        options = arg;
      } else if ('defaultProperty' in params) {
        // passed in default property and no options literal
        options[params.defaultProperty] = arg;
      } else {
        throw new TypeError('Expected options object');
      }
    } else if (arguments.length == 2) {
      if ('defaultProperty' in params) {
        // first parameter is the value of the default property, and the
        // other is the options literal
        options = arguments[1];
        options[params.defaultProperty] = arguments[0];
      } else {
        throw new Error('No default property for the DOM builder');
      }
    }
    
    // check passed in options against property spec
    options = GEarthExtensions.checkParameters(options,
        false, params.propertySpec);
    
    // call Earth API factory function, i.e. createXX(...)
    var newObj = this.util.callMethod(
                     this.pluginInstance, params.apiFactoryFn, options.id);

    // call constructor fn with factory-created object and options literal
    if (!geo.util.isUndefined(params.constructor)) {
      params.constructor.call(this, newObj, options);
    }
    
    // call base builder constructor functions
    base = params.base;
    while (base) {
      // call ancestor constructor functions
      if ('constructor' in base.builderParams) {
        base.builderParams.constructor.call(this, newObj, options);
      }
      
      base = base.builderParams.base;
    }
    
    // run automatic property setters as defined in property spec
    for (var property in params.propertySpec) {
      // TODO: abstract away into isAuto()
      if (params.propertySpec[property] === GEarthExtensions.AUTO &&
          property in options) {
        // auto setters calls newObj.setXx(options[xx]) if xx is in options
        this.util.callMethod(newObj,
            'set' + property.charAt(0).toUpperCase() + property.substr(1),
            options[property]);
      }
    }
    
    return newObj;
  };
  
  builderFn.builderParams = params;
  return builderFn;
};
