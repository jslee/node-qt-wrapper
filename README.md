# Testing node-qt

This isn't exactly a real project and lib currently but it's got some useful stuff in it anyway. So far the main focus has been in translating the provided interfaces to something easier to use and more closelt following JS semantics.

* Event handling is managed by a few interfaces behind the scenes but results in a familiar node-like emitter.on('event', callback) interface, emitter.emit('event') for custom emissions, and QT events routed into this

* Interface wrappers that expose accessors for the the properties instead of functions. Getters and setters are provided where possible. Actual methods are copied to the wrapper interface so there's no need to use the QT bindings directly.

* Object resolution where possible, such as resolving Event objects to their values. (mouseEvent with function x, y, and button are resolved and mapped to enums where appropriate)


```javascript
function createApp(){
  var app = new App('Test');
  var win = app.main;
  var position;

  // open window on startup
  app.on('startup', function(){ win.show() });
  // close window on shutdown
  app.on('shutdown', function(){ win.close() });

  win.on('paint', function(){
    var p = new Painter;
    p.begin(this);
    if (position) {
      p.drawText(20, 30, util.inspect(position));
    }
    p.end();
  });

  win.on('mousedown', function(event){
    // right click to exit
    if (event.button === 'RightButton') app.stop();
    console.log('mousedown', event);
  });

  win.on('mouseup', function(event){
    console.log('mouseup', event);
  });

  win.on('mousemove', function(event){
    position = event;
    this.update();
  });

  return app;
}

var application = createApp();

application.start();
```