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