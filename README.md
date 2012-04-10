# Testing node-qt

This isn't exactly a real project and lib currently but it's got some useful stuff in it anyway. So far the main focus has been in translating the provided interfaces to something easier to use and more closelt following JS semantics.

* Event handling is managed by a few interfaces behind the scenes but results in a familiar node-like emitter.on('event', callback) interface, emitter.emit('event') for custom emissions, and QT events routed into this

* Interface wrappers that expose accessors for the the properties instead of functions. Getters and setters are provided where possible. Actual methods are copied to the wrapper interface so there's no need to use the QT bindings directly.

* Object resolution where possible, such as resolving Event objects to their values. (mouseEvent with function x, y, and button are resolved and mapped to enums where appropriate)


```javascript
function createApp(){
  var app = new App('Test');
  var window = app.main;
  var position;

  // open window on startup
  app.on('startup', function(){ window.show() });
  // close window on shutdown
  app.on('shutdown', function(){ window.close() });

  window.on('paint', function(){
    var painter = new Painter;
    painter.begin(this);
    if (position) {
      painter.drawText(20, 30, util.inspect(position));
    }
    painter.end();
  });

  window.on('mousedown', function(event){
    // right click to exit
    if (event.button === 'RightButton') app.stop();
    console.log('mousedown', event);
  });

  window.on('mouseup', function(event){
    console.log('mouseup', event);
  });

  window.on('mousemove', function(event){
    position = event;
    this.update();
  });

  return app;
}

var application = createApp();

application.start();
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