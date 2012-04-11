var util = require('util');

var qt = require('./');


function log(e){
  console.log(util.inspect(e, false, 4, true));
}

// create the basic window example with the improved event binding and accessors
function createApp(){
  var app = new qt.App('Test');
  var window = app.main;
  var mousePos;
  var appPos;

  // open window on startup
  app.on('startup', function(event){ window.show() });
  // close window on shutdown
  app.on('shutdown', function(event){ window.close() });

  window.on('paint', function(event){
    var p = new qt.Painter;
    p.begin(event.target);
    if (mousePos) {
      p.drawText(20, 30, util.inspect(mousePos));
    }
    if (appPos) {
      p.drawText(20, 60, util.inspect(appPos));
    }
    p.end();
  });

  window.on('mousemove', function(event){
    mousePos = { x: event.x, y: event.y };
    event.target.update();
  });

  window.on('move', function(event){
    appPos = event;
    event.target.update();
  });

  window.on('mousedown', function(event){
    if (event.button === 2) app.stop();
  });

  window.on('mouseup mousedown mouseenter mouseleave keydown keyup close resize', log);


  return app;
}

var application = createApp();

application.start();

