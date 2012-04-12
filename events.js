var qt = require('node-qt');
var constants = require('./constants');
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


function mods(value, lookup, obj){
  obj = obj || {};
  for (var name in lookup) {
    if ((value & lookup[name]) > 0) obj[name] = true;
  }
  return obj;
}


// ########################################
// ### Map QT events to JS style events ###
// ########################################


function translate(proto){
  function Ctor(name){
    this.name = name+'Event';
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

var TMouseEvent = translate({
  emit: function(emitter, event){
    mods(event.modifiers, constants.modifiers, event);
    delete event.modifiers;
  }
})

var TKeyEvent = translate({
  emit: function(emitter, event){
    event.key = enums.key[event.key()];
    mods(event.modifiers, constants.modifiers, event);
    delete event.modifiers;
  }
});

var TTrackEvent = translate({
  first: function(emitter){
    emitter.mouseTracking = true;
  },
  last: function(emitter){
    emitter.mouseTracking = false;
  }
});


var map = {
  mousemove: new TTrackEvent('mouseMove'),
  mousedown: new TMouseEvent('mousePress'),
  mouseup: new TMouseEvent('mouseRelease'),
  mouseenter: new TEvent('enter'),
  mouseleave: new TEvent('leave'),
  keydown: new TKeyEvent('keyPress'),
  keyup: new TKeyEvent('keyRelease'),
  resize: new TEvent('resize'),
  move: new TEvent('move'),
  paint: new TEvent('paint'),
  close: new TEvent('close'),
};

// intercept listener add and remove so we can additionally hit the QT handler
function adaptEmitter(emitter){
  var origOn = emitter.on;
  var origOff = emitter.off;
  var origOffAll = emitter.offAll;
  var originals = {};

  for (var k in map) {
    if (map[k].name in emitter) {
      originals[k] = emitter[map[k].name];
      delete emitter[map[k].name];
    }
  }
  var refs = new WeakMap;

  emitter.on = function on(event, callback){
    var self = this;
    var events = event === '*' ? Object.keys(originals) : event.split(' ');
    var refcount = refs.has(this) ? refs.get(this) : refs.set(this, {});

    events.forEach(function(event){
      if (!(event in map)) return;
      if (refcount[event]) return refcount[event]++;

      refcount[event] = 1;
      if (map[event].first) map[event].first(self);

      originals[event].call(self, function(e){
        if (map[event].emit) map[event].emit(self, e);
        if (e) {
          e.type = event;
          Object.defineProperty(e, 'target', { value: self });
        } else {
          e = new Event(event, self);
        }
        self.emit(e);
      });
    });
    origOn.apply(this, arguments);
  }

  emitter.off = function off(event){
    var self = this;
    var events = event === '*' ? Object.keys(originals) : event.split(' ');
    var refcount = refs.has(this) ? refs.get(this) : refs.set(this, {});
    events.forEach(function(event){
      if (event in originals && refcount[event] && !--refcount[event]) {
        if (map[event].last) {
          map[event].last(self);
        }
        originals[event].call(self);
      }
    });
    return origOff.apply(this, arguments);
  }

  emitter.offAll = function offAll(){
    if (refs.has(this)) {
      var self = this;
      var refcount = refs.get(this);
      refs.delete(this);
      Object.keys(refcount).forEach(function(event){
        if (refcount[event]) {
          originals[event].call(self);
        }
      });
    }
    return origOffAll.apply(this, arguments);
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

Emitter.castEmitter = function castEmitter(obj){
  if (Object.getPrototypeOf(obj) === Object.prototype) {
    obj.__proto__ = Emitter.prototype;
  } else {
    var proto = obj;
    while (proto = Object.getPrototypeOf(proto)) {
      if (proto === null || proto === Object.prototype) break;
      obj = proto;
    }
    obj.__proto__ = Emitter.prototype;
  }
  if (needsAdapter(obj)) {
    adaptEmitter(obj);
  }
}


var emitters = new WeakMap;
var receivers = new WeakMap;

// standardish emitter that is able to be ignorant of QT needs
Emitter.prototype = {
  constructor: Emitter,
  on: function on(events, listener){
    var listeners = emitters.get(this);
    events.split(' ').forEach(function(event){
      if (event in listeners){
        listeners[event].push(listener);
      } else {
        listeners[event] = [listener];
      }
    });
  },
  off: function off(events, listener){
    var listeners = emitters.get(this);
    events.split(' ').forEach(function(event){
      if (listeners[event]) {
        listeners[event].splice(listeners[event].indexOf(listener), 1);
      }
    });
  },
  offAll: function offAll(event){
    delete emitters.get(this)[event];
  },
  once: function once(event, listener){
    var self = this;
    this.on(event, function(){
      self.off(event, listener);
      return listener.apply(receivers.get(self), arguments);
    });
  },
  emit: function emit(type){
    var event, events = emitters.get(this);
    if (typeof type !== 'string') {
      event = type;
      type = event.type;
    }
    if (events['*']) {
      var listeners = events[type] ? events['*'].concat(events[type]) : events['*'];
    } else {
      var listeners = events[type];
    }
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
};
