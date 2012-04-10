var qt = require('node-qt');

var slice = require('./utility').slice;
var reverse = require('./utility').reverse;

module.exports = Emitter;

// ###########################################
// ### Resolve event objects to end values ###
// ###########################################

var enums = {
  button: reverse(qt.MouseButton),
  color: reverse(qt.GlobalColor),
  key: reverse(qt.Key)
};



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


// ########################################
// ### Map QT events to JS style events ###
// ########################################

var map = {
  mousemove: [ 'mouseMove',    resolve(['x', 'y']) ],
  mousedown: [ 'mousePress',   resolve(['x', 'y', 'button']) ],
  mouseup:   [ 'mouseRelease', resolve(['x', 'y', 'button']) ],
  keydown:   [ 'keyPress',     resolve(['key', 'text']) ],
  keyup:     [ 'keyRelease',   resolve(['key', 'text']) ],
  paint:     [ 'paint',        function(){}]
};

var adapt = ['mouseMoveEvent', 'mousePressEvent', 'mouseReleaseEvent', 'keyPressEvent', 'keyReleaseEvent']

function needsAdapter(emitter){
  for (var i=0; i < adapt.length; i++) {
    if (adapt[i] in emitter) return true;
  }
  return false;
}

// intercept listener add and remove so we can additionally hit the QT handler
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

// forward on event subscriptions from one object to another
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

// standardish emitter that is able to be ignorant of QT needs
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
