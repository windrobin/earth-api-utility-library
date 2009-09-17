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
 * Bounces a point placemark by animating its altitude.
 * @param {KmlPlacemark} placemark The point placemark to bounce.
 * @param {Object} [options] The bounce options.
 * @param {Number} [options.duration=300] The duration of the initial bounce,
 *     in milliseconds.
 * @param {Number} [options.startAltitude] The altitude at which to start the
 *     bounce, in meters. The default is the point's current altitude.
 * @param {Number} [options.altitude] The altitude by which the placemark
 *     should rise at its peak, in meters. The default is the computed based
 *     on the current plugin viewport.
 * @param {Number} [options.phase] The bounce phase. If no phase is specified,
 *     both ascent and descent are performed. If phase=1, then only the ascent
 *     is performed. If phase=2, then only the descent and repeat are performed.
 * @param {Number} [options.repeat=0] The number of times to repeat the bounce.
 * @param {Number} [options.dampen=0.3] The altitude and duration dampening
 *     factor that repeat bounces should be scaled by.
 * @param {Function} [options.callback] A callback function to be triggered
 *     after the bounce is completed. The callback's 'this' variable will be
 *     bound to the placemark object, and it will receive a single boolean
 *     argument that will be true if the bounce was cancelled.
 *     Note that the callback is not fired if phase=2.
 */
GEarthExtensions.prototype.fx.bounce = function(placemark, options) {
  options = checkParameters_(options, false, {
    duration: 300,
    startAltitude: ALLOWED_,
    altitude: this.util.getCamera().getAltitude() / 5,
    phase: ALLOWED_,
    repeat: 0,
    dampen: 0.3,
    callback: function(){}
  });
  
  var me = this;
  this.fx.rewind(placemark);
  
  // double check that we're given a placemark with a point geometry
  if (!'getGeometry' in placemark ||
      !placemark.getGeometry() ||
      placemark.getGeometry().getType() != 'KmlPoint') {
    throw new TypeError('Placemark must be a KmlPoint geometry');
  }
  
  var point = placemark.getGeometry();
  var origAltitudeMode = point.getAltitudeMode();

  // changing altitude if the mode is clamp to ground does nothing, so switch
  // to relative to ground
  if (origAltitudeMode == this.pluginInstance.ALTITUDE_CLAMP_TO_GROUND) {
    point.setAltitude(0);
    point.setAltitudeMode(this.pluginInstance.ALTITUDE_RELATIVE_TO_GROUND);
  }
  
  if (origAltitudeMode == this.pluginInstance.ALTITUDE_CLAMP_TO_SEA_FLOOR) {
    point.setAltitude(0);
    point.setAltitudeMode(this.pluginInstance.ALTITUDE_RELATIVE_TO_SEA_FLOOR);
  }

  if (typeof options.startAltitude != 'number') {
    options.startAltitude = point.getAltitude();
  }
  
  // setup the animation phases
  var phase1, phase2;
  
  // up
  phase1 = function() {
    me.fx.animateProperty(point, 'altitude', {
      duration: options.duration / 2,
      end: options.startAltitude + options.altitude,
      easing: 'out',
      featureProxy: placemark,
      callback: phase2 || function(){}
    });
  };
  
  // down and repeats
  phase2 = function(e) {
    if (e && e.cancelled) {
      return;
    }
    
    me.fx.animateProperty(point, 'altitude', {
      duration: options.duration / 2,
      start: options.startAltitude + options.altitude,
      end: options.startAltitude,
      easing: 'in',
      featureProxy: placemark,
      callback: function(e2) {
        point.setAltitudeMode(origAltitudeMode);

        if (e2.cancelled) {
          point.setAltitude(options.startAltitude);
          options.callback.call(placemark, e2);
          return;
        }

        // done with this bounce, should we bounce again?
        if (options.repeat >= 1) {
          --options.repeat;
          options.altitude *= options.dampen;
          options.duration *= Math.sqrt(options.dampen);
          options.phase = 0; // do all phases
          me.fx.bounce(placemark, options);
        } else {
          options.callback.call(placemark, e2);
        }
      }
    });
  };
  
  // animate the bounce
  if (options.phase === 1) {
    phase2 = null;
    phase1.call();
  } else if (options.phase === 2) {
    phase2.call();
  } else {
    phase1.call();
  }
};
//#BEGIN_TEST
function test_fx_bounce(successCallback, errorCallback) {
  testext_.dom.clearFeatures();
  
  testhelpers_.setViewAndContinue(
      testext_.dom.buildLookAt([0, 0], { tilt: 45, range: 100000 }),
      function() {
    var pm = testext_.dom.addPointPlacemark([0, 0]);
    
    var callbackCalled = false;
    
    try {
      testext_.fx.bounce(pm, {
        duration: 350,
        repeat: 1,
        dampen: 0.3,
        callback: function() {
          callbackCalled = true;

          testhelpers_.confirm(
              'Did the placemark bounce twice, the second time not as high ' +
              'as the first?', successCallback, errorCallback);
        }
      });
    } catch(e) { errorCallback(e); }
    
    // check to make sure the callback was called
    window.setTimeout(function() {
      if (!callbackCalled) {
        errorCallback({ message: 'Bounce callback never called.' });
      }
    }, 350 * 2 + 1000); // allow time for two bounces and 1s overhead
  });
}
test_fx_bounce.interactive = true;
//#END_TEST
