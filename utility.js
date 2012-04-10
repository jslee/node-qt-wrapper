// ################################
// ### Utilities and fast slice ###
// ################################

module.exports = {
  isObject: isObject,
  isPrimitive: isPrimitive,
  isNative: isNative,
  isCtor: isCtor,
  slice: slice,
  reverse: reverse,
};

function reverse(o){
  return Object.keys(o).reduce(function(r,s){
    r[o[s]] = s;
    return r;
  }, {});
}

function isObject(o){ return Object(o) === o }

function isPrimitive(o){ return Object(o) !== o }

function isNative(o){
  return typeof o === 'function' && (o+'').slice(-17) === '{ [native code] }';
}

function isCtor(o){
  if (typeof o !== 'function') return false;
  o = o.prototype;
  return o && Object.getOwnPropertyNames(o).length > ('constructor' in o);
}

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
