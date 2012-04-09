var util = require('util');


// ########################################
// ### Initialize QT with shorter names ###
// ########################################

var enums = {
  button: reverse(require('node-qt').MouseButton),
  color: reverse(require('node-qt').GlobalColor),
  key: reverse(require('node-qt').Key)
};

var qt = module.exports = function(qt){
  return {
    App: qt.QApplication,
    Brush: qt.QBrush,
    Color: qt.QColor,
    Font: qt.QFont,
    Image: qt.QImage,
    KeyEvent: qt.QKeyEvent,
    Matrix: qt.QMatrix,
    MouseEvent: qt.QMouseEvent,
    Painter: qt.QPainter,
    PainterPath: qt.QPainterPath,
    Pen: qt.QPen,
    Pixmap: qt.QPixmap,
    PointF: qt.QPointF,
    ScrollArea: qt.QScrollArea,
    ScrollBar: qt.QScrollBar,
    Size: qt.QSize,
    Sound: qt.QSound,
    Widget: qt.QWidget
  };
}(require('node-qt'));


// ################################
// ### Utilities and fast slice ###
// ################################


function reverse(o){
  return Object.keys(o).reduce(function(r,s){
    r[o[s]] = s;
    return r;
  }, {});
}


function isConstructor(o){
  return typeof o === 'function' && o.prototype &&
         Object.getOwnPropertyNames(o.prototype).length >
         ('constructor' in o.prototype);
}

function isNative(o){
  return typeof o === 'function' && (o+'').slice(-17) === '{ [native code] }';
}

function isObject(o){ return Object(o) === o }
var _slice = Array.prototype.slice;

function slice(a,o,p){
  switch (a.length) {
           case 0: return [];
           case 1: return o ? [] : [a[0]];
          default: return _slice.call(a,o,p);
           case 2: a = [a[0],a[1]];
    break; case 3: a = [a[0],a[1],a[2]];
    break; case 4: a = [a[0],a[1],a[2],a[3]];
    break; case 5: a = [a[0],a[1],a[2],a[3],a[4]];
    break; case 6: a = [a[0],a[1],a[2],a[3],a[4],a[5]];
    break; case 7: a = [a[0],a[1],a[2],a[3],a[4],a[5],a[6]];
    break; case 8: a = [a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]];
    break; case 9: a = [a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8]];
  }
  return (o || p) ? a.slice(o,p) : a;
}



var Emitter = function(){

  // ########################################
  // ### Map QT events to JS style events ###
  // ########################################

  function resolve(names){
    return function(e){
      names.forEach(function(name){
        if (typeof name === 'string')
          e[name] = e[name]();
        if (name in enums)
          e[name] = enums[name][e[name]];
      });
      return e;
    }
  }

  var map = {
    mousemove: [ 'mouseMove',    resolve(['x', 'y']) ],
    mousedown: [ 'mousePress',   resolve(['x', 'y', 'button']) ],
    mouseup:   [ 'mouseRelease', resolve(['x', 'y', 'button']) ],
    keydown:   [ 'keyPress',     resolve(['key', 'text']) ],
    keyup:     [ 'keyRelease',   resolve(['key', 'text']) ],
    paint:     [ 'paint', function(){}]
  };

  var adapt = ['mouseMoveEvent', 'mousePressEvent', 'mouseReleaseEvent', 'keyPressEvent', 'keyReleaseEvent']

  function needsAdapter(emitter){
    for (var i=0; i < adapt.length; i++) {
      if (adapt[i] in emitter) return true;
    }
    return false;
  }

  function adaptEmitter(emitter){
    var refcount = {};
    var origOn = emitter.on;
    var origOff = emitter.off;

    emitter.on = function on(event, callback){
      if (event in map) {
        if (refcount[event]) {
          refcount[event]++;
        } else {
          refcount[event] = 1;
          if (event === 'mousemove') {
            emitter.setMouseTracking(true);
          }
          var norm = map[event];
          emitter[norm[0]+'Event'](function(e){
            e = norm[1](e);
            emitter.emit(event, e);
          });
        }
      }
      return origOn.apply(this, arguments);
    }

    emitter.off = function off(event){
      if (event in map && refcount[event]) {
        if (!--refcount[event]) {
          if (event === 'mousemove') {
            emitter.setMouseTracking(false);
          }
          var norm = map[event];
          emitter[norm[0]+'Event']();
        }
      }
      return origOff.apply(this, arguments);
    }
  }

  // ##############################################
  // ### Prototype and initializer for emitters ###
  // ##############################################

  function Emitter(){
    if (!Emitter.prototype.isPrototypeOf(this)) {
      for (var k in Emitter.prototype) {
        this[k] = Emitter.prototype[k];
      }
    }
    if (needsAdapter(this)) {
      adaptEmitter(this);
    }
    emitters.set(this, {});
    receivers.set(this, this);
  }

  Emitter.forward = function forward(from, to){
    if (!emitters.has(to)) {
      emitters.set(to, {});
      receivers.set(to, to);
    }
    emitters.set(from, emitters.get(to));
    from.on = to.on.bind(to);
    from.off = to.off.bind(to);
  }

  var emitters = new WeakMap;
  var receivers = new WeakMap;

  Emitter.prototype = {
    on: function on(event, listener){
      var events = emitters.get(this);
      if (event in events){
        events[event].push(listener);
      } else {
        events[event] = [listener];
      }
    },
    once: function once(event, listener){
      var self;
      this.on(event, function(){
        self.off(event, listener);
        return listener.apply(receivers.get(this), arguments);
      });
    },
    emit: function emit(event){
      var listeners = emitters.get(this)[event];
      if (listeners) {
        for (var i=0; i < listeners.length; i++) {
          listeners[i].apply(receivers.get(this), slice(arguments, 1));
        }
      }
    },
    off: function off(event, listener){
      var listeners = emitters.get(this)[event];
      if (listeners) {
        listeners.splice(listeners.indexOf(listener), 1);
      }
    },
    offAll: function offAll(event){
      if (event) {
        emitters.get(this)[event] = [];
      } else {
        emitters.set(this, {});
      }
    },
  };

  return Emitter;
}();


// ##########################################################
// ### Create an interface wrapper closer to JS semantics ###
// ##########################################################

function createInterface(opts){
  var ctor = opts.ctor;
  var lib = opts.lib;
  ctor.prototype = Object.create(Emitter.prototype);
  ctor.prototype.constructor = ctor;

  // copy over reamining methods so everything is available on the wrapper
  function defineMethods(obj, methods){
    methods.forEach(function(name){
      obj[name] = function(){
        return this._lib[name].apply(this._lib, arguments);
      }
    });
  }

  opts.accessors && defineAccessors(ctor.prototype, opts.accessors);
  opts.methods && defineMethods(ctor.prototype, opts.methods);

  return ctor;
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

// ##################################################
// ### Window widget interface wrapper definition ###
// ##################################################

function Window(w,h){
  Object.defineProperty(this, '_lib', { value: new qt.Widget });
  Emitter.call(this._lib);
  Emitter.forward(this, this._lib);
  this.size = [w||400, h||400];
}

module.exports.Window = createInterface({
  lib:       qt.Widget,
  ctor:      Window,
  methods:   [ 'update', 'move', 'show', 'close', 'parent' ],
  accessors: {
    height:  { get: 'height',     set: function(v){ this.size = [this.width, v]  } },
    width:   { get: 'width',      set: function(v){ this.size = [v, this.height] } },
    left:    { get: 'x',          set: function(v){ this._lib.move(v, this.top)  } },
    top:     { get: 'y',          set: function(v){ this._lib.move(this.left, v) } },
    size:    { get: 'size',       set: 'resize' },
    name:    { get: 'objectName', set: 'setObjectName' },
    focusPolicy:   { set: 'setFocusPolicy' },
    mouseTracking: { get: 'hasMouseTracking', set: 'setMouseTracking' } }
});





var qtColor = qt.Color;

function Color(r,g,b,a){
  Object.defineProperty(this, '_lib', { value: new qtColor(r,g,b,a) });
}
module.exports.Color = createInterface({
  lib:       qtColor,
  ctor:      Color,
  accessors: {
    name:  { get: 'name',  set: 'name'  },
    red:   { get: 'red',   set: 'red'   },
    green: { get: 'green', set: 'green' },
    blue:  { get: 'blue',  set: 'blue'  },
    alpha: { get: 'alpha', set: 'alpha' } }
});


var qtApp = qt.App;

module.exports.App = App;

function App(name, main){
  var self = this;
  var app = new qtApp;
  this.main = main || new Window;
  this.name = name;
  this.start = start;
  Emitter.call(this);

  var timer;
  function start(){
    timer = setInterval(app.processEvents, 10);
    self.stop = stop;
    delete self.start;
    self.emit('startup');
  }
  function stop(){
    clearInterval(timer);
    self.start = start;
    self.emit('shutdown');
    delete self.stop;
  }
}

App.prototype = {
  __proto__: Emitter.prototype,
  constructor: App,
};



// create the basic window example with the new an improved event binding and accessors
function createApp(){
  var app = new App('Test');
  var win = app.main;
  var pos;

  app.on('startup', function(){ win.show() })
  app.on('shutdown', function(){ win.close() })

  win.on('paint', function(){
    var p = new qt.Painter;
    p.begin(this);
    p.drawText(20, 30, util.inspect(pos));
    p.end();
  });

  console.log(win);

  win.on('mousedown', function(e){
    if (e.button === 'RightButton')  {
      app.stop();
    }
    console.log('down', e);
  });
  win.on('mouseup', function(e){
    console.log('up', e);
  });

  win.on('mousemove', function(e){
    pos = e;
    this.update();
  });

  return app;
}

var prog = createApp();

prog.start();