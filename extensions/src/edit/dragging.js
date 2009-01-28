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
 * Make a placemark draggable.
 * NOTE: this doesn't work with multi geometries yet.
 */
(function() {
  // NOTE: this is shared across all GEarthExtensions instances
  var currentDragData_ = null;
  
  function makeMouseDownListener_(extInstance) {
    return function(event) {
      // TODO: check if getTarget() is draggable and is a placemark
      currentDragData_ = {
        placemark: event.getTarget(),
        dragged: false
      };
      
      // get placemark's draggable options
      var placemarkDragData = extInstance.util.getJsDataValue(
          currentDragData_.placemark,
          '_GEarthExtensions_dragData').draggableOptions || {};
      
      // animate
      if (placemarkDragData.bounce) {
        extInstance.fx.cancel(currentDragData_.placemark);
        extInstance.fx.bounce(currentDragData_.placemark, {
          phase: 1
        });
      }
    
      // listen for mousemove on the globe
      google.earth.addEventListener(extInstance.pluginInstance.getWindow(),
          'mousemove', extInstance.fx.dragListeners_.mouseMove);

      // listen for mouseup on the window
      google.earth.addEventListener(extInstance.pluginInstance.getWindow(),
          'mouseup', extInstance.fx.dragListeners_.mouseUp);
    };
  }
  
  function makeMouseMoveListener_(extInstance) {
    return function(event) {
      if (currentDragData_ && event.getDidHitGlobe()) {
        event.preventDefault();
        var point = currentDragData_.placemark.getGeometry();
        point.setLatitude(event.getLatitude());
        point.setLongitude(event.getLongitude());
        currentDragData_.dragged = true;
      }
    };
  }
  
  function makeMouseUpListener_(extInstance) {
    return function(event) {
      if (currentDragData_) {
        // get placemark's draggable options
        var placemarkDragData = extInstance.util.getJsDataValue(
            currentDragData_.placemark,
            '_GEarthExtensions_dragData').draggableOptions || {};
        
        // listen for mousemove on the globe
        google.earth.removeEventListener(extInstance.pluginInstance.getWindow(),
            'mousemove', extInstance.fx.dragListeners_.mouseMove);

        // listen for mouseup on the window
        google.earth.removeEventListener(extInstance.pluginInstance.getWindow(),
            'mouseup', extInstance.fx.dragListeners_.mouseUp);
        
        // animate
        if (placemarkDragData.bounce) {
          extInstance.fx.cancel(currentDragData_.placemark);
          extInstance.fx.bounce(currentDragData_.placemark, {
            startAltitude: 0,
            phase: 2,
            repeat: 1,
            dampen: 0.3
          });
        }

        if (currentDragData_.dragged) {
          // if the placemark was dragged, prevent balloons from popping up
          event.preventDefault();

          if (placemarkDragData.dropCallback) {
            placemarkDragData.dropCallback.call(currentDragData_.placemark);
          }
        }
        
        currentDragData_ = null;
      }
    };
  }
  
  GEarthExtensions.prototype.edit.makeDraggable = function(placemark, options) {
    // TODO: assert this is a point placemark
    options = GEarthExtensions.checkParameters(options, false, {
      bounce: true,
      dropCallback: GEarthExtensions.ALLOWED
    });
    
    if (!this.fx.dragListeners_) {
      this.fx.dragListeners_ = {
        mouseDown: makeMouseDownListener_(this),
        mouseMove: makeMouseMoveListener_(this),
        mouseUp: makeMouseUpListener_(this)
      };
    }
  
    // listen for mousedown on the window (look specifically for
    // point placemarks)
    google.earth.addEventListener(placemark, 'mousedown',
        this.fx.dragListeners_.mouseDown);
    
    this.util.setJsDataValue(placemark, '_GEarthExtensions_dragData', {
      draggableOptions: options
    });
  };

  /**
   * Stop a placemark from being draggable
   */
  GEarthExtensions.prototype.edit.endDraggable = function(placemark) {
    // listen for mousedown on the window (look specifically for
    // point placemarks)
    google.earth.removeEventListener(placemark, 'mousedown',
        this.fx.dragListeners_.mouseDown);
    
    this.util.clearJsDataValue(placemark, '_GEarthExtensions_dragInfo');
  };
}());
/***IGNORE_BEGIN***/
function test_edit_Dragging(successCallback, errorCallback) {
  testext_.dom.clearFeatures();
  
  function vce() {
    google.earth.removeEventListener(testplugin_.getView(),
        'viewchangeend', vce);
    var pm = testext_.dom.addPointPlacemark([0, 0]);
    
    alert('Drag and drop the placemark');
    
    testext_.edit.makeDraggable(pm, {
      dropCallback: function() {
        window.setTimeout(function() {
          try {
            if (!confirm('Press OK if the drag worked as expected.')) {
              fail('User reported placemark drag failed');
            }
            
            successCallback();
          } catch (e) {
            errorCallback(e);
          }
        }, 1000);
      }
    });
    
    // TODO: make sure drop callback was called
    // check to make sure the callback was called
    window.setTimeout(function() {
      if (!callbackCalled) {
        try {
          fail('Bounce callback never called.');
        } catch (e) { errorCallback(e); }
      }
    }, 350 * 2 + 1000); // allow time for two bounces and 1s overhead
  }
  
  google.earth.addEventListener(testplugin_.getView(), 'viewchangeend', vce);
  testext_.util.lookAt([0, 0], { tilt: 45, range: 100000 });
}
test_edit_Dragging.interactive = true;
/***IGNORE_END***/
