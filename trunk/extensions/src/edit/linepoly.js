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
(function() {

  var LINESTRINGEDITDATA_JSDATA_KEY = '_GEarthExtensions_lineStringEditData';

  GEarthExtensions.prototype.edit.drawLineString = function(lineString) {
    var lineStringEditData = this.util.getJsDataValue(
        lineString, LINESTRINGEDITDATA_JSDATA_KEY) || {};
    if (lineStringEditData) {
      this.edit.endEditLineString(lineString);
    }

    var coords = lineString.getCoordinates();

    var innerDoc = this.pluginInstance.parseKml(
        '<Document>' +
        '<Style id="_GEarthExtensions_regularPlacemark"><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '</IconStyle></Style>' +
        '</Document>');

    // TODO: options: icon for placemarks, bounce?, etc.

    var me = this;

    var placemarks = [];

    var done = false;

    var headPlacemark = null;

    var drawNext;
    drawNext = function() {
      headPlacemark = me.dom.buildPointPlacemark([100, 0], {
        style: '#_GEarthExtensions_regularPlacemark'
      });
      innerDoc.getFeatures().appendChild(headPlacemark);
      placemarks.push(headPlacemark);

      me.edit.place(headPlacemark, {
        dropCallback: function() {
          if (!done) {
            coords.pushLatLngAlt(
                headPlacemark.getGeometry().getLatitude(),
                headPlacemark.getGeometry().getLongitude(), 0);

            setTimeout(drawNext, 0);
          }
        }
      });
    };

    drawNext.call(null);

    var endFunction = function() {
      me.edit.endDraggable(headPlacemark);

      done = true;

      me.dom.removeObject(innerDoc);

      placemarks = [];

      me.util.clearJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY);

      // TODO: user-defined completion callback
    };

    var dblclickFinishListener = function(event) {
      event.preventDefault();
      endFunction.call(null);
    };
    
    google.earth.addEventListener(me.pluginInstance.getWindow(), 'dblclick',
        dblclickFinishListener);

    // display the editing UI
    this.pluginInstance.getFeatures().appendChild(innerDoc);

    // set up an abort function for use in endEditLineString
    this.util.setJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY, {
      abortAndEndFn: function() {
        endFunction.call(null);
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'dblclick', dblclickFinishListener);
      }
    });
  };
  // TODO: interactive test

  // TODO: docs
  GEarthExtensions.prototype.edit.editLineString = function(lineString) {
    var lineStringEditData = this.util.getJsDataValue(
        lineString, LINESTRINGEDITDATA_JSDATA_KEY) || {};
    if (lineStringEditData) {
      this.edit.endEditLineString(lineString);
    }

    var me = this;
    
    var isRing = (lineString.getType() == 'KmlLinearRing');
    var coords = lineString.getCoordinates();
    var numCoords = coords.getLength();

    var innerDoc = this.pluginInstance.parseKml(
        '<Document>' +
        '<Style id="_GEarthExtensions_regularPlacemark"><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '</IconStyle></Style>' +
        '<StyleMap id="_GEarthExtensions_midPlacemark">' +
        '<Pair><key>normal</key>' +
        '<Style><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '<color>60ffffff</color><scale>0.75</scale>' +
        '</IconStyle></Style></Pair>' +
        '<Pair><key>highlight</key>' +
        '<styleUrl>#_GEarthExtensions_regularPlacemark</styleUrl>' +
        '</Pair></StyleMap>' +
        '</Document>');

    // TODO: doubleclick or rightclick deletes points
    
    // TODO: options: icon for placemarks, bounce?, linear ring?

    // TODO: it may be easier to use a linked list for all this

    var coordDataArr = [];

    var makeRegularDeleteEventListener_ = function(coordData) {
      return function(event) {
        event.preventDefault();

        // shift coordinates in the KmlCoordArray up
        // TODO: speed this up
        for (i = coordData.index; i < numCoords - 1; i++)
          coords.set(i, coords.get(i + 1));
        coords.pop();

        var leftCoordData = null;
        if (coordData.index > 0 || isRing) {
          var leftIndex = coordData.index - 1;
          if (leftIndex < 0)
            leftIndex += numCoords; // wrap

          leftCoordData = coordDataArr[leftIndex];
        }

        numCoords--;

        // at the end of the line and there's no right-mid placemark.
        // the previous-to-last point's mid point should be removed too.
        if (coordData.rightMidPlacemark == null && leftCoordData) {
          me.edit.endDraggable(leftCoordData.rightMidPlacemark);
          me.dom.removeObject(leftCoordData.rightMidPlacemark);
          leftCoordData.rightMidPlacemark = null;
        }

        // teardown mid placemark
        if (coordData.rightMidPlacemark) {
          me.edit.endDraggable(coordData.rightMidPlacemark);
          me.dom.removeObject(coordData.rightMidPlacemark);
        }

        // tear down this placemark
        me.edit.endDraggable(coordData.regularPlacemark);
        google.earth.removeEventListener(coordData.regularPlacemark,
            'dblclick', coordData.deleteEventListener);
        me.dom.removeObject(coordData.regularPlacemark);

        coordDataArr.splice(coordData.index, 1);

        // update all coord data indices after this removed
        // coordinate, because indices have changed
        for (i = 0; i < numCoords; i++) {
          coordDataArr[i].index = i;
        }

        // call the drag listener for the previous coordinate
        // to update the midpoint location
        if (leftCoordData) {
          leftCoordData.regularDragCallback.call(
              leftCoordData.regularPlacemark, leftCoordData);
        }
      };
    };

    var makeRegularDragCallback_ = function(coordData) {
      return function() {
        // update this coordinate
        coords.setLatLngAlt(coordData.index,
            this.getGeometry().getLatitude(),
            this.getGeometry().getLongitude(), 0);

        // update midpoint placemarks
        var curCoord = coords.get(coordData.index);

        if (coordData.index > 0 || isRing) {
          var leftIndex = coordData.index - 1;
          if (leftIndex < 0)
            leftIndex += numCoords; // wrap
          
          var leftMidPt = new geo.Point(coords.get(leftIndex)).midpoint(
              new geo.Point(curCoord));
          coordDataArr[leftIndex].rightMidPlacemark.getGeometry().setLatitude(
              leftMidPt.lat());
          coordDataArr[leftIndex].rightMidPlacemark.getGeometry().setLongitude(
              leftMidPt.lng());
        }

        if (coordData.index < numCoords - 1 || isRing) {
          var rightMidPt = new geo.Point(curCoord).midpoint(
              new geo.Point(coords.get((coordData.index + 1) % numCoords)));
          coordData.rightMidPlacemark.getGeometry().setLatitude(
              rightMidPt.lat());
          coordData.rightMidPlacemark.getGeometry().setLongitude(
              rightMidPt.lng());
        }
      };
    };

    var makeMidDragCallback_ = function(coordData) {
      // vars for the closure
      var convertedToRegular = false;
      var newCoordData = null;

      return function() {
        if (!convertedToRegular) {
          // first time drag... convert this midpoint into a regular point

          convertedToRegular = true;
          var i;

          // change style to regular placemark style
          this.setStyleUrl('#_GEarthExtensions_regularPlacemark');

          // shift coordinates in the KmlCoordArray down
          // TODO: speed this up
          coords.push(coords.get(numCoords - 1));
          for (i = numCoords - 1; i > coordData.index + 1; i--)
            coords.set(i, coords.get(i - 1));

          numCoords++;

          // create a new coordData object for the newly created
          // coordinate
          newCoordData = {};
          newCoordData.index = coordData.index + 1;
          newCoordData.regularPlacemark = this; // the converted midpoint

          // replace this to-be-converted midpoint with a new midpoint
          // placemark (will be to the left of the new coord)
          coordData.rightMidPlacemark = me.dom.buildPointPlacemark({
            point: coords.get(coordData.index),
            style: '#_GEarthExtensions_midPlacemark'
          });
          innerDoc.getFeatures().appendChild(coordData.rightMidPlacemark);

          me.edit.makeDraggable(coordData.rightMidPlacemark, {
            bounce: false,
            dragCallback: makeMidDragCallback_(coordData) // previous coord
          });

          // create a new right midpoint
          newCoordData.rightMidPlacemark = me.dom.buildPointPlacemark({
            point: coords.get(coordData.index),
            style: '#_GEarthExtensions_midPlacemark'
          });
          innerDoc.getFeatures().appendChild(newCoordData.rightMidPlacemark);

          me.edit.makeDraggable(newCoordData.rightMidPlacemark, {
            bounce: false,
            dragCallback: makeMidDragCallback_(newCoordData)
          });

          // create a delete listener
          newCoordData.deleteEventListener = makeRegularDeleteEventListener_(
              newCoordData);
          google.earth.addEventListener(this, 'dblclick',
              newCoordData.deleteEventListener);

          newCoordData.regularDragCallback = makeRegularDragCallback_(newCoordData);

          // insert the new coordData
          coordDataArr.splice(newCoordData.index, 0, newCoordData);

          // update all placemark drag callbacks after this newly inserted
          // coordinate, because indices have changed
          // NOTE: the old draggable callbacks are replaced with these
          // calls to makeDraggable
          for (i = 0; i < numCoords; i++) {
            coordDataArr[i].index = i;
          }
        }

        // do regular dragging stuff
        newCoordData.regularDragCallback.call(this, newCoordData);
      };
    };

    // create the edit placemarks
    for (var i = 0; i < numCoords; i++) {
      var curCoord = coords.get(i);
      var nextCoord = coords.get((i + 1) % numCoords);

      var coordData = {};
      coordDataArr.push(coordData);
      coordData.index = i;

      // create the regular placemark on the point
      coordData.regularPlacemark = me.dom.buildPointPlacemark(curCoord, {
        style: '#_GEarthExtensions_regularPlacemark'
      });
      innerDoc.getFeatures().appendChild(coordData.regularPlacemark);

      coordData.regularDragCallback = makeRegularDragCallback_(coordData);

      // set up drag handlers for main placemarks
      me.edit.makeDraggable(coordData.regularPlacemark, {
        bounce: false,
        dragCallback: coordData.regularDragCallback
      });

      coordData.deleteEventListener =
          makeRegularDeleteEventListener_(coordData);
      google.earth.addEventListener(coordData.regularPlacemark, 'dblclick',
          coordData.deleteEventListener);

      // create the next midpoint placemark
      if (i < numCoords - 1 || isRing) {
        coordData.rightMidPlacemark = me.dom.buildPointPlacemark({
          point: new geo.Point(curCoord).midpoint(
              new geo.Point(nextCoord)),
          style: '#_GEarthExtensions_midPlacemark'
        });
        innerDoc.getFeatures().appendChild(coordData.rightMidPlacemark);

        // set up drag handlers for mid placemarks
        me.edit.makeDraggable(coordData.rightMidPlacemark, {
          bounce: false,
          dragCallback: makeMidDragCallback_(coordData)
        });
      }
    }

    // display the editing UI
    this.pluginInstance.getFeatures().appendChild(innerDoc);

    // set up an abort function for use in endEditLineString
    this.util.setJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY, {
      innerDoc: innerDoc,
      abortAndEndFn: function() {
        var i;

        for (i = 0; i < coordDataArr.length; i++) {
          // teardown for regular placemark, its delete event listener
          // and its right-mid placemark
          google.earth.removeEventListener(coordDataArr[i].regularPlacemark,
              'dblclick', coordDataArr[i].deleteEventListener);

          me.edit.endDraggable(coordDataArr[i].regularPlacemark);
          
          if (coordDataArr[i].rightMidPlacemark) {
            me.edit.endDraggable(coordDataArr[i].rightMidPlacemark);
          }
        }

        me.dom.removeObject(innerDoc);
      }
    });
  };

  GEarthExtensions.prototype.edit.endEditLineString = function(lineString) {
    // get placemark's drag data
    var lineStringEditData = this.util.getJsDataValue(
        lineString, LINESTRINGEDITDATA_JSDATA_KEY);

    // stop listening for mousedown on the window
    if (lineStringEditData) {
      lineStringEditData.abortAndEndFn.call(null);

      this.util.clearJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY);
    }
  };
})();