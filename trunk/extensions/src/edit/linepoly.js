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

  /**
   * Enters a mode in which the user can draw the given line string geometry
   * on the globe by clicking on the globe to create coordinates.
   * To cancel the placement, use GEarthExtensions#edit.endEditLineString.
   * This is similar in intended usage to GEarthExtensions#edit.place.
   * @param {KmlLineString|KmlLinearRing} lineString The line string geometry
   *     to allow the user to draw (or append points to).
   * @param {Object} [options] The edit options.
   * @param {Boolean} [options.bounce] Whether or not to enable bounce effects
   *     while drawing coordinates.
   * @param {Function} finishCallback A callback to fire when drawing is
   *     successfully completed (via double click or by clicking on the first
   *     coordinate again).
   */
  GEarthExtensions.prototype.edit.drawLineString = function(lineString,
                                                            options) {
    options = GEarthExtensions.checkParameters(options, false, {
      bounce: true,
      finishCallback: GEarthExtensions.ALLOWED
    });
    
    var lineStringEditData = this.util.getJsDataValue(
        lineString, LINESTRINGEDITDATA_JSDATA_KEY) || {};
    if (lineStringEditData) {
      this.edit.endEditLineString(lineString);
    }
    
    var me = this;

    // TODO: options: icon for placemarks

    var done = false;
    var placemarks = [];
    var altitudeMode = lineString.getAltitudeMode();
    var headPlacemark = null;
    var isRing = (lineString.getType() == 'KmlLinearRing');
    var coords = lineString.getCoordinates();
    var innerDoc = this.pluginInstance.parseKml(
        '<Document>' +
        '<Style id="_GEarthExtensions_regularCoordinate"><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '</IconStyle></Style>' +
        '<Style id="_GEarthExtensions_firstCoordinateHighlight"><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '<scale>1.3</scale><color>ff00ff00</color>' +
        '</IconStyle></Style>' +
        '<StyleMap id="_GEarthExtensions_firstCoordinate">' +
        '<Pair><key>normal</key>' +
        '<styleUrl>#_GEarthExtensions_regularCoordinate</styleUrl>' +
        '</Pair><Pair><key>highlight</key>' +
        '<styleUrl>#_GEarthExtensions_firstCoordinateHighlight</styleUrl>' +
        '</Pair></StyleMap>' +
        '</Document>');

    var endFunction = function(abort) {
      // duplicate the first coordinate to the end if necessary
      var numCoords = coords.getLength();
      if (numCoords) {
        var tempFirstCoord_ = coords.get(0);
        var tempLastCoord_ = coords.get(numCoords - 1);
        if (isRing && (
            tempFirstCoord_.getLatitude() != tempLastCoord_.getLatitude() ||
            tempFirstCoord_.getLongitude() != tempLastCoord_.getLongitude())) {
          coords.pushLatLngAlt(tempFirstCoord_.getLatitude(),
                               tempFirstCoord_.getLongitude(),
                               tempFirstCoord_.getAltitude());
        }
      }

      me.edit.endDraggable(headPlacemark);
      me.dom.removeObject(innerDoc);
      me.util.clearJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY);
      placemarks = [];
      done = true;

      if (options.finishCallback && !abort)
        options.finishCallback.call(null);
    };
    
    var finishListener = function(event) {
      event.preventDefault();
      endFunction.call(null);
    };
    
    var drawNext;
    drawNext = function() {
      headPlacemark = me.dom.buildPointPlacemark([0, 0], {
        altitudeMode: altitudeMode,
        style: '#_GEarthExtensions_regularCoordinate'
      });
      innerDoc.getFeatures().appendChild(headPlacemark);
      placemarks.push(headPlacemark);

      me.edit.place(headPlacemark, {
        bounce: options.bounce,
        dropCallback: function() {
          if (!done) {
            coords.pushLatLngAlt(
                headPlacemark.getGeometry().getLatitude(),
                headPlacemark.getGeometry().getLongitude(), 0);

            if (placemarks.length == 1) {
              // set up a click listener on the first placemark -- if it gets
              // clicked, stop drawing the linestring
              placemarks[0].setStyleUrl('#_GEarthExtensions_firstCoordinate');
              google.earth.addEventListener(placemarks[0], 'mousedown',
                  finishListener);
            }

            setTimeout(drawNext, 0);
          }
        }
      });
    };

    drawNext.call(null);
    
    google.earth.addEventListener(me.pluginInstance.getWindow(), 'dblclick',
        finishListener);

    // display the editing UI
    this.pluginInstance.getFeatures().appendChild(innerDoc);

    // set up an abort function for use in endEditLineString
    this.util.setJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY, {
      abortAndEndFn: function() {
        endFunction.call(null, true); // abort
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'dblclick', finishListener);
      }
    });
  };
  // TODO: interactive test

  /**
   * Allows the user to edit the coordinates of the given line string by
   * dragging existing points, splitting path segments/creating new points or
   * deleting existing points.
   * @param {KmlLineString|KmlLinearRing} lineString The line string or lienar
   *     ring geometry to edit. For KmlPolygon geometries, pass in an outer
   *     or inner boundary.
   * @param {Object} [options] The line string edit options.
   * @param {Function} [options.editCallback] A callback function to fire
   *     when the line string coordinates have changed due to user interaction.
   */
  GEarthExtensions.prototype.edit.editLineString = function(lineString,
                                                            options) {
    options = GEarthExtensions.checkParameters(options, false, {
      editCallback: GEarthExtensions.ALLOWED
    });
    
    var lineStringEditData = this.util.getJsDataValue(
        lineString, LINESTRINGEDITDATA_JSDATA_KEY) || {};
    if (lineStringEditData) {
      this.edit.endEditLineString(lineString);
    }

    var me = this;
    
    var isRing = (lineString.getType() == 'KmlLinearRing');
    var altitudeMode = lineString.getAltitudeMode();
    var coords = lineString.getCoordinates();
    var numCoords = coords.getLength();

    var innerDoc = this.pluginInstance.parseKml(
        '<Document>' +
        '<Style id="_GEarthExtensions_regularCoordinate"><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '</IconStyle></Style>' +
        '<StyleMap id="_GEarthExtensions_midCoordinate">' +
        '<Pair><key>normal</key>' +
        '<Style><IconStyle>' +
        '<Icon><href>http://maps.google.com/mapfiles/kml/' +
        'shapes/placemark_circle.png</href></Icon>' +
        '<color>60ffffff</color><scale>0.75</scale>' +
        '</IconStyle></Style></Pair>' +
        '<Pair><key>highlight</key>' +
        '<styleUrl>#_GEarthExtensions_regularCoordinate</styleUrl>' +
        '</Pair></StyleMap>' +
        '</Document>');

    // TODO: options: icon for placemarks
    // TODO: it may be easier to use a linked list for all this
    
    // remove the last coordinate temporarily if it's the same as the first
    // coord, for editing convenience
    if (numCoords >= 2) {
      var tempFirstCoord_ = coords.get(0);
      var tempLastCoord_ = coords.get(numCoords - 1);
      if (isRing &&
          tempFirstCoord_.getLatitude() == tempLastCoord_.getLatitude() &&
          tempFirstCoord_.getLongitude() == tempLastCoord_.getLongitude() &&
          tempFirstCoord_.getAltitude() == tempLastCoord_.getAltitude()) {
        coords.pop();
        numCoords--;
      }
    }

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
        
        if (options.editCallback)
          options.editCallback(null);
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
        
        if (options.editCallback)
          options.editCallback(null);
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
          this.setStyleUrl('#_GEarthExtensions_regularCoordinate');

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
            altitudeMode: altitudeMode,
            style: '#_GEarthExtensions_midCoordinate'
          });
          innerDoc.getFeatures().appendChild(coordData.rightMidPlacemark);

          me.edit.makeDraggable(coordData.rightMidPlacemark, {
            bounce: false,
            dragCallback: makeMidDragCallback_(coordData) // previous coord
          });

          // create a new right midpoint
          newCoordData.rightMidPlacemark = me.dom.buildPointPlacemark({
            point: coords.get(coordData.index),
            altitudeMode: altitudeMode,
            style: '#_GEarthExtensions_midCoordinate'
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

          newCoordData.regularDragCallback =
              makeRegularDragCallback_(newCoordData);

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
        
        // the regular drag callback calls options.editCallback
      };
    };

    me.util.batchExecute(function() {
      // create the edit placemarks
      for (var i = 0; i < numCoords; i++) {
        var curCoord = coords.get(i);
        var nextCoord = coords.get((i + 1) % numCoords);

        var coordData = {};
        coordDataArr.push(coordData);
        coordData.index = i;

        // create the regular placemark on the point
        coordData.regularPlacemark = me.dom.buildPointPlacemark(curCoord, {
          altitudeMode: altitudeMode,
          style: '#_GEarthExtensions_regularCoordinate'
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
            altitudeMode: altitudeMode,
            style: '#_GEarthExtensions_midCoordinate'
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
      me.pluginInstance.getFeatures().appendChild(innerDoc);
    });

    // set up an abort function for use in endEditLineString
    me.util.setJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY, {
      innerDoc: innerDoc,
      abortAndEndFn: function() {
        me.util.batchExecute(function() {
          // duplicate the first coordinate to the end if necessary
          var numCoords = coords.getLength();
          if (numCoords) {
            var tempFirstCoord_ = coords.get(0);
            var tempLastCoord_ = coords.get(numCoords - 1);
            if (isRing && (
                tempFirstCoord_.getLatitude() != tempLastCoord_.getLatitude() ||
                tempFirstCoord_.getLongitude() != tempLastCoord_.getLongitude()
                )) {
              coords.pushLatLngAlt(tempFirstCoord_.getLatitude(),
                                   tempFirstCoord_.getLongitude(),
                                   tempFirstCoord_.getAltitude());
            }
          }
          
          for (var i = 0; i < coordDataArr.length; i++) {
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
        });
      }
    });
  };

  /**
   * Ceases the ability for the user to edit or draw the given line string.
   */
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