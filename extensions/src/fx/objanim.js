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
 * Cancel all animations on a given feature, potentially leaving them in an
 * intermediate visual state.
 */
GEarthExtensions.prototype.fx.cancel = function(feature) {
  // TODO: verify that feature is a KmlFeature
  var animations = this.util.getJsDataValue(feature,
                       '_GEarthExtensions_anim') || [];
  for (var i = 0; i < animations.length; i++) {
    animations[i].stop();
  }
};

/**
 * Cancel all animations on a given feature and revert them to their t = 0
 * state.
 */
GEarthExtensions.prototype.fx.rewind = function(feature) {
  // TODO: verify that feature is a KmlFeature
  var animations = this.util.getJsDataValue(feature,
                       '_GEarthExtensions_anim') || [];
  for (var i = 0; i < animations.length; i++) {
    animations[i].rewind();
  }
};

/**
 * Animate a numeric property on a plugin object.
 */
GEarthExtensions.prototype.fx.animateProperty =
function(obj, property, options) {
  options = GEarthExtensions.checkParameters(options, false, {
    duration: 500,
    start: GEarthExtensions.ALLOWED,
    end: GEarthExtensions.ALLOWED,
    delta: GEarthExtensions.ALLOWED,
    easing: 'none',
    callback: GEarthExtensions.ALLOWED
  });
  
  // http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm
  // TODO: ensure easing function exists
  // get the easing function
  if (typeof options.easing == 'string') {
    options.easing = {
      'none': function(t) {
        return t;
      },
      'in': function(t) { // cubic in
        return t*t*t;
      },
      'out': function(t) { // cubic out
        var ts = t*t;
        var tc = ts*t;
        return tc - 3*ts + 3*t;
      },
      'both': function(t) { // quintic in-out
        var ts = t*t;
        var tc = ts*t;
        return 6*tc*ts - 15*ts*ts + 10*tc;
      }
    }[options.easing];
  }

  var propertyTitleCase = property.charAt(0).toUpperCase() +
                          property.substr(1);

  var me = this;
  
  // TODO: custom support for KmlColor -- gex.util.blendColors
  
  var getter = function() {
    return me.util.callMethod(obj, 'get' + propertyTitleCase);
  };
  
  var setter = function(val) {
    return me.util.callMethod(obj, 'set' + propertyTitleCase, val);
  };
    
  // use EITHER start/end or delta
  if (!isFinite(options.start) && !isFinite(options.end)) {
    // use delta
    if (!isFinite(options.delta)) {
      options.delta = 0.0;
    }
    
    options.start = getter();
    options.end = getter() + options.delta;
  } else {
    // use start/end
    if (!isFinite(options.start)) {
      options.start = getter();
    }

    if (!isFinite(options.end)) {
      options.end = getter();
    }
  }
  
  var anim = new this.fx.TimedAnimation(options.duration,
    function(t) {
      // render callback
      setter(options.start +
             options.easing.call(null, 1.0 * t / options.duration) *
               (options.end - options.start));
    },
    function() {
      // completion callback
      
      // remove this animation from the list of animations on the object
      var animations = me.util.getJsDataValue(obj, '_GEarthExtensions_anim');
      if (animations) {
        for (var i = 0; i < animations.length; i++) {
          if (animations[i] == this) {
            animations.splice(i, 1);
            break;
          }
        }
        
        if (!animations.length) {
          me.util.clearJsDataValue(obj, '_GEarthExtensions_anim');
        }
      }

      if (options.callback) {
        options.callback.call(obj);
      }
    });
  
  // add this animation to the list of animations on the object
  var animations = this.util.getJsDataValue(obj, '_GEarthExtensions_anim');
  if (animations) {
    animations.push(anim);
  } else {
    this.util.setJsDataValue(obj, '_GEarthExtensions_anim', [anim]);
  }
  
  anim.start();
  return anim;
};