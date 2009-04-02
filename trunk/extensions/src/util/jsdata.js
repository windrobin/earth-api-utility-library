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
  // NOTE: this is shared across all GEarthExtensions instances
  // dictionary mapping objects's jstag (uuid) to an object literal
  // { object: <object>, data: <object's js data dictionary> }
  var jsData_ = {};

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
  * @private
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
      s[i] = itoh.charAt(s[i]);
    }

    // Insert '-'s
    s[8] = s[13] = s[18] = s[23] = '-';

    return s.join('');
  }

  /**
   * @private
   */
  function getJsTag_(object) {
    // TODO: use unique id from Earth API
    for (var tag in jsData_) {
      if (jsData_[tag].object.equals(object))
        return tag;
    }

    return null;
  }

  /**
   * Returns whether or not the KmlObject has any JS-side data.
   * @param {KmlObject} object The plugin object to inquire about.
   * @public
   */
  GEarthExtensions.prototype.util.hasJsData = function(object) {
    return getJsTag_(object) ? true : false;
  };

  /**
   * Clears all JS-side data for the given KmlObject.
   * @param {KmlObject} object The plugin object to clear data on.
   */
  GEarthExtensions.prototype.util.clearAllJsData = function(object) {
    var jsTag = getJsTag_(object);
    if (jsTag) {
      delete jsData_[jsTag];
    }
  };

  /**
   * Gets the JS-side data for the given KmlObject associated with the given
   * key.
   * @param {KmlObject} object The plugin object to get data for.
   * @param {String} key The JSData key to request.
   * @public
   */
  GEarthExtensions.prototype.util.getJsDataValue = function(object, key) {
    var jsTag = getJsTag_(object);
    if (jsTag && key in jsData_[jsTag].data) {
      return jsData_[jsTag].data[key];
    }

    // TODO: null or undefined?
    return undefined;
  };

  /**
   * Sets the JS-side data for the given KmlObject associated with the given
   * key to the passed in value.
   * @param {KmlObject} object The object to get data for.
   * @public
   */
  GEarthExtensions.prototype.util.setJsDataValue =
  function(object, key, value) {
    var jsTag = getJsTag_(object);
    if (!jsTag) {
      // no current data dictionary, create a jstag for this object
      jsTag = null;
      while (!jsTag || jsTag in jsData_) {
        jsTag = randomUUID();
      }

      // create an empty data dict
      jsData_[jsTag] = { object: object, data: {} };
    }

    // set the data
    jsData_[jsTag].data[key] = value;
  };

  /**
   * Clears the JS-side data for the given KmlObject associated with the given
   * key.
   * @param {KmlObject} object The plugin object to clear data on.
   * @param {String} key The data key whose value should be cleared.
   */
  GEarthExtensions.prototype.util.clearJsDataValue = function(object, key) {
    var jsTag = getJsTag_(object);
    if (jsTag &&
        key in jsData_[jsTag].data) {
      delete jsData_[jsTag].data[key];

      // check if the data dict is empty... if so, cleanly remove it
      for (var k in jsData_[jsTag].data) {
        return; // not empty
      }

      // data dict is empty
      this.util.clearAllJsData(object);
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
    // DEPRECATED: snippets are no longer used for jsdata tag storage
    //assertEquals('', pm1.getSnippet());
    //assertEquals('foo bar', pm2.getSnippet());

    // tear down
    testext_.dom.removeObject(pm1);
    testext_.dom.removeObject(pm2);
  }
  /***IGNORE_END***/
}());