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
    animations[i].stop(false);
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
 * @param {KmlObject} object The plugin object whose property to animate.
 * @param {String} property The property to animate. This should match 1:1 to
 *     the getter/setter methods on the plugin object. For example, to animate
 *     a KmlPoint latitude, pass in `latitude`, since the getter/setters are
 *     `getLatitude` and `setLatitude`.
 * @param {Object} options The property animation options.
 * @param {Number} [options.duration=500] The duration, in milliseconds, of the
 *     animation.
 * @param {Number} [options.start] The value of the property to set at the
 *     start of the animation.
 * @param {Number} [options.end] The desired end value of the property.
 * @param {Number} [options.delta] If end is not specified, you may set this
 *     to the desired change in the property value.
 * @param {String|Function} [options.easing='none'] The easing function to use
 *     during the animation. Valid values are 'none', 'in', 'out', or 'both'.
 *     Alternatively, an easy function mapping `[0.0, 1.0] -> [0.0, 1.0]` can
 *     be specified. No easing is `f(x) = x`.
 * @param {Function} [options.callback] A callback method to fire when the
 *     animation is completed/stopped. The callback will receive an object
 *     literal argument that will contain a 'cancelled' boolean value that will
 *     be true if the effect was cancelled.
 * @param {KmlFeature} [options.featureProxy] A feature to associate with this
 *     property animation for use with GEarthExtensions#fx.cancel or
 *     GEarthExtensions#fx.rewind.
 */
GEarthExtensions.prototype.fx.animateProperty =
function(obj, property, options) {
  options = checkParameters_(options, false, {
    duration: 500,
    start: ALLOWED_,
    end: ALLOWED_,
    delta: ALLOWED_,
    easing: 'none',
    callback: ALLOWED_,
    featureProxy: ALLOWED_
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
  
  /** @private */
  var doAnimate_;
  if (property == 'color') {
    // KmlColor blending
    if (options.delta) {
      throw new Error('Cannot use delta with color animations.');
    }
    
    var colorObj = obj.getColor() || {get: function(){ return ''; }};
    
    // use start/end
    if (!options.start) {
      options.start = colorObj.get();
    }

    if (!options.end) {
      options.end = colorObj.get();
    }
  
    /** @private */
    doAnimate_ = function(f) {
      colorObj.set(me.util.blendColors(options.start, options.end,
          options.easing.call(null, f)));
    };
  } else {
    // numerical property blending
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
  
    /** @private */
    doAnimate_ = function(f) {
      setter(options.start + (options.end - options.start) *
                             options.easing.call(null, f));
    };
  }
  
  var anim = new this.fx.TimedAnimation(options.duration,
    function(t) {
      // render callback
      doAnimate_(1.0 * t / options.duration);
    },
    function(e) {
      // completion callback
      
      // remove this animation from the list of animations on the object
      var animations = me.util.getJsDataValue(options.featureProxy || obj,
          '_GEarthExtensions_anim');
      if (animations) {
        for (var i = 0; i < animations.length; i++) {
          if (animations[i] == this) {
            animations.splice(i, 1);
            break;
          }
        }
        
        if (!animations.length) {
          me.util.clearJsDataValue(options.featureProxy || obj,
              '_GEarthExtensions_anim');
        }
      }

      if (options.callback) {
        options.callback.call(obj, e);
      }
    });
  
  // add this animation to the list of animations on the object
  var animations = this.util.getJsDataValue(options.featureProxy || obj,
      '_GEarthExtensions_anim');
  if (animations) {
    animations.push(anim);
  } else {
    this.util.setJsDataValue(options.featureProxy || obj,
        '_GEarthExtensions_anim', [anim]);
  }
  
  anim.start();
  return anim;
};
