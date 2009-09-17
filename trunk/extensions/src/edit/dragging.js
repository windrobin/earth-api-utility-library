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
var DRAGDATA_JSDATA_KEY = '_GEarthExtensions_dragData';

// NOTE: this is shared across all GEarthExtensions instances
var currentDragContext_ = null;

function beginDragging_(extInstance, placemark) {
  // get placemark's drag data
  var placemarkDragData = extInstance.util.getJsDataValue(
      placemark, DRAGDATA_JSDATA_KEY) || {};

  currentDragContext_ = {
    placemark: placemark,
    startAltitude: placemark.getGeometry().getAltitude(),
    draggableOptions: placemarkDragData.draggableOptions,
    dragged: false
  };
}

function makeMouseMoveListener_(extInstance) {
  return function(event) {
    if (currentDragContext_) {
      event.preventDefault();

      if (!event.getDidHitGlobe()) {
        return;
      }
      
      if (!currentDragContext_.dragged) {
        currentDragContext_.dragged = true;

        // set dragging style
        if (currentDragContext_.draggableOptions.draggingStyle) {
          currentDragContext_.oldStyle =
              currentDragContext_.placemark.getStyleSelector();
          currentDragContext_.placemark.setStyleSelector(
              extInstance.dom.buildStyle(
              currentDragContext_.draggableOptions.draggingStyle));
        }

        // animate
        if (currentDragContext_.draggableOptions.bounce) {
          extInstance.fx.cancel(currentDragContext_.placemark);
          extInstance.fx.bounce(currentDragContext_.placemark, {
            phase: 1
          });
        }

        // show 'target' screen overlay (will be correctly positioned
        // later)
        if (currentDragContext_.draggableOptions.targetScreenOverlay) {
          var overlay = extInstance.dom.buildScreenOverlay(
              currentDragContext_.draggableOptions.targetScreenOverlay);
          extInstance.pluginInstance.getFeatures().appendChild(overlay);
          currentDragContext_.activeTargetScreenOverlay = overlay;
        }
      }

      // move 'target' screen overlay
      if (currentDragContext_.activeTargetScreenOverlay) {
        // NOTE: overlayXY but we really are setting the screenXY due to
        // the two being swapped in the Earth API
        extInstance.dom.setVec2(
            currentDragContext_.activeTargetScreenOverlay.getOverlayXY(),
            { left: event.getClientX(), top: event.getClientY() });
      }

      // TODO: allow for non-point dragging (models?)
      var point = currentDragContext_.placemark.getGeometry();
      point.setLatitude(event.getLatitude());
      point.setLongitude(event.getLongitude());
      
      // show the placemark
      currentDragContext_.placemark.setVisibility(true);

      if (currentDragContext_.draggableOptions.dragCallback) {
        currentDragContext_.draggableOptions.dragCallback.call(
            currentDragContext_.placemark);
      }
    }
  };
}

function stopDragging_(extInstance, abort) {
  if (currentDragContext_) {
    if (currentDragContext_.dragged) {
      // unset dragging style
      if (currentDragContext_.oldStyle) {
        currentDragContext_.placemark.setStyleSelector(
            currentDragContext_.oldStyle);
        delete currentDragContext_.oldStyle;
      }

      // remove 'target' screen overlay
      if (currentDragContext_.activeTargetScreenOverlay) {
        extInstance.pluginInstance.getFeatures().removeChild(
            currentDragContext_.activeTargetScreenOverlay);
        delete currentDragContext_.activeTargetScreenOverlay;
      }

      // animate
      if (currentDragContext_.draggableOptions.bounce) {
        extInstance.fx.cancel(currentDragContext_.placemark);
        extInstance.fx.bounce(currentDragContext_.placemark, {
          startAltitude: currentDragContext_.startAltitude,
          phase: 2,
          repeat: 1,
          dampen: 0.3
        });
      }
    }

    if (currentDragContext_.dragged &&
        currentDragContext_.draggableOptions.dropCallback && !abort) {
      currentDragContext_.draggableOptions.dropCallback.call(
          currentDragContext_.placemark);
    }

    currentDragContext_ = null;
  }
}

/**
 * Turns on draggability for the given point placemark.
 * @param {KmlPlacemark} placemark The point placemark to enable dragging on.
 * @param {Object} [options] The draggable options.
 * @param {Boolean} [options.bounce=true] Whether or not to bounce up upon
 *     dragging and bounce back down upon dropping.
 * @param {Function} [options.dragCallback] A callback function to fire
 *     continuously while dragging occurs.
 * @param {Function} [options.dropCallback] A callback function to fire
 *     once the placemark is successfully dropped.
 * @param {StyleOptions|KmlStyle} [options.draggingStyle] The style options
 *     to apply to the placemark while dragging.
 * @param {ScreenOverlayOptions|KmlScreenOverlay} [options.targetScreenOverlay]
 *     A screen overlay to use as a drop target indicator (i.e. a bullseye)
 *     while dragging.
 */
GEarthExtensions.prototype.edit.makeDraggable = function(placemark, options) {
  this.edit.endDraggable(placemark);

  // TODO: assert this is a point placemark
  options = checkParameters_(options, false, {
    bounce: true,
    dragCallback: ALLOWED_,
    dropCallback: ALLOWED_,
    draggingStyle: ALLOWED_,
    targetScreenOverlay: ALLOWED_
  });

  var me = this;

  // create a mouse move listener for use once dragging has begun
  var mouseMoveListener = makeMouseMoveListener_(me);

  // create a mouse up listener for use once dragging has begun
  var mouseUpListener;
  mouseUpListener = function(event) {
    if (currentDragContext_ && event.getButton() === 0) {
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
    if (event.getButton() === 0) {
      // TODO: check if getTarget() is draggable and is a placemark
      beginDragging_(me, event.getTarget());

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
 * Ceases the draggability of the given placemark. If the placemark is in the
 * process of being placed via GEarthExtensions#edit.place, the placement
 * is cancelled.
 */
GEarthExtensions.prototype.edit.endDraggable = function(placemark) {
  // get placemark's drag data
  var placemarkDragData = this.util.getJsDataValue(
      placemark, DRAGDATA_JSDATA_KEY);

  // stop listening for mousedown on the window
  if (placemarkDragData) {
    placemarkDragData.abortAndEndFn.call(null);

    this.util.clearJsDataValue(placemark, DRAGDATA_JSDATA_KEY);
  }
};

/**
 * Enters a mode in which the user can place the given point placemark onto
 * the globe by clicking on the globe. To cancel the placement, use
 * GEarthExtensions#edit.endDraggable.
 * @param {KmlPlacemark} placemark The point placemark for the user to place
 *     onto the globe.
 * @param {Object} [options] The draggable options. See
 *     GEarthExtensions#edit.makeDraggable.
 */
GEarthExtensions.prototype.edit.place = function(placemark, options) {
  // TODO: assert this is a point placemark
  options = checkParameters_(options, false, {
    bounce: true,
    dragCallback: ALLOWED_,
    dropCallback: ALLOWED_,
    draggingStyle: ALLOWED_,
    targetScreenOverlay: ALLOWED_
  });

  var me = this;

  // create a mouse move listener
  var mouseMoveListener = makeMouseMoveListener_(me);
  
  // hide the placemark initially
  placemark.setVisibility(false);

  // create a mouse down listener
  var mouseDownListener;
  mouseDownListener = function(event) {
    if (currentDragContext_ && event.getButton() === 0) {
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
  beginDragging_(me, placemark);

  // listen for mousemove on the window
  google.earth.addEventListener(me.pluginInstance.getWindow(),
      'mousemove', mouseMoveListener);

  // listen for mousedown on the window
  google.earth.addEventListener(me.pluginInstance.getWindow(),
      'mousedown', mouseDownListener);
};
//#BEGIN_TEST
function test_edit_Dragging(successCallback, errorCallback) {
  testext_.dom.clearFeatures();
  
  testhelpers_.setViewAndContinue(
      testext_.dom.buildLookAt([0, 0], { tilt: 45, range: 100000 }),
      function() {
    var pm = testext_.dom.addPointPlacemark([0, 0]);

    testhelpers_.alert('Drag and drop the placemark.');
    
    try {
      testext_.edit.makeDraggable(pm, {
        dropCallback: function() {
          testhelpers_.confirm(
              'Did the drag worked as expected?',
              successCallback, errorCallback);
        }
      });
    } catch (e) { errorCallback(e); }
  });
}
test_edit_Dragging.interactive = true;

function test_edit_Place(successCallback, errorCallback) {
  testext_.dom.clearFeatures();
  
  testhelpers_.setViewAndContinue(
      testext_.dom.buildLookAt([0, 0], { tilt: 45, range: 100000 }),
      function() {
    var pm = testext_.dom.addPointPlacemark([0,0]);

    testhelpers_.alert('Place the placemark.');
    
    try {
      testext_.edit.place(pm, {
        dropCallback: function() {
          testhelpers_.confirm(
              'Was the placemark placed as expected?',
              successCallback, errorCallback);
        }
      });
    } catch (e) { errorCallback(e); }
  });
}
test_edit_Place.interactive = true;
//#END_TEST
