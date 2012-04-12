var util = require('util');

var qt = require('./');


// create the basic window example with the improved event binding and accessors
function createApp(name, url){
  var app = new qt.App(name);
  var window = app.main;
  var mousePos;
  var appPos;
  var dragDiff;

  app.on('start', function(event){
    var webview = new qt.WebView(window);
    webview.load(new qt.URL(url));
    webview.show();
  });

  // window.on('paint', function(event){
  //   var p = new qt.Painter;
  //   p.begin(event.target);
  //   if (mousePos) p.drawText(20, 30, util.inspect(mousePos));
  //   if (appPos) p.drawText(20, 60, util.inspect(appPos));
  //   if (dragDiff) p.drawText(20, 90, util.inspect(dragDiff));
  //   p.end();
  // });

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

  // window.on('*', function(event){
  //   if (event.type !== 'mousemove' && event.type !== 'paint') {
  //     createApp.log(event);
  //   }
  // });

  window.on('mousedown', function(event){
    if (event.button !== 1) return;
    var offset = { x: window.x - event.globalX, y: window.y - event.globalY };
    function drag(event){
      window.move(event.globalX + offset.x, event.globalY + offset.y);
    }
    window.on('mousemove', drag);
    window.once('mouseup', function(){
      window.off('mousemove', drag);
    });
    event.accept();
  });


  return app;
}


createApp.log = function(e){
  console.log(util.inspect(e, false, 4, true));
};

module.exports = createApp;

if (module === process.mainModule) {
  var app = createApp('Test', 'http://www.google.com');
  app.start();
}