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
/**
 * @class The root class/namespace hybrid for the Earth API extensions library.
 * This class groups functionality into namespaces such as
 * {@link GEarthExtensions#dom } and {@link GEarthExtensions#fx }.
 * @param {GEPlugin} pluginInstance The Google Earth Plugin instance to
 *     associate this GEarthExtensions instance with.
 * @example
 * var gex = new GEarthExtensions(ge); // ge is an instance of GEPlugin
 * gex.dom.clearFeatures(); // gex is an instance of a class, and gex.dom
 *                          // is effectively a namespace grouping
 *                          // functionality
 */
var GEarthExtensions = function(pluginInstance) {
  // create class
  var me = this;
  this.pluginInstance = pluginInstance;
  
  // bind all functions in namespaces to this GEarthExtensions instance
  /** @private */
  function bindFunction_(fn_) {
    return function() {
      return fn_.apply(me, arguments);
    };
  }

  /** @private */
  function bindNamespaceMembers_(nsParent) {
    for (var mstr in nsParent) {
      var member = nsParent[mstr];
      
      // bind this namespace's functions to the GEarthExtensions object
      if (geo.util.isFunction(member)) {
        if (member.isclass_) {
          // if it's a class constructor, give it access to this
          // GEarthExtensions instance
          member.extInstance_ = me;
        } else {
          // function's not a constructor, just bind it to this
          // GEarthExtensions instance
          nsParent[mstr] = bindFunction_(member);
        }
      }
      
      // duplicate sub-namespace objects (required for multiple instances to
      // work) and bind functions of all sub-namespaces
      if (isExtensionsNamespace_(member)) {
        var nsDuplicate = {};
        for (var subMstr in member)
          nsDuplicate[subMstr] = member[subMstr];
        
        bindNamespaceMembers_(nsDuplicate);
        
        nsParent[mstr] = nsDuplicate;
      }
    }
  }
  
  bindNamespaceMembers_(this);
};