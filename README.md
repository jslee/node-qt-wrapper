# Testing node-qt

This isn't exactly a real project and lib currently but it's got some useful stuff in it anyway. So far the main focus has been in translating the provided interfaces to something easier to use and more closelt following JS semantics.

* Event handling is managed by a few interfaces behind the scenes but results in a familiar node-like emitter.on('event', callback) interface, emitter.emit('event') for custom emissions, and QT events routed into this

* Interface wrappers that expose accessors for the the properties instead of functions. Getters and setters are provided where possible. Actual methods are copied to the wrapper interface so there's no need to use the QT bindings directly.

* Object resolution where possible, such as resolving Event objects to their values. (mouseEvent with function x, y, and button are resolved and mapped to enums where appropriate)


```javascript

function init(){
  var win = new Window;

  win.on('paint', function(){
    var p = new qt.Painter;
    p.begin(this);
    p.drawText(20, 30, '[ '+[win.top-0, win.left - 0 + win.width, win.top - 0 + win.height, win.left - 0].join(', ')+' ]');
    p.end();
  });

  win.on('mousePress', function(e){
    console.log(require('util').inspect(e, true, 4));
  });

  win.size = [500, 500];
  win.show();
  return win;
}

```