var util = require('util');

var qt = require('./');


// create the basic window example with the improved event binding and accessors
function createApp(name){
  var app = new qt.App(name);
  var window = app.main;
  var mousePos;
  var appPos;

  window.on('paint', function(event){
    var p = new qt.Painter;
    p.begin(event.target);
    if (mousePos) p.drawText(20, 30, util.inspect(mousePos));
    if (appPos) p.drawText(20, 60, util.inspect(appPos));
    p.end();
  });

  window.on('mousemove', function(event){
    mousePos = { x: event.x, y: event.y };
    event.target.update();
  });

  window.on('move', function(event){
    appPos = event.pos;
    event.target.update();
  });

  window.on('mouseup', function(event){
    if (event.button === 2) app.stop();
  });

  window.on('*', function(event){
    if (event.type !== 'mousemove' && event.type !== 'paint') {
      createApp.log(event);
    }
  });

  return app;
}

createApp.log = function(e){
  console.log(util.inspect(e, false, 4, true));
};

module.exports = createApp;

if (module === process.mainModule) {
  var app = createApp();
  app.start();
}