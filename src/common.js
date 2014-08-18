/**
 * rAF & cAF
 */

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback/*, element*/) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
})();


/**
 * Check that input parameter is a function
 * @param a
 * @returns {boolean}
 */
function isFun(a) {
    return typeof a === "function";
}

/**
 * Asynchronous forEach
 * @param {Array} items
 * @param {Function} fn
 * @param {Number} time
 * @param {Function} finishCallback
 */
function asyncForEach(items, fn, time, finishCallback) {
    if (!(items instanceof Array))
        return;

    var workArr = items.reverse().concat();

    (function loop() {
        if (workArr.length > 0) {
            fn(workArr.shift(), workArr);
            setTimeout(loop, time || 10);
        }
        else if (isFun(finishCallback)) {
            finishCallback();
        }
    })();
}

/**
 * true if colors aren't same
 * @param a {d3.rgb}
 * @param b {d3.rgb}
 * @returns {boolean}
 */
function compereColor(a, b) {
    return a.r != b.r || a.g != b.g || a.b != b.b;
}

/**
 * @param {Object} obj
 * @param {*} key
 * @returns {Function}
 */
function func(obj, key) {
    return function(arg) {
        if(!arguments.length)
            return obj[key].value;
        isFun(arg) &&
        (obj[key].value = arg);
        return obj;
    };
}

/**
 * Returning function by key from obj if obj and function are exist or empty function
 * @param obj
 * @param key
 * @returns {Function}
 */
function getFun(obj, key) {
    return obj && isFun(obj[key]) && isFun(obj[key]()) ? obj[key]() : emptyFun;
}


//TODO it is d3.functor
/**
 * Empty function
 * @returns {Arguments}
 */
function emptyFun(arg) {
    return arg;
}

/**
 * Type of node
 * @type {{parent: number, child: number}}
 */
var typeNode = {
    parent : 0,
    child : 1
};

var ONE_SECOND = 1000
    , PI_CIRCLE = 2 * Math.PI
    ;

var layersCounter = 0;