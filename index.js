var util = require('util');


// ########################################
// ### Initialize QT with shorter names ###
// ########################################

var enums = {
  mouse: reverse(require('node-qt').MouseButton),
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




// ################################
// ### Event object translators ###
// ################################

function lookup(set, field){
  return function(e){
    var val = e[field];
    if (typeof val === 'function')
      val = val();
    e[field] = set[val];
    return e;
  }
}

function resolve(names){
  return function(e){
    names.forEach(function(name){
      if (typeof name === 'string')
        e[name] = e[name]();
    });
    return e;
  }
}


var preprocess = {
  mouseMove: resolve(['x', 'y']),
  mousePress: resolve(['x', 'y', lookup(enums.mouse, 'button')]),
  mouseRelease: resolve(['x', 'y', lookup(enums.mouse, 'button')]),
  keyPress: resolve(['key', 'text']),
  keyRelease: resolve(['key', 'text'])
};

// #################################
// ### Event mediator and router ###
// #################################

var router = function(){
  var sources = {};

  function EventSource(type, events){
    this.type = type;
    this.events = [];
    this.emitters = new WeakMap;
    this.registerEvent(events);
  }

  EventSource.prototype = {
    constructor: EventSource,
    registerEvent: function registerEvent(event){
      event && [].push.apply(this.events, Array.isArray(event) ? event : [event]);
    },
    registerEmitter: function registerEmitter(emitter){
      this.emitters.set(emitter, {});
    },
    removeAllListeners: function removeAllListeners(emitter){
      this.emitters.set(emitter, {});
    },
    removeListener: function removeListener(emitter, event, listener){
      var listeners = this.emitters.get(emitter)[event];
      listeners.splice(listeners.indexOf(listener), 1);
    },
    emit: function emit(emitter, event, args){
      var listeners = this.emitters.get(emitter)[event];
      for (var i=0; i < listeners.length; i++) {
        listeners[i].apply(emitter, args);
      }
    },
    registerListener: function registerListener(emitter, event, listener){
      var events = this.emitters.get(emitter);
      if (event in events){
        return events[event].push(listener);
      } else if (!isNative(emitter.constructor)) {
        events[event] = [listener];
        return true;
      } else {
        events[event] = [listener];
        emitter[event+'Event'](function(){
          var args = slice(arguments);
          if (event in preprocess) {
            preprocess[event].apply(null, args);
          }
          for (var i=0; i < events[event].length; i++) {
            events[event][i].apply(emitter, args);
          }
        });
        return 1;
      }
    }
  };

  return function router(type, events){
    if (events) {
      sources[type] = new EventSource(type, events);
    } else {
      if (type && sources[type]) {
        return sources[type];
      } else {
        return false;
      }
    }
  }
}();

function isConstructor(o){
  return typeof o === 'function' && o.prototype &&
         Object.getOwnPropertyNames(o.prototype).length >
         ('constructor' in o.prototype);
}

function isNative(o){
  return typeof o === 'function' && (o+'').slice(-17) === '{ [native code] }';
}


// ################################################
// ### Prototype and initializer for interfaces ###
// ################################################

function Emitter(type){
  router(type).registerEmitter(this);
  Object.defineProperty(this, 'emitterType', { value: type, configurable: true, writable: true });
}

Emitter.prototype = {
  on: function on(event, listener){
    router(this.emitterType).registerListener(this, event, listener);
  },
  once: function once(event, listener){
    var self;
    this.on(event, function(){
      self.off(event, listener);
      return listener.apply(this, arguments);
    });
  },
  emit: function emit(event){
    router(this.emitterType).emit(this, event, slice(arguments, 1));
  },
  off: function off(event, listener){
    router(this.emitterType).removeListener(this, event, listener);
  }
};

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

router('Widget', ['paint', 'keyPress', 'keyRelease', 'mouseMove', 'mousePress', 'mouseRelease']);

function Window(w,h){
  Object.defineProperty(this, '_lib', { value: new qt.Widget });
  Emitter.call(this._lib, 'Widget');
  this.on = Emitter.prototype.on.bind(this._lib);
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

router('App', ['startup', 'shutdown']);

function App(name, main){
  var self = this;
  var app = new qtApp;
  this.main = main || new Window;
  this.name = name;
  this.start = start;
  Emitter.call(this, 'App');

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



// // create the basic window example with the new an improved event binding and accessors
function createApp(){
  var app = new App('Test');
  var win = app.main;

  app.on('startup', function(){ win.show() })
  app.on('shutdown', function(){ win.close() })

  win.on('paint', function(){
    var p = new qt.Painter;
    p.begin(this);
    p.drawText(20, 30, '[ '+[win.top, win.left  + win.width, win.top + win.height, win.left].join(', ')+' ]');
    p.end();
  });

  win.on('mousePress', function(e){
    if (e.button = 'RightButton')  {
      app.stop();
    }
  });

  return app;
}

var prog = createApp();

prog.start();