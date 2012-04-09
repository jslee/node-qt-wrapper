var qt = require('node-qt');
var Emitter = require('./events');

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

  return ctor;
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




// ##################################################
// ### Window widget interface wrapper definition ###
// ##################################################

function Window(w,h){
  Object.defineProperty(this, '_lib', { value: new qt.QWidget });
  Emitter.call(this._lib);
  Emitter.forward(this, this._lib);
  this.size = [w||400, h||400];
}

module.exports.Window = createInterface({
  lib:       qt.QWidget,
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


module.exports.App = App;

function App(name, main){
  var self = this;
  var app = new qt.QApplication;
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


function Color(r,g,b,a){
  Object.defineProperty(this, '_lib', { value: new qt.QColor(r,g,b,a) });
}

module.exports.Color = createInterface({
  lib:       qt.qColor,
  ctor:      Color,
  accessors: {
    name:  { get: 'name',  set: 'name'  },
    red:   { get: 'red',   set: 'red'   },
    green: { get: 'green', set: 'green' },
    blue:  { get: 'blue',  set: 'blue'  },
    alpha: { get: 'alpha', set: 'alpha' } }
});

