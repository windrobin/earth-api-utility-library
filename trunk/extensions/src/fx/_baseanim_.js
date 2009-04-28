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
 * Returns the singleton animation manager for the plugin instance.
 * @private
 */
GEarthExtensions.prototype.fx.getAnimationManager_ = function() {
  if (!this.animationManager_) {
    this.animationManager_ = new this.fx.AnimationManager_(this);
  }
  
  return this.animationManager_;
};

/**
 * Private singleton class for managing GEarthExtensions#fx animations in a
 * plugin instance.
 * @private
 */
GEarthExtensions.prototype.fx.AnimationManager_ = GEarthExtensions.createClass_(
function(extInstance) {
  this.extInstance = extInstance;
  this.animations_ = [];

  this.running_ = false;
  this.globalTime_ = 0.0;
});

/**
 * Start an animation (deriving from GEarthExtensions#fx.Animation).
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.startAnimation =
function(anim) {
  this.animations_.push({
    obj: anim,
    startGlobalTime: this.globalTime_
  });
  
  this.start_();
};

/**
 * Stop an animation (deriving from GEarthExtensions#fx.Animation).
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.stopAnimation =
function(anim) {
  for (var i = 0; i < this.animations_.length; i++) {
    if (this.animations_[i].obj == anim) {
      // remove the animation from the array
      this.animations_.splice(i, 1);
      return;
    }
  }
};

/**
 * Private, internal function to start animating
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.start_ = function() {
  if (this.running_) {
    return;
  }
  
  this.startTimeStamp_ = Number(new Date());
  this.tick_();
  
  for (var i = 0; i < this.animations_.length; i++) {
    this.animations_[i].obj.renderFrame(0);
  }
  
  var me = this;
  this.frameendListener_ = function(){ me.tick_(); };
  this.tickInterval_ = window.setInterval(this.frameendListener_, 100);
  google.earth.addEventListener(this.extInstance.pluginInstance,
      'frameend', this.frameendListener_);
  this.running_ = true;
};

/**
 * Private, internal function to stop animating
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.stop_ = function() {
  if (!this.running_) {
    return;
  }
  
  google.earth.removeEventListener(this.extInstance.pluginInstance,
      'frameend', this.frameendListener_);
  this.frameendListener_ = null;
  window.clearInterval(this.tickInterval_);
  this.tickInterval_ = null;
  this.running_ = false;
  this.globalTime_ = 0.0;
};

/**
 * Internal tick handler (frameend)
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.tick_ = function() {
  if (!this.running_) {
    return;
  }
  
  this.globalTime_ = Number(new Date()) - this.startTimeStamp_;
  this.renderCurrentFrame_();
};

/**
 * Private function to render current animation frame state (by calling
 * registered Animations' individual frame renderers.
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.renderCurrentFrame_ =
function() {
  for (var i = this.animations_.length - 1; i >= 0; i--) {
    var animation = this.animations_[i];
    animation.obj.renderFrame(this.globalTime_ - animation.startGlobalTime);
  }
  
  if (this.animations_.length === 0) {
    this.stop_();
  }
};

/**
 * Abstract base class for GEarthExtensions#fx animations
 * @class
 */
GEarthExtensions.prototype.fx.Animation =
GEarthExtensions.createClass_(function(renderFn, completionFn) {
  this.extInstance = arguments.callee.extInstance_;
  this.renderFn = renderFn;
  this.completionFn = completionFn; // optional
});

/**
 * Start the animation.
 */
GEarthExtensions.prototype.fx.Animation.prototype.start = function() {
  this.extInstance.fx.getAnimationManager_().startAnimation(this);
};

/**
 * Stop the animation.
 */
GEarthExtensions.prototype.fx.Animation.prototype.stop = function(completed) {
  this.extInstance.fx.getAnimationManager_().stopAnimation(this);
  
  if (this.completionFn && (completed || geo.util.isUndefined(completed))) {
    this.completionFn.call(this); // clean exit
  }
};

/**
 * Stop and rewind the animation, without calling the 
 */
GEarthExtensions.prototype.fx.Animation.prototype.rewind = function() {
  this.renderFrame(0);
  this.stop(false);
};

/**
 * Render the frame at time t after the animation was started.
 * @param {Number} t The time in seconds of the frame to render.
 * @abstract
 */
GEarthExtensions.prototype.fx.Animation.prototype.renderFrame = function(t) {
  this.renderFn.call(this, t);
};

/**
 * Generic class for fixed-duration animations.
 * @class
 * @extends Animation
 */
GEarthExtensions.prototype.fx.TimedAnimation =
GEarthExtensions.createClass_(
  [GEarthExtensions.prototype.fx.Animation],
function(duration, renderFn, completionFn) {
  this.extInstance = arguments.callee.extInstance_;
  this.duration = duration;
  this.renderFn = renderFn;
  this.completionFn = completionFn; // optional
});

GEarthExtensions.prototype.fx.TimedAnimation.prototype.renderFrame =
function(t) {
  if (t > this.duration) {
    this.renderFn.call(this, this.duration);
    this.stop();
    return;
  }
  
  this.renderFn.call(this, t);
};
