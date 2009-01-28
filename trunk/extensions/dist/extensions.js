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
 * The geo namespace contains generic classes and namespaces for processing
 * geographic data in JavaScript. Where possible, an effort was made to keep
 * the library compatible with the Google Geo APIs (Maps, Earth, KML, etc.)
 * @namespace
 */
geo = {isnamespace_:true};
/*
see https://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:Array:map
*/
if (!('map' in Array.prototype)) {
  Array.prototype.map = function(mapFn) {
    var len = this.length;
    if (typeof mapFn != 'function') {
      throw new TypeError('map() requires a mapping function.');
    }

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
      if (i in this) {
        res[i] = mapFn.call(thisp, this[i], i, this);
      }
    }

    return res;
  }
}
geo.ALTITUDE_CLAMP_TO_GROUND = 0;
geo.ALTITUDE_RELATIVE_TO_GROUND = 1;
geo.ALTITUDE_ABSOLUTE = 2;
/**
 * @namespace
 */
geo.math = {isnamespace_:true};
/**
 * Converts an angle from degrees to radians.
 * @param {Number} rad The angle in degrees.
 * @type Number
 * @return Returns the angle, converted to radians.
 */
if (!('toRadians' in Number.prototype)) {
  Number.prototype.toDegrees = function() {
    return this * 180 / Math.PI;
  };
}

/**
 * Converts an angle from radians to degrees.
 * @param {Number} rad The angle in radians.
 * @type Number
 * @return Returns the angle, converted to degrees.
 */
if (!('toRadians' in Number.prototype)) {
  Number.prototype.toRadians = function() {
    return this * Math.PI / 180;
  };
}
/**
 * Normalizes an angle to the [0,2pi) range.
 * @param {Number} angleRad The angle to normalize, in radians.
 * @type Number
 * @return Returns the angle, fit within the [0,2pi) range, in radians.
 */
geo.math.normalizeAngle = function(angleRad) {
  angleRad = angleRad % (2 * Math.PI);
  return angleRad >= 0 ? angleRad : angleRad + 2 * Math.PI;
};

/**
 * Reverses an angle.
 * @param {Number} angleRad The angle to reverse, in radians.
 * @type Number
 * @return Returns the reverse angle, in radians.
 */
geo.math.reverseAngle = function(angleRad) {
  return geo.math.normalizeAngle(angleRad + Math.PI);
};
/**
 * The radius of the Earth, in meters, assuming the Earth is a perfect sphere.
 * See http://en.wikipedia.org/wiki/Earth_radius.
 * @type Number
 */
geo.math.EARTH_RADIUS = 6378135;

/**
 * The average radius-of-curvature of the Earth, in meters.
 * See http://en.wikipedia.org/wiki/Radius_of_curvature_(applications).
 * @type Number
 */
geo.math.EARTH_RADIUS_CURVATURE_AVG = 6372795;
/**
 * Returns the approximate sea level great circle (Earth) distance between
 * two points using the Haversine formula and assuming an Earth radius of
 * geo.math.EARTH_RADIUS.
 * (see http://www.movable-type.co.uk/scripts/latlong.html)
 * @param {geo.Point} point1 The first point.
 * @param {geo.Point} point2 The second point.
 * @type Number
 * @return The Earth distance between the two points, in meters.
 */
geo.math.distance = function(point1, point2) {
  return geo.math.EARTH_RADIUS * geo.math.angularDistance(point1, point2);
};

/*
Vincenty formula:
geo.math.angularDistance = function(point1, point2) {
  point1 = new geo.Point(point1);
  point2 = new geo.Point(point2);
  
  var phi1 = point1.lat.toRadians();
  var phi2 = point2.lat.toRadians();
  
  var sin_phi1 = Math.sin(phi1);
  var cos_phi1 = Math.cos(phi1);
  
  var sin_phi2 = Math.sin(phi2);
  var cos_phi2 = Math.cos(phi2);
  
  var sin_d_lmd = Math.sin(
      point2.lng.toRadians() - point1.lng.toRadians());
  var cos_d_lmd = Math.cos(
      point2.lng.toRadians() - point1.lng.toRadians());
  
  // TODO: options to specify formula
  // TODO: compute radius of curvature at given point for more precision
  
  // Vincenty formula (may replace with Haversine for performance?)
  return Math.atan2(
      Math.sqrt(
        Math.pow(cos_phi2 * sin_d_lmd, 2) +
        Math.pow(cos_phi1 * sin_phi2 - sin_phi1 * cos_phi2 * cos_d_lmd, 2)
      ), sin_phi1 * sin_phi2 + cos_phi1 * cos_phi2 * cos_d_lmd);
}
*/
geo.math.angularDistance = function(point1, point2) {
  var phi1 = point1.lat.toRadians();
  var phi2 = point2.lat.toRadians();
  
  var d_phi = (point2.lat - point1.lat).toRadians();
  var d_lmd = (point2.lng - point1.lng).toRadians();
  
  var A = Math.pow(Math.sin(d_phi / 2), 2) +
          Math.cos(phi1) * Math.cos(phi2) *
            Math.pow(Math.sin(d_lmd / 2), 2);
  
  return 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
};
// TODO: add non-sea level distance using Earth API's math3d.js or Sylvester
/*
    p1 = V3.latLonAltToCartesian([loc1.lat(), loc1.lng(),
      this.ge.getGlobe().getGroundAltitude(loc1.lat(), loc1.lng())]);
    p2 = V3.latLonAltToCartesian([loc2.lat(), loc2.lng(),
      this.ge.getGlobe().getGroundAltitude(loc2.lat(), loc2.lng())]);
    return V3.earthDistance(p1, p2);
*/

/**
 * Calculates the initial heading/bearing at which an object at the start
 * point will need to travel to get to the destination point.
 * (see http://mathforum.org/library/drmath/view/55417.html)
 * @param {geo.Point} start The start point.
 * @param {geo.Point} dest The destination point.
 * @type Number
 * @return The initial heading required to get to the destination point,
 *     in the [0,360) degree range.
 */
geo.math.heading = function(start, dest) {
  var phi1 = start.lat.toRadians();
  var phi2 = dest.lat.toRadians();
  var cos_phi2 = Math.cos(phi2);
  
  var d_lmd = (dest.lng - start.lng).toRadians();
  
  return geo.math.normalizeAngle(Math.atan2(
      Math.sin(d_lmd) * cos_phi2,
      Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * cos_phi2 *
        Math.cos(d_lmd))).toDegrees();
};

geo.math.bearing = geo.math.heading;

/**
 * Calculates an intermediate point on the geodesic between the two given
 * points.
 * (see http://williams.best.vwh.net/avform.htm#Intermediate)
 * @param {geo.Point} point1 The first point.
 * @param {geo.Point} point2 The second point.
 * @param {number} [fraction=0.5] The fraction of distance between the first
 *     and second points.
 * @type geo.Point
 */
geo.math.midpoint = function(point1, point2, fraction) {
  // TODO: check for antipodality and fail w/ exception in that case
  if (geo.util.isUndefined(fraction) || fraction === null) {
    fraction = 0.5;
  }
  
  var phi1 = point1.lat.toRadians();
  var phi2 = point2.lat.toRadians();
  var lmd1 = point1.lng.toRadians();
  var lmd2 = point2.lng.toRadians();
  
  var cos_phi1 = Math.cos(phi1);
  var cos_phi2 = Math.cos(phi2);
  
  var angularDistance = geo.math.angularDistance(point1, point2);
  var sin_angularDistance = Math.sin(angularDistance);
  
  var A = Math.sin((1 - fraction) * angularDistance) / sin_angularDistance;
  var B = Math.sin(fraction * angularDistance) / sin_angularDistance;
  
  var x = A * cos_phi1 * Math.cos(lmd1) +
          B * cos_phi2 * Math.cos(lmd2);
  
  var y = A * cos_phi1 * Math.sin(lmd1) +
          B * cos_phi2 * Math.sin(lmd2);
  
  var z = A * Math.sin(phi1) +
          B * Math.sin(phi2);
  
  return new geo.Point(
      Math.atan2(z, Math.sqrt(Math.pow(x, 2) +
                              Math.pow(y, 2))).toDegrees(),
      Math.atan2(y, x).toDegrees());
};

/**
 * Calculates the destination point along a geodesic, given an initial heading
 * and distance, from the given start point.
 * (see http://www.movable-type.co.uk/scripts/latlong.html)
 * @param {geo.Point} start The start point.
 * @param {object} options The heading and distance object literal.
 * @param {number} options.heading The initial heading, in degrees.
 * @param {number} options.distance The distance along the geodesic, in meters.
 * @type geo.Point
 */
geo.math.destination = function(point, options) {
  if (!('heading' in options && 'distance' in options)) {
    throw new TypeError('destination() requres both heading and ' +
                        'distance options.');
  }
  
  var phi1 = point.lat.toRadians();
  var lmd1 = point.lng.toRadians();
  
  var sin_phi1 = Math.sin(phi1);
  
  var angularDistance = options.distance / geo.math.EARTH_RADIUS;
  var heading_rad = options.heading.toRadians();
  
  var sin_angularDistance = Math.sin(angularDistance);
  var cos_angularDistance = Math.cos(angularDistance);
  
  var phi2 = Math.asin(
               sin_phi1 * cos_angularDistance + 
               Math.cos(phi1) * sin_angularDistance *
                 Math.cos(heading_rad));
  
  return new geo.Point(
      phi2.toDegrees(),
      Math.atan2(
        Math.sin(heading_rad) *
          sin_angularDistance * Math.cos(phi2),
        cos_angularDistance - sin_phi1 * Math.sin(phi2)).toDegrees() +
        point.lng);
};
/**
 * Creates a new path from the given parameters.
 * @param {PathSpec} path The path data.
 * @constructor
 */
geo.Path = function() {
  // TODO: accept instances of GPolyline
  this.coords_ = []; // don't use mutable objects in global defs
  var coordArraySrc = null;
  var i;
  
  // 1 argument constructor
  if (arguments.length == 1) {
    var path = arguments[0];
    
    // copy constructor
    if (path.constructor === geo.Path) {
      for (i = 0; i < path.numCoords(); i++) {
        this.coords_.push(new geo.Point(path.coord(i)));
      }
    
    // array constructor
    } else if (geo.util.isArray(path)) {
      // check if its an array of numbers (not array of arrays)
      if (!path.length || geo.util.isArray(path[0])) {
        // an array of arrays (i.e. an array of points)
        coordArraySrc = path;
      } else {
        // a single-coord array
        coordArraySrc = [path];
      }
    
    // construct from Earth API object
    } else if (geo.util.isEarthAPIObject_(path)) {
      var type = path.getType();
      
      // contruct from KmlLineString
      if (type == 'KmlLineString' ||
          type == 'KmlLinearRing') {
        var n = path.getCoordinates().getLength();
        for (i = 0; i < n; i++) {
          this.coords_.push(new geo.Point(path.getCoordinates().get(i)));
        }
      
      // can't construct from the passed-in Earth object
      } else {
        throw new TypeError(
            'Could not create a path from the given arguments');
      }
    
    // can't construct from the given argument
    } else {
      throw new TypeError('Could not create a path from the given arguments');
    }
  
  // Assume each argument is a PointSpec, i.e.
  // new Path(p1, p2, p3) ==> new Point([p1, p2, p3])
  } else {
    coordArraySrc = arguments;
  }
  
  // construct from an array (presumably of PoinySpecs)
  if (coordArraySrc) {
    // TODO: type check
    for (i = 0; i < coordArraySrc.length; i++) {
      this.coords_.push(new geo.Point(coordArraySrc[i]));
    }
  }
};

/**#@+
  @field
*/

/**
 * The path's coordinates array.
 * @type number
 * @private
 */
geo.Path.prototype.coords_ = null; // don't use mutable objects here

/**#@-*/

geo.Path.prototype.toString = function() {
  return '[' + this.coords_.map(function(p) {
                                  return p.toString();
                                }).join(', ') + ']';
};

/**
 * Determines whether or not the given path is the same as this one.
 * @param {geo.Path} p2 The other path.
 * @type boolean
 */
geo.Path.prototype.equals = function(p2) {
  for (var i = 0; i < p2.numCoords(); i++) {
    if (!this.coord(i).equals(p2.coord(i))) {
      return false;
    }
  }
  
  return true;
};

/**
 * Returns the number of coords in the path.
 */
geo.Path.prototype.numCoords = function() {
  return this.coords_.length;
};

/**
 * Returns the coordinate at the given index in the path.
 */
geo.Path.prototype.coord = function(i) {
  // TODO: bounds check
  return this.coords_[i];
};

/**
 * Prepends the given coordinate to the path.
 */
geo.Path.prototype.prepend = function(coord) {
  this.coords_.unshift(new geo.Point(coord));
};

/**
 * Appends the given coordinate to the path.
 */
geo.Path.prototype.append = function(coord) {
  this.coords_.push(new geo.Point(coord));
};

/**
 * Inserts the given coordinate at the i'th index in the path.
 */
geo.Path.prototype.insert = function(i, coord) {
  // TODO: bounds check
  this.coords_.splice(i, 0, new geo.Point(coord));
};

/**
 * Removes the coordinate at the i'th index from the path.
 */
geo.Path.prototype.remove = function(i) {
  // TODO: bounds check
  this.coords_.splice(i, 1);
};

/**
 * Returns a sub path, containing coordinates starting from the
 * startIndex position, and up to but not including the endIndex
 * position.
 */
geo.Path.prototype.subPath = function(startIndex, endIndex) {
  return this.coords_.slice(startIndex, endIndex);
};


///////////////
// non-trivial stuff

/**
 * Calculates the total length of the path using great circle distance
 * calculations.
 */
geo.Path.prototype.distance = function() {
  var dist = 0;
  for (var i = 0; i < this.coords_.length - 1; i++) {
    dist += this.coords_[i].distance(this.coords_[i + 1]);
  }
  
  return dist;
};

/**
 * Returns whether or not the path, when closed, contains the given point.
 * Thanks to Mike Williams of http://econym.googlepages.com/epoly.htm and
 * http://alienryderflex.com/polygon/ for this code.
 */
geo.Path.prototype.containsPoint = function(point) {
  var oddNodes = false;
  var y = point.lat;
  var x = point.lng;
  for (var i = 0; i < this.coords_.length; i++) {
    var j = (i + 1) % this.coords_.length;
    if (((this.coords_[i].lat < y && this.coords_[j].lat >= y) ||
         (this.coords_[j].lat < y && this.coords_[i].lat >= y)) &&
        (this.coords_[i].lng + (y - this.coords_[i].lat) /
                               (this.coords_[j].lat - this.coords_[i].lat) *
                               (this.coords_[j].lng - this.coords_[i].lng)
         < x)) {
      oddNodes = !oddNodes;
    }
  }
  
  return oddNodes;
};

/*

**
 * Returns the approximate area of the polygon formed by the path when the path
 * is closed.
 * Taken from http://econym.googlepages.com/epoly.htm and
 * NOTE: this method only works with non-intersecting polygons.
 *
geo.Path.prototype.area = function() {
  var a = 0;
  var b = this.Bounds();
  var x0 = b.getSouthWest().lng();
  var y0 = b.getSouthWest().lat();
  for (var i=0; i < this.getVertexCount(); i++) {
    var j = (i + 1) % this.coords_.length;
    var x1 = this.getVertex(i).distanceFrom(new GLatLng(this.getVertex(i).lat(),x0));
    var x2 = this.getVertex(j).distanceFrom(new GLatLng(this.getVertex(j).lat(),x0));
    var y1 = this.getVertex(i).distanceFrom(new GLatLng(y0,this.getVertex(i).lng()));
    var y2 = this.getVertex(j).distanceFrom(new GLatLng(y0,this.getVertex(j).lng()));
    a += x1*y2 - x2*y1;
  }
  return Math.abs(a * 0.5);
}
*/
/**
 * Creates a new point from the given parameters.
 * @param {PointSpec} point The point data.
 * @constructor
 */
geo.Point = function() {
  // TODO: accept instances of GLatLng
  // and accept point object literals
  var pointArraySrc = null;
  
  // 1 argument constructor
  if (arguments.length == 1) {
    var point = arguments[0];
    
    // copy constructor
    if (point.constructor === geo.Point) {
      this.lat = point.lat;
      this.lng = point.lng;
      this.altitude = point.altitude;
      this.altitudeMode = point.altitudeMode;
      
    // array constructor
    } else if (geo.util.isArray(point)) {
      pointArraySrc = point;
    
    // constructor from an Earth API object
    } else if (geo.util.isEarthAPIObject_(point)) {
      var type = point.getType();
      
      // KmlPoint and KmlLookAt constructor
      if (type == 'KmlPoint' ||
          type == 'KmlLookAt') {
        this.lat = point.getLatitude();
        this.lng = point.getLongitude();
        this.altitude = point.getAltitude();
        this.altitudeMode = point.getAltitudeMode();
      
      // KmlCoord and KmlLocation constructor
      } else if (type == 'KmlCoord' ||
                 type == 'KmlLocation') {
        this.lat = point.getLatitude();
        this.lng = point.getLongitude();
        this.altitude = point.getAltitude();
      
      // Error, can't create a Point from any other Earth object
      } else {
        throw new TypeError(
            'Could not create a point from the given Earth object');
      }
    
    // Error, can't create a Point from the single argument
    } else {
      throw new TypeError('Could not create a point from the given arguments');
    }
  
  // Assume each argument is a point coordinate, i.e.
  // new Point(0, 1, 2) ==> new Point([0, 1, 2])
  } else {
    pointArraySrc = arguments;
  }
  
  // construct from an array
  if (pointArraySrc) {
    // TODO: type check
    this.lat = pointArraySrc[0];
    this.lng = pointArraySrc[1];
    if (pointArraySrc.length >= 3) {
      this.altitude = pointArraySrc[2];
      if (pointArraySrc.length >= 4) {
        this.altitudeMode = pointArraySrc[3];
      }
    }
  }
};

/**#@+
  @field
*/

/**
 * The point's latitude, in degrees.
 * @type number
 */
geo.Point.prototype.lat = 0;

/**
 * The point's longitude, in degrees.
 * @type number
 */
geo.Point.prototype.lng = 0;

/**
 * The point's altitude, in meters.
 * @type number
 */
geo.Point.prototype.altitude = 0;

/**
 * The point's altitude mode.
 * @type KmlAltitudeModeEnum
 */
geo.Point.prototype.altitudeMode = geo.ALTITUDE_RELATIVE_TO_GROUND;
/**#@-*/

geo.Point.prototype.toString = function() {
  return '(' + this.lat.toString() + ', ' + this.lng.toString() + ', ' +
      this.altitude.toString() + ')';
};

/**
 * Determines whether or not the given point is the same as this one.
 * @param {geo.Point} p2 The other point.
 * @type boolean
 */
geo.Point.prototype.equals = function(p2) {
  return this.lat == p2.lat && this.lng == p2.lng &&
      this.altitude == p2.altitude && this.altitudeMode == p2.altitudeMode;
};

/**
 * @see geo.math.angularDistance
 */
geo.Point.prototype.angularDistance = function(dest) {
  return geo.math.angularDistance(this, dest);
};

/**
 * @see geo.math.distance
 */
geo.Point.prototype.distance = function(dest) {
  return geo.math.distance(this, dest);
};

/**
 * @see geo.math.heading
 */
geo.Point.prototype.heading = function(dest) {
  return geo.math.heading(this, dest);
};

/**
 * @see geo.math.midpoint
 */
geo.Point.prototype.midpoint = function(dest, fraction) {
  return geo.math.midpoint(this, dest, fraction);
};

/**
 * @see geo.math.destination
 */
geo.Point.prototype.destination = function(options) {
  return geo.math.destination(this, options);
};
/**
 * Creates a new polygon from the given parameters.
 * @param {PathSpec} outerBoundary The polygon's outer boundary.
 * @param {PathSpec[]} [innerBoundaries] The polygon's inner boundaries, if any.
 * @constructor
 */
geo.Polygon = function() {
    // TODO: accept instances of GPolygon, GPolyline
  this.innerBoundaries_ = [];
  var i;
  
  // 0 argument constructor
  if (arguments.length === 0) {
    this.outerBoundary_ = new geo.Path();
  
  // 1 argument constructor
  } else if (arguments.length == 1) {
    var poly = arguments[0];
    
    // copy constructor
    if (poly.constructor === geo.Polygon) {
      this.outerBoundary_ = new geo.Path(poly.outerBoundary());
      for (i = 0; i < poly.innerBoundaries().length; i++) {
        this.innerBoundaries_.push(new geo.Path(poly.innerBoundaries()[i]));
      }
    
    // construct from Earth API object
    } else if (geo.util.isEarthAPIObject_(poly)) {
      var type = poly.getType();

      // construct from KmlLineString
      if (type == 'KmlLineString' ||
          type == 'KmlLinearRing') {
        this.outerBoundary_ = new geo.Path(poly);
      
      // construct from KmlPolygon
      } else if (type == 'KmlPolygon') {
        this.outerBoundary_ = new geo.Path(poly.getOuterBoundary());
        
        var ibChildNodes = poly.getInnerBoundaries().getChildNodes();
        var n = ibChildNodes.getLength();
        for (i = 0; i < n; i++) {
          this.innerBoundaries_.push(new geo.Path(ibChildNodes.item(i)));
        }
      
      // can't construct from the passed-in Earth object
      } else {
        throw new TypeError(
            'Could not create a polygon from the given arguments');
      }
    
    // treat first argument as an outer boundary path
    } else {
      this.outerBoundary_ = new geo.Path(arguments[0]);
    }
  
  // multiple argument constructor, either:
  // - arrays of numbers (outer boundary coords)
  // - a path (outer boundary) and an array of paths (inner boundaries)
  } else {
    if (arguments[0].length && typeof arguments[0][0] == 'number') {
      // ...new geo.Polygon([0,0], [1,1], [2,2]...
      this.outerBoundary_ = new geo.Path(arguments);
    } else if (arguments[1]) {
      // ...new geo.Polygon([ [0,0] ... ], [ [ [0,0], ...
      this.outerBoundary_ = new geo.Path(arguments[0]);
      if (!geo.util.isArray(arguments[1])) {
        throw new TypeError('Second argument to geo.Polygon constructor ' +
                            'must be an array of paths.');
      }
      
      for (i = 0; i < arguments[1].length; i++) {
        this.innerBoundaries_.push(new geo.Path(arguments[1][i]));
      }
    } else {
      throw new Error('Cannot create a path from the given arguments.');
    }
  }
};

/**#@+
  @field
*/

/**
 * The polygon's outer boundary (path).
 * @type {geo.Path}
 * @private
 */
geo.Polygon.prototype.outerBoundary_ = null;

/**
 * The polygon's inner boundaries.
 * @type {geo.Path[]}
 * @private
 */
geo.Polygon.prototype.innerBoundaries_ = null; // don't use mutable objects

/**#@-*/

geo.Polygon.prototype.toString = function() {
  return 'Polygon: ' + this.outerBoundary().toString() +
      (this.innerBoundaries().length ?
        ', (' + this.innerBoundaries().length + ' inner boundaries)' : '');
};


/**
 * Returns the polygon's outer boundary path.
 */
geo.Polygon.prototype.outerBoundary = function() {
  return this.outerBoundary_;
};

/**
 * Returns an array containing the polygon's inner boundaries.
 */
geo.Polygon.prototype.innerBoundaries = function() {
  return this.innerBoundaries_;
};


// http://econym.googlepages.com/epoly.htm

/**
 * Returns whether or not the polygon contains the given point.
 */
geo.Polygon.prototype.containsPoint = function(point) {
  // outer boundary should contain the point
  if (!this.outerBoundary_.containsPoint(point)) {
    return false;
  }
  
  // none of the inner boundaries should contain the point
  for (var i = 0; i < this.innerBoundaries_.length; i++) {
    if (this.innerBoundaries_[i].containsPoint(point)) {
      return false;
    }
  }
  
  return true;
};

/*
**
 * Returns the approximate area of the polygon.
 *
GPolygon.prototype.area = function() {
  // start with outer boundary area
  var area = this.outerBoundary_.area();
  
  // subtract inner boundary areas
  // TODO: watch for double counting of intersections
  for (var i = 0; i < this.innerBoundaries_.length; i++) {
    area -= this.innerBoundaries_[i].area();
  }
  
  return area;
}
*/
/**
 * The geo.util namespace contains generic JavaScript and JS/Geo utility
 * functions.
 * @namespace
 */
geo.util = {isnamespace_:true};

/**
 * Determines whether or not the object is undefined in JavaScript terms.
 * @param {object} object The object to test.
 * Taken from prototype.js
 */
geo.util.isUndefined = function(object) {
  return typeof object == 'undefined';
};

/**
 * Determines whether or not the object is a JavaScript array.
 * @param {object} object The object to test.
 * Taken from prototype.js
 */
geo.util.isArray = function(object) {
  return object !== null && typeof object == 'object' &&
      'splice' in object && 'join' in object;
};

/**
 * Determines whether or not the object is a JavaScript function.
 * @param {object} object The object to test.
 * Taken from prototype.js
 */
geo.util.isFunction = function(object) {
  return object !== null && typeof object == 'function' &&
      'call' in object && 'apply' in object;
};

/**
 * Determines whether or not the object is an object literal/anonymous object.
 * @param {object} object The object to test.
 */
geo.util.isObjectLiteral = function(object) {
  return object !== null && typeof object == 'object' &&
      object.constructor === Object;
};

/**
 * Determines whether or not the given object is an Earth API object.
 * @param {object} object The object to test.
 */
geo.util.isEarthAPIObject_ = function(object) {
  return object !== null && typeof object == 'function' &&
      'getType' in object;
};

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
 * GEarthExtensions is the root class/namespace hybrid for the Earth API
 * utility library.
 * @class GEarthExtensions
 */
var GEarthExtensions = function(pluginInstance) {
  // create class
  this.pluginInstance = pluginInstance;
  
  // bind all functions in namespaces to this GEarthExtensions instance
  /** @private */
  function bindFunction(fn_, this_) {
    return function() {
      return fn_.apply(this_, arguments);
    };
  }
  
  var me = this;
  /** @private */
  function bindNamespaceMembers(nsParent, context) {
    for (mstr in nsParent) {
      member = nsParent[mstr];
      
      // bind this namespace's functions to the given context
      if (geo.util.isFunction(member) &&
          !member.isclass_) {
        nsParent[mstr] = bindFunction(member, context);
      }
      
      // bind functions of all sub-namespaces
      if (GEarthExtensions.isExtensionsNamespace_(member)) {
        bindNamespaceMembers(member, context);
      }
    }
  }
  
  bindNamespaceMembers(this, this);
};
/**
 * Converts between various color formats, i.e. '#rrggbb', to the KML color
 * format ('aabbggrr')
 * @param {string} arg The source color value.
 * @type {string}
 * @return A string in KML color format, i.e. 'aabbggrr'
 */
GEarthExtensions.parseColor = function(arg) {
  // detect #rrggbb and convert to kml color aabbggrr
  // TODO: also accept rgb(0,0,0) format using regex, maybe even hsl?
  if (geo.util.isArray(arg)) {
    // expected array as [r,g,b] or [r,g,b,a]
    
    var pad2 = function(s) {
      return ((s.length < 2) ? '0' : '') + s;
    };

    return pad2(((arg.length >= 4) ? arg[3].toString(16) : 'ff')) +
           pad2(arg[2].toString(16)) +
           pad2(arg[1].toString(16)) +
           pad2(arg[0].toString());
  } else if (typeof arg == 'string') {
    // parsing a string
    if (arg.length > 7) {
      // if not stored as HTML color, assume it's stored as a
      // KML color and return as is
      // TODO: check for valid KML color using regex?
      return arg;
    } else if (arg.length > 4) {
      // stored as full HTML color
      return arg.replace(
          /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i,
          'ff$3$2$1').toLowerCase();
    } else {
      // stored as shorthand HTML/CSS color (#fff)
      return arg.replace(
          /#?([0-9a-f])([0-9a-f])([0-9a-f])/i,
          'ff$3$3$2$2$1$1').toLowerCase();
    }
  }
};

/**
 * Inline merges default values into a provided object literal (hash).
 */
/*
GEarthExtensions.mergeDefaults = function(explicitOptions, defaults) {
  // shallow copy explicitOptions
  var finalOptions = {};
  for (member in (explicitOptions || {})) {
    finalOptions[member] = explicitOptions[member];
  }
  
  // copy in defaults
  for (member in (defaults || {})) {
    if (!(member in finalOptions)) {
      finalOptions[member] = defaults[member];
    }
  }
  
  return finalOptions;
};
*/
// TODO: unit test

GEarthExtensions.AUTO = Infinity; // for dom builder (auto property setters)
GEarthExtensions.ALLOWED = null;
GEarthExtensions.REQUIRED = undefined;

/**
 * Checks a given parameters object against an parameter spec,
 * throwing exceptions as necessary, and returning the resulting options object
 * with defaults filled in.
 * @param {object} explicitParams The parameters object to check.
 * @param {boolean} allowAll Whether or not to allow all parameters, or limit
 *     allowed parameters to those listed in the parameter spec.
 * @param {object} paramSpec The parameter spec, which should be an object whose
 *     properties are the properties expected in the given parameters object and
 *     whose property values are GEarthExtensions.REQUIRED if the property is
 *     required or some other value to set a default value.
 * @return Returns a shallow copy of the given parameters object, cleaned up
 *     according to the parameters spec and with default values filled in.
 */
GEarthExtensions.checkParameters = function(explicitParams,
                                            allowAll, paramSpec) {
  // shallow copy explicitParameters
  var finalParams = {};
  
  explicitParams = explicitParams || {};
  paramSpec = paramSpec || {};
  
  for (member in explicitParams) {
    // if not allowing all, check that it's in the param spec
    if (!allowAll && !(member in paramSpec)) {
      var allowed = [];
      for (m in paramSpec) {
        allowed.push(m);
      }
      
      throw new Error(
        'Unexpected parameter \'' + member + '\'. ' +
        'Allowed parameters are: ' + allowed.join(', ') + '.');
    }
    
    finalParams[member] = explicitParams[member];
  }
  
  // copy in defaults
  for (member in paramSpec) {
    if (!(member in finalParams)) {
      // if member was required, throw an exception
      if (paramSpec[member] === GEarthExtensions.REQUIRED) {
        throw new Error(
            'Required parameter \'' + member + '\' was not passed.');
      }
      
      if (paramSpec[member] != GEarthExtensions.ALLOWED &&
          paramSpec[member] != GEarthExtensions.AUTO) {
        // GEarthExtensions.ALLOWED and GEarthExtensions.AUTO are placeholders,
        // not default values
        finalParams[member] = paramSpec[member];
      }
    }
  }
  
  return finalParams;
};

/**
 * Creates a new 'class' from the provided constructor function and mixes in
 * members of provided mixin classes.
 */
GEarthExtensions.createClass_ = function() {
  var mixins = [];
  var constructorFn = null;
  
  if (geo.util.isArray(arguments[0])) {
    mixins = arguments[0];
    constructorFn = arguments[1];
  } else {
    constructorFn = arguments[0];
  }
  
  constructorFn.isclass_ = true;
  
  for (var i = 0; i < mixins.length; i++) {
    for (var k in mixins[i].prototype) {
      constructorFn.prototype[k] = mixins[i].prototype[k];
    }
  }
  
  return constructorFn;
};

/**
 * Determines whether or not the object is a GEarthExtensions namespace.
 * @param {object} object The object to test.
 * @private
 */
GEarthExtensions.isExtensionsNamespace_ = function(object) {
  return object !== null && typeof object == 'object' &&
      'isnamespace_' in object && member.isnamespace_;
};

/**
 * Determines whether or not the given object is directly an instance
 * of the specified Earth API type.
 * @param {object} object The object to test.
 * @param {string} type The Earth API type string, i.e. 'KmlPlacemark'
 */
GEarthExtensions.isInstanceOfEarthInterface = function(object, type) {
  // TODO: double check that all earth interfaces are typeof 'function'
  return object !== null && typeof object == 'function' &&
      'getType' in object && object.getType() == type;
};
/**
 * The GEarthExtensions#dom class/namespace hybrid contains both DOM builder
 * functions and DOM manipulation functions.
 * @class
 */
GEarthExtensions.prototype.dom = {isnamespace_:true};

/**
 * This is a sort of parametrized decorator around a fundamental constructor
 * DOM builder function,
 * it calls GEPlugin's createXX factory functions, allows for a type of
 * inheritance, provides extra functionality such as automatic property setters,
 * default arguments (i.e. fn('bar', {cat:'dog'}) == fn({foo:'bar', cat:'dog'}))
 * and checking if the parameter is an instance of the object we're constructing
 * @private
 */
GEarthExtensions.domBuilder_ = function(params) {
  if (params.apiInterface && !geo.util.isArray(params.apiInterface)) {
    params.apiInterface = [params.apiInterface];
  }
  
  // merge in base builder params
  // TODO: detect circular base builders
  var base = params.base;
  while (base) {
    // merge in propertyspec
    if ('propertySpec' in base.builderParams) {
      if (!('propertySpec' in params)) {
        params.propertySpec = [];
      }
      
      for (member in base.builderParams.propertySpec) {
        if (!(member in params.propertySpec)) {
          params.propertySpec[member] =
              base.builderParams.propertySpec[member];
        }
      }
    }
    
    // set Earth API interface if none was set for this builder
    if (!params.apiInterface) {
      params.apiInterface = base.builderParams.apiInterface;
    }
    
    // set Earth API factory fn if none was set for this builder
    if (!params.apiFactoryFn) {
      params.apiFactoryFn = base.builderParams.apiFactoryFn;
    }
    
    base = base.builderParams.base;
  }
  
  // merge in root dom builder property spec (only id is universal to
  // all DOM objects)
  var rootPropertySpec = {
    id: ''
  };
  
  for (member in rootPropertySpec) {
    if (!(member in params.propertySpec)) {
      params.propertySpec[member] = rootPropertySpec[member];
    }
  }
  
  /** @ignore */
  var builderFn = function() {
    var options = {};
    var i;
    
    // construct options literal to pass to constructor function
    // from arguments
    if (arguments.length === 0) {
      throw new TypeError('Cannot create object without any arguments!');
    } else if (arguments.length == 1) {
      // the argument to the function may already be an instance of the
      // interface we're trying to create... if so, then simply return the
      // instance
      
      // TODO: maybe clone the object instead of just returning it
      for (i = 0; i < params.apiInterface.length; i++) {
        if (GEarthExtensions.isInstanceOfEarthInterface(
            arguments[0], params.apiInterface[i])) {
          return arguments[0];
        }
      }
      
      // find out if the first argument is the default property or the
      // options literal and construct the final options literal to
      // pass to the constructor function
      var arg = arguments[0];
      if (geo.util.isObjectLiteral(arg)) {
        // passed in only the options literal
        options = arg;
      } else if ('defaultProperty' in params) {
        // passed in default property and no options literal
        options[params.defaultProperty] = arg;
      } else {
        throw new TypeError('Expected options object');
      }
    } else if (arguments.length == 2) {
      if ('defaultProperty' in params) {
        // first parameter is the value of the default property, and the
        // other is the options literal
        options = arguments[1];
        options[params.defaultProperty] = arguments[0];
      } else {
        throw new Error('No default property for the DOM builder');
      }
    }
    
    // check passed in options against property spec
    options = GEarthExtensions.checkParameters(options,
        false, params.propertySpec);
    
    // call Earth API factory function, i.e. createXx(...)
    var newObj = this.pluginInstance[params.apiFactoryFn].call(
                     this.pluginInstance, options.id);
    
    // call constructor fn with factory-created object and options literal
    if (!geo.util.isUndefined(params.constructor)) {
      params.constructor.call(this, newObj, options);
    }
    
    // call base builder constructor functions
    base = params.base;
    while (base) {
      // call ancestor constructor functions
      if ('constructor' in base.builderParams) {
        base.builderParams.constructor.call(this, newObj, options);
      }
      
      base = base.builderParams.base;
    }
    
    // run automatic property setters as defined in property spec
    for (property in params.propertySpec) {
      // TODO: abstract away into isAuto()
      if (params.propertySpec[property] === GEarthExtensions.AUTO &&
          property in options) {
        // auto setters calls newObj.setXx(options[xx]) if xx is in options
        newObj['set' + property.substr(0,1).toUpperCase() +
            property.substr(1)].call(newObj, options[property]);
      }
    }
    
    return newObj;
  };
  
  builderFn.builderParams = params;
  return builderFn;
};
/** @ignore */
GEarthExtensions.prototype.dom.createFeature_ = GEarthExtensions.domBuilder_({
  propertySpec: {
    name: GEarthExtensions.AUTO,
    visibility: GEarthExtensions.AUTO,
    description: GEarthExtensions.AUTO,
    snippet: GEarthExtensions.AUTO
  }
});

/**
 * Creates a new placemark with the given parameters.
 * @function
 * @param {object} options The parameters of the placemark to create.
 * @param {string} [options.name] The name of the feature.
 * @param {boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {string} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {PointSpec} [options.point] A point geometry to use in the placemark.
 * @param {LineStringSpec} [options.lineString] A line string geometry to use
 *     in the placemark.
 * @param {LinearRingSpec} [options.linearRing] A linear ring geometry to use
 *     in the placemark.
 * @param {PolygonSpec} [options.polygon] A polygon geometry to use
 *     in the placemark.
 * @param {ModelSpec} [options.model] A model geometry to use
 *     in the placemark.
 * @param {MultiGeometrySpec} [options.geometries] A multi-geometry to use
 *     in the placemark.
 * @type KmlPlacemark
 */
// TODO: document styling
GEarthExtensions.prototype.dom.createPlacemark = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlPlacemark',
  base: GEarthExtensions.prototype.dom.createFeature_,
  apiFactoryFn: 'createPlacemark',
  propertySpec: {
    // allowed geometries
    point: GEarthExtensions.ALLOWED,
    lineString: GEarthExtensions.ALLOWED,
    linearRing: GEarthExtensions.ALLOWED,
    polygon: GEarthExtensions.ALLOWED,
    model: GEarthExtensions.ALLOWED,
    geometries: GEarthExtensions.ALLOWED,
    
    // styling
    stockIcon: GEarthExtensions.ALLOWED,
    icon: GEarthExtensions.ALLOWED,
    style: GEarthExtensions.ALLOWED,
    highlightStyle: GEarthExtensions.ALLOWED
  },
  constructor: function(placemarkObj, options) {
    // geometries
    var geometries = [];
    if (options.point) {
      geometries.push(this.dom.createPoint(options.point));
    }
    if (options.lineString) {
      geometries.push(this.dom.createLineString(options.lineString));
    }
    if (options.linearRing) {
      geometries.push(this.dom.createLinearRing(options.linearRing));
    }
    if (options.polygon) {
      geometries.push(this.dom.createPolygon(options.polygon));
    }
    if (options.model) {
      geometries.push(this.dom.createModel(options.model));
    }
    if (options.geometries) {
      geometries = geometries.concat(options.geometries);
    }
  
    if (geometries.length > 1) {
      placemarkObj.setGeometry(this.dom.createMultiGeometry(geometries));
    } else if (geometries.length == 1) {
      placemarkObj.setGeometry(geometries[0]);
    }
  
    // set styles
    if (options.stockIcon) {
      options.icon = options.icon || {};
      options.icon.stockIcon = options.stockIcon;
    }
  
    if (options.icon) {
      if (!options.style) {
        options.style = {};
      }
    
      options.style.icon = options.icon;
    }
  
    // NOTE: for this library, allow EITHER a style or a styleUrl, not both..
    // if you want both, you'll have to do it manually
    if (options.style) {
      if (options.highlightStyle) {
        // style map
        var styleMap = this.pluginInstance.createStyleMap(options.id);
      
        // set normal style
        if (typeof options.style == 'string') {
          styleMap.setNormalStyleUrl(options.style);
        } else {
          styleMap.setNormalStyle(this.dom.createStyle(options.style));
        }
      
        // set highlight style
        if (typeof options.highlightStyle == 'string') {
          styleMap.setHighlightStyleUrl(options.highlightStyle);
        } else {
          styleMap.setHighlightStyle(this.dom.createStyle(
              options.highlightStyle));
        }
      
        // assign style map
        placemarkObj.setStyleSelector(styleMap);
      } else {
        // single style
        if (typeof options.style == 'string') {
          placemarkObj.setStyleUrl(options.style);
        } else {
          placemarkObj.setStyleSelector(this.dom.createStyle(options.style));
        }
      }
    }
  }
});

/**
 * @see GEarthExtensions#dom.createPlacemark
 */
GEarthExtensions.prototype.dom.createPointPlacemark =
GEarthExtensions.domBuilder_({
  base: GEarthExtensions.prototype.dom.createPlacemark,
  defaultProperty: 'point'
});

/**
 * @see GEarthExtensions#dom.createPlacemark
 */
GEarthExtensions.prototype.dom.createLineStringPlacemark =
GEarthExtensions.domBuilder_({
  base: GEarthExtensions.prototype.dom.createPlacemark,
  defaultProperty: 'lineString'
});

/**
 * @see GEarthExtensions#dom.createPlacemark
 */
GEarthExtensions.prototype.dom.createPolygonPlacemark =
GEarthExtensions.domBuilder_({
  base: GEarthExtensions.prototype.dom.createPlacemark,
  defaultProperty: 'polygon'
});


/**
 * Creates a new network link with the given parameters.
 * @function
 * @param {LinkSpec} [link] An object describing the link to use for this
 *     network link.
 * @param {object} options The parameters of the network link to create.
 * @param {string} [options.name] The name of the feature.
 * @param {boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {string} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {LinkSpec} [options.link] The link to use.
 * @type KmlNetworkLink
 */
GEarthExtensions.prototype.dom.createNetworkLink =
GEarthExtensions.domBuilder_({
  apiInterface: 'KmlNetworkLink',
  base: GEarthExtensions.prototype.dom.createFeature_,
  apiFactoryFn: 'createNetworkLink',
  defaultProperty: 'link',
  propertySpec: {
    link: GEarthExtensions.ALLOWED,
    
    // auto properties
    flyToView: GEarthExtensions.AUTO,
    refreshVisibility: GEarthExtensions.AUTO
  },
  constructor: function(networkLinkObj, options) {
    if (options.link) {
      networkLinkObj.setLink(this.dom.createLink(options.link));
    }
  }
});
// TODO: unit tests

/** @ignore */
GEarthExtensions.prototype.dom.createContainer_ = GEarthExtensions.domBuilder_({
  base: GEarthExtensions.prototype.dom.createFeature_,
  propertySpec: {
    children: GEarthExtensions.ALLOWED
  },
  constructor: function(containerObj, options) {
    // children
    if (options.children) {
      for (var i = 0; i < options.children.length; i++) {
        containerObj.getFeatures().appendChild(options.children[i]);
      }
    }  
  }
});

/**
 * Creates a new folder with the given parameters.
 * @function
 * @param {KmlFeature[]} [children] The children of this folder.
 * @param {object} options The parameters of the folder to create.
 * @param {string} [options.name] The name of the feature.
 * @param {boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {string} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {KmlFeature[]} [options.children] The children of this folder.
 * @type KmlFolder
 */
GEarthExtensions.prototype.dom.createFolder = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlFolder',
  base: GEarthExtensions.prototype.dom.createContainer_,
  apiFactoryFn: 'createFolder',
  defaultProperty: 'children'
});
// TODO: unit tests

/**
 * Creates a new document with the given parameters.
 * @function
 * @param {KmlFeature[]} [children] The children of this document.
 * @param {object} options The parameters of the document to create.
 * @param {string} [options.name] The name of the feature.
 * @param {boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {string} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {KmlFeature[]} [options.children] The children of this document.
 * @type KmlDocument
 */
GEarthExtensions.prototype.dom.createDocument = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlDocument',
  base: GEarthExtensions.prototype.dom.createContainer_,
  apiFactoryFn: 'createDocument',
  defaultProperty: 'children'
});
// TODO: unit tests

/** @ignore */
GEarthExtensions.prototype.dom.createOverlay_ = GEarthExtensions.domBuilder_({
  base: GEarthExtensions.prototype.dom.createFeature_,
  propertySpec: {
    color: GEarthExtensions.ALLOWED,
    icon: GEarthExtensions.ALLOWED,
    
    // auto properties
    drawOrder: GEarthExtensions.AUTO
  },
  constructor: function(overlayObj, options) {
    // color
    if (options.color) {
      overlayObj.getColor().set(GEarthExtensions.parseColor(options.color));
    }
  
    // icon
    if (options.icon) {
      var icon = this.pluginInstance.createIcon('');
      overlayObj.setIcon(icon);
    
      if (typeof options.icon == 'string') {
        // default just icon href
        icon.setHref(options.icon);
      }
    }
  }
});

/**
 * Creates a new ground overlay with the given parameters.
 */
// TODO: documentation
GEarthExtensions.prototype.dom.createGroundOverlay =
GEarthExtensions.domBuilder_({
  apiInterface: 'KmlGroundOverlay',
  base: GEarthExtensions.prototype.dom.createOverlay_,
  apiFactoryFn: 'createGroundOverlay',
  defaultProperty: 'icon',
  propertySpec: {
    // required properties
    box: GEarthExtensions.REQUIRED,
    
    // auto properties
    altitude: GEarthExtensions.AUTO,
    altitudeMode: GEarthExtensions.AUTO
  },
  constructor: function(groundOverlayObj, options) {
    if (options.box) {
      // TODO: exception if any of the options are missing
      var box = this.pluginInstance.createLatLonBox('');
      box.setBox(options.box.north, options.box.south,
                 options.box.east, options.box.west,
                 options.box.rotation ? options.box.rotation : 0);
      groundOverlayObj.setLatLonBox(box);
    }
  }
});


//////////////////////////////
// GEarthExtensions#dom shortcut functions

(function(){
  var autoShortcut = ['Placemark',
                      'PointPlacemark', 'LineStringPlacemark',
                      'PolygonPlacemark',
                      'Folder', 'NetworkLink', 'GroundOverlay', 'Style'];
  for (var i = 0; i < autoShortcut.length; i++) {
    GEarthExtensions.prototype.dom['add' + autoShortcut[i]] =
      function(shortcutBase) {
        return function() {
          var obj = this.dom['create' + shortcutBase].apply(null, arguments);
          this.pluginInstance.getFeatures().appendChild(obj);
          return obj;
        };
    }(autoShortcut[i]); // escape closure
  }
})();
/** @ignore */
GEarthExtensions.prototype.dom.createExtrudableGeometry_ =
GEarthExtensions.domBuilder_({
  propertySpec: {
    altitudeMode: GEarthExtensions.AUTO,
    extrude: GEarthExtensions.AUTO,
    tessellate: GEarthExtensions.AUTO
  }
});

/**
 * Creates a new point geometry with the given parameters.
 * @function
 * @param {PointSpec} [point] The point data.
 * @param {object} options The parameters of the point object to create.
 * @param {PointSpec} [options.point] The point data.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @type KmlPoint
 */
GEarthExtensions.prototype.dom.createPoint = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlPoint',
  base: GEarthExtensions.prototype.dom.createExtrudableGeometry_,
  apiFactoryFn: 'createPoint',
  defaultProperty: 'point',
  propertySpec: {
    point: GEarthExtensions.REQUIRED
  },
  constructor: function(pointObj, options) {
    var point = new geo.Point(options.point);
    pointObj.set(
        point.lat,
        point.lng,
        point.altitude,
        point.altitudeMode,
        false,
        false);
  }
});
// TODO: unit tests

/**
 * Creates a new line string geometry with the given parameters.
 * @function
 * @param {PathSpec} [path] The path data.
 * @param {object} options The parameters of the line string to create.
 * @param {PathSpec} [options.path] The path data.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlLineString
 */
GEarthExtensions.prototype.dom.createLineString = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlLineString',
  base: GEarthExtensions.prototype.dom.createExtrudableGeometry_,
  apiFactoryFn: 'createLineString',
  defaultProperty: 'path',
  propertySpec: {
    path: GEarthExtensions.REQUIRED
  },
  constructor: function(lineStringObj, options) {
    // TODO: maybe use parseKml instead of pushLatLngAlt for performance
    // purposes
    var coordsObj = lineStringObj.getCoordinates();
  
    var path = new geo.Path(options.path);
    var numCoords = path.numCoords();
    for (var i = 0; i < numCoords; i++) {
      coordsObj.pushLatLngAlt(path.coord(i).lat, path.coord(i).lng,
          path.coord(i).altitude);
    }
  }
});
// TODO: unit tests

/**
 * Creates a new linear ring geometry with the given parameters.
 * @function
 * @param {PathSpec} [path] The path data.
 *     The first coordinate doesn't need to be repeated at the end.
 * @param {object} options The parameters of the linear ring to create.
 * @param {PathSpec} [options.path] The path data.
 *     The first coordinate doesn't need to be repeated at the end.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlLinearRing
 */
GEarthExtensions.prototype.dom.createLinearRing = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlLinearRing',
  base: GEarthExtensions.prototype.dom.createLineString,
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
 * @param {PolygonSpec} [polygon] The polygon data.
 * @param {object} options The parameters of the polygon to create.
 * @param {PolygonSpec} [options.polygon] The polygon data.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlPolygon
 */
GEarthExtensions.prototype.dom.createPolygon = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlPolygon',
  base: GEarthExtensions.prototype.dom.createExtrudableGeometry_,
  apiFactoryFn: 'createPolygon',
  defaultProperty: 'polygon',
  propertySpec: {
    polygon: GEarthExtensions.REQUIRED
  },
  constructor: function(polygonObj, options) {
    var polygon = new geo.Polygon(options.polygon);
  
    polygonObj.setOuterBoundary(
        this.dom.createLinearRing(polygon.outerBoundary()));
    if (polygon.innerBoundaries().length) {
      var innerBoundaries = polygon.innerBoundaries();
      for (var i = 0; i < innerBoundaries.length; i++) {
        polygonObj.getInnerBoundaries().appendChild(
            this.dom.createLinearRing(innerBoundaries[i]));
      }
    }
  }
});
// TODO: unit tests

/**
 * Creates a new model geometry with the given parameters.
 * @function
 * @param {LinkSpec} [link] The remote link this model should use.
 * @param {object} options The parameters of the model to create.
 * @param {LinkSpec} [options.link] The remote link this model should use.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {PointSpec} [options.location] The location of the model.
 * @param {number|number[]} [options.scale] The scale factor of the model.
 * @param {object} [options.orientation] The orientation of the model.
 * @param {number} [options.orientation.heading] The model heading.
 * @param {number} [options.orientation.tilt] The model tilt.
 * @param {number} [options.orientation.roll] The model roll.
 * @type KmlPolygon
 */
GEarthExtensions.prototype.dom.createModel = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlModel',
  apiFactoryFn: 'createModel',
  defaultProperty: 'link',
  propertySpec: {
    link: GEarthExtensions.ALLOWED,
    location: GEarthExtensions.ALLOWED,
    scale: GEarthExtensions.ALLOWED,
    orientation: GEarthExtensions.ALLOWED
  },
  constructor: function(modelObj, options) {
    if (options.link) {
      modelObj.setLink(this.dom.createLink(options.link));
    }
  
    if (options.location) {
      var pointObj = new geo.Point(options.location);
      var locationObj = this.pluginInstance.createLocation('');
      locationObj.setLatLngAlt(pointObj.lat, pointObj.lng, pointObj.altitude);
      modelObj.setLocation(locationObj);
      modelObj.setAltitudeMode(pointObj.altitudeMode);
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

/**
 * Creates a new multi-geometry with the given parameters.
 * @function
 * @param {KmlGeometry[]} [geometries] The child geometries.
 * @param {object} options The parameters of the multi-geometry to create.
 * @param {KmlGeometry[]} [options.geometries] The child geometries.
 * @type KmlMultiGeometry
 */
GEarthExtensions.prototype.dom.createMultiGeometry =
GEarthExtensions.domBuilder_({
  apiInterface: 'KmlMultiGeometry',
  apiFactoryFn: 'createMultiGeometry',
  defaultProperty: 'geometries',
  propertySpec: {
    geometries: GEarthExtensions.ALLOWED
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
/**
 * Creates a new link object with the given parameters.
 * @function
 * @param {string} [href] The link href.
 * @param {object} options The link parameters.
 * @param {string} [options.href] The link href.
 * @param {KmlRefreshModeEnum} [options.refreshMode] The link refresh mode.
 * @param {number} [options.refreshInterval] The link refresh interval,
 *     in seconds.
 * @param {KmlViewRefreshModeEnum} [options.viewRefreshMode] The view-based
 *     refresh mode.
 * @type KmlLink
 */
GEarthExtensions.prototype.dom.createLink = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlLink',
  apiFactoryFn: 'createLink',
  defaultProperty: 'href',
  propertySpec: {
    // auto properties
    href: GEarthExtensions.AUTO,
    refreshMode: GEarthExtensions.AUTO,
    refreshInterval: GEarthExtensions.AUTO,
    viewRefreshMode: GEarthExtensions.AUTO,
    viewBoundScale: GEarthExtensions.AUTO
  }
});
/**
 * Creates a new style with the given parameters.
 * @function
 * @param {object} options The style parameters.
 
 * @param {string|object} [options.icon] The icon href or an icon
 *     object literal.
 * @param {string} [options.icon.href] The icon href.
 * @param {number} [options.icon.scale] The icon scaling factor.
 * @param {ColorSpec} [options.icon.color] The color of the icon.
 
 * @param {ColorSpec|object} [options.label] The label color or a label
 *     object literal.
 * @param {number} [options.label.scale] The label scaling factor.
 * @param {ColorSpec} [options.label.color] The color of the label.

 * @param {ColorSpec|object} [options.line] The line color or a line
 *     object literal.
 * @param {number} [options.line.width] The line width.
 * @param {ColorSpec} [options.line.color] The line color.

 * @param {ColorSpec|object} [options.poly] The polygon color or a polygon style
 *     object literal.
 * @param {boolean} [options.poly.fill] Whether or not the polygon will be
 *     filled.
 * @param {boolean} [options.poly.outline] Whether or not the polygon will have
 *     an outline.
 * @param {ColorSpec} [options.poly.color] The color of the polygon fill.

 * @type KmlStyle
 */
GEarthExtensions.prototype.dom.createStyle = GEarthExtensions.domBuilder_({
  apiInterface: ['KmlStyle', 'KmlStyleMap'],
  apiFactoryFn: 'createStyle',
  propertySpec: {
    icon: GEarthExtensions.ALLOWED,
    label: GEarthExtensions.ALLOWED,
    line: GEarthExtensions.ALLOWED,
    poly: GEarthExtensions.ALLOWED
  },
  constructor: function(styleObj, options) {
    // set icon style
    if (options.icon) {
      var iconStyle = styleObj.getIconStyle();
    
      if (typeof options.icon == 'string') {
        options.icon = { href: options.icon };
      }
    
      var icon = this.pluginInstance.createIcon('');
      iconStyle.setIcon(icon);
    
      // more options
      if ('href' in options.icon) {
        icon.setHref(options.icon.href);
      } else if ('stockIcon' in options.icon) {
        icon.setHref('http://maps.google.com/mapfiles/kml/paddle/' +
            options.icon.stockIcon + '.png');
      } else {
        // use default icon href
        icon.setHref('http://maps.google.com/mapfiles/kml/paddle/' +
            'wht-blank.png');
        iconStyle.getHotSpot().set(0.5, this.pluginInstance.UNITS_FRACTION,
            0, this.pluginInstance.UNITS_FRACTION);
      }
      if ('scale' in options.icon) {
        iconStyle.setScale(options.icon.scale);
      }
      if ('heading' in options.icon) {
        iconStyle.setHeading(options.icon.heading);
      }
      if ('color' in options.icon) {
        iconStyle.getColor().set(
            GEarthExtensions.parseColor(options.icon.color));
      }
      if ('hotSpot' in options.icon) {
        this.dom.setVec2(iconStyle.getHotSpot(), options.icon.hotSpot);
      }
      // TODO: colormode
    }
  
    // set label style
    if (options.label) {
      var labelStyle = styleObj.getLabelStyle();
    
      if (typeof options.label == 'string') {
        options.label = { color: options.label };
      }
    
      // more options
      if ('scale' in options.label) {
        labelStyle.setScale(options.label.scale);
      }
      if ('color' in options.label) {
        labelStyle.getColor().set(
            GEarthExtensions.parseColor(options.label.color));
      }
      // TODO: add colormode
    }
  
    // set line style
    if (options.line) {
      var lineStyle = styleObj.getLineStyle();
    
      if (typeof options.line == 'string') {
        options.line = { color: options.line };
      }
  
      // more options
      if ('width' in options.line) {
        lineStyle.setWidth(options.line.width);
      }
      if ('color' in options.line) {
        lineStyle.getColor().set(
            GEarthExtensions.parseColor(options.line.color));
      }
      // TODO: add colormode
    }
  
    // set poly style
    if (options.poly) {
      var polyStyle = styleObj.getPolyStyle();
    
      if (typeof options.poly == 'string') {
        options.poly = { color: options.poly };
      }
    
      // more options
      if ('fill' in options.poly) {
        polyStyle.setFill(options.poly.fill);
      }
      if ('outline' in options.poly) {
        polyStyle.setOutline(options.poly.outline);
      }
      if ('color' in options.poly) {
        polyStyle.getColor().set(
            GEarthExtensions.parseColor(options.poly.color));
      }
      // TODO: add colormode
    }
  }
});
// TODO: unit tests
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

/**
 * Walks a KML object, calling a given visit function for each object in
 * the KML DOM. The lone argument must be either a visit function or an
 * options literal.
 * @param {Object} [options] The walk options:
 * @param {Function} [options.visitCallback] The function to call upon visiting
 *     a node in the DOM. The 'this' variable in the callback function will be
 *     bound to the object being visited. The lone argument passed to this
 *     function will be an object literal for the call context. To get the
 *     current application-specific call context, use the 'current' property
 *     of the context object. To set the context for all child calls, set the
 *     'child' property of the context object. To stop the walking process,
 *     return false in the function.
 * @param {KmlObject} [options.rootObject] The root of the KML object hierarchy
 *     to walk.
 * @param {boolean} [options.features] Descend into feature containers?
 *     Default true.
 * @param {boolean} [options.geometries] Descend into geometry containers?
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
      child: currentContext
    };
    
    // walk object
    var retValue = options.visitCallback.call(object, contextArgument);
    if (!retValue && !geo.util.isUndefined(retValue)) {
      return;
    }
    
    var objectContainer = null; // GESchemaObjectContainer
    
    // check if object is a parent
    if ('getFeatures' in object) { // GEFeatureContainer
      if (options.features) {
        objectContainer = object.getFeatures();
      }
    } else if ('getGeometry' in object) { // KmlFeature - descend into geoms.
      if (options.geometries && object.getGeometry()) {
        recurse_(object.getGeometry(), contextArgument.child);
      }
    } else if ('getGeometries' in object) { // GEGeometryContainer
      if (options.geometries) {
        objectContainer = object.getGeometries();
      }
    } else if ('getInnerBoundaries' in object) { // GELinearRingContainer
      if (options.geometries) {
        objectContainer = object.getInnerBoundaries();
      }
    }
    
    // iterate through children if object is a parent and recurse so they
    // can be walked
    if (objectContainer && objectContainer.hasChildNodes()) {
      var childNodes = objectContainer.getChildNodes();
      var numChildNodes = childNodes.getLength();
      
      for (var i = 0; i < numChildNodes; i++) {
        var child = childNodes.item(i);
        
        recurse_(child, contextArgument.child);
      }
    }
  };
  
  if (options.rootObject) {
    recurse_(options.rootObject, options.rootContext);
  }
};

/**
 * Gets the object in the Earth DOM with the given id.
 * @param {string} id The id of the object to retrieve.
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
  
  testext_.dom.walk({
    rootObject: options.root,
    features: true,
    geometries: true,
    visitCallback: function() {
      if (this.getId() == id) {
        returnObject = this;
        return false; // stop walk
      }
    }
  });
};
// TODO: unit test

/**
 * Removes the given object from the Earth object's DOM.
 * @param {KmlObject} object The object to remove.
 */
GEarthExtensions.prototype.dom.removeObject = function(object) {
  // TODO: make sure this removes the feature from its parent, which may not
  // necessarily be the root feature container
  var parent = object.getParentNode();
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
 * Parse hotspot
 * TODO: docs
 */
GEarthExtensions.prototype.dom.setVec2 = function(vec2, options) {
  options = GEarthExtensions.checkParameters(options, false, {
    left: GEarthExtensions.ALLOWED,
    top: GEarthExtensions.ALLOWED,
    right: GEarthExtensions.ALLOWED,
    bottom: GEarthExtensions.ALLOWED
  });
  
  var x = 0.0;
  var xUnits = this.pluginInstance.UNITS_PIXELS;
  var y = 0.0;
  var yUnits = this.pluginInstance.UNITS_PIXELS;
  
  // set X (origin = left)
  if ('left' in options) {
    if (typeof options.left == 'number') {
      x = options.left;
    } else if (typeof options.left == 'string' &&
               options.left[options.left.length - 1] == '%') {
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
               options.right[options.right.length - 1] == '%') {
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
               options.bottom[options.bottom.length - 1] == '%') {
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
               options.top[options.top.length - 1] == '%') {
      y = 1.0 - parseFloat(options.top) / 100;
      yUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('top must be a number or string indicating a ' +
                          'percentage');
    }
  }
  
  vec2.set(x, xUnits, y, yUnits);
};
/**
 * Creates a new lookat object with the given parameters.
 * @function
 * @param {PointSpec} [point] The point to look at.
 * @param {object} options The parameters of the lookat object to create.
 * @param {PointSpec} [options.point] The point to look at.
 * @param {boolean} [options.copy] Whether or not to copy parameters from the
 *     existing view if they aren't explicitly specified in the options.
 * @param {number} [options.heading] The lookat heading/direction.
 * @param {number} [options.tilt] The lookat tilt.
 * @param {number} [options.range] The range of the camera (distance from the
 *     lookat point).
 * @type KmlLookAt
 */
GEarthExtensions.prototype.dom.createLookAt = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlLookAt',
  apiFactoryFn: 'createLookAt',
  defaultProperty: 'point',
  propertySpec: {
    copy: GEarthExtensions.ALLOWED,
    point: GEarthExtensions.REQUIRED,
    heading: GEarthExtensions.ALLOWED,
    tilt: GEarthExtensions.ALLOWED,
    range: GEarthExtensions.ALLOWED
  },
  constructor: function(lookAtObj, options) {
    var point = new geo.Point(options.point);
  
    var defaults = {
      heading: 0,
      tilt: 0,
      range: 1000
    };
  
    if (options.copy) {
      var currentLookAt = this.util.getLookAt(defaults.altitudeMode);
      defaults.heading = currentLookAt.getHeading();
      defaults.tilt = currentLookAt.getTilt();
      defaults.range = currentLookAt.getRange();
    }
  
    options = GEarthExtensions.checkParameters(options, true, defaults);
  
    lookAtObj.set(
        point.lat,
        point.lng,
        point.altitude,
        point.altitudeMode,
        options.heading,
        options.tilt,
        options.range);
  }
});
// TODO: incrementLookAt

/**
 * Creates a new camera object with the given parameters.
 * @function
 * @param {PointSpec} [point] The point at which to place the camera.
 * @param {object} options The parameters of the camera object to create.
 * @param {PointSpec} [options.point] The point at which to place the camera.
 * @param {boolean} [options.copy] Whether or not to copy parameters from the
 *     existing view if they aren't explicitly specified in the options.
 * @param {number} [options.heading] The camera heading/direction.
 * @param {number} [options.tilt] The camera tilt.
 * @param {number} [options.range] The camera roll.
 * @type KmlCamera
 */
GEarthExtensions.prototype.dom.createCamera = GEarthExtensions.domBuilder_({
  apiInterface: 'KmlCamera',
  apiFactoryFn: 'createCamera',
  defaultProperty: 'point',
  propertySpec: {
    copy: GEarthExtensions.ALLOWED,
    point: GEarthExtensions.REQUIRED,
    heading: GEarthExtensions.ALLOWED,
    tilt: GEarthExtensions.ALLOWED,
    roll: GEarthExtensions.ALLOWED
  },
  constructor: function(cameraObj, options) {
    var point = new geo.Point(options.point);
  
    var defaults = {
      heading: 0,
      tilt: 0,
      roll: 0
    };
  
    if (options.copy) {
      var currentCamera = this.util.getCamera(defaults.altitudeMode);
      defaults.heading = currentCamera.getHeading();
      defaults.tilt = currentCamera.getTilt();
      defaults.roll = currentCamera.getRoll();
    }
  
    options = GEarthExtensions.checkParameters(options, true, defaults);
  
    cameraObj.set(
        point.lat,
        point.lng,
        point.altitude,
        point.altitudeMode,
        options.heading,
        options.tilt,
        options.roll);
  }
});
// TODO: incrementLookAt
/**
 * The GEarthExtensions#edit class/namespace hybrid contains methods for
 * allowing editing of Earth features.
 * @namespace
 */
GEarthExtensions.prototype.edit = {isnamespace_:true};
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
/**
 * The GEarthExtensions#fx class/namespace hybrid contains various
 * animation/effects tools for use in the Earth API.
 * @namespace
 */
GEarthExtensions.prototype.fx = {isnamespace_:true};
/**
 * Returns the singleton animation manager for the plugin instance.
 */
GEarthExtensions.prototype.fx.getAnimationManager_ = function() {
  if (!this.animationManager_) {
    this.animationManager_ = new this.fx.AnimationManager_(this);
  }
  
  return this.animationManager_;
};

/**
 * Private singleton class for managing GEarthExtensions#fx animations in a
 * plugin instance.
 */
GEarthExtensions.prototype.fx.AnimationManager_ = GEarthExtensions.createClass_(
function(extInstance) {
  this.extInstance = extInstance;
  this.animations_ = [];

  this.running_ = false;
  this.globalTime_ = 0.0;
});

/**
 * Start an animation (deriving from GEarthExtensions#fx.Animation).
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.startAnimation =
function(anim) {
  this.animations_.push({
    obj: anim,
    startGlobalTime: this.globalTime_
  });
  
  this.start_();
};

/**
 * Stop an animation (deriving from GEarthExtensions#fx.Animation).
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.stopAnimation =
function(anim) {
  for (var i = 0; i < this.animations_.length; i++) {
    if (this.animations_[i].obj == anim) {
      // remove the animation from the array
      this.animations_.splice(i, 1);
      return;
    }
  }
};

/**
 * Private, internal function to start animating
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.start_ = function() {
  if (this.running_) {
    return;
  }
  
  this.startTimeStamp_ = Number(new Date());
  this.tick_();
  
  for (var i = 0; i < this.animations_.length; i++) {
    this.animations_[i].obj.renderFrame(0);
  }
  
  var me = this;
  this.frameendListener_ = function(){ me.tick_(); };
  this.tickInterval_ = window.setInterval(this.frameendListener_, 100);
  google.earth.addEventListener(this.extInstance.pluginInstance,
      'frameend', this.frameendListener_);
  this.running_ = true;
};

/**
 * Private, internal function to stop animating
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.stop_ = function() {
  if (!this.running_) {
    return;
  }
  
  google.earth.removeEventListener(this.extInstance.pluginInstance,
      'frameend', this.frameendListener_);
  this.frameendListener_ = null;
  window.clearInterval(this.tickInterval_);
  this.tickInterval_ = null;
  this.running_ = false;
  this.globalTime_ = 0.0;
};

/**
 * Internal tick handler (frameend)
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.tick_ = function() {
  if (!this.running_) {
    return;
  }
  
  this.globalTime_ = Number(new Date()) - this.startTimeStamp_;
  this.renderCurrentFrame_();
};

/**
 * Private function to render current animation frame state (by calling
 * registered Animations' individual frame renderers.
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.renderCurrentFrame_ =
function() {
  for (var i = this.animations_.length - 1; i >= 0; i--) {
    var animation = this.animations_[i];
    var me = this;
    animation.obj.renderFrame(this.globalTime_ - animation.startGlobalTime);
  }
  
  if (this.animations_.length === 0) {
    this.stop_();
  }
};

/**
 * Abstract base class for GEarthExtensions#fx animations
 */
GEarthExtensions.prototype.fx.Animation_ =
GEarthExtensions.createClass_(function() { });

/**
 * Start the animation.
 */
GEarthExtensions.prototype.fx.Animation_.prototype.start = function() {
  this.extInstance.fx.getAnimationManager_().startAnimation(this);
};

/**
 * Stop the animation.
 */
GEarthExtensions.prototype.fx.Animation_.prototype.stop = function() {
  this.extInstance.fx.getAnimationManager_().stopAnimation(this);
  this.renderFrame(0);
};

/**
 * Render the frame at time t after the animation was started.
 * @param {number} t The time in seconds of the frame to render.
 * @abstract
 */
GEarthExtensions.prototype.fx.Animation_.prototype.renderFrame = function(t){ };

/**
 * Generic class for fixed-duration animations.
 */
GEarthExtensions.prototype.fx.GenericSimpleAnimation =
GEarthExtensions.createClass_(
  [GEarthExtensions.prototype.fx.Animation_],
function(extInstance, duration, renderFn) {
  this.extInstance = extInstance;
  this.duration = duration;
  this.renderFn = renderFn;
});

GEarthExtensions.prototype.fx.GenericSimpleAnimation.prototype.renderFrame =
function(t) {
  if (t > this.duration) {
    this.stop();
    this.renderFn.call(this, this.duration); // clean exit
    return;
  }
  
  this.renderFn.call(this, t);
};
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
/**
 * Cancel all animations on a given feature, potentially leaving them in an
 * intermediate visual state.
 */
GEarthExtensions.prototype.fx.cancel = function(feature) {
  // TODO: verify that feature is a KmlFeature
  var animations = this.util.getJsDataValue(feature,
                       '_GEarthExtensions_anim') || [];
  for (var i = 0; i < animations.length; i++) {
    animations[i].stop();
  }
};

/**
 * Cancel all animations on a given feature and revert them to their t = 0
 * state.
 */
GEarthExtensions.prototype.fx.rewind = function(feature) {
  // TODO: verify that feature is a KmlFeature
  var animations = this.util.getJsDataValue(feature,
                       '_GEarthExtensions_anim') || [];
  for (var i = 0; i < animations.length; i++) {
    animations[i].rewind();
  }
};

/**
 * Animate a numeric property on a plugin object.
 */
GEarthExtensions.prototype.fx.animateProperty =
function(obj, property, options) {
  options = GEarthExtensions.checkParameters(options, false, {
    duration: 500,
    start: GEarthExtensions.ALLOWED,
    end: GEarthExtensions.ALLOWED,
    delta: GEarthExtensions.ALLOWED,
    easing: 'none',
    callback: GEarthExtensions.ALLOWED
  });
  
  // http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm
  // TODO: ensure easing function exists
  // get the easing function
  if (typeof options.easing == 'string') {
    options.easing = {
      'none': function(t) {
        return t;
      },
      'in': function(t) { // cubic in
        return t*t*t;
      },
      'out': function(t) { // cubic out
        var ts = t*t;
        var tc = ts*t;
        return tc - 3*ts + 3*t;
      },
      'both': function(t) { // quintic in-out
        var ts = t*t;
        var tc = ts*t;
        return 6*tc*ts - 15*ts*ts + 10*tc;
      }
    }[options.easing];
  }
  
  var getter = function() {
    return obj['get' + property.substr(0,1).toUpperCase() +
        property.substr(1)].call(obj);
  };
  
  var setter = function(val) {
    return obj['set' + property.substr(0,1).toUpperCase() +
        property.substr(1)].call(obj, val);
  };
    
  // use EITHER start/end or delta
  if (!isFinite(options.start) && !isFinite(options.end)) {
    // use delta
    if (!isFinite(options.delta)) {
      options.delta = 0.0;
    }
    
    options.start = getter();
    options.end = getter() + options.delta;
  } else {
    // use start/end
    if (!isFinite(options.start)) {
      options.start = getter();
    }

    if (!isFinite(options.end)) {
      options.end = getter();
    }
  }
  
  var anim = new this.fx.GenericSimpleAnimation(this, options.duration,
    function(t) {
      setter(options.start + options.easing.call(null, 1.0 *
                                                       t / options.duration) *
                             (options.end - options.start));
      if (t == options.duration && options.callback) {
        options.callback.call(obj);
      }
    });
  
  anim.start();
};
/**
 * The GEarthExtensions#util class/namespace hybrid contains miscellaneous
 * utility functions and shortcuts for the Earth API.
 * @namespace
 */
GEarthExtensions.prototype.util = {isnamespace_:true};
(function() {
  // NOTE: this is shared across all GEarthExtensions instances
  // dictionary mapping feature's jstag (uuid) --> feature's js data dictionary
  var jsDataDicts_ = {};
  
  /* randomUUID.js - Version 1.0
  *
  * Copyright 2008, Robert Kieffer
  *
  * This software is made available under the terms of the Open Software License
  * v3.0 (available here: http://www.opensource.org/licenses/osl-3.0.php )
  *
  * The latest version of this file can be found at:
  * http://www.broofa.com/Tools/randomUUID.js
  *
  * For more information, or to comment on this, please go to:
  * http://www.broofa.com/blog/?p=151
  */

  /**
  * Create and return a "version 4" RFC-4122 UUID string.
  */
  function randomUUID() {
    var s = [], itoh = '0123456789ABCDEF', i = 0;

    // Make array of random hex digits. The UUID only has 32 digits in it, but we
    // allocate an extra items to make room for the '-'s we'll be inserting.
    for (i = 0; i < 36; i++) {
      s[i] = Math.floor(Math.random()*0x10);
    }

    // Conform to RFC-4122, section 4.4
    s[14] = 4;  // Set 4 high bits of time_high field to version
    s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

    // Convert to hex chars
    for (i = 0; i < 36; i++) {
      s[i] = itoh[s[i]];
    }

    // Insert '-'s
    s[8] = s[13] = s[18] = s[23] = '-';

    return s.join('');
  }
  
  var jsTagRegex_ = /##JSTAG:([0-9a-f\-]+)##/i;
  
  /**
   * @private
   */
  function getJsTag_(feature) {
    var jsTag = feature.getSnippet().match(jsTagRegex_);
    if (jsTag) {
      jsTag = jsTag[1];
    }
    
    return jsTag;
  }
  
  /**
   * @private
   */
  function setJsTag_(feature, jsTag) {
    if (getJsTag_(feature)) {
      feature.setSnippet(feature.getSnippet().replace(jsTagRegex_, ''));
    }
    
    if (jsTag) {
      feature.setSnippet(
          '##JSTAG:' + jsTag + '##' +
          feature.getSnippet());
    }
  }
  
  /**
   * Returns whether or not the KmlFeature has any JS-side data.
   * @param {KmlFeature} feature The feature to inquire about.
   * @public
   */
  GEarthExtensions.prototype.util.hasJsData = function(feature) {
    var jsTag = getJsTag_(feature);
    return (jsTag && jsTag in jsDataDicts_) ? true : false;
  };
  
  /**
   * Clears all JS-side data for the given KmlFeature.
   * @param {KmlFeature} feature The feature to clear data on.
   */
  GEarthExtensions.prototype.util.clearAllJsData = function(feature) {
    var jsTag = getJsTag_(feature);
    if (jsTag) {
      setJsTag_(feature, null);
      delete jsDataDicts_[jsTag];
    }
  };

  /**
   * Gets the JS-side data for the given KmlFeature associated with the given
   * key.
   * WARNING: This method currently stores custom data in the feature's
   * &lt;snippet&gt;. Data must be cleared out with clearJsData before
   * manipulating the snippet or using getKml.
   * @param {KmlFeature} feature The feature to get data for.
   * @public
   */
  GEarthExtensions.prototype.util.getJsDataValue = function(feature, key) {
    var jsTag = getJsTag_(feature);
    if (jsTag &&
        jsTag in jsDataDicts_ &&
        key in jsDataDicts_[jsTag]) {
      return jsDataDicts_[jsTag][key];
    }
    
    // TODO: null or undefined?
    return undefined;
  };
  
  /**
   * Sets the JS-side data for the given KmlFeature associated with the given
   * key to the passed in value.
   * WARNING: This method currently stores custom data in the feature's
   * &lt;snippet&gt;. Data must be cleared out with clearJsData before
   * manipulating the snippet or using getKml.
   * @param {KmlFeature} feature The feature to get data for.
   * @public
   */
  GEarthExtensions.prototype.util.setJsDataValue =
  function(feature, key, value) {
    var jsTag = getJsTag_(feature);
    if (!jsTag) {
      // no current data dictionary, create a jstag to inject into the
      // feature's snippet
      jsTag = null;
      while (!jsTag || jsTag in jsDataDicts_) {
        jsTag = randomUUID();
      }
      
      // inject the jsTag into the snippet
      setJsTag_(feature, jsTag);
      
      // create an empty data dict
      jsDataDicts_[jsTag] = {};
    }
    
    // set the data
    jsDataDicts_[jsTag][key] = value;
  };
  
  /**
   * Clears the JS-side data for the given KmlFeature associated with the given
   * key.
   * @param {KmlFeature} feature The feature to clear data on.
   * @param {string} key The data key whose value should be cleared.
   */
  GEarthExtensions.prototype.util.clearJsDataValue = function(feature, key) {
    var jsTag = getJsTag_(feature);
    if (jsTag &&
        jsTag in jsDataDicts_ &&
        key in jsDataDicts_[jsTag]) {
      delete jsDataDicts_[jsTag][key];
      
      // check if the data dict is empty... if so, cleanly remove it
      for (var k in jsDataDicts_[jsTag]) {
        return; // not empty
      }
      
      // data dict is empty
      this.util.clearAllJsData(feature);
    }
  };
  
}());
(function() {
  // TODO: docs
  GEarthExtensions.prototype.util.serializeView = function() {
    var camera = this.pluginInstance.getView().copyAsCamera(
        this.pluginInstance.ALTITUDE_ABSOLUTE);
    return encodeCamera_({
      lat: camera.getLatitude(),
      lng: camera.getLongitude(),
      altitude: camera.getAltitude(),
      heading: camera.getHeading(),
      tilt: camera.getTilt(),
      roll: camera.getRoll() });
  };

  // TODO: docs
  GEarthExtensions.prototype.util.deserializeView = function(s) {
    var cameraProps = decodeCamera_(s);
    var camera = this.pluginInstance.createCamera('');
    
    // TODO: isFinite checks
    camera.set(cameraProps.lat, cameraProps.lng, cameraProps.altitude,
        this.pluginInstance.ALTITUDE_ABSOLUTE, cameraProps.heading,
        cameraProps.tilt, cameraProps.roll);
    this.pluginInstance.getView().setAbstractView(camera);
  };
  
  /***********
  helper functions, most of which are from
  http://code.google.com/apis/maps/documentation/include/polyline.js
  ************/
  
  GEarthExtensions.prototype.util.encodeCamera_ = function(cam) {
    var encOverflow = 1073741824;
    var alt = Math.floor(cam.altitude * 1e5);
    return encodeArray_([
      Math.floor(fit180_(cam.lat) * 1e5),
      Math.floor(fit180_(cam.lng) * 1e5),
      Math.floor(alt / encOverflow),
      alt % encOverflow,
      Math.floor(fit360_(cam.heading) * 1e5),
      Math.floor(fit360_(cam.tilt) * 1e5),
      Math.floor(fit360_(cam.roll) * 1e5)
    ]);
  }

  GEarthExtensions.prototype.util.decodeCamera_ = function(s) {
    var encOverflow = 1073741824;
    var arr = decodeArray_(s);
    return {
      lat: arr[0] * 1e-5,
      lng: arr[1] * 1e-5,
      altitude: (encOverflow * arr[2] + arr[3]) * 1e-5,
      heading: arr[4] * 1e-5,
      tilt: arr[5] * 1e-5,
      roll: arr[6] * 1e-5
    };
  }
  
  // modified base64 for url
  // http://en.wikipedia.org/wiki/Base64
  var ALPHABET_ =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  
  function encodeArray_(a) {
    var s = '';
    for (var i = 0; i < a.length; i++) {
      s += encodeSignedNumber_(a[i]);
    }

    return s;
  }

  function fit360_(a) {
    while (a < 0) {
      a += 360;
    }

    return a % 360;
  }

  function fit180_(a) {
    a = fit360_(a);
    return (a > 180) ? a - 360 : a;
  }
  
  // Encode a signed number in the encode format.
  function encodeSignedNumber_(num) {
    var sgn_num = num << 1;

    if (num < 0) {
      sgn_num = ~(sgn_num);
    }

    var encodeString = "";

    while (sgn_num >= 0x20) {
      encodeString += ALPHABET_[0x20 | (sgn_num & 0x1f)];
      sgn_num >>= 5;
    }

    encodeString += ALPHABET_[sgn_num];
    return encodeString;
  }
  
  function decodeArray_(encoded) {
    var len = encoded.length;
    var index = 0;
    var array = [];
    var lat = 0;
    var lng = 0;

    while (index < len) {
      var b;
      var shift = 0;
      var result = 0;
      do {
        b = ALPHABET_.indexOf(encoded.charAt(index++));
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      array.push(((result & 1) ? ~(result >> 1) : (result >> 1)));
    }

    return array;
  }

}());
/**
 * Creates a KmlLookAt and sets it as the Earth plugin's view. This function
 * takes the same parameters as GEarthExtensions#dom.LookAt.
 */
GEarthExtensions.prototype.util.lookAt = function() {
  //this.pluginInstance.getView().setAbstractView(this.dom.LookAt(...));
  this.pluginInstance.getView().setAbstractView(
      this.dom.createLookAt.apply(null, arguments));
};

/**
 * Gets the current view as a KmlLookAt.
 * @param {number} [altitudeMode=ALTITUDE_ABSOLUTE] The altitude mode
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
 * @param {number} [altitudeMode=ALTITUDE_ABSOLUTE] The altitude mode
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

GEarthExtensions.prototype.util.displayKml = function(url, options) {
  // TODO: auto cache buster
  google.earth.fetchKml(this.pluginInstance, function(kmlObject) {
    if (kmlObject) {
      this.pluginInstance.getFeatures().appendChild(kmlObject);
    }
  });
};

GEarthExtensions.prototype.util.displayKmlString = function(str, options) {
  var kmlObject = this.pluginInstance.parseKml(str);
  this.pluginInstance.getFeatures().appendChild(kmlObject);
};
