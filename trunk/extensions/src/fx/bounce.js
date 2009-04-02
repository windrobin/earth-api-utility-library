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
 * Bounce a placemark once.
 */
GEarthExtensions.prototype.fx.bounce = function(placemark, options) {
  this.fx.rewind(placemark);
  
  options = GEarthExtensions.checkParameters(options, false, {
    duration: 250,
    startAltitude: GEarthExtensions.ALLOWED,
    altitude: this.util.getCamera().getAltitude() / 5,
    phase: GEarthExtensions.ALLOWED,
    repeat: 0,
    dampen: 1.0,
    callback: GEarthExtensions.ALLOWED
  });
  
  // double check that we're given a placemark with a point geometry
  if (!'getGeometry' in placemark ||
      !placemark.getGeometry() ||
      placemark.getGeometry().getType() != 'KmlPoint') {
    throw new Error('Placemark must be a KmlPoint geometry');
  }
  
  var point = placemark.getGeometry();
  
  // changing altitude if the mode is clamp to ground does nothing, so switch
  // to relative to ground
  // TODO: change it back when the animation is done?
  if (point.getAltitudeMode() == this.pluginInstance.ALTITUDE_CLAMP_TO_GROUND) {
    point.setAltitude(0);
    point.setAltitudeMode(this.pluginInstance.ALTITUDE_RELATIVE_TO_GROUND);
  }
  
  var startAltitude = point.getAltitude();
  if ('startAltitude' in options) {
    startAltitude = options.startAltitude;
  }
  
  // setup the animation phases
  var phase1, phase2;
  var me = this;
  
  // up
  phase1 = function() {
    me.fx.animateProperty(point, 'altitude', {
      duration: options.duration / 2,
      end: startAltitude + options.altitude,
      easing: 'out',
      callback: phase2
    });
  };
  
  // down and repeats
  phase2 = function() {
    me.fx.animateProperty(point, 'altitude', {
      duration: options.duration / 2,
      end: startAltitude,
      easing: 'in',
      callback: function() {
        // done with this bounce, should we bounce again?
        if (options.repeat >= 1) {
          --options.repeat;
          options.altitude *= options.dampen;
          options.phase = 0; // do all phases
          me.fx.bounce(placemark, options);
        } else if (options.callback) {
          options.callback.call(placemark);
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
/***IGNORE_BEGIN***/
function test_fx_bounce(successCallback, errorCallback) {
  testext_.dom.clearFeatures();
  
  function vce() {
    google.earth.removeEventListener(testplugin_.getView(),
        'viewchangeend', vce);
    var pm = testext_.dom.addPointPlacemark([0, 0]);
    
    var callbackCalled = false;
    
    testext_.fx.bounce(pm, {
      duration: 350,
      repeat: 1,
      dampen: 0.3,
      callback: function() {
        callbackCalled = true;
        try {
          if (!confirm('Press OK if you saw the placemark bounce twice, the ' +
                       'second time not as high as the first.')) {
            fail('User reported placemark didnt bounce');
          }
          
          successCallback();
        } catch (e) {
          errorCallback(e);
        }
      }
    });
    
    // check to make sure the callback was called
    window.setTimeout(function() {
      if (!callbackCalled) {
        try {
          fail('Bounce callback never called.');
        } catch (e) { errorCallback(e); }
      }
    }, 350 * 2 + 1000); // allow time for two bounces and 1s overhead
  }
  
  google.earth.addEventListener(testplugin_.getView(),
      'viewchangeend', vce);
  testext_.util.lookAt([0, 0], { tilt: 45, range: 100000 });
}
test_fx_bounce.interactive = true;
/***IGNORE_END***/
