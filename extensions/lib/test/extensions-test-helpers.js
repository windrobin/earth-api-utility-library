window.testhelpers_ = {};

////////////////////////////////////////////////////////////////////////////////
// Interactive UI

testhelpers_.clearPrompt = function() {
  $('#testprompt-text').html('');
  $('#testprompt-buttons').html('');
  $('#testprompt').css('background-color', '');
};

testhelpers_.makePrompt = function(promptHTML, buttons) {
  testhelpers_.clearPrompt();
  
  $('#testprompt-text').html(promptHTML);
  
  for (var i = 0; i < buttons.length; i++) {
    var button = document.createElement('input');
    button.type = 'button';
    button.value = buttons[i][0];
    $('#testprompt-buttons').append(button);
    $(button).click(buttons[i][1]);
  }
  
  // flash the prompt (requires jQuery UI)
  $('#testprompt').stop(); // stop all other effects
  $('#testprompt').css({ backgroundColor: 'blue' });
  $('#testprompt').animate({ backgroundColor: '#ccccff' }, 'slow');
};

testhelpers_.alert = function(alertHTML) {
  testhelpers_.makePrompt(alertHTML, [
    ['Close', function(){ testhelpers_.clearPrompt(); }]
  ]);
};

testhelpers_.confirm = function(promptHTML, successCallback, failureCallback) {
  testhelpers_.makePrompt(promptHTML, [
    ['Yes', function() {
              testhelpers_.clearPrompt();
              successCallback();
            }],
    ['No',  function() {
              testhelpers_.clearPrompt();
              failureCallback({ message: 'User confirmation failed.' });
            }]
  ]);
};

////////////////////////////////////////////////////////////////////////////////
// Other Interactive Test Shortcuts

testhelpers_.setViewAndContinue = function(view, continuation) {
  var viewchangeendHandler;
  viewchangeendHandler = function() {
    google.earth.removeEventListener(testplugin_.getView(),
        'viewchangeend', viewchangeendHandler);
    continuation();
  };

  google.earth.addEventListener(testplugin_.getView(), 'viewchangeend',
      viewchangeendHandler);
  testplugin_.getView().setAbstractView(view);
}