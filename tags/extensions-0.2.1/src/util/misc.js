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
 * Creates a KmlLookAt and sets it as the Earth plugin's view. This function
 * takes the same parameters as GEarthExtensions#dom.buildLookAt.
 */
GEarthExtensions.prototype.util.lookAt = function() {
  this.pluginInstance.getView().setAbstractView(
      this.dom.buildLookAt.apply(null, arguments));
};

/**
 * Gets the current view as a KmlLookAt.
 * @param {Number} [altitudeMode=ALTITUDE_ABSOLUTE] The altitude mode
 *     that the resulting LookAt should be in.
 * @type KmlLookAt
 * @return Returns the current view as a KmlLookAt.
 */
GEarthExtensions.prototype.util.getLookAt = function(altitudeMode) {
  if (geo.util.isUndefined(altitudeMode)) {
    altitudeMode = this.pluginInstance.ALTITUDE_ABSOLUTE;
  }
  
  return this.pluginInstance.getView().copyAsLookAt(altitudeMode);
};

/**
 * Gets the current view as a KmlCamera.
 * @param {Number} [altitudeMode=ALTITUDE_ABSOLUTE] The altitude mode
 *     that the resulting camera should be in.
 * @type KmlCamera
 * @return Returns the current view as a KmlCamera.
 */
GEarthExtensions.prototype.util.getCamera = function(altitudeMode) {
  if (geo.util.isUndefined(altitudeMode)) {
    altitudeMode = this.pluginInstance.ALTITUDE_ABSOLUTE;
  }
  
  return this.pluginInstance.getView().copyAsCamera(altitudeMode);
};

/**
 * Flies to an object; if the object is a feature and has an explicitly defined
 * abstract view, that view is used. Otherwise, attempts to calculate a bounds
 * view of the object and flies to that (assuming options.boundsFallback is
 * true).
 * @param {KmlObject} obj The object to fly to.
 * @param {Object} [options] Flyto options.
 * @param {Boolean} [options.boundsFallback=true] Whether or not to attempt to
 *     calculate a bounding box view of the object if it doesn't have an
 *     abstract view.
 * @param {Number} [options.aspectRatio=1.0] When calculating a bounding box
 *     view, this should be the current aspect ratio of the plugin window.
 */
GEarthExtensions.prototype.util.flyToObject = function(obj, options) {
  options = checkParameters_(options, false, {
    boundsFallback: true,
    aspectRatio: 1.0
  });
  
  if (!obj) {
    throw new Error('flyToObject was given an invalid object.');
  }
  
  if ('getAbstractView' in obj && obj.getAbstractView()) {
    this.pluginInstance.getView().setAbstractView(
        obj.getAbstractView());
  } else if (options.boundsFallback) {
    var bounds = this.dom.computeBounds(obj);
    if (bounds && !bounds.isEmpty()) {
      this.view.setToBoundsView(bounds, {
        aspectRatio: options.aspectRatio
      });
    }
  }
};

/**
 * Executes the given function quickly using a Google Earth API callback
 * hack. Future versions of this method may use other methods for batch
 * execution.
 * @param {Function} batchFn The function containing batch code to execute.
 * @param {Object} [context] Optional context parameter to pass to the
 *     function.
 */
GEarthExtensions.prototype.util.batchExecute = function(batchFn, context) {
  var me = this;
  google.earth.executeBatch(this.pluginInstance, function() {
    batchFn.call(me, context);
  });
};
//#BEGIN_TEST
function test_util_batchExecute(successCallback, errorCallback) {
  var pm = testplugin_.createPlacemark('');
  testext_.util.batchExecute(function() {
    pm.setName('hey');
  });

  setTimeout(function() {
    if (pm.getName() == 'hey') {
      successCallback();
    } else {
      try {
        fail('batchExecute method did not finish within 2 seconds.');
      } catch (e) { errorCallback(e); }
    }
  }, 2000);
}
test_util_batchExecute.async = true;
//#END_TEST

/**
 * Calls method on object with optional arguments. Arguments to pass to the
 * method should be given in order after the 'method' argument.
 * @param {Object} object The object to call the method on.
 * @param {String} method The method to call.
 */
GEarthExtensions.prototype.util.callMethod = function(object, method) {
  "object:nomunge, method:nomunge, args:nomunge";

  var i;

  // strip out 'object' and 'method' arguments
  var args = [];
  for (i = 2; i < arguments.length; i++) {
    args.push(arguments[i]);
  }

  if (typeof object[method] == 'function') {
    // most browsers, most object/method pairs
    return object[method].apply(object, args);
  } else {
    // In the Earth API in Internet Explorer, typeof returns 'unknown'
    var reprArgs = [];
    for (i = 0; i < args.length; i++) {
      reprArgs.push('args[' + i + ']');
    }

    // Don't use eval directly due to a YUI Compressor bug/feature.
    return window['eval']('object.' + method + '(' + reprArgs.join(',') + ')');
  }
};
//#BEGIN_TEST
function test_util_callMethod() {
  function Adder(a) {
    this.a = a;
  }

  // test on a pure JavaScript object and method
  Adder.prototype.add2 = function(b, c) {
    return this.a + b + c;
  };

  var adder = new Adder(5);
  assertEquals(8, testext_.util.callMethod(adder, 'add2', 1, 2));

  // test on an Earth API object and method
  var placemark = testext_.util.callMethod(testplugin_, 'createPlacemark', '');
  assertTrue(placemark && 'getType' in placemark);
  assertEquals('KmlPlacemark', placemark.getType());
}
//#END_TEST

/**
 * Enables or disables full camera ownership mode, which sets fly to speed
 * to teleport, disables user mouse interaction, and hides the navigation
 * controls.
 * @param {Boolean} enable Whether to enable or disable full camera ownership.
 */
GEarthExtensions.prototype.util.takeOverCamera = function(enable) {
  if (enable || geo.util.isUndefined(enable)) {
    if (this.cameraControlOldProps_) {
      return;
    }
    
    this.cameraControlOldProps_ = {
      flyToSpeed: this.pluginInstance.getOptions().getFlyToSpeed(),
      mouseNavEnabled:
          this.pluginInstance.getOptions().getMouseNavigationEnabled(),
      navControlVis: this.pluginInstance.getNavigationControl().getVisibility()
    };
    
    this.pluginInstance.getOptions().setFlyToSpeed(
        this.pluginInstance.SPEED_TELEPORT);
    this.pluginInstance.getOptions().setMouseNavigationEnabled(false);
    this.pluginInstance.getNavigationControl().setVisibility(
        this.pluginInstance.VISIBILITY_HIDE);
  } else {
    if (!this.cameraControlOldProps_) {
      return;
    }
    
    this.pluginInstance.getOptions().setFlyToSpeed(
        this.cameraControlOldProps_.flyToSpeed);
    this.pluginInstance.getOptions().setMouseNavigationEnabled(
        this.cameraControlOldProps_.mouseNavEnabled);
    this.pluginInstance.getNavigationControl().setVisibility(
        this.cameraControlOldProps_.navControlVis);
    
    delete this.cameraControlOldProps_;
  }
};
