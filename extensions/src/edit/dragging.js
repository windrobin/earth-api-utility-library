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
 * Make a placemark draggable.
 * TODO: make this work with multi-geometries
 */
(function() {
  // NOTE: this is shared across all GEarthExtensions instances
  var currentDragContext_ = null;

  var DRAGDATA_JSDATA_KEY = '_GEarthExtensions_dragData';

  function beginDragging_(extInstance, placemark, x, y) {
    // get placemark's drag data
    var placemarkDragData = extInstance.util.getJsDataValue(
        placemark, DRAGDATA_JSDATA_KEY) || {};

    currentDragContext_ = {
      placemark: placemark,
      dragCallback: placemarkDragData.draggableOptions.dragCallback,
      dropCallback: placemarkDragData.draggableOptions.dropCallback,
      dragged: false
    };

    // animate
    if (placemarkDragData.draggableOptions.bounce) {
      extInstance.fx.cancel(currentDragContext_.placemark);
      extInstance.fx.bounce(currentDragContext_.placemark, {
        phase: 1
      });
    }

    // set dragging style
    if (placemarkDragData.draggableOptions.draggingStyle) {
      placemarkDragData.oldStyle =
          currentDragContext_.placemark.getStyleSelector();
      currentDragContext_.placemark.setStyleSelector(
          placemarkDragData.draggableOptions.draggingStyle);
    }

    // show 'target' screen overlay
    if (placemarkDragData.draggableOptions.targetScreenOverlay) {
      var overlay = extInstance.dom.buildScreenOverlay(
          placemarkDragData.draggableOptions.targetScreenOverlay);
      extInstance.dom.setVec2(overlay.getOverlayXY(), { left: x, top: y });
      extInstance.pluginInstance.getFeatures().appendChild(overlay);
      currentDragContext_.activeTargetScreenOverlay = overlay;
    }
  }

  function makeMouseMoveListener_(extInstance) {
    return function(event) {
      if (currentDragContext_) {
        event.preventDefault();

        if (!event.getDidHitGlobe()) {
          return;
        }

        // move 'target' screen overlay
        if (currentDragContext_.activeTargetScreenOverlay) {
          extInstance.dom.setVec2(
              currentDragContext_.activeTargetScreenOverlay.getOverlayXY(),
              { left: event.getClientX(), top: event.getClientY() });
        }

        // TODO: allow for non-point dragging (models?)
        var point = currentDragContext_.placemark.getGeometry();
        point.setLatitude(event.getLatitude());
        point.setLongitude(event.getLongitude());
        currentDragContext_.dragged = true;

        if (currentDragContext_.dragCallback) {
          currentDragContext_.dragCallback.call(currentDragContext_.placemark);
        }
      }
    };
  }

  function stopDragging_(extInstance, abort) {
    if (currentDragContext_) {
      // get placemark's draggable data
      var placemarkDragData = extInstance.util.getJsDataValue(
          currentDragContext_.placemark, DRAGDATA_JSDATA_KEY) || {};

      // unset dragging style
      if (placemarkDragData.oldStyle) {
        currentDragContext_.placemark.setStyleSelector(
            placemarkDragData.oldStyle);
        delete placemarkDragData.oldStyle;
      }

      // remove 'target' screen overlay
      if (currentDragContext_.activeTargetScreenOverlay) {
        extInstance.pluginInstance.getFeatures().removeChild(
            currentDragContext_.activeTargetScreenOverlay);
        delete currentDragContext_.activeTargetScreenOverlay;
      }

      // animate
      if (placemarkDragData.draggableOptions.bounce) {
        extInstance.fx.cancel(currentDragContext_.placemark);
        extInstance.fx.bounce(currentDragContext_.placemark, {
          startAltitude: 0,
          phase: 2,
          repeat: 1,
          dampen: 0.3
        });
      }

      if (currentDragContext_.dragged &&
          currentDragContext_.dropCallback && !abort) {
        currentDragContext_.dropCallback.call(currentDragContext_.placemark);
      }

      currentDragContext_ = null;
    }
  }

  /**
   * Allows the user to drag the given placemark by using the mouse.
   */
  GEarthExtensions.prototype.edit.makeDraggable = function(placemark, options) {
    this.edit.endDraggable(placemark);

    // TODO: assert this is a point placemark
    options = GEarthExtensions.checkParameters(options, false, {
      bounce: true,
      dragCallback: GEarthExtensions.ALLOWED,
      dropCallback: GEarthExtensions.ALLOWED,
      draggingStyle: GEarthExtensions.ALLOWED,
      targetScreenOverlay: GEarthExtensions.ALLOWED
    });

    var me = this;

    // create a mouse move listener for use once dragging has begun
    var mouseMoveListener = makeMouseMoveListener_(me);

    // create a mouse up listener for use once dragging has begun
    var mouseUpListener;
    mouseUpListener = function(event) {
      if (currentDragContext_ && event.getButton() == 0) {
        // remove listener for mousemove on the globe
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mousemove', mouseMoveListener);

        // remove listener for mouseup on the window
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mouseup', mouseUpListener);

        if (currentDragContext_.dragged) {
          // if the placemark was dragged, prevent balloons from popping up
          event.preventDefault();
        }

        stopDragging_(me);
      }
    };

    // create a mouse down listener
    var mouseDownListener = function(event) {
      if (event.getButton() == 0) {
        // TODO: check if getTarget() is draggable and is a placemark
        beginDragging_(me, event.getTarget(),
            event.getClientX(), event.getClientY());

        // listen for mousemove on the globe
        google.earth.addEventListener(me.pluginInstance.getWindow(),
            'mousemove', mouseMoveListener);

        // listen for mouseup on the window
        google.earth.addEventListener(me.pluginInstance.getWindow(),
            'mouseup', mouseUpListener);
      }
    };

    // persist drag options for use in listeners
    this.util.setJsDataValue(placemark, DRAGDATA_JSDATA_KEY, {
      draggableOptions: options,
      abortAndEndFn: function() {
        if (currentDragContext_ &&
            currentDragContext_.placemark.equals(placemark)) {
          // remove listener for mousemove on the globe
          google.earth.removeEventListener(me.pluginInstance.getWindow(),
              'mousemove', mouseMoveListener);

          // remove listener for mouseup on the window
          google.earth.removeEventListener(me.pluginInstance.getWindow(),
              'mouseup', mouseUpListener);

          stopDragging_(me, true); // abort
        }

        google.earth.removeEventListener(placemark, 'mousedown',
            mouseDownListener);
      }
    });

    // listen for mousedown on the placemark
    google.earth.addEventListener(placemark, 'mousedown', mouseDownListener);
  };

  /**
   * Prevents the given placemark from being draggable.
   */
  GEarthExtensions.prototype.edit.endDraggable = function(placemark) {
    // get placemark's drag data
    var placemarkDragData = this.util.getJsDataValue(
        placemark, DRAGDATA_JSDATA_KEY);

    // stop listening for mousedown on the window
    if (placemarkDragData) {
      placemarkDragData.abortAndEndFn.call();

      this.util.clearJsDataValue(placemark, DRAGDATA_JSDATA_KEY);
    }
  };

  /**
   * Enters a mode in which the user can place the given placemark onto the
   * globe by clicking on the globe.
   */
  GEarthExtensions.prototype.edit.place = function(placemark, options) {
    // TODO: assert this is a point placemark
    options = GEarthExtensions.checkParameters(options, false, {
      bounce: true,
      dragCallback: GEarthExtensions.ALLOWED,
      dropCallback: GEarthExtensions.ALLOWED,
      draggingStyle: GEarthExtensions.ALLOWED,
      targetScreenOverlay: GEarthExtensions.ALLOWED
    });

    var me = this;

    // create a mouse move listener
    var mouseMoveListener = makeMouseMoveListener_(me);

    // create a mouse down listener
    var mouseDownListener;
    mouseDownListener = function(event) {
      if (currentDragContext_ && event.getButton() == 0) {
        event.preventDefault();
        event.stopPropagation();
        
        // remove listener for mousemove on the globe
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mousemove', mouseMoveListener);

        // remove listener for mousedown on the window
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mousedown', mouseDownListener);

        stopDragging_(me);
      }
    };

    // persist drag options for use in listeners
    this.util.setJsDataValue(placemark, DRAGDATA_JSDATA_KEY, {
      draggableOptions: options,
      abortAndEndFn: function() {
        if (currentDragContext_ &&
            currentDragContext_.placemark.equals(placemark)) {
          // remove listener for mousemove on the globe
          google.earth.removeEventListener(me.pluginInstance.getWindow(),
              'mousemove', mouseMoveListener);

          // remove listener for mousedown on the window
          google.earth.removeEventListener(me.pluginInstance.getWindow(),
              'mousedown', mouseDownListener);

          stopDragging_(me, true); // abort
        }
      }
    });

    // enter dragging mode right away to 'place' the placemark on the globe
    beginDragging_(me, placemark, -999, -999);

    // listen for mousemove on the window
    google.earth.addEventListener(me.pluginInstance.getWindow(),
        'mousemove', mouseMoveListener);

    // listen for mousedown on the window
    google.earth.addEventListener(me.pluginInstance.getWindow(),
        'mousedown', mouseDownListener);
  };
}());
/***IGNORE_BEGIN***/
function test_edit_Dragging(successCallback, errorCallback) {
  testext_.dom.clearFeatures();
  
  var vce;
  vce = function() {
    google.earth.removeEventListener(testplugin_.getView(),
        'viewchangeend', vce);
    var pm = testext_.dom.addPointPlacemark([0, 0]);

    var callbackCalled = false;
    setTimeout(function() {
      alert('Drag and drop the placemark');
    }, 0);
    
    testext_.edit.makeDraggable(pm, {
      dropCallback: function() {
        window.setTimeout(function() {
          try {
            if (!confirm('Press OK if the drag worked as expected.')) {
              fail('User reported placemark drag failed');
            }

            callbackCalled = true;
            successCallback();
          } catch (e) {
            errorCallback(e);
          }
        }, 1000);
      }
    });
    
    // TODO: make sure drop callback was called
  }
  
  google.earth.addEventListener(testplugin_.getView(), 'viewchangeend', vce);
  testext_.util.lookAt([0, 0], { tilt: 45, range: 100000 });
}
test_edit_Dragging.interactive = true;
/***IGNORE_END***/
