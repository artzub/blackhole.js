/**
 * BlackHoleJS is a library for dynamic data visualization.
 * Powered by http://d3js.org
 * Copyright 2013-2014 Artem Zubkov
 * @author: Artem Zubkov
 * @email: artzub@gmail.com
 * @license: MIT
 * @source: http://github.com/artzub/blackhole.js
 */
"use strict";

!function() {
    var blackhole = {
        version: "1.1.2"
    };
    (function() {
        var lastTime = 0;
        var vendors = [ "ms", "moz", "webkit", "o" ];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
            window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] || window[vendors[x] + "CancelRequestAnimationFrame"];
        }
        if (!window.requestAnimationFrame) window.requestAnimationFrame = function(callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
        if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    })();
    function isFun(a) {
        return typeof a === "function";
    }
    function dist(a, b) {
        return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    }
    function asyncForEach(items, fn, time, callback) {
        if (!(items instanceof Array)) return;
        var workArr = items.reverse().concat();
        (function loop() {
            if (workArr.length > 0) {
                fn(workArr.shift(), workArr);
                setTimeout(loop, time || 10);
            } else if (isFun(callback)) {
                callback();
            }
        })();
    }
    function compereColor(a, b) {
        return a.r != b.r || a.g != b.g || a.b != b.b;
    }
    function func(obj, key) {
        return function(arg) {
            if (!arguments.length) return obj[key].value;
            isFun(arg) && (obj[key].value = arg);
            return obj;
        };
    }
    function getFun(obj, key) {
        return obj && isFun(obj[key]) && isFun(obj[key]()) ? obj[key]() : emptyFun;
    }
    function emptyFun(arg) {
        return arg;
    }
    var typeNode = {
        parent: 0,
        child: 1
    };
    var ONE_SECOND = 1e3, PI_CIRCLE = 2 * Math.PI;
    var layersCounter = 0;
    function Parser() {
        var parser = {
            size: [ 500, 500 ],
            categoryMax: 0,
            categoryHash: null,
            childHash: null,
            parentHash: null,
            setting: {
                getName: null,
                getCategoryKey: null,
                getCategoryName: null,
                getKey: null,
                getChildKey: null,
                getParentKey: null,
                getParent: null,
                getParentImage: null,
                getGroupBy: null,
                getValue: null,
                getParentRadius: null,
                getChildRadius: null,
                getParentPosition: null,
                getParentFixed: null,
                onBeforeParsing: null,
                onParsing: null,
                onAfterParsing: null,
                parentColor: d3.scale.category20b(),
                childColor: d3.scale.category20()
            }
        }, rd3 = d3.random.irwinHall(8);
        function randomTrue() {
            return Math.floor(rd3() * 8) % 2;
        }
        (function() {
            var reg = new RegExp("^[get|on]");
            d3.keys(parser.setting).forEach(function(key) {
                if (reg.test(key)) parser.setting[key] = func(parser.setting, key);
            });
            parser.setting.getName(function(d) {
                return d.name;
            });
            parser.setting.getCategoryKey(function(d) {
                return d.category;
            });
            parser.setting.getCategoryName(function(d) {
                return parser.setting.getCategoryKey()(d);
            });
            parser.setting.getKey(function(d, type) {
                return type == typeNode.child ? parser.setting.getChildKey()(d) : parser.setting.getParentKey()(d);
            });
            parser.setting.getChildKey(function(d) {
                return d.key;
            });
            parser.setting.getParentKey(function(d) {
                return d.key;
            });
            parser.setting.getParent(function(d) {
                return d.parent;
            });
            parser.setting.getParentImage(function(d) {
                return d.img;
            });
            parser.setting.getGroupBy(function(d) {
                return d.date;
            });
            parser.setting.getValue(function() {
                return 1;
            });
            parser.setting.getParentRadius(function() {
                return 25;
            });
            parser.setting.getChildRadius(function() {
                return 2;
            });
            parser.setting.getParentPosition(function() {
                return null;
            });
            parser.setting.getParentFixed(function() {
                return false;
            });
        })();
        function doFunc(key) {
            return getFun(parser.setting, key);
        }
        function doBeforeParsing(data) {
            return doFunc("onBeforeParsing")(data);
        }
        function doParsing(item) {
            return doFunc("onParsing")(item);
        }
        function doAfterParsing(item) {
            return doFunc("onAfterParsing")(item);
        }
        function Category(c, name) {
            var cat = parser.categoryHash.get(c);
            if (!cat) {
                cat = {
                    key: c,
                    name: name || c,
                    all: 0,
                    currents: {},
                    values: {},
                    color: d3.rgb(parser.setting.childColor(c)),
                    now: []
                };
                parser.categoryHash.set(c, cat);
            }
            return cat;
        }
        function createPosition(d, type) {
            var x, y, w = parser.size[0], h = parser.size[1], w2 = w / 2, w5 = w / 5, h2 = h / 2, h5 = h / 5, parentPos;
            x = w * Math.random();
            y = h * Math.random();
            !type == typeNode.child && (parentPos = parser.setting.getParentPosition()(d, [ x, y ]));
            if (type == typeNode.parent) {
                if (!parentPos || parentPos.length < 2) {
                    if (randomTrue()) {
                        x = x > w5 && x < w2 ? x / 5 : x > w2 && x < w - w5 ? w - x / 5 : x;
                    } else {
                        y = y > h5 && y < h2 ? y / 5 : y > h2 && y < h - h5 ? h - y / 5 : y;
                    }
                } else {
                    x = parentPos[0];
                    y = parentPos[1];
                }
            }
            return {
                x: x,
                y: y
            };
        }
        function Node(d, type) {
            var isChild = type == typeNode.child, c = isChild ? parser.setting.getCategoryKey()(d) : parser.setting.parentColor(parser.setting.getParentKey()(d)), cat, x, y;
            if (isChild) {
                cat = Category(c, parser.setting.getCategoryName()(d));
                cat.all++;
                c = cat.color;
            }
            var pos = createPosition(d, type);
            x = pos.x;
            y = pos.y;
            return {
                x: x,
                y: y,
                id: type + "_" + parser.setting.getKey()(d, type),
                size: !isChild ? parser.setting.getParentRadius()(d) : parser.setting.getChildRadius()(d),
                fixed: true,
                permanentFixed: !isChild ? parser.setting.getParentFixed()(d) : false,
                visible: false,
                links: 0,
                type: type,
                color: c.toString(),
                d3color: d3.rgb(c),
                flashColor: d3.rgb(!isChild ? c : c.brighter().brighter()),
                category: cat,
                parent: !isChild ? parser.setting.getParentKey()(d) : null,
                img: !isChild ? parser.setting.getParentImage()(d) : null,
                nodeValue: d
            };
        }
        function getParent(d) {
            var parent, key, n;
            if (!d || !(parent = parser.setting.getParent()(d))) return null;
            key = parser.setting.getParentKey()(parent);
            if (key == null) key = "undefined";
            n = parser.parentHash.get(key);
            if (!n) {
                n = Node(parent, typeNode.parent);
                parser.parentHash.set(key, n);
            }
            return n;
        }
        function getChild(d) {
            var key, n;
            if (!d) return null;
            key = parser.setting.getChildKey()(d);
            if (key == null) key = "undefined";
            n = parser.childHash.get(key);
            if (!n) {
                n = Node(d, typeNode.child);
                n.links = 1;
                parser.childHash.set(key, n);
            }
            return n;
        }
        parser.init = function() {
            parser.parentHash = d3.map({});
            parser.childHash = d3.map({});
            parser.categoryHash = d3.map({});
            parser.categoryMax = 0;
        };
        parser.nodes = function(data, callback) {
            console.time("parser");
            var ns = [];
            doBeforeParsing(data);
            if (isFun(callback)) {
                asyncForEach(data, function(d) {
                    parseNode(d, ns);
                }, 1, function(err) {
                    doAfterParsing(ns);
                    callback(ns);
                    console.timeEnd("parser");
                });
            } else {
                parse(data, ns);
                console.timeEnd("parser");
                return ns;
            }
        };
        function parse(inData, outData) {
            if (!inData) return;
            var i = inData.length;
            while (--i > -1) parseNode(inData[i], outData);
            doAfterParsing(outData);
        }
        function parseNode(d, ns) {
            var j, n, groupBy;
            if (!d || !ns || !(ns instanceof Array)) return;
            d.nodes = [];
            n = getParent(d);
            d.parentNode = n;
            !n.inserted && (n.inserted = ns.push(n));
            groupBy = parser.setting.getGroupBy()(d);
            n = getChild(d);
            d.nodes.push(n);
            n.category.currents[groupBy] = n.category.currents[groupBy] || 0;
            n.category.currents[groupBy]++;
            n.category.values["_" + n.id] = parser.setting.getValue()(d);
            !n.inserted && (n.inserted = ns.push(n));
            j = parser.categoryHash.values().reduce(function(id) {
                return function(a, b) {
                    return (a || 0) + (b.currents[id] || 0);
                };
            }(groupBy), null);
            parser.categoryMax = Math.max(parser.categoryMax, j);
            doParsing(n);
        }
        parser.setInitState = function(node) {
            var pos = createPosition(node.nodeValue, node.type);
            node.x = pos.x;
            node.y = pos.y;
            node.size = node.type === typeNode.parent ? parser.setting.getParentRadius()(node.nodeValue) : parser.setting.getChildRadius()(node.nodeValue);
        };
        parser.refreshCategories = function() {
            parser.categoryHash.forEach(function(key, value) {
                value.now.splice(0);
            });
        };
        return parser;
    }
    function Processor() {
        var pause, stop, worker, tempTimeout;
        var step = ONE_SECOND;
        var processor = {
            killWorker: killWorker,
            boundRange: [ 0, 1 ],
            onFinished: null,
            onStopped: null,
            onStarted: null,
            onProcessing: null,
            onProcessed: null,
            onRecalc: null,
            onFilter: null,
            onCalcRightBound: null,
            setting: {
                realtime: false,
                skipEmptyDate: true,
                step: step
            }
        };
        d3.keys(processor).forEach(function(key) {
            if (/^on/.test(key)) processor[key] = func(processor, key);
        });
        function killWorker() {
            if (worker) {
                clearInterval(worker);
                worker = null;
            }
            if (tempTimeout) {
                clearTimeout(tempTimeout);
                tempTimeout = null;
            }
        }
        function doFunc(key) {
            return getFun(processor, key);
        }
        function doFilter(dl, dr) {
            return doFunc("onFilter")(dl, dr);
        }
        function doCalcRightBound(dl) {
            return getFun(processor, "onCalcRightBound")(dl);
        }
        function doFinished(dl, dr) {
            doFunc("onFinished")(dl, dr);
        }
        function doStopped() {
            doFunc("onStopped")();
        }
        function doStarted() {
            doFunc("onStarted")();
        }
        function doProcessing(items, dl, dr) {
            doFunc("onProcessing")(items, dl, dr);
        }
        function doProcessed(items, dl, dr) {
            doFunc("onProcessed")(items, dl, dr);
        }
        function doRecalc(d) {
            doFunc("onRecalc")(d);
        }
        function loop() {
            if (tempTimeout) {
                clearTimeout(tempTimeout);
                tempTimeout = null;
            }
            if (stop) {
                killWorker();
                return;
            }
            if (pause) return;
            var dl, dr;
            dl = processor.boundRange[0];
            dr = doCalcRightBound(dl);
            processor.boundRange[0] = dr;
            var visTurn = doFilter(dl, dr);
            visTurn && visTurn.length && asyncForEach(visTurn, doRecalc, step / (visTurn.length || step));
            doProcessing(visTurn, dl, dr);
            try {
                if (dl > processor.boundRange[1]) {
                    if (!processor.setting.realtime) {
                        killWorker();
                        doFinished(dl, dr);
                        throw new Error("break");
                    } else {
                        processor.boundRange[0] = processor.boundRange[1] + 1;
                    }
                } else {
                    if ((!visTurn || !visTurn.length) && processor.setting.skipEmptyDate) {
                        tempTimeout = setTimeout(loop, 1);
                    }
                }
            } catch (e) {} finally {
                doProcessed(visTurn, dl, dr);
            }
        }
        processor.step = function(arg) {
            if (!arguments.length || arg == null || arg < 0) return step;
            processor.setting.step = step = arg;
            if (processor.IsRun()) {
                killWorker();
                worker = setInterval(loop, step);
            }
            return processor;
        };
        processor.start = function() {
            stop = pause = false;
            step = processor.setting.step;
            killWorker();
            doStarted();
            worker = setInterval(loop, step);
            return processor;
        };
        processor.pause = function() {
            pause = true;
            return processor;
        };
        processor.stop = function() {
            stop = true;
            killWorker();
            doStopped();
            return processor;
        };
        processor.resume = function() {
            pause = false;
            return processor;
        };
        processor.IsPaused = function() {
            return worker && pause && !stop;
        };
        processor.IsRun = function() {
            return !!worker;
        };
        return processor;
    }
    function Render() {
        var particleImageCache = d3.map({}), neonBallCache = d3.map({}), fontSize;
        var render = {
            size: [ 500, 500 ],
            onGetChildNodes: null,
            onGetParentNodes: null,
            onGetLinks: null,
            onGetLastEvent: null,
            onGetSelectedColor: null,
            onGetSelectedNode: null,
            onGetNodeRadius: null,
            setting: {
                onGetParentLabel: null,
                onGetChildLabel: null,
                drawEdge: false,
                drawChild: false,
                drawChildLabel: false,
                drawParent: false,
                drawParentLabel: false,
                drawPaddingCircle: false,
                drawHalo: false,
                drawTrack: false,
                drawVanishingTail: false,
                drawAsPlasma: false,
                drawParentImg: false,
                hasLabelMaxWidth: false,
                padding: 0,
                lengthTrack: 2,
                compositeOperation: null,
                drawCrookedPath: false
            }
        };
        var regEvent = new RegExp("^on");
        d3.map(render.setting).keys().forEach(function(key) {
            if (regEvent.test(key)) render.setting[key] = func(render.setting, key);
        });
        d3.map(render).keys().forEach(function(key) {
            if (regEvent.test(key)) render[key] = func(render, key);
        });
        function getLastEvent() {
            return getFun(render, "onGetLastEvent")();
        }
        function getChildNodes() {
            return getFun(render, "onGetChildNodes")();
        }
        function getParentNodes() {
            return getFun(render, "onGetParentNodes")();
        }
        function getLinks() {
            return getFun(render, "onGetLinks")();
        }
        function getParentLabel(d) {
            return getFun(render.setting, "onGetParentLabel")(d);
        }
        function getChildLabel(d) {
            return getFun(render.setting, "onGetChildLabel")(d);
        }
        function getSelectedColor(d) {
            return getFun(render, "onGetSelectedColor")(d);
        }
        function getNodeRadius(d) {
            return getFun(render, "onGetNodeRadius")(d);
        }
        function getSelectedNode() {
            return getFun(render, "onGetSelectedNode")();
        }
        var defImg, particleImg, trackCanvas, trackCtx, bufCanvas, bufCtx, selectedNode;
        render.reset = function() {
            trackCanvas = trackCtx = bufCanvas = bufCtx = null;
        };
        function setFontSize(size) {
            fontSize = size;
            bufCtx && (bufCtx.font = "normal normal " + fontSize + "px Tahoma");
        }
        function sortByColor(a, b) {
            return d3.ascending(b.color + !b.flash, a.color + !a.flash);
        }
        function sortByOpacity(a, b) {
            return d3.ascending(b.opacity, a.opacity);
        }
        render.calcDrawCoords = function(d) {
            d.drawX = d.x;
            d.drawY = d.y;
            if (!render.setting.drawCrookedPath) return;
            var to = d.parent || d;
            var r = dist(+d.from.x - to.x, +d.from.y - to.y) / 2, dx = to.x - d.x, dy = to.y - d.y, sx = dx < 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
            dx = Math.abs(dx) - r;
            dy = Math.abs(dy) - r;
            var k = .5;
            d.drawX = d.x;
            d.drawY = d.y - (r ? k * Math.sqrt(r * r - dx * dx) : 0);
        };
        function drawTrack(nodes, lastEvent) {
            if (!trackCtx) {
                trackCanvas = document.createElement("canvas");
                trackCanvas.width = render.size[0];
                trackCanvas.height = render.size[1];
                trackCtx = trackCanvas.getContext("2d");
                trackCtx.lineJoin = "round";
                trackCtx.lineWidth = 1;
            }
            trackCtx.save();
            trackCtx.globalCompositeOperation = "destination-out";
            trackCtx.fillStyle = "rgba(0, 0, 0, .2)";
            trackCtx.fillRect(0, 0, render.size[0], render.size[1]);
            trackCtx.globalCompositeOperation = "source-over";
            trackCtx.translate(lastEvent.translate[0], lastEvent.translate[1]);
            trackCtx.scale(lastEvent.scale, lastEvent.scale);
            if (nodes) {
                var d, l = nodes.length || 0, curColor, c = null;
                var test = false;
                trackCtx.fillStyle = "none";
                if (test) trackCtx.lineWidth = .5;
                while (--l > -1) {
                    d = nodes[l];
                    render.calcDrawCoords(d);
                    curColor = getSelectedColor(d);
                    if (curColor + "" === "none") {
                        d.paths && d.paths.splice(0);
                        continue;
                    }
                    if (!c || compereColor(c, curColor)) {
                        c = curColor;
                        trackCtx.strokeStyle = c.toString();
                    }
                    if (!d.paths) continue;
                    trackCtx.beginPath();
                    var rs = d.paths.slice(0).reverse(), p, lrs = rs.length;
                    if (!d.flash && d.paths.length < render.setting.lengthTrack) d.paths = [];
                    if (d.paths.length > render.setting.lengthTrack) d.paths.splice(0, d.flash ? render.setting.lengthTrack : render.setting.lengthTrack + 1);
                    if (lrs) {
                        if (test) {
                            trackCtx.beginPath();
                            p = rs.pop();
                            trackCtx.moveTo(Math.floor(p.x), Math.floor(p.y));
                            while (p = rs.pop()) {
                                trackCtx.lineTo(Math.floor(p.x), Math.floor(p.y));
                            }
                            trackCtx.lineTo(Math.floor(d.x), Math.floor(d.y));
                            trackCtx.stroke();
                        } else {
                            while (p = rs.pop()) {
                                trackCtx.beginPath();
                                trackCtx.moveTo(Math.floor(p.x), Math.floor(p.y));
                                p = rs.length ? rs[rs.length - 1] : {
                                    x: d.drawX,
                                    y: d.drawY
                                };
                                trackCtx.lineTo(Math.floor(p.x), Math.floor(p.y));
                                trackCtx.globalAlpha = (lrs - rs.length + 1) / lrs;
                                trackCtx.stroke();
                            }
                        }
                    }
                    d.alive && d.parent && (d.flash || d.paths.length > 1) && d.paths.push({
                        x: d.drawX,
                        y: d.drawY
                    });
                    !d.alive && d.paths.splice(0);
                }
            }
            trackCtx.restore();
            return trackCanvas;
        }
        function drawLinks(linksCtx, links, selected) {
            if (!links || !links.length || !linksCtx) return;
            linksCtx.save();
            linksCtx.lineCap = "round";
            linksCtx.lineJoin = "round";
            if (!render.setting.drawEdge && selected) links = links.filter(function(d) {
                return d.source == selectedNode || d.target == selected;
            });
            var d, l = links.length, curColor, c = null, base, child, i = 100;
            linksCtx.fillStyle = "none";
            while (--l > -1) {
                d = links[l];
                if (!d.source || !d.target) continue;
                child = d.source.type == typeNode.child;
                base = child ? d.source : d.target;
                curColor = getSelectedColor(base);
                if (!c || compereColor(c, curColor)) {
                    c = curColor;
                    linksCtx.strokeStyle = c.toString();
                }
                if (i != base.opacity) {
                    i = base.opacity;
                    bufCtx.globalAlpha = i * .01;
                }
                linksCtx.lineWidth = 1;
                linksCtx.beginPath();
                var sx = child ? d.target.x : d.source.x, sy = child ? d.target.y : d.source.y, tx = !child ? d.target.x : d.source.x, ty = !child ? d.target.y : d.source.y;
                linksCtx.moveTo(Math.floor(sx), Math.floor(sy));
                var x3 = .3 * ty - .3 * sy + .8 * sx + .2 * tx, y3 = .8 * sy + .2 * ty - .3 * tx + .3 * sx, x4 = .3 * ty - .3 * sy + .2 * sx + .8 * tx, y4 = .2 * sy + .8 * ty - .3 * tx + .3 * sx;
                linksCtx.bezierCurveTo(x3, y3, x4, y4, tx, ty);
                linksCtx.stroke();
            }
            linksCtx.restore();
        }
        render.draw = function() {
            if (!bufCtx) {
                bufCanvas = document.createElement("canvas");
                bufCanvas.width = render.size[0];
                bufCanvas.height = render.size[1];
                bufCtx = bufCanvas.getContext("2d");
                bufCtx.globalCompositeOperation = "lighter";
                bufCtx.textAlign = "center";
            }
            var lastEvent = getLastEvent(), n, cn, l, i, img, d, beg, c, selectedColor, x, y, s, currentCache, tracksImg;
            if (!lastEvent || !lastEvent.hasOwnProperty("translate")) return bufCanvas;
            bufCtx.save();
            bufCtx.clearRect(0, 0, render.size[0], render.size[1]);
            if (render.setting.drawTrack && (render.setting.drawChild || render.setting.drawChildLabel)) {
                cn = (getChildNodes() || []).sort(sortByOpacity).sort(sortByColor);
                tracksImg = drawTrack(cn, lastEvent);
                render.setting.drawTrack && tracksImg && bufCtx.drawImage(tracksImg, 0, 0, render.size[0], render.size[1]);
            }
            bufCtx.translate(lastEvent.translate[0], lastEvent.translate[1]);
            bufCtx.scale(lastEvent.scale, lastEvent.scale);
            bufCtx.globalCompositeOperation = "source-over";
            selectedNode = getSelectedNode();
            if (render.setting.drawEdge || selectedNode) {
                n = getLinks() || [];
                drawLinks(bufCtx, n, selectedNode);
            }
            if (render.setting.drawChild || render.setting.drawChildLabel) {
                cn = cn || (getChildNodes() || []).sort(sortByOpacity).sort(sortByColor);
                currentCache = render.setting.drawAsPlasma ? neonBallCache : particleImageCache;
                if (render.setting.compositeOperation && bufCtx.globalCompositeOperation != render.setting.compositeOperation) bufCtx.globalCompositeOperation = render.setting.compositeOperation;
                l = cn.length;
                c = null;
                i = 100;
                beg = false;
                bufCtx.strokeStyle = "none";
                bufCtx.globalAlpha = i * .01;
                while (--l > -1) {
                    d = cn[l];
                    if (i != d.opacity) {
                        i = d.opacity;
                        bufCtx.globalAlpha = i * .01;
                    }
                    selectedColor = getSelectedColor(d);
                    if (selectedColor + "" === "none") continue;
                    if (!c || compereColor(c, selectedColor)) {
                        c = selectedColor;
                        if (render.setting.drawChild) {
                            if (!render.setting.drawHalo) {
                                if (beg) {
                                    bufCtx.stroke();
                                    bufCtx.fill();
                                }
                                bufCtx.beginPath();
                                bufCtx.fillStyle = c.toString();
                                beg = true;
                            } else {
                                bufCtx.strokeStyle = c.toString();
                                img = currentCache.get(bufCtx.strokeStyle);
                                if (!img) {
                                    c.a = c.hasOwnProperty("a") ? c.a || 0 : 1;
                                    img = render.setting.drawAsPlasma ? generateNeonBall(64, 64, c.r, c.g, c.b, c.a) : colorize(particleImg, c.r, c.g, c.b, c.a);
                                    currentCache.set(bufCtx.strokeStyle, img);
                                }
                            }
                        }
                    }
                    x = Math.floor(d.drawX);
                    y = Math.floor(d.drawY);
                    s = getNodeRadius(d) * (render.setting.drawHalo ? render.setting.drawAsPlasma ? 8 : 10 : .8);
                    if (render.setting.drawChild) {
                        if (!render.setting.drawHalo) {
                            bufCtx.moveTo(x + s, y);
                            bufCtx.arc(x, y, s, 0, PI_CIRCLE, true);
                        } else bufCtx.drawImage(img, x - s / 2, y - s / 2, s, s);
                    }
                    if (render.setting.drawChildLabel) {
                        bufCtx.fillStyle = c.toString();
                        s *= render.setting.drawHalo ? 1 : render.setting.drawAsPlasma ? 10 : 12.5;
                        setFontSize(s / 2);
                        bufCtx.textAlign = "center";
                        if (render.setting.hasLabelMaxWidth) bufCtx.fillText(getChildLabel(d), x, y + (render.setting.drawChild ? s / 2 : 0), render.size[0] / 2); else bufCtx.fillText(getChildLabel(d), x, y + (render.setting.drawChild ? s / 2 : 0));
                    }
                }
                if (!render.setting.drawHalo && beg) {
                    bufCtx.stroke();
                    bufCtx.fill();
                }
            }
            if (render.setting.drawParent || render.setting.drawParentLabel) {
                bufCtx.globalCompositeOperation = "source-over";
                n = getParentNodes();
                n = n.sort(sortByOpacity).sort(sortByColor);
                l = n.length;
                i = 100;
                bufCtx.globalAlpha = i * .01;
                while (--l > -1) {
                    d = n[l];
                    if (i != d.opacity) {
                        i = d.opacity;
                        bufCtx.globalAlpha = i * .01;
                    }
                    x = Math.floor(d.x);
                    y = Math.floor(d.y);
                    s = getNodeRadius(d);
                    if (render.setting.drawParent) {
                        c = d.color;
                        bufCtx.save();
                        if (render.setting.drawPaddingCircle) {
                            bufCtx.beginPath();
                            bufCtx.strokeStyle = "none";
                            bufCtx.fillStyle = "#ff0000";
                            bufCtx.arc(x, y, s + render.setting.padding, 0, PI_CIRCLE, true);
                            bufCtx.closePath();
                            bufCtx.fill();
                            bufCtx.stroke();
                        }
                        img = render.setting.drawParentImg ? d.img || defImg : null;
                        img = img && img.width && img.height ? img : null;
                        bufCtx.beginPath();
                        bufCtx.strokeStyle = "transparent";
                        bufCtx.fillStyle = img ? "transparent" : c;
                        bufCtx.arc(x, y, s, 0, PI_CIRCLE, true);
                        bufCtx.fill();
                        bufCtx.stroke();
                        bufCtx.closePath();
                        if (img) {
                            bufCtx.clip();
                            bufCtx.drawImage(img, x - s, y - s, s * 2, s * 2);
                        }
                        bufCtx.restore();
                    }
                    if (render.setting.drawParentLabel) {
                        c = d.flash ? "white" : "gray";
                        bufCtx.fillStyle = c;
                        setFontSize(s / 2);
                        bufCtx.textAlign = "center";
                        bufCtx.fillText(getParentLabel(d), x, y + s * (render.setting.drawParent ? 1.5 : .5));
                    }
                }
            }
            bufCtx.restore();
            return bufCanvas;
        };
        render.resize = function(arg) {
            if (!arguments.length) return render.size;
            render.size = arg;
            if (bufCanvas) {
                bufCanvas.width = arg[0];
                bufCanvas.height = arg[1];
            }
            if (trackCanvas) {
                trackCanvas.width = arg[0];
                trackCanvas.height = arg[1];
            }
        };
        (function() {
            defImg = new Image();
            defImg.src = "data:image/png;base64,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";
            particleImg = new Image();
            particleImg.src = "data:image/png;base64,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";
        })();
        function generateNeonBall(w, h, r, g, b, a) {
            var tempCanvas = document.createElement("canvas");
            tempCanvas.width = w;
            tempCanvas.height = h;
            var imgCtx = tempCanvas.getContext("2d");
            var gradient = imgCtx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            gradient.addColorStop(0, "rgba(255,255,255," + a + ")");
            gradient.addColorStop(.3, "rgba(" + [ r, g, b, a * .5 ] + ")");
            gradient.addColorStop(1, "rgba(" + [ r, g, b, 0 ] + ")");
            imgCtx.fillStyle = gradient;
            imgCtx.fillRect(0, 0, w, h);
            return tempCanvas;
        }
        function colorize(img, r, g, b, a) {
            var tempCanvas = document.createElement("canvas");
            if (!img || !img.width) return tempCanvas;
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            var imgCtx = tempCanvas.getContext("2d"), imgData, i;
            imgCtx.drawImage(img, 0, 0);
            imgData = imgCtx.getImageData(0, 0, img.width, img.height);
            i = imgData.data.length;
            while ((i -= 4) > -1) {
                imgData.data[i + 3] = imgData.data[i] * a;
                if (imgData.data[i + 3]) {
                    imgData.data[i] = r;
                    imgData.data[i + 1] = g;
                    imgData.data[i + 2] = b;
                }
            }
            imgCtx.putImageData(imgData, 0, 0);
            return tempCanvas;
        }
        return render;
    }
    blackhole = function(node) {
        var parentNode = node || document.body, parser = Parser(), processor = Processor(), render = Render(), bh = {
            version: blackhole.version,
            IsRun: processor.IsRun,
            IsPaused: processor.IsPaused,
            stop: processor.stop,
            pause: processor.pause,
            resume: processor.resume,
            setting: {
                alpha: .025,
                childLife: 255,
                parentLife: 255,
                edgeLife: 255,
                rateOpacity: .5,
                rateFlash: 2.5,
                blendingLighter: false,
                increaseChildWhenCreated: false,
                increaseChild: true,
                createNearParent: false,
                zoomAndDrag: true,
                zoom: null,
                scale: 1,
                translate: [ 0, 0 ],
                scaleExtent: [ .1, 8 ],
                colorless: "rgb(128, 128, 128)",
                colorlessFlash: "rgb(211, 211, 211)"
            }
        }, hashOnAction = {}, lastEvent = {
            translate: [ 0, 0 ],
            scale: 1
        }, selected, userSelected, selectedCategory, frozenCategory, nodes, links, incData, idLayer = layersCounter++, layer, valid, rqId, restart, canvas, ctx, xW, yH, zoom, zoomScale, forceChild, forceParent, restartFunction;
        bh.selectNode = function(node) {
            if (!arguments.length) return selected;
            selected = node;
            return bh;
        };
        bh.selectCategory = function(category) {
            if (!arguments.length) return selectedCategory;
            selectedCategory = category;
            return bh;
        };
        bh.frozenCategory = function(category) {
            if (!arguments.length) return frozenCategory;
            frozenCategory = category;
            return bh;
        };
        bh.parents = function(arg) {
            if (!arguments.length) return parser.parentHash;
            if (arg instanceof Object) arg = d3.map(arg);
            parser.parentHash = arg;
            return bh;
        };
        bh.children = function(arg) {
            if (!arguments.length) return parser.childHash;
            if (arg instanceof Object) arg = d3.map(arg);
            parser.childHash = arg;
            return bh;
        };
        bh.categories = function(arg) {
            if (!arguments.length) return parser.categoryHash;
            if (arg instanceof Object) arg = d3.map(arg);
            parser.categoryHash = arg;
            return bh;
        };
        bh.categoryMax = function(val) {
            if (!arguments.length) return parser.categoryMax;
            parser.categoryMax = +val;
            return bh;
        };
        (function() {
            var reg = /^draw/;
            function makeGetterSetter(obj, key) {
                return {
                    get: function() {
                        return obj[key];
                    },
                    set: function(value) {
                        obj[key] = value;
                    },
                    enumerable: true
                };
            }
            d3.map(render.setting).keys().filter(function(key) {
                return reg.test(key);
            }).concat([ "lengthTrack", "padding" ]).forEach(function(key) {
                Object.defineProperty(bh.setting, key, makeGetterSetter(render.setting, key));
            });
            Object.defineProperty(bh.setting, "parentColors", makeGetterSetter(parser.setting, "parentColor"));
            Object.defineProperty(bh.setting, "categoryColors", makeGetterSetter(parser.setting, "childColor"));
            Object.defineProperty(bh.setting, "skipEmptyDate", makeGetterSetter(processor.setting, "skipEmptyDate"));
            Object.defineProperty(bh.setting, "realtime", makeGetterSetter(processor.setting, "realtime"));
            Object.defineProperty(bh.setting, "speed", makeGetterSetter(processor.setting, "step"));
            Object.defineProperty(bh.setting, "blendingLighter", {
                get: function() {
                    return render.setting.compositeOperation === "lighter";
                },
                set: function(value) {
                    render.setting.compositeOperation = value === true ? "lighter" : "source-over";
                },
                enumerable: true
            });
        })();
        bh.setting.drawEdge = false;
        bh.setting.drawChild = true;
        bh.setting.drawChildLabel = false;
        bh.setting.drawParent = true;
        bh.setting.drawParentLabel = true;
        bh.setting.drawPaddingCircle = false;
        bh.setting.drawHalo = true;
        bh.setting.drawTrack = false;
        bh.setting.drawVanishingTail = true;
        bh.setting.drawAsPlasma = true;
        bh.setting.drawParentImg = true;
        bh.setting.padding = 25;
        bh.setting.blendingLighter = true;
        bh.setting.hasLabelMaxWidth = true;
        bh.setting.realtime = false;
        bh.setting.asyncParsing = false;
        bh.setting.skipEmptyDate = true;
        bh.on = function(key, value) {
            if (!key || !(typeof key === "string")) return bh;
            key = key.toLowerCase();
            if (arguments.length < 2) return isFun(hashOnAction[key]) ? hashOnAction[key]() : undefined;
            isFun(hashOnAction[key]) && hashOnAction[key](value);
            return bh;
        };
        (function() {
            hashOnAction["calcrightbound"] = processor.onCalcRightBound;
            hashOnAction["processing"] = processor.onProcessing;
            hashOnAction["processed"] = processor.onProcessed;
            hashOnAction["stopped"] = processor.onStopped;
            hashOnAction["beforeparsing"] = parser.setting.onBeforeParsing;
            hashOnAction["parsing"] = parser.setting.onParsing;
            hashOnAction["afterparsing"] = parser.setting.onAfterParsing;
            hashOnAction["getchildlabel"] = render.setting.onGetChildLabel;
            hashOnAction["getparentlabel"] = render.setting.onGetParentLabel;
            hashOnAction["getselectedcolor"] = attachGetSelectedColor;
            hashOnAction["getvisiblebystep"] = attachGetVisibleByStep;
            hashOnAction["getcreatenearparent"] = attachGetCreateNearParent;
            var reg = /^get/;
            d3.map(parser.setting).keys().forEach(function(key) {
                if (reg.test(key)) hashOnAction[key.toLowerCase()] = parser.setting[key];
            });
        })();
        function defaultSort(a, b) {
            var fn = parser.setting.getGroupBy();
            return d3.ascending(fn(a), fn(b));
        }
        bh.sort = function(arg) {
            if (!arguments.length) return bh.sort.value;
            bh.sort.value = arg;
            return bh;
        };
        bh.sort(defaultSort);
        function defaultFilter(l, r) {
            return incData.filter(function(d) {
                var value = parser.setting.getGroupBy()(d);
                return value >= l && value < r;
            });
        }
        bh.filter = function(arg) {
            if (!arguments.length) return processor.onFilter();
            if (!isFun(arg)) arg = defaultFilter;
            processor.onFilter(arg);
            return bh;
        };
        bh.filter(null);
        bh.speed = function(milliseconds) {
            var result = processor.step(milliseconds);
            if (result == processor) return bh;
            return result;
        };
        function checkLinks(d, s) {
            if (d.type === typeNode.parent) return false;
            var key = parser.setting.getParentKey()(s.nodeValue) + "_" + parser.setting.getChildKey()(d.nodeValue);
            return links.has(key);
        }
        function defaultGetSelectedColor(d) {
            var category = selectedCategory;
            bh.setting.colorlessFlash = d3.rgb(bh.setting.colorlessFlash || "gray");
            bh.setting.colorless = d3.rgb(bh.setting.colorless || "lightgray");
            if (!category && selected) {
                if (selected.type == typeNode.parent) {
                    return !(d.parent === selected || checkLinks(d, selected)) ? d.flash ? bh.setting.colorlessFlash : bh.setting.colorless : d.flash ? d.flashColor : d.d3color;
                }
                if (selected.category) category = selected.category;
            }
            return category && category !== d.category ? d.flash ? bh.setting.colorlessFlash : bh.setting.colorless : d.flash ? d.flashColor : d.d3color;
        }
        function attachGetSelectedColor(arg) {
            if (!arguments.length) return render.onGetSelectedColor();
            if (!isFun(arg)) arg = defaultGetSelectedColor;
            render.onGetSelectedColor(arg);
        }
        bh.on("getSelectedColor", defaultGetSelectedColor);
        function defaultGetVisibleByStep() {
            return true;
        }
        function attachGetVisibleByStep(arg) {
            if (!arguments.length) return attachGetVisibleByStep.value;
            if (!isFun(arg)) arg = defaultGetVisibleByStep;
            attachGetVisibleByStep.value = arg;
        }
        bh.on("getVisibleByStep", defaultGetVisibleByStep);
        function defaultGetCreateNearParent() {
            return false;
        }
        function attachGetCreateNearParent(arg) {
            if (!arguments.length) return attachGetCreateNearParent.value;
            if (!isFun(arg)) arg = defaultGetCreateNearParent;
            attachGetCreateNearParent.value = arg;
        }
        bh.on("getCreateNearParent", defaultGetCreateNearParent);
        bh.on("getParentLabel", function(d) {
            return d.nodeValue.name;
        });
        [ "getChildCharge", "finished", "starting", "started", "mouseovernode", "mousemove", "mouseoutnode", "particleattarget" ].forEach(function(key) {
            hashOnAction[key] = func(hashOnAction, key);
        });
        function doFunc(key) {
            return getFun(hashOnAction, key);
        }
        function doGetChildCharge(d) {
            return doFunc("getChildCharge")(d);
        }
        function doStating() {
            return doFunc("starting")();
        }
        function doStarted() {
            return doFunc("started")();
        }
        function doFinished(dl, dr) {
            return doFunc("finished")(dl, dr);
        }
        function doMouseOverNode(d, e) {
            return doFunc("mouseovernode")(d, e);
        }
        function doMouseOutNode(d, e) {
            return doFunc("mouseoutnode")(d, e);
        }
        function doMouseMove(d, e) {
            return doFunc("mousemove")(d, e);
        }
        function doParticleAtTarget(d, p) {
            return doFunc("particleattarget")(d, p);
        }
        bh.size = function(arg) {
            if (!arguments.length) return parser.size;
            render.resize(parser.size = arg);
            if (canvas) {
                canvas.width = arg[0];
                canvas.height = arg[1];
            }
            xW && (xW = d3.scale.linear().range([ 0, arg[0] ]).domain([ 0, arg[0] ]));
            yH && (yH = d3.scale.linear().range([ 0, arg[1] ]).domain([ 0, arg[1] ]));
            updateWHScale();
            forceChild && forceChild.size(arg);
            forceParent && forceParent.size(arg);
            return bh;
        };
        function normalizeRadius(d) {
            return d.size > 0 ? d.size : 0;
        }
        function checkVisible(d, offsetx, offsety) {
            var tx = lastEvent.translate[0] / lastEvent.scale, ty = lastEvent.translate[1] / lastEvent.scale;
            offsetx = offsetx || 0;
            if (!(offsetx instanceof Array)) offsetx = [ offsetx, offsetx ];
            offsety = offsety || 0;
            if (!(offsety instanceof Array)) offsety = [ offsety, offsety ];
            return d.x + d.size > -tx + offsetx[0] && d.x - d.size < -tx + offsetx[1] + bh.size()[0] / lastEvent.scale && d.y + d.size > -ty + offsety[0] && d.y - d.size < -ty + offsety[1] + bh.size()[1] / lastEvent.scale;
        }
        function updateWHScale() {
            if (!lastEvent) return;
            var tl = lastEvent.translate[0] / lastEvent.scale, tt = lastEvent.translate[1] / lastEvent.scale, size = bh.size();
            xW && xW.range([ -tl, -tl + size[0] / lastEvent.scale ]).domain([ 0, size[0] ]);
            yH && yH.range([ -tt, -tt + size[1] / lastEvent.scale ]).domain([ 0, size[1] ]);
            valid = false;
        }
        function zooming() {
            if (!bh.setting.zoomAndDrag) return;
            lastEvent.translate = d3.event.translate.slice(0);
            lastEvent.scale = d3.event.scale;
            updateWHScale();
        }
        bh.translate = function(point) {
            if (!arguments.length || !(point instanceof Array)) return lastEvent.translate;
            lastEvent.translate = point.slice(0);
            updateWHScale();
            return bh;
        };
        bh.scale = function(s) {
            if (!arguments.length) return lastEvent.scale;
            lastEvent.scale = s;
            updateWHScale();
            return bh;
        };
        function tick() {
            if (restart) {
                forceParent.stop();
                forceChild.stop();
                return;
            }
            var haveVisible = false;
            if (forceChild.nodes()) {
                var fn = cluster(bh.setting.alpha);
                forceChild.nodes().forEach(function(d) {
                    fn(d);
                    haveVisible = haveVisible || d.visible;
                });
                forceParent.nodes(forceParent.nodes().filter(filterParentNodes));
            }
            var checkParent = bh.setting.parentLife > 0 && forceParent.nodes() && forceParent.nodes().length;
            if (restart || !(processor.IsRun() || haveVisible || checkParent)) {
                forceParent.stop();
                forceChild.stop();
                return;
            }
            forceParent.resume();
            forceChild.resume();
        }
        function filterParentNodes(d) {
            blink(d, !d.links && bh.setting.parentLife > 0);
            if (d.visible && d.links === 0 && bh.setting.parentLife > 0) {
                d.flash = 0;
                d.alive = d.alive / 10;
            }
            return d.visible;
        }
        function cluster(alpha) {
            parser.parentHash.forEach(function(k, d) {
                d.links = 0;
            });
            return function(d) {
                if (restart) return;
                blink(d, bh.setting.childLife > 0);
                if (!d.parent || !d.visible) return;
                var node = d.parent, l, r, x, y, dl, pr;
                if (node === d) return;
                node.links++;
                render.calcDrawCoords(d);
                dl = dist(d.drawX - node.x, d.drawY - node.y);
                x = d.x - node.x;
                y = d.y - node.y;
                l = Math.sqrt(x * x + y * y);
                pr = render.onGetNodeRadius()(node) + bh.setting.padding;
                r = render.onGetNodeRadius()(d) / 2 + pr;
                if (typeof d.lr !== "undefined" && d.lr - l < alpha * 10) {
                    if (!d.atTarget) {
                        d.atTarget = true;
                        doParticleAtTarget(d, node);
                    }
                }
                d.lr = dl;
                l = dl;
                if (l !== r) {
                    l = (l - r) / (l || 1) * (alpha || 1);
                    x *= l;
                    y *= l;
                    d.x -= x;
                    d.y -= y;
                }
                d.paths && d.flash && d.paths.push({
                    x: d.drawX,
                    y: d.drawY
                });
            };
        }
        function blink(d, aliveCheck) {
            if (processor.IsPaused()) return;
            d.flash = (d.flash -= bh.setting.rateFlash) > 0 ? d.flash : 0;
            !d.flash && aliveCheck && (d.alive = d.alive-- > 0 ? d.alive : 0);
            d.opacity = !d.alive ? (d.opacity -= bh.setting.rateOpacity) > 0 ? d.opacity : 0 : d.opacity;
            d.visible && !d.opacity && (d.visible = false);
        }
        function filterVisible(d) {
            var vis = checkVisible(d) && (d.visible || d.alive);
            !vis && d.type === typeNode.child && (d.paths = []);
            return vis && (d.type !== typeNode.child || !frozenCategory || frozenCategory === d.category);
        }
        function filterChild(d) {
            !d.visible && (d.paths = []);
            return d.type !== typeNode.parent && (d.visible || d.opacity);
        }
        function filterParent(d) {
            return d.type === typeNode.parent && (d.visible || d.opacity);
        }
        render.onGetChildNodes(function() {
            var sort = null;
            var data = !restart && forceChild ? forceChild.nodes().filter(filterVisible).sort() : [];
            return isFun(sort) ? data.sort(function(a, b) {
                return sort(a.nodeValue, b.nodeValue);
            }) : data;
        });
        render.onGetParentNodes(function() {
            return !restart && forceParent ? forceParent.nodes().filter(filterVisible) : [];
        });
        render.onGetLinks(function() {
            return links ? links.values().filter(function(d) {
                return d.source && d.target && d.source.opacity && d.target.opacity;
            }) : [];
        });
        render.onGetLastEvent(function() {
            return lastEvent;
        });
        render.onGetSelectedNode(function() {
            return selected;
        });
        render.onGetNodeRadius(function(d) {
            return d.type == typeNode.child ? Math.sqrt(normalizeRadius(d)) : normalizeRadius(d);
        });
        processor.onRecalc(function reCalc(d) {
            if (!processor.IsRun() || restart) return;
            var l = d.nodes.length, n, p, fn, ind;
            p = d.parentNode;
            p.fixed = p.permanentFixed || p == selected;
            if (!l) console.log(d); else {
                p.alive = bh.setting.parentLife > 0 ? bh.setting.parentLife : 1;
                p.opacity = 100;
                p.flash = 100;
                p.visible = true;
            }
            while (l--) {
                n = d.nodes[l];
                if (n.fixed && n !== selected) {
                    if (bh.setting.createNearParent && attachGetCreateNearParent()(d, n)) {
                        n.x = +p.x + 30 * Math.cos(Math.random() * Math.PI * 2);
                        n.y = +p.y + 30 * Math.sin(Math.random() * Math.PI * 2);
                    } else {
                        n.x = d.x || xW(n.x);
                        n.y = d.y || yH(n.y);
                    }
                    n.paths = [];
                    if (bh.setting.increaseChildWhenCreated) {
                        n.correctSize = n.size;
                        n.size *= 3;
                    }
                } else {
                    n.size = n.hasOwnProperty("correctSize") ? n.correctSize : n.size;
                    delete n["correctSize"];
                }
                bh.setting.increaseChild && (n.size += 1);
                n.fixed = false;
                n.from = n.parent && n.parent !== p ? n.parent : n.from || {
                    x: n.x,
                    y: n.y
                };
                n.parent = p;
                delete n.atTarget;
                delete n.lr;
                n.visible = attachGetVisibleByStep()(d, n);
                fn = parser.setting.getChildKey()(n.nodeValue);
                n.flash = 100;
                n.opacity = 100;
                n.alive = bh.setting.childLife > 0 ? bh.setting.childLife : 1;
                if (n.visible) {
                    n.category.now.indexOf(fn) < 0 && n.category.now.push(fn);
                } else {
                    (ind = n.category.now.indexOf(fn)) > -1 && n.category.now.splice(ind, 1);
                    n.flash *= .5;
                    n.alive *= .2;
                    n.opacity *= .5;
                }
                var key = parser.setting.getParentKey()(p.nodeValue) + "_" + fn;
                if (links && !links.has(key)) links.set(key, {
                    key: key,
                    source: p,
                    target: n
                });
            }
            forceChild && forceChild.nodes(nodes.filter(filterChild)).start();
            forceParent && forceParent.nodes(nodes.filter(filterParent)).start();
        });
        processor.onFinished(function(dl, dr) {
            doFinished(dl, dr);
        });
        processor.onStarted(function() {
            restart = false;
            render.reset();
            if (!rqId) doRender();
            doStarted();
        });
        function doRender() {
            if (restart) return restartFunction && restartFunction();
            rqId = requestAnimationFrame(doRender, undefined);
            if (!ctx || valid) return;
            valid = true;
            ctx.save();
            ctx.clearRect(0, 0, bh.size()[0], bh.size()[1]);
            ctx.drawImage(render.draw(), 0, 0);
            ctx.restore();
            valid = false;
        }
        function contain(d, pos) {
            var px = (lastEvent.translate[0] - pos[0]) / lastEvent.scale, py = (lastEvent.translate[1] - pos[1]) / lastEvent.scale, r = Math.sqrt(Math.pow(d.x + px, 2) + Math.pow(d.y + py, 2)), dr = render.onGetNodeRadius()(d);
            return r < dr * (d.type == typeNode.parent ? 1.5 : 1);
        }
        function getNodeFromPos(pos) {
            for (var i = nodes.length - 1; i >= 0; i--) {
                var d = nodes[i];
                if ((!d.fixed || d.permanentFixed) && d.opacity && contain(d, pos) && (!frozenCategory || d.category === frozenCategory)) return d;
            }
            return null;
        }
        function moveMouse(d) {
            var item = arguments.length > 1 && arguments[1] instanceof HTMLCanvasElement ? arguments[1] : this;
            d = null;
            if (selected) {
                var od = selected;
                if (contain(od, d3.mouse(item))) d = od;
                if (!d) {
                    doMouseOutNode(od, d3.event);
                    if (od) od.type == typeNode.child ? od.fixed &= 3 : od.permanentFixed || (od.fixed &= 3);
                    selected = null;
                    layer.style("cursor", null);
                }
            } else d = getNodeFromPos(d3.mouse(item));
            if (d) {
                selected = d;
                d.fixed |= 4;
                layer && layer.style("cursor", "pointer");
                doMouseOverNode(d, d3.event);
            }
            doMouseMove(d, d3.event);
        }
        function resortNodes(a, b) {
            return a.type == typeNode.child && b.type == typeNode.child ? d3.ascending(incData.indexOf(a.nodeValue), incData.indexOf(b.nodeValue)) : -Infinity;
        }
        function reInitNode(a) {
            a.alive = 0;
            a.flash = 0;
            a.opacity = 0;
            a.parent = null;
            a.visible = false;
            parser.setInitState(a);
            a.fixed = a.type == typeNode.child || a.permanentFixed;
            delete a.px;
            delete a.py;
            delete a.atTarget;
            delete a.lr;
        }
        bh.data = function() {
            return incData;
        };
        bh.append = function(data, removeOld, force) {
            if (!(data instanceof Array) || !nodes) return false;
            if (removeOld) {
                var l = nodes.length, a, ia;
                while (l--) {
                    a = nodes[l];
                    if (a.type === typeNode.child && (force || !a.opacity && !a.fixed)) {
                        ia = incData.indexOf(a.nodeValue);
                        nodes.splice(l, 1);
                        ~ia && incData.splice(ia, 1);
                    }
                }
            }
            incData.push.apply(incData, data);
            nodes.push.apply(nodes, parser.nodes(data));
            processor.IsRun() && processor.pause();
            var bound = d3.extent(data.map(parser.setting.getGroupBy()));
            processor.boundRange = [ processor.boundRange[0] > processor.boundRange[1] ? processor.boundRange[1] + 1 : processor.boundRange[0], bound[1] ];
            processor.IsRun() && processor.resume();
            return true;
        };
        bh.start = function(inData, width, height, reInitData, callback) {
            restart = true;
            processor.killWorker();
            if (rqId) restartFunction = insideRestartShow; else insideRestartShow();
            function insideRestartShow() {
                restartFunction = null;
                rqId = null;
                if (!reInitData && nodes) {
                    nodes.sort(function(a, b) {
                        reInitNode(a);
                        reInitNode(b);
                        return resortNodes(a, b);
                    });
                    parser.refreshCategories();
                }
                if (!(inData || []).length) return;
                layer = parentNode.selectAll ? parentNode : d3.select(parentNode);
                if (!(inData || []).length) {
                    layer.selectAll("*").remove();
                    return;
                }
                var w = width || layer.node().clientWidth;
                var h = height || layer.node().clientHeight;
                bh.size([ w, h ]);
                doStating();
                forceChild && forceChild.nodes([]).stop();
                forceParent && forceParent.nodes([]).stop();
                if (!incData || !nodes || reInitData) {
                    nodes && (nodes.length = 0);
                    var sort = bh.sort();
                    incData && (incData.length = 0);
                    incData = isFun(sort) ? inData.sort(sort) : inData;
                    parser.init();
                    if (!bh.setting.asyncParsing) {
                        nodes = parser.nodes(incData);
                        initCallback(w, h, callback);
                    } else {
                        parser.nodes(incData, function(newNodes) {
                            nodes = newNodes;
                            initCallback(w, h, callback);
                        });
                    }
                } else {
                    initCallback(w, h, callback);
                }
            }
            return bh;
        };
        function initCallback(w, h, callback) {
            links = d3.map({});
            processor.boundRange = d3.extent(incData.map(parser.setting.getGroupBy()));
            layer.selectAll("*").remove();
            lastEvent = {
                translate: bh.setting.translate instanceof Array ? bh.setting.translate : [ 0, 0 ],
                scale: bh.setting.scale != null ? bh.setting.scale : 1
            };
            w = bh.size()[0];
            h = bh.size()[1];
            xW = xW || d3.scale.linear().range([ 0, w ]).domain([ 0, w ]);
            yH = yH || d3.scale.linear().range([ 0, h ]).domain([ 0, h ]);
            zoom = bh.setting.zoom || d3.behavior.zoom().scaleExtent(bh.setting.scaleExtent instanceof Array ? bh.setting.scaleExtent : [ .1, 8 ]).scale(lastEvent.scale).translate(lastEvent.translate).on("zoom", zooming);
            ctx = null;
            canvas = layer.append("canvas").text("This browser doesn't support element type of Canvas.").attr("width", w).attr("height", h).attr("id", "canvas_bh_" + idLayer).call(zoom).on("mousemove.tooltip", moveMouse).node();
            bh.style({
                position: "absolute",
                top: 0,
                left: 0
            });
            var tf = bh.findStyleProperty([ "transform", "WebkitTransform", "OTransform", "MozTransform", "msTransform" ]);
            tf && bh.style(tf, "translate3d(0px, 0px, 0px)");
            applyStyleWhenStart();
            ctx = canvas.getContext("2d");
            forceChild = (forceChild || d3.layout.force().stop().size([ w, h ]).friction(.75).gravity(0).charge(function(d) {
                return -render.onGetNodeRadius()(d);
            }).on("tick", tick)).nodes([]);
            zoomScale = d3.scale.linear().range([ 5, 1 ]).domain([ .1, 1 ]);
            forceParent = (forceParent || d3.layout.force().stop().size([ w, h ]).gravity(bh.setting.padding * .001).charge(function(d) {
                return -(bh.setting.padding + d.size) * 8;
            })).nodes([]);
            restart = false;
            processor.start();
            bh.size([ w, h ]);
            forceChild.start();
            forceParent.start();
            isFun(callback) && callback(bh);
        }
        bh.getCanvas = function() {
            return canvas;
        };
        bh.findStyleProperty = function(props) {
            var style = document.documentElement.style;
            for (var i = 0; i < props.length; i++) {
                if (props[i] in style) {
                    return props[i];
                }
            }
            return false;
        };
        var hashStyle = document.createElement("canvas");
        bh.style = function(name, value, priority) {
            var n = arguments.length;
            var target = d3.selectAll([ hashStyle ]);
            if (canvas) target = d3.selectAll([ hashStyle, canvas ]);
            if (n < 3) {
                if (typeof name !== "string") {
                    target.style(name);
                    return bh;
                }
                if (n < 2) return d3.select(hashStyle).style(name);
                priority = "";
            }
            target.style(name, value, priority);
            return bh;
        };
        function applyStyleWhenStart() {
            d3.select(canvas).attr("style", d3.select(hashStyle).attr("style"));
        }
        return bh;
    };
    blackhole.utils = {
        isFun: isFun,
        func: func,
        getFun: getFun,
        emptyFun: emptyFun
    };
    d3.blackHole = blackhole;
}();