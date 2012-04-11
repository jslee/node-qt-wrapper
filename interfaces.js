var qt = require('node-qt');
var Emitter = require('./events');
var reverse = require('./utility').reverse;
var globalColor = reverse(qt.GlobalColor);

function mixin(to, from){
  Object.keys(from).forEach(function(key){
    to[key] = from[key];
  })
}

var bindbind = Function.bind.bind(Function.bind);
var callbind = bindbind(Function.call);
var applybind = bindbind(Function.apply);
var bind = callbind(Function.bind);
var call = callbind(Function.call);
var apply = callbind(Function.apply);
var concat = callbind([].concat, []);
var slice = callbind([].slice);

function make(self, ctor, superctor, args){
  //if (!(self instanceof superctor)) {
    if (args) {
      superctor = apply(Function.bind, superctor, concat(null, args));
    }
    self = new superctor;
    self.__proto__ = ctor.prototype;
  //}
  return self;
}

// ##########################################################
// ### Create an interface wrapper closer to JS semantics ###
// ##########################################################

function createInterface(opts){
  var ctor = opts.ctor;
  var lib = opts.lib;
  ctor.prototype = Object.create(Emitter.prototype);
  ctor.prototype.constructor = ctor;

  opts.accessors && defineAccessors(ctor.prototype, opts.accessors);
  opts.methods && defineMethods(ctor.prototype, opts.methods);

  return function(){
    var inst = Object.create(ctor.prototype);
    ctor.apply(inst, arguments);
    inst.type = ctor.name;
    return inst;
  };
}

// copy over reamining methods so everything is available on the wrapper
function defineMethods(obj, methods){
  methods.forEach(function(name){
    obj[name] = function(){
      return this._lib[name].apply(this._lib, arguments);
    }
  });
}

// maps the existing functions to getter/setter where possible
function defineAccessors(obj, props){
  Object.keys(props).forEach(function(name){
    var desc = { configurable: true, enumerable: true };
    var p = props[name];

    if (typeof p.get === 'function')
      desc.get = p.get
    if (typeof p.set === 'function')
      desc.set = p.set

    if (typeof p.get === 'string')
      desc.get = function(){ return this._lib[p.get]() }
    if (typeof p.set === 'string')
      desc.set = function(v){ this._lib[p.set].apply(this._lib, Array.isArray(v) ? v : [v]) }


    Object.defineProperty(obj, name, desc);
  });
}




module.exports.App = App;
Emitter.castEmitter(qt.QApplication.prototype);

function App(name, main){
  var self = make(this, App, qt.QApplication);
  Emitter.call(self);
  self.name = name;
  self.main = main || new Window;
  return self;
}

var timers = new WeakMap;

App.prototype = {
  __proto__: qt.QApplication.prototype,
  start: function start(){
    if (timers.has(this)) return;
    timers.set(this, setInterval(this.processEvents.bind(this), 10));
    this.running = true;
    this.emit('start');
  },
  stop: function stop(){
    if (!timers.has(this)) return;
    clearInterval(timers.get(this));
    timers.delete(this);
    this.running = false;
    this.emit('stop');
  },
  exit: function exit(){
    if (!timers.has(this)) return;
    clearInterval(timers.get(this));
    timers.delete(this);
    qt.QApplication.prototype.exit.call(this);
    this.running = false;
    this.emit('exit');
    this.__proto__ = exited;
  }
};

var noop = function(){};
var exited = {
  __proto__: App.prototype,
  start: noop,
  stop: noop,
  exit: noop,
  exec: noop,
  processEvents: noop,
};




module.exports.Widget = qt.QWidget;
Emitter.castEmitter(qt.QWidget.prototype);

// ##################################################
// ### Window widget interface wrapper definition ###
// ##################################################

module.exports.Window = Window;

function Window(w, h){
  var self = make(this, Window, qt.QWidget);
  self.resize(w || 400, h || 400);
  Emitter.call(self);
  return self;
}

Window.prototype = {
  __proto__: qt.QWidget.prototype,
  constructor: Window
};



function ScrollArea(w,h){
  Object.defineProperty(this, '_lib', { value: new qt.QScrollArea });
}

module.exports.ScrollArea = createInterface({
  lib:       qt.QScrollArea,
  ctor:      ScrollArea,
  methods:   [ 'update', 'move', 'show', 'close', 'parent' ],
  accessors: {
    height:  { get: 'height', set: function(v){ this.size = [this.width, v]  } },
    width:   { get: 'width',  set: function(v){ this.size = [v, this.height] } },
    left:    { get: 'x',      set: function(v){ this._lib.move(v, this.top)  } },
    top:     { get: 'y',      set: function(v){ this._lib.move(this.left, v) } },
    size:    { get: 'size',      set: 'resize' },
    widget:  { get: 'widget',    set: 'setWidget' },
    name:    { get: 'objectName',set: 'setObjectName' },
    horizontal: { get: 'horizontalScrollBar', set: 'setHorizontalScrollBarPolicy' },
    vertical:   { get: 'verticalScrollBar',   set: 'setVerticalScrollBarPolicy' },
    shape: { set: 'setFrameShape' },
    focus: { set: 'setFocusPolicy' } }
});


// provided not constructed
function ScrollBar(scrollbar){
  Object.defineProperty(this, '_lib', { value: scrollbar });
}

module.exports.ScrollBar = createInterface({
  lib:       qt.QScrollBar,
  ctor:      ScrollBar,
  accessors: {
    value:   { get: 'value',  set: 'setValue'  } }
});


//rgba
//hex
//QColor
function Color(r,g,b,a){
  Object.defineProperty(this, '_lib', { value: new qt.QColor(r,g,b,a) });
}

module.exports.Color = createInterface({
  lib:       qt.QColor,
  ctor:      Color,
  accessors: {
    name:  { get: 'name',  set: 'name'  },
    red:   { get: 'red',   set: 'red'   },
    green: { get: 'green', set: 'green' },
    blue:  { get: 'blue',  set: 'blue'  },
    alpha: { get: 'alpha', set: 'alpha' } }
});

function Size(size){
  Object.defineProperty(this, '_lib', { value: size });
}

module.exports.Size = createInterface({
  lib:       qt.QSize,
  ctor:      Size,
  accessors: {
    width:  { get: 'width',  set: 'width'  },
    height: { get: 'height', set: 'height' } }
});


function Pixmap(w,h){
  Object.defineProperty(this, '_lib', { value: new qt.QPixmap(w,h) });
}

module.exports.Pixmap = createInterface({
  lib:       qt.QPixmap,
  ctor:      Pixmap,
  accessors: {
    width:  { get: 'width',  set: 'width'  },
    height: { get: 'height', set: 'height' } },
  methods: ['save', 'fill']
});


function Painter(){
  Object.defineProperty(this, '_lib', { value: new qt.QPainter });
}

module.exports.Painter = createInterface({
  lib:       qt.QPainter,
  ctor:      Painter,
  accessors: {
    isActive: { get: 'isActive' },
    matrix:   { set: 'matrix' },
    pen:      { set: 'pen' },
    font:     { set: 'font'  }  },
  methods: ['restore', 'save', 'begin', 'end', 'drawPixmap', 'drawImage', 'drawText', 'strokePath', 'fillRect']
});


function Pen(brush, width, penStyle, penCapStyle, penJoinStyle){
  Object.defineProperty(this, '_lib', { value: new qt.QPen(brush, width, penStyle, penCapStyle, penJoinStyle) });
}

module.exports.Pen = createInterface({
  lib:  qt.QPen,
  ctor: Pen
});


function Brush(color){
  if (color in globalColors) color = globalColors[color];
  Object.defineProperty(this, '_lib', { value: new qt.QBrush(color) });
}

module.exports.Brush = createInterface({
  lib:  qt.QBrush,
  ctor: Brush
});

function Sound(filename){
  Object.defineProperty(this, '_lib', { value: new qt.QSound(filename) });
}

module.exports.Sound = createInterface({
  lib:       qt.QSound,
  ctor:      Sound,
  accessors: {
    fileName: { set: 'fileName', get: 'fileName' },
    loops:    { set: 'loops'  }  },
  methods: ['play']
});


function Image(filename){
  Object.defineProperty(this, '_lib', { value: new qt.QImage(filename) });
}

module.exports.Image = createInterface({
  lib:  qt.QImage,
  ctor: Image,
  methods: ['isNull']
});

//QMatrix(QMatrix)
function Matrix(m11, m12, m21, m22, dx, dy){
  Object.defineProperty(this, '_lib', { value: new qt.QMatrix(m11, m12, m21, m22, dx, dy) });
}

module.exports.Matrix = createInterface({
  lib:  qt.QMatrix,
  ctor: Matrix,
  accessors: {
    m11: { set: 'm11', get: 'm11' },
    m12: { set: 'm12', get: 'm12' },
    m21: { set: 'm21', get: 'm21' },
    m22: { set: 'm22', get: 'm22' },
    dx: { set: 'dx', get: 'dx' },
    dy: { set: 'dy', get: 'dy' } },
  methods: ['translate', 'scale']
});


function PainterPath(a, b, c){
  Object.defineProperty(this, '_lib', { value: new qt.QPainterPath(a, b, c) });
}


//lineTo(QPointF())
module.exports.PainterPath = createInterface({
  lib:  qt.QPainterPath,
  ctor: PainterPath,
  methods: ['moveTo', 'lineTo', 'currentPosition', 'closeSubpath']
});


//QFont(string family, pointSize=-1, weight=-1, italic=false)
//QFont(QFont font)
function Font(family, pointSize, weight, italic){
  Object.defineProperty(this, '_lib', { value: new qt.QFont(family, pointSize, weight, italic) });
}

module.exports.Font = createInterface({
  lib:  qt.QFont,
  ctor: Font,
  accessors: {
    family: { get: 'family', set: 'setFamily' },
    pixelSize: { get: 'pixelSize', set: 'setPixelSize' },
    pointSize: { get: 'pointSize', set: 'setPointSize' },
    pointSizeF: { get: 'pointSizeF', set: 'setPointSizeF' } }
});



function PointF(x, y){
  Object.defineProperty(this, '_lib', { value: new qt.QPointF(x, y) });
}

module.exports.PointF = createInterface({
  lib:  qt.QPointF,
  ctor: PointF,
  accessors: {
    isNull: { set: 'isNull', get: 'isNull' },
    x: { set: 'x', get: 'x' },
    y: { set: 'y', get: 'y' },
    m22: { set: 'm22', get: 'm22' },
    dx: { set: 'dx', get: 'dx' },
    dy: { set: 'dy', get: 'dy' } },
  methods: ['translate', 'scale']
});
