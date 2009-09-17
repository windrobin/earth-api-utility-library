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
/** @ignore */
GEarthExtensions.prototype.dom.buildExtrudableGeometry_ = domBuilder_({
  propertySpec: {
    altitudeMode: AUTO_,
    extrude: AUTO_,
    tessellate: AUTO_
  }
});

/**
 * Creates a new point geometry with the given parameters.
 * @function
 * @param {PointOptions|geo.Point|KmlPoint} [point] The point data. Anything
 *     that can be passed to the geo.Point constructor.
 * @param {Object} options The parameters of the point object to create.
 * @param {PointOptions|geo.Point|KmlPoint} options.point The point data.
 *     Anything that can be passed to the geo.Point constructor.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @type KmlPoint
 */
GEarthExtensions.prototype.dom.buildPoint = domBuilder_({
  apiInterface: 'KmlPoint',
  base: GEarthExtensions.prototype.dom.buildExtrudableGeometry_,
  apiFactoryFn: 'createPoint',
  defaultProperty: 'point',
  propertySpec: {
    point: REQUIRED_
  },
  constructor: function(pointObj, options) {
    var point = new geo.Point(options.point);
    pointObj.set(
        point.lat(),
        point.lng(),
        point.altitude(),
        ('altitudeMode' in options) ? options.altitudeMode :
                                      point.altitudeMode(),
        false,
        false);
  }
});
// TODO: unit tests

/**
 * Creates a new line string geometry with the given parameters.
 * @function
 * @param {PathOptions|geo.Path|KmlLineString} [path] The path data.
 *     Anything that can be passed to the geo.Path constructor.
 * @param {Object} options The parameters of the line string to create.
 * @param {PathOptions|geo.Path|KmlLineString} options.path The path data.
 *     Anything that can be passed to the geo.Path constructor.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {Boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlLineString
 */
GEarthExtensions.prototype.dom.buildLineString = domBuilder_({
  apiInterface: 'KmlLineString',
  base: GEarthExtensions.prototype.dom.buildExtrudableGeometry_,
  apiFactoryFn: 'createLineString',
  defaultProperty: 'path',
  propertySpec: {
    path: REQUIRED_
  },
  constructor: function(lineStringObj, options) {
    // TODO: maybe use parseKml instead of pushLatLngAlt for performance
    // purposes
    var coordsObj = lineStringObj.getCoordinates();
  
    var path = new geo.Path(options.path);
    var numCoords = path.numCoords();
    for (var i = 0; i < numCoords; i++) {
      coordsObj.pushLatLngAlt(path.coord(i).lat(), path.coord(i).lng(),
          path.coord(i).altitude());
    }
  }
});
// TODO: unit tests

/**
 * Creates a new linear ring geometry with the given parameters.
 * @function
 * @param {PathOptions|geo.Path|KmlLinearRing} [path] The path data.
 *     Anything that can be passed to the geo.Path constructor.
 *     The first coordinate doesn't need to be repeated at the end.
 * @param {Object} options The parameters of the linear ring to create.
 * @param {PathOptions|geo.Path|KmlLinearRing} options.path The path data.
 *     Anything that can be passed to the geo.Path constructor.
 *     The first coordinate doesn't need to be repeated at the end.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {Boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlLinearRing
 */
GEarthExtensions.prototype.dom.buildLinearRing = domBuilder_({
  apiInterface: 'KmlLinearRing',
  base: GEarthExtensions.prototype.dom.buildLineString,
  apiFactoryFn: 'createLinearRing',
  defaultProperty: 'path',
  constructor: function(linearRingObj, options) {
    /*
    Earth API automatically dups first coordinate at the end to complete
    the ring when using createLinearRing, but parseKml won't do that...
    so if we switch to parseKml, make sure to duplicate the last point
    */
  }
});
// TODO: unit tests

/**
 * Creates a new polygon geometry with the given parameters.
 * @function
 * @param {PolygonOptions|geo.Polygon|KmlPolygon} [polygon] The polygon data.
 *     Anything that can be passed to the geo.Polygon constructor.
 * @param {Object} options The parameters of the polygon to create.
 * @param {PolygonOptions|geo.Polygon|KmlPolygon} options.polygon The polygon
 *     data. Anything that can be passed to the geo.Polygon constructor.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {Boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlPolygon
 */
GEarthExtensions.prototype.dom.buildPolygon = domBuilder_({
  apiInterface: 'KmlPolygon',
  base: GEarthExtensions.prototype.dom.buildExtrudableGeometry_,
  apiFactoryFn: 'createPolygon',
  defaultProperty: 'polygon',
  propertySpec: {
    polygon: REQUIRED_
  },
  constructor: function(polygonObj, options) {
    var polygon = new geo.Polygon(options.polygon);
  
    polygonObj.setOuterBoundary(
        this.dom.buildLinearRing(polygon.outerBoundary()));
    if (polygon.innerBoundaries().length) {
      var innerBoundaries = polygon.innerBoundaries();
      for (var i = 0; i < innerBoundaries.length; i++) {
        polygonObj.getInnerBoundaries().appendChild(
            this.dom.buildLinearRing(innerBoundaries[i]));
      }
    }
  }
});
// TODO: unit tests

/**
 * Creates a new model geometry with the given parameters.
 * @function
 * @param {LinkOptions|KmlLink} [link] The remote link this model should use.
 * @param {Object} options The parameters of the model to create.
 * @param {LinkOptions|KmlLink} [options.link] The remote link this model
 *     should use.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {PointOptions|geo.Point} [options.location] The location of the model.
 * @param {Number|Number[]} [options.scale] The scale factor of the model,
 *     either as a constant scale, or a 3-item array for x, y, and z scale.
 * @param {Object} [options.orientation] The orientation of the model.
 * @param {Number} [options.orientation.heading] The model heading.
 * @param {Number} [options.orientation.tilt] The model tilt.
 * @param {Number} [options.orientation.roll] The model roll.
 * @type KmlModel
 */
GEarthExtensions.prototype.dom.buildModel = domBuilder_({
  apiInterface: 'KmlModel',
  apiFactoryFn: 'createModel',
  defaultProperty: 'link',
  propertySpec: {
    altitudeMode: AUTO_,
    
    link: ALLOWED_,
    location: ALLOWED_,
    scale: ALLOWED_,
    orientation: ALLOWED_
  },
  constructor: function(modelObj, options) {
    if (options.link) {
      modelObj.setLink(this.dom.buildLink(options.link));
    }
  
    if (options.location) {
      var pointObj = new geo.Point(options.location);
      var locationObj = this.pluginInstance.createLocation('');
      locationObj.setLatLngAlt(pointObj.lat(), pointObj.lng(),
          pointObj.altitude());
      modelObj.setLocation(locationObj);
      modelObj.setAltitudeMode(pointObj.altitudeMode());
    }
  
    if (options.scale) {
      var scaleObj = this.pluginInstance.createScale('');
      if (typeof options.scale == 'number') {
        scaleObj.set(options.scale, options.scale, options.scale);
      } else if (geo.util.isArray(options.scale)) {
        scaleObj.set(options.scale[0], options.scale[1], options.scale[2]);
      }
    
      modelObj.setScale(scaleObj);
    }
  
    if (options.orientation) {
      var orientationObj = this.pluginInstance.createOrientation('');
      if ('heading' in options.orientation &&
          'tilt' in options.orientation &&
          'roll' in options.orientation) {
        orientationObj.set(options.orientation.heading,
                           options.orientation.tilt,
                           options.orientation.roll);
      }
    
      modelObj.setOrientation(orientationObj);
    }
  }
});
//#BEGIN_TEST
function test_dom_buildModel() {
  var model = testext_.dom.buildModel({
    link: 'http://earth-api-samples.googlecode.com/svn/trunk/examples/' +
          'static/splotchy_box.dae',
    location: [37, -122, 100],
    scale: 4.0,
    orientation: {
      heading: 45,
      tilt: 15,
      roll: 15
    }
  });
  
  assertEquals('KmlModel', model.getType());
  
  if (model.getLink().getHref().indexOf('splotchy_box.dae') < 0) {
    fail('Model was not assigned a link');
  }
  
  assertEquals(37, model.getLocation().getLatitude());
  assertEquals(-122, model.getLocation().getLongitude());
  assertEquals(100, model.getLocation().getAltitude());
  assertEquals(testplugin_.ALTITUDE_RELATIVE_TO_GROUND,
      model.getAltitudeMode());

  assertEquals(4.0, model.getScale().getX());
  assertEquals(4.0, model.getScale().getY());
  assertEquals(4.0, model.getScale().getZ());
  
  assertEquals(45, model.getOrientation().getHeading());
  assertEquals(15, model.getOrientation().getTilt());
  assertEquals(15, model.getOrientation().getRoll());
}
//#END_TEST

/**
 * Creates a new multi-geometry with the given parameters.
 * @function
 * @param {KmlGeometry[]} [geometries] The child geometries.
 * @param {Object} options The parameters of the multi-geometry to create.
 * @param {KmlGeometry[]} [options.geometries] The child geometries.
 * @type KmlMultiGeometry
 */
GEarthExtensions.prototype.dom.buildMultiGeometry = domBuilder_({
  apiInterface: 'KmlMultiGeometry',
  apiFactoryFn: 'createMultiGeometry',
  defaultProperty: 'geometries',
  propertySpec: {
    geometries: ALLOWED_
  },
  constructor: function(multiGeometryObj, options) {
    var geometriesObj = multiGeometryObj.getGeometries();
  
    if (geo.util.isArray(options.geometries)) {
      for (var i = 0; i < options.geometries.length; i++) {
        geometriesObj.appendChild(options.geometries[i]);
      }
    }
  }
});
// TODO: unit tests
