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
 * Loads and shows the given KML URL in the Google Earth Plugin instance.
 * @param {String} url The URL of the KML content to show.
 * @param {Object} [options] KML display options.
 * @param {Boolean} [options.cacheBuster] Enforce freshly downloading the KML
 *     by introducing a cache-busting query parameter.
 * @param {Boolean} [options.flyToView] Fly to the document-level abstract view
 *     in the loaded KML after loading it. If no explicit view is available,
 *     a default bounds view will be calculated and used unless
 *     options.flyToBoundsFallback is false.
 *     See GEarthExtensions#util.flyToObject for more information.
 * @param {Boolean} [options.flyToBoundsFallback] If options.flyToView is true
 *     and no document-level abstract view is explicitly defined, do not
 *     calculate and fly to a bounds view.
 */
GEarthExtensions.prototype.util.displayKml = function(url, options) {
  options = checkParameters_(options, false, {
    cacheBuster: false,
    flyToView: false,
    flyToBoundsFallback: true,
    aspectRatio: 1.0
  });
  
  if (options.cacheBuster) {
    url += (url.match(/\?/) ? '&' : '?') + '_cacheBuster=' +
        Number(new Date()).toString();
  }

  // TODO: option to choose network link or fetchKml
  var me = this;
  google.earth.fetchKml(me.pluginInstance, url, function(kmlObject) {
    if (kmlObject) {
      me.pluginInstance.getFeatures().appendChild(kmlObject);
      
      if (options.flyToView) {
        me.util.flyToObject(kmlObject, {
          boundsFallback: options.flyToBoundsFallback,
          aspectRatio: options.aspectRatio
        });
      }
    }
  });
};

/**
 * Loads and shows the given KML string in the Google Earth Plugin instance.
 * @param {String} str The KML string to show.
 * @param {Object} [options] KML display options.
 * @param {Boolean} [options.flyToView] Fly to the document-level abstract view
 *     in the parsed KML. If no explicit view is available,
 *     a default bounds view will be calculated and used unless
 *     options.flyToBoundsFallback is false.
 *     See GEarthExtensions#util.flyToObject for more information.
 * @param {Boolean} [options.flyToBoundsFallback] If options.flyToView is true
 *     and no document-level abstract view is explicitly defined, do not
 *     calculate and fly to a bounds view.
 * @return Returns the parsed object on success, or null if there was an error.
 */
GEarthExtensions.prototype.util.displayKmlString = function(str, options) {
  options = checkParameters_(options, false, {
    flyToView: false,
    flyToBoundsFallback: true,
    aspectRatio: 1.0
  });
  
  var kmlObject = this.pluginInstance.parseKml(str);
  if (kmlObject) {
    this.pluginInstance.getFeatures().appendChild(kmlObject);
    
    if (options.flyToView) {
      this.util.flyToObject(kmlObject, {
        boundsFallback: options.flyToBoundsFallback,
        aspectRatio: options.aspectRatio
      });
    }
  }
  
  return kmlObject;
};
//#BEGIN_TEST
function test_util_displayKml(successCallback, errorCallback) {
  // Step 1.
  testext_.dom.clearFeatures();
  testext_.util.displayKml('http://earth-api-samples.googlecode.com/' +
                           'svn/trunk/examples/static/red.kml',
                           {flyToView: true});
  testhelpers_.confirm('After the flyto, do you see 3 red placemarks?',
  function() {
    // Step 2.
    testplugin_.getLayerRoot().enableLayerById(
        testplugin_.LAYER_BUILDINGS, true);
    testext_.util.displayKml('http://kml-samples.googlecode.com/' +
                             'svn/trunk/kml/Camera/golden-gate.kml',
                             {flyToView: true});
    testhelpers_.confirm('After the flyto, do you see the Golden Gate bridge?',
    function() {
      testplugin_.getLayerRoot().enableLayerById(
          testplugin_.LAYER_BUILDINGS, false);
      
      // Step 3.
      testext_.dom.clearFeatures();
      testext_.util.displayKmlString(
          ['<?xml version="1.0" encoding="UTF-8"?>',
           '<kml xmlns="http://earth.google.com/kml/2.2">',
           '<Document><Placemark><Point>',
           '<coordinates>-122.0018218053078,37.00612121450768,0</coordinates>',
           '</Point></Placemark><Placemark><Point>',
           '<coordinates>-121.9924312125212,37.00025095270595,0</coordinates>',
           '</Point></Placemark><Placemark><Point>',
           '<coordinates>-122.0067679196375,36.99783505460958,0</coordinates>',
           '</Point></Placemark></Document></kml>'
          ].join(''), {flyToView: true});
      testhelpers_.confirm('After the flyto, do you see 3 plain placemarks?',
      successCallback, errorCallback);
    }, errorCallback);
  }, errorCallback);
}
test_util_displayKml.interactive = true;
//#END_TEST