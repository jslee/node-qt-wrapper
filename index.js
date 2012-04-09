var util = require('util');

var Window = require('./interfaces').Window;
var App = require('./interfaces').App;
var Painter = require('node-qt').QPainter;


// create the basic window example with the improved event binding and accessors
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



// not even using these decls, just keeping it handy for now
//var qt = module.exports = function(qt){
//  return { Brush: qt.QBrush, Color: qt.QColor, Font: qt.QFont, Image: qt.QImage, KeyEvent: qt.QKeyEvent,
//           Matrix: qt.QMatrix, MouseEvent: qt.QMouseEvent, Painter: qt.QPainter, PainterPath: qt.QPainterPath,
//           Pen: qt.QPen, Pixmap: qt.QPixmap, PointF: qt.QPointF, ScrollArea: qt.QScrollArea,
//           ScrollBar: qt.QScrollBar, Size: qt.QSize, Sound: qt.QSound, Widget: qt.QWidget };
//}(require('node-qt'));
