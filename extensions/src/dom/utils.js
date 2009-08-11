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
 * Removes all top-level features from the Earth object's DOM.
 */
GEarthExtensions.prototype.dom.clearFeatures = function() {
  var featureContainer = this.pluginInstance.getFeatures();
  var c;
  while ((c = featureContainer.getLastChild()) !== null) {
    featureContainer.removeChild(c);
  }
};
/***IGNORE_BEGIN***/
function test_dom_clearFeatures() {
  var placemark = testplugin_.createPlacemark('');
  testplugin_.getFeatures().appendChild(placemark);
  testext_.dom.clearFeatures();
  assertEquals(0, testplugin_.getFeatures().getChildNodes().getLength());
}
/***IGNORE_END***/

/**
 * Walks a KML object, calling a given visit function for each object in
 * the KML DOM. The lone argument must be either a visit function or an
 * options literal.
 * 
 * NOTE: walking the DOM can have pretty poor performance on very large
 * hierarchies, as first time accesses to KML objects from JavaScript
 * incur some overhead in the API.
 * 
 * @param {Object} [options] The walk options:
 * @param {Function} [options.visitCallback] The function to call upon visiting
 *     a node in the DOM. The 'this' variable in the callback function will be
 *     bound to the object being visited. The lone argument passed to this
 *     function will be an object literal for the call context. To get the
 *     current application-specific call context, use the 'current' property
 *     of the context object. To set the context for all child calls, set the
 *     'child' property of the context object.To prevent walking the children
 *     of the current object, set the 'walkChildren' property of the context
 *     object to false. To stop the walking process altogether,
 *     return false in the function.
 * @param {KmlObject} [options.rootObject] The root of the KML object hierarchy
 *     to walk.
 * @param {Boolean} [options.features] Descend into feature containers?
 *     Default true.
 * @param {Boolean} [options.geometries] Descend into geometry containers?
 *     Default false.
 * @param {Object} [options.rootContext] The application-specific context to
 *     pass to the root item.
 */
GEarthExtensions.prototype.dom.walk = function() {
  var options;
  
  // figure out the arguments
  if (arguments.length == 1) {
    if (geo.util.isObjectLiteral(arguments[0])) {
      // object literal only
      options = arguments[0];
    } else if (geo.util.isFunction(arguments[0])) {
      // callback function only
      options = { visitCallback: arguments[0] };
    } else {
      throw new TypeError('walk requires a visit callback function or ' +
                          'options literal as a first parameter');
    }
  } else {
    throw new Error('walk takes at most 1 arguments');
  }
  
  if (!('visitCallback' in options)) {
    throw new Error('walk requires a visit callback function');
  }
  
  if (!('features' in options)) {
    options.features = true;
  }
  
  if (!('geometries' in options)) {
    options.geometries = false;
  }
  
  if (!('rootObject' in options)) {
    options.rootObject = this.pluginInstance;
  }
  
  var recurse_ = function(object, currentContext) {
    var contextArgument = {
      current: currentContext,
      child: currentContext,
      walkChildren: true
    };
    
    // walk object
    var retValue = options.visitCallback.call(object, contextArgument);
    if (!retValue && !geo.util.isUndefined(retValue)) {
      return false;
    }
    
    if (!contextArgument.walkChildren) {
      return true;
    }
    
    var objectContainer = null; // GESchemaObjectContainer
    
    // check if object is a parent
    if ('getFeatures' in object) { // GEFeatureContainer
      if (options.features) {
        objectContainer = object.getFeatures();
      }
    } else if ('getGeometry' in object) { // KmlFeature - descend into
                                          // contained geometry
      if (options.geometries && object.getGeometry()) {
        recurse_(object.getGeometry(), contextArgument.child);
      }
    } else if ('getGeometries' in object) { // GEGeometryContainer
      if (options.geometries) {
        objectContainer = object.getGeometries();
      }
    } else if ('getOuterBoundary' in object) { // KmlPolygon - descend into
                                               // outer boundary
      if (options.geometries && object.getOuterBoundary()) {
        recurse_(object.getOuterBoundary(), contextArgument.child);
        objectContainer = object.getInnerBoundaries(); // GELinearRingContainer
      }
    }
    
    // iterate through children if object is a parent and recurse so they
    // can be walked
    if (objectContainer && objectContainer.hasChildNodes()) {
      var childNodes = objectContainer.getChildNodes();
      var numChildNodes = childNodes.getLength();
      
      for (var i = 0; i < numChildNodes; i++) {
        var child = childNodes.item(i);
        
        if (!recurse_(child, contextArgument.child)) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  if (options.rootObject) {
    recurse_(options.rootObject, options.rootContext);
  }
};
/***IGNORE_BEGIN***/
function test_dom_walk() {
  var obj = testext_.dom.buildFolder([ // test walking feature container
    testext_.dom.buildPlacemark({ // test walking multi-geometry
      point: [37, -122],
      polygon: new geo.Polygon( // test walking linear ring container
        [ [-1,-1], [-1,1], [1,1], [1,-1] ], // outer boundary
        [ [ [-0.5,-0.5], [-0.5,0.5], [0.5,0.5], [0.5,-0.5] ] ])
    })
  ]);

  var reached = { };
  
  testext_.dom.walk({
    rootObject: obj,
    rootContext: 1, // level
    features: true,
    geometries: true,
    visitCallback: function(context) {
      // mark this object type as reached in the walk
      reached[this.getType()] = true;
      
      // check for levels at which object was reached
      if (this.getType() == 'KmlFolder') {
        assertEquals(1, context.current); // Folder at level 1
      } else if (this.getType() == 'KmlPlacemark') {
        assertEquals(2, context.current); // Placemark at level 2
      } else if (this.getType() == 'KmlMultiGeometry') {
        assertEquals(3, context.current); // Multigeometry at level 3
      } else if (this.getType() == 'KmlPolygon' ||
                 this.getType() == 'KmlPoint') {
        assertEquals(4, context.current); // Point and Polygon at level 4
      } else if (this.getType() == 'KmlLinearRing') {
        assertEquals(5, context.current); // Outer and inner boundary linear
                                          // rings at level 5
      } else {
        fail('walk hit an unexpected type: ' + this.getType());
      }
      
      context.child = context.current + 1; // level
    }
  });
  
  var mustReach = ['KmlFolder', 'KmlPlacemark', 'KmlPolygon', 'KmlPoint',
                   'KmlLinearRing'];
  for (var i = 0; i < mustReach.length; i++) {
    if (!reached[mustReach[i]]) {
      fail('walk did not reach a ' + mustReach[i]);
    }
  }
}
/***IGNORE_END***/

/**
 * Gets the object in the Earth DOM with the given id.
 * @param {String} id The id of the object to retrieve.
 * @return Returns the object with the given id, or null if it was not found.
 */
GEarthExtensions.prototype.dom.getObjectById = function(id, options) {
  options = GEarthExtensions.checkParameters(options, false, {
    recursive: true,
    root: this.pluginInstance
  });
  
  // check self
  if ('getId' in options.root && options.root.getId() == id) {
    return options.root;
  }
  
  var returnObject = null;
  
  this.dom.walk({
    rootObject: options.root,
    features: true,
    geometries: true,
    visitCallback: function() {
      if ('getId' in this && this.getId() == id) {
        returnObject = this;
        return false; // stop walk
      }
    }
  });

  return returnObject;
};
// TODO: unit test

/**
 * Removes the given object from the Earth object's DOM.
 * @param {KmlObject} object The object to remove.
 */
GEarthExtensions.prototype.dom.removeObject = function(object) {
  // TODO: make sure this removes the feature from its parent, which may not
  // necessarily be the root feature container
  if (!object)
    return;

  var parent = object.getParentNode();
  if (!parent) {
    throw new Error('Cannot remove an object without a parent.');
  }

  var objectContainer = null; // GESchemaObjectContainer
  
  if ('getFeatures' in parent) { // GEFeatureContainer
    objectContainer = parent.getFeatures();
  } else if ('getGeometries' in parent) { // GEGeometryContainer
    objectContainer = parent.getGeometries();
  } else if ('getInnerBoundaries' in parent) { // GELinearRingContainer
    objectContainer = parent.getInnerBoundaries();
  }
  
  objectContainer.removeChild(object);
};
// TODO: unit test (heavily)

/**
 * Sets the given KmlVec2 object to the point defined in the options.
 * @param {KmlVec2} vec2 The object to set, for example a screen overlay's
 *     screenXY.
 * @param {Object} options The options literal defining the point.
 * @param {Number|String} [options.left] The left offset, in pixels (i.e. 5),
 *     or as a percentage (i.e. '25%').
 * @param {Number|String} [options.top] The top offset, in pixels or a string
 *     percentage.
 * @param {Number|String} [options.right] The right offset, in pixels or a
 *     string percentage.
 * @param {Number|String} [options.bottom] The bottom offset, in pixels or a
 *     string percentage.
 * @param {Number|String} [options.width] A convenience parameter specifying
 *     width, only useful for screen overlays, in pixels or a string percentage.
 * @param {Number|String} [options.height] A convenience parameter specifying
 *     height, only useful for screen overlays, in pixels or a string
 *     percentage.
 */
GEarthExtensions.prototype.dom.setVec2 = function(vec2, options) {
  options = GEarthExtensions.checkParameters(options, false, {
    left: GEarthExtensions.ALLOWED,
    top: GEarthExtensions.ALLOWED,
    right: GEarthExtensions.ALLOWED,
    bottom: GEarthExtensions.ALLOWED,
    width: GEarthExtensions.ALLOWED, // for screen overlay size
    height: GEarthExtensions.ALLOWED // for screen overlay size
  });
  
  if ('width' in options) {
    options.left = options.width;
  }
  
  if ('height' in options) {
    options.bottom = options.height;
  }
  
  var x = 0.0;
  var xUnits = this.pluginInstance.UNITS_PIXELS;
  var y = 0.0;
  var yUnits = this.pluginInstance.UNITS_PIXELS;
  
  // set X (origin = left)
  if ('left' in options) {
    if (typeof options.left == 'number') {
      x = options.left;
    } else if (typeof options.left == 'string' &&
               options.left.charAt(options.left.length - 1) == '%') {
      x = parseFloat(options.left) / 100;
      xUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('left must be a number or string indicating a ' +
                          'percentage');
    }
  } else if ('right' in options) {
    if (typeof options.right == 'number') {
      x = options.right;
      xUnits = this.pluginInstance.UNITS_INSET_PIXELS;
    } else if (typeof options.right == 'string' &&
               options.right.charAt(options.right.length - 1) == '%') {
      x = 1.0 - parseFloat(options.right) / 100;
      xUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('right must be a number or string indicating a ' +
                          'percentage');
    }
  }
  
  // set Y (origin = bottom)
  if ('bottom' in options) {
    if (typeof options.bottom == 'number') {
      y = options.bottom;
    } else if (typeof options.bottom == 'string' &&
               options.bottom.charAt(options.bottom.length - 1) == '%') {
      y = parseFloat(options.bottom) / 100;
      yUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('bottom must be a number or string indicating a ' +
                          'percentage');
    }
  } else if ('top' in options) {
    if (typeof options.top == 'number') {
      y = options.top;
      yUnits = this.pluginInstance.UNITS_INSET_PIXELS;
    } else if (typeof options.top == 'string' &&
               options.top.charAt(options.top.length - 1) == '%') {
      y = 1.0 - parseFloat(options.top) / 100;
      yUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('top must be a number or string indicating a ' +
                          'percentage');
    }
  }
  
  vec2.set(x, xUnits, y, yUnits);
};
/***IGNORE_BEGIN***/
function test_dom_setVec2() {
  var style = testplugin_.createStyle('');
  var vec2 = style.getIconStyle().getHotSpot();
  
  function assertEqualVec2(vec2, x, xUnits, y, yUnits) {
    assertEquals(x, vec2.getX());
    assertEquals(xUnits, vec2.getXUnits());
    assertEquals(y, vec2.getY());
    assertEquals(yUnits, vec2.getYUnits());
  }
  
  // basic tests
  testext_.dom.setVec2(vec2, { left: 5, top: '10%' });
  assertEqualVec2(vec2, 5, testplugin_.UNITS_PIXELS,
      0.9, testplugin_.UNITS_FRACTION);

  testext_.dom.setVec2(vec2, { right: '10%', bottom: 5 });
  assertEqualVec2(vec2, 0.9, testplugin_.UNITS_FRACTION,
      5, testplugin_.UNITS_PIXELS);

  testext_.dom.setVec2(vec2, { left: 5, top: 5 });
  assertEqualVec2(vec2, 5, testplugin_.UNITS_PIXELS,
      5, testplugin_.UNITS_INSET_PIXELS);
  
  // TODO: check for failures such as invalid percentage string
}
/***IGNORE_END***/

/**
 * Computes the latitude/longitude bounding box for the given object.
 * Note that this method walks the object's DOM, so may have poor performance
 * for large objects.
 * @param {KmlFeature|KmlGeometry} object The feature or geometry whose bounds
 *     should be computed.
 * @type geo.Bounds
 */
GEarthExtensions.prototype.dom.computeBounds = function(object) {
  var bounds = new geo.Bounds();
  
  // Walk the object's DOM, extending the bounds as coordinates are
  // encountered.
  this.dom.walk({
    rootObject: object,
    features: true,
    geometries: true,
    visitCallback: function() {
      if ('getType' in this) {
        var type = this.getType();
        switch (type) {
          case 'KmlGroundOverlay':
            var llb = this.getLatLonBox();
            if (llb) {
              var alt = this.getAltitude();
              bounds.extend(new geo.Point(llb.getNorth(), llb.getEast(), alt));
              bounds.extend(new geo.Point(llb.getNorth(), llb.getWest(), alt));
              bounds.extend(new geo.Point(llb.getSouth(), llb.getEast(), alt));
              bounds.extend(new geo.Point(llb.getSouth(), llb.getWest(), alt));
            }
            break;
          
          case 'KmlModel':
            bounds.extend(new geo.Point(this.getLocation()));
            break;
        
          case 'KmlLinearRing':
          case 'KmlLineString':
            var coords = this.getCoordinates();
            if (coords) {
              var n = coords.getLength();
              for (var i = 0; i < n; i++)
                bounds.extend(new geo.Point(coords.get(i)));
            }
            break;

          case 'KmlCoord': // coordinates
          case 'KmlLocation': // models
          case 'KmlPoint': // points
            bounds.extend(new geo.Point(this));
            break;
        };
      }
    }
  });
  
  return bounds;
};