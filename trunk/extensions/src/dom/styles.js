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
 * Creates a new style with the given parameters.
 * @function
 * @param {Object} options The style parameters.

 * @param {String|Object} [options.icon] The icon href or an icon
 *     object literal.
 * @param {String} [options.icon.href] The icon href.
 * @param {Number} [options.icon.scale] The icon scaling factor.
 * @param {ColorSpec} [options.icon.color] The color of the icon.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the icon,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @param {ColorSpec|Object} [options.label] The label color or a label
 *     object literal.
 * @param {Number} [options.label.scale] The label scaling factor.
 * @param {ColorSpec} [options.label.color] The color of the label.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the label,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @param {ColorSpec|Object} [options.line] The line color or a line
 *     object literal.
 * @param {Number} [options.line.width] The line width.
 * @param {ColorSpec} [options.line.color] The line color.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the line,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @param {ColorSpec|Object} [options.poly] The polygon color or a polygon style
 *     object literal.
 * @param {Boolean} [options.poly.fill] Whether or not the polygon will be
 *     filled.
 * @param {Boolean} [options.poly.outline] Whether or not the polygon will have
 *     an outline.
 * @param {ColorSpec} [options.poly.color] The color of the polygon fill.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the polygon,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @type KmlStyle
 */
GEarthExtensions.prototype.dom.buildStyle = GEarthExtensions.domBuilder_({
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
    var pad2 = function(s) {
      return ((s.length < 2) ? '0' : '') + s;
    };
    
    var me = this;
    
    var mergeColorOpacity = function(color, opacity) {
      color = color ? me.util.parseColor(color) : 'ffffffff';
      if (!geo.util.isUndefined(opacity)) {
        color = pad2(Math.floor(255 * opacity).toString(16)) +
            color.substring(2);
      }
      
      return color;
    };
    
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
        icon.setHref('http://maps.google.com/mapfiles/kml/' +
            options.icon.stockIcon + '.png');
      } else {
        // use default icon href
        icon.setHref('http://maps.google.com/mapfiles/kml/' +
            'paddle/wht-blank.png');
        iconStyle.getHotSpot().set(0.5, this.pluginInstance.UNITS_FRACTION,
            0, this.pluginInstance.UNITS_FRACTION);
      }
      if ('scale' in options.icon) {
        iconStyle.setScale(options.icon.scale);
      }
      if ('heading' in options.icon) {
        iconStyle.setHeading(options.icon.heading);
      }
      if ('color' in options.icon || 'opacity' in options.icon) {
        options.icon.color = mergeColorOpacity(options.icon.color,
                                               options.icon.opacity);
        iconStyle.getColor().set(options.icon.color);
      }
      if ('opacity' in options.icon) {
        if (!('color' in options.icon)) {
          options.icon.color = 'ffffffff';
        }
        
        options.icon.color = pad2(options.icon.opacity.toString(16)) +
            options.icon.color.substring(2);
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
      if ('color' in options.label || 'opacity' in options.label) {
        options.label.color = mergeColorOpacity(options.label.color,
                                                options.label.opacity);
        labelStyle.getColor().set(options.label.color);
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
      if ('color' in options.line || 'opacity' in options.line) {
        options.line.color = mergeColorOpacity(options.line.color,
                                               options.line.opacity);
        lineStyle.getColor().set(options.line.color);
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
      if ('color' in options.poly || 'opacity' in options.poly) {
        options.poly.color = mergeColorOpacity(options.poly.color,
                                               options.poly.opacity);
        polyStyle.getColor().set(options.poly.color);
      }
      // TODO: add colormode
    }
  }
});
// TODO: unit tests
