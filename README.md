# Testing node-qt

This isn't exactly a real project and lib currently but it's got some useful stuff in it anyway. So far the main focus has been in translating the provided interfaces to something easier to use and more closelt following JS semantics.

* Event handling is managed by a few interfaces behind the scenes but results in a familiar node-like emitter.on('event', callback) interface, emitter.emit('event') for custom emissions, and QT events routed into this

* Interface wrappers that expose accessors for the the properties instead of functions. Getters and setters are provided where possible. Actual methods are copied to the wrapper interface so there's no need to use the QT bindings directly.

* Object resolution where possible, such as resolving Event objects to their values. (mouseEvent with function x, y, and button are resolved and mapped to enums where appropriate)


```javascript
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


var myApp = createApp('MyApp');
myApp.start();
```

### Valid Constructor Forms References

```javascript
function PainterPath(){}
function Painter(){}

function Sound(filename){}
function Image(){}
function Image(filename){}
function Font(){}
function Font(family,points,weight,italic){}

function Brush(color){}
function Matrix(){}
function Matrix(m11,m12,m21,m22,dx,dy){}
function PointF(x,y){}
function ScrollArea(){}
function ScrollArea(QWidget){}
function Widget(){}
function Widget(QWidget){}

function Color(hex){}
function Color(r,g,b,a){}

function Size(size){}
function Pixmap(w,h){}
function Pen(){}
function Pen(QColor){}
function Pen(brush, width, penStyle, penCapStyle, penJoinStyle){}
```