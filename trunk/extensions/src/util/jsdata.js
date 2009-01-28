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
  
  /***IGNORE_BEGIN***/
  function test_util_JsData() {
    var pm1 = testext_.dom.addPointPlacemark([0, 0], { name: 'Test PM 1' });
    var pm2 = testext_.dom.addPointPlacemark([0, 1], { name: 'Test PM 2' });
    
    pm2.setSnippet('foo bar');
    
    // set the values
    testext_.util.setJsDataValue(pm1, 'a', 1);
    testext_.util.setJsDataValue(pm1, 'b', 2);
    testext_.util.setJsDataValue(pm2, 'a', 3);
    testext_.util.setJsDataValue(pm2, 'b', 4);
    
    // check the values
    assertEquals(1, testext_.util.getJsDataValue(pm1, 'a'));
    assertEquals(2, testext_.util.getJsDataValue(pm1, 'b'));
    assertEquals(3, testext_.util.getJsDataValue(pm2, 'a'));
    assertEquals(4, testext_.util.getJsDataValue(pm2, 'b'));
    
    // clear the values
    testext_.util.clearJsDataValue(pm1, 'a');
    testext_.util.clearJsDataValue(pm1, 'b');
    testext_.util.clearJsDataValue(pm2, 'a');
    testext_.util.clearJsDataValue(pm2, 'b');
    
    // make sure they were cleared
    assertUndefined(testext_.util.getJsDataValue(pm1, 'a'));
    assertUndefined(testext_.util.getJsDataValue(pm1, 'b'));
    assertUndefined(testext_.util.getJsDataValue(pm2, 'a'));
    assertUndefined(testext_.util.getJsDataValue(pm2, 'b'));
    
    // assert there are no values left
    assertFalse(testext_.util.hasJsData(pm1));
    assertFalse(testext_.util.hasJsData(pm2));
    
    // assert the snippets are back to normal
    assertEquals('', pm1.getSnippet());
    assertEquals('foo bar', pm2.getSnippet());
    
    // tear down
    testext_.dom.removeObject(pm1);
    testext_.dom.removeObject(pm2);
  }
  /***IGNORE_END***/
}());