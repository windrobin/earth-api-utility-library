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
