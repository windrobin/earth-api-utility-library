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
 * @class The root class/namespace hybrid for the Earth API extensions library.
 * This class groups functionality into namespaces such as
 * {@link GEarthExtensions#dom } and {@link GEarthExtensions#fx }.
 * @example
 * var gex = new GEarthExtensions(ge); // ge is an instance of GEPlugin
 * gex.dom.clearFeatures(); // gex is an instance of a class, and gex.dom
 *                          // is effectively a namespace grouping
 *                          // functionality
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

  /** @private */
  function bindNamespaceMembers(nsParent, context) {
    for (var mstr in nsParent) {
      var member = nsParent[mstr];
      
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