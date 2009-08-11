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
 * Creates a new link object with the given parameters.
 * @function
 * @param {String} [href] The link href.
 * @param {Object} options The link parameters.
 * @param {String} [options.href] The link href.
 * @param {KmlRefreshModeEnum} [options.refreshMode] The link refresh mode.
 * @param {Number} [options.refreshInterval] The link refresh interval,
 *     in seconds.
 * @param {KmlViewRefreshModeEnum} [options.viewRefreshMode] The view-based
 *     refresh mode.
 * @type KmlLink
 */
GEarthExtensions.prototype.dom.buildLink = GEarthExtensions.domBuilder_({
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
 * Creates a new region with the given parameters.
 * @function
 * @param {Object} options The parameters of the region to create.
 * @param {String} [options.box] The bounding box of the region, defined by
 *     either N/E/S/W, or center+span, and optional altitudes.
 * @param {Number} [options.box.north] The north latitude for the region.
 * @param {Number} [options.box.east] The east longitude for the region.
 * @param {Number} [options.box.south] The south latitude for the region.
 * @param {Number} [options.box.west] The west longitude for the region.
 * @param {PointOptions|geo.Point} [options.box.center] The center point
 *     for the region's bounding box.
 * @param {Number|Number[]} [options.box.span] If using center+span region box
 *     definition, this is either a number indicating both latitude and
 *     longitude span, or a 2-item array defining [latSpan, lngSpan].
 * @param {Number} [options.box.minAltitude] The low altitude for the region.
 * @param {Number} [options.box.maxAltitude] The high altitude for the region.
 * @param {KmlAltitudeModeEnum} [options.box.altitudeMode] The altitude mode
 *     of the region, pertaining to min and max altitude.
 * @param {Number[]} [options.lod] An array of values indicating the LOD range
 *     for the region. The array can either contain 2 values, i.e.
 *     [minLodPixels, maxLodPixels], or 4 values to indicate fade extents, i.e.
 *     [minLodPixels, minFadeExtent, maxFadeExtent, maxLodPixels].
 * @type KmlRegion
 */
GEarthExtensions.prototype.dom.buildRegion =
GEarthExtensions.domBuilder_({
  apiInterface: 'KmlRegion',
  apiFactoryFn: 'createRegion',
  propertySpec: {
    // required properties
    box: GEarthExtensions.REQUIRED,
    
    // allowed properties
    lod: GEarthExtensions.ALLOWED
  },
  constructor: function(regionObj, options) {
    // TODO: exception if any of the options are missing
    var box = this.pluginInstance.createLatLonAltBox('');
    
    // center +/- span to calculate n/e/s/w
    if (options.box.center && options.box.span) {
      if (!geo.util.isArray(options.box.span) &&
          typeof options.box.span === 'number') {
        // use this one number as both the lat and long span
        options.box.span = [options.box.span, options.box.span];
      }
      
      var center = new geo.Point(options.box.center);
      options.box.north = center.lat() + options.box.span[0] / 2;
      options.box.south = center.lat() - options.box.span[0] / 2;
      options.box.east = center.lng() + options.box.span[1] / 2;
      options.box.west = center.lng() - options.box.span[1] / 2;
    }
    
    box.setAltBox(options.box.north, options.box.south,
                  options.box.east, options.box.west,
                  options.box.rotation || 0,
                  options.box.minAltitude || 0,
                  options.box.maxAltitude || 0,
                  options.box.altitudeMode ||
                      this.pluginInstance.ALTITUDE_CLAMP_TO_GROUND);
    
    // NOTE: regions MUST be given an Lod due to
    // http://code.google.com/p/earth-api-samples/issues/detail?id=190
    var lod = this.pluginInstance.createLod('');
    lod.set(-1, -1, 0, 0); // default Lod
    
    if (options.lod && geo.util.isArray(options.lod)) {
      // TODO: exception if it's not an array
      if (options.lod.length == 2) {
        // minpix, maxpix
        lod.set(options.lod[0], options.lod[1], 0, 0);
      } else if (options.lod.length == 4) {
        // minpix, minfade, maxfade, maxpix
        lod.set(options.lod[0], options.lod[3],
                options.lod[1], options.lod[2]);
      } else {
        // TODO: exception
      }
    }
    
    regionObj.setLatLonAltBox(box);
    regionObj.setLod(lod);
  }
});