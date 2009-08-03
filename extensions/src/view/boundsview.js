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
 * Creates a KmlAbstractView from a bounding box.
 * @param {geo.Bounds} bounds The bounding box for which to create a view.
 * @param {Object} options The parameters of the bounds view.
 * @param {Number} options.aspectRatio The aspect ratio (width : height)
 *     of the plugin viewport.
 * @param {Number} [options.defaultRange=1000] The default lookat range to use
 *     when creating a view for a degenerate, single-point bounding box.
 * @param {Number} [options.rangeMultiplier=1.5] A scaling factor by which
 *     to multiple the lookat range.
 */
GEarthExtensions.prototype.view.createBoundsView = function(bounds, options) {
  options = GEarthExtensions.checkParameters(options, false, {
    aspectRatio: GEarthExtensions.REQUIRED,
    
    defaultRange: 1000,
    scaleRange: 1.5
  });
    
  var center = bounds.center();
  var lookAtRange = options.defaultRange;
  
  var boundsSpan = bounds.span();
  if (boundsSpan.lat != 0 | boundsSpan.lng != 0) {
    var distEW = new geo.Point(center.lat(), bounds.east())
       .distance(new geo.Point(center.lat(), bounds.west()));
    var distNS = new geo.Point(bounds.north(), center.lng())
       .distance(new geo.Point(bounds.south(), center.lng()));
    
    var aspectRatio = Math.min(Math.max(options.aspectRatio,
                                        distEW / distNS),
                               1.0);
    
    // Create a LookAt using the experimentally derived distance formula.
    var alpha = (45.0 / (aspectRatio + 0.4) - 2.0).toRadians();
    var expandToDistance = Math.max(distNS, distEW);
    var beta = Math.min((90).toRadians(),
                        alpha + expandToDistance / (2 * geo.math.EARTH_RADIUS));
    
    lookAtRange = options.scaleRange * geo.math.EARTH_RADIUS *
        (Math.sin(beta) *
         Math.sqrt(1 + 1 / Math.pow(Math.tan(alpha), 2))
         - 1);
  }
  
  return this.dom.buildLookAt(
      new geo.Point(center.lat(), center.lng(),
                    bounds.top(), bounds.northEastTop().altitudeMode()),
      { range: lookAtRange });
};
// TODO: unit tests

/**
 * Creates a bounds view and sets it as the Earth plugin's view. This function
 * takes the same parameters as GEarthExtensions#view.createBoundsView.
 */
GEarthExtensions.prototype.view.setToBoundsView = function() {
  this.pluginInstance.getView().setAbstractView(
      this.view.createBoundsView.apply(this, arguments));
};