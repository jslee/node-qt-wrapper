var util = require('util');

var qt = require('./');

// create the basic window example with the improved event binding and accessors
function createApp(){
  var app = new qt.App('Test');
  var window = app.main;
  var position;

  // open window on startup
  app.on('startup', function(){ window.show() });
  // close window on shutdown
  app.on('shutdown', function(){ window.close() });

  window.on('paint', function(){
    var p = new qt.Painter;
    p.begin(this);
    if (position) {
      p.drawText(20, 30, util.inspect(position));
    }
    p.end();
  });

  window.on('mousedown', function(event){
    // right click to exit
    if (event.button === 'RightButton') app.stop();
    console.log('mousedown', event);
  });

  window.on('mouseup', function(event){
    console.log('mouseup', event);
  });

  window.on('keydown', function(event){
    console.log('keydown', event);
  });
  window.on('keyup', function(event){
    console.log('keyup', event);
  });

  window.on('mousemove', function(event){
    position = event;
    this.update();
  });

  window.on('mouseenter', function(event){
    console.log('mouseenter', event);
  });

  window.on('mouseleave', function(event){
    console.log('mouseleave', event);
  });

  window.on('close', function(event){
    app.stop();
    console.log('close', event);
  });

  window.on('resize', function(event){
    console.log('resize', event);
  });

  return app;
}

var application = createApp();

application.start();

