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




// ########################################
// ### Map QT events to JS style events ###
// ########################################
function resolve(type){
  return function(e){
    console.log(e[type]);
    e[type] = enums[type][e[type]];
  }
}



function translate(proto){
  function Ctor(name){
    this.name = name;
    translate.events.push(name);
  }
  Ctor.prototype = proto;
  return Ctor;
}
translate.events = [];

function needsAdapter(emitter){
  for (var i=0; i < translate.events.length; i++) {
    if (translate.events[i] in emitter) return true;
  }
  return false;
}


var TEvent = translate({});

var TKeyEvent = translate({
  emit: function(emitter, event){
    event.key = enums.key[event.key()];
  }
});

var TTrackEvent = translate({
  first: function(emitter){
    emitter.setMouseTracking(true)
  },
  last: function(emitter){
    emitter.setMouseTracking(false);
  }
});

var map = {
  mousemove: new TEvent('mouseMove'),
  mousedown: new TEvent('mousePress'),
  mouseup: new TEvent('mouseRelease'),
  mouseenter: new TTrackEvent('enter'),
  mouseleave: new TTrackEvent('leave'),
  keydown: new TKeyEvent('keyPress'),
  keyup: new TKeyEvent('keyRelease'),
  resize: new TEvent('resize'),
  move: new TEvent('move'),
  paint: new TEvent('paint'),
  close: new TEvent('close'),
};

// intercept listener add and remove so we can additionally hit the QT handler
function adaptEmitter(emitter){
  var refcount = {};
  var origOn = emitter.on;
  var origOff = emitter.off;

  emitter.on = function on(events, callback){
    events.split(' ').forEach(function(event){
      if (event in map) {
        if (refcount[event]) {
          refcount[event]++;
        } else {
          refcount[event] = 1;
          if (map[event].first) {
            map[event].first(emitter);
          }
          emitter[map[event].name+'Event'](function(e){
            if (map[event].emit) {
              map[event].emit(emitter, e);
            }
            if (e) {
              e.type = event;
              e.target = emitter;
            } else {
              e = new Event(event, emitter);
            }
            emitter.emit(e);
          });
        }
      }
    });
    origOn.apply(this, arguments);
  }

  emitter.off = function off(events){
    events.split(' ').forEach(function(event){
      if (event in map && refcount[event]) {
        if (!--refcount[event]) {
          if (map[event].last) {
            map[event].last(emitter);
          }
          emitter[map[event].name+'Event']();
        }
      }
    });
    return origOff.apply(this, arguments);
  }
}



// ### Generic Event ###

function Event(type, target){
  this.type = type;
  this.target = target;
}

function ErrorEvent(error, event, target){
  Event.call(this, 'error', target)
  this.error = error;
  this.event = event;
}

// ##############################################
// ### Prototype and initializer for emitters ###
// ##############################################

function Emitter(){
  if (!Emitter.prototype.isPrototypeOf(this)) {
    for (var k in Emitter.prototype) {
      Object.defineProperty(this, k, {
        configurable: true,
        writable: true,
        value: Emitter.prototype[k]
      });
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
  on: function on(events, listener){
    var registered = emitters.get(this);
    events.split(' ').forEach(function(event){
      if (event in registered){
        registered[event].push(listener);
      } else {
        registered[event] = [listener];
      }
    });
  },
  once: function once(event, listener){
    var self;
    this.on(event, function(){
      self.off(event, listener);
      return listener.apply(receivers.get(this), arguments);
    });
  },
  emit: function emit(type){
    var event;
    if (typeof type !== 'string') {
      event = type;
      type = event.type;
    }
    var listeners = emitters.get(this)[type];
    if (listeners) {
      event = event || new Event(type, receivers.get(this));
      var args = [event].concat(slice(arguments, 1));
      for (var i=0; i < listeners.length; i++) {
        try {
          listeners[i].apply(this, args);
        } catch (e) {
          this.emit(new ErrorEvent(e, event, listeners[i]));
        }
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
