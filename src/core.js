import "common";

blackhole = function (node) {
    // environment variables
    var parentNode = node || document.body
        , parser = Parser()
        , processor = Processor()
        , render = Render()
        , bh = {
            version : blackhole.version
            , IsRun : processor.IsRun
            , IsPaused : processor.IsPaused
            , stop : processor.stop
            , pause : processor.pause
            , resume : processor.resume

            , setting : {
                alpha : 0.025
                , childLife : 255 // number of steps of life a file
                , parentLife : 255 // number of steps of life a user
                , edgeLife : 255 // number of steps of life a edge
                , rateOpacity : .5 // rate of decrease of opacity
                , rateFlash : 2.5 // rate of decrease of flash
                , blendingLighter : false // blending mode for canvas
                , increaseChildWhenCreated : false // when a child is created his size will be increased
                , createNearParent : false
                , zoomAndDrag : true // enable zooming and padding
                , zoom : null // function d3.zoom
                , scale : 1 // initial scale
                , translate : [0, 0] // initial translate
                , scaleExtent : [.1, 8]

                , colorless : "rgb(128, 128, 128)"
                , colorlessFlash : "rgb(211, 211, 211)"

                //, showCountExt : true // show table of file's extension
                //, onlyShownExt : true // show only extension which is shown
                //, showHistogram : true // displaying histogram of changed files
                //, showCommitMessage : false // show commit message
                //, skipEmptyDate : true // skip empty date
            }
        }
        , hashOnAction = {}
        , lastEvent = {
            translate: [0, 0],
            scale : 1
        }
        , selected
        , userSelected
        , selectedCategory
        , frozenCategory
        , nodes
        , links
        , incData
        , idLayer = layersCounter++
        , layer
        , valid
        , rqId
        , restart
        , canvas
        , ctx

        , xW
        , yH
        , zoom
        , zoomScale
        , forceChild
        , forceParent

        , restartFunction
        ;

    bh.selectNode = function(node) {
        if (!arguments.length)
            return selected;
        selected = node;
        return bh;
    };

    bh.selectCategory = function(category) {
        if (!arguments.length)
            return selectedCategory;
        selectedCategory = category;
        return bh;
    };

    bh.frozenCategory = function(category) {
        if (!arguments.length)
            return frozenCategory;
        frozenCategory = category;
        return bh;
    };

    bh.parents = function(arg) {
        if (!arguments.length)
            return parser.parentHash;
        if (arg instanceof Object)
            arg = d3.map(arg);
        parser.parentHash = arg;
        return bh;
    };

    bh.children = function(arg) {
        if (!arguments.length)
            return parser.childHash;
        if (arg instanceof Object)
            arg = d3.map(arg);
        parser.childHash = arg;
        return bh;
    };

    bh.categories = function(arg) {
        if (!arguments.length)
            return parser.categoryHash;
        if (arg instanceof Object)
            arg = d3.map(arg);
        parser.categoryHash = arg;
        return bh;
    };

    bh.categoryMax = function(val) {
        if(!arguments.length)
            return parser.categoryMax;
        parser.categoryMax = +val;
        return bh;
    };

    (function() {
        var reg = /^draw/;

        function makeGetterSetter(obj, key) {
            return {
                get : function() { return obj[key]; },
                set : function(value) { obj[key] = value; },
                enumerable: true
            }
        }

        d3.map(render.setting).keys()
            .filter(function(key) { return reg.test(key); })
            .concat(['lengthTrack', 'padding'])
            .forEach(function(key) {
                Object.defineProperty(bh.setting, key, makeGetterSetter(render.setting, key));
            });

        Object.defineProperty(bh.setting, 'parentColors', makeGetterSetter(parser.setting, 'parentColor'));
        Object.defineProperty(bh.setting, 'categoryColors', makeGetterSetter(parser.setting, 'childColor'));
        Object.defineProperty(bh.setting, 'skipEmptyDate', makeGetterSetter(processor.setting, 'skipEmptyDate'));
        Object.defineProperty(bh.setting, 'realtime', makeGetterSetter(processor.setting, 'realtime'));
        Object.defineProperty(bh.setting, 'speed', makeGetterSetter(processor.setting, 'step'));
        Object.defineProperty(bh.setting, 'blendingLighter', {
            get : function() { return render.setting.compositeOperation === 'lighter'; },
            set : function(value) { render.setting.compositeOperation = value === true ? 'lighter' : 'source-over'; },
            enumerable: true
        });

    })();

    bh.setting.drawEdge = false; // draw a edge
    bh.setting.drawChild = true; // draw a child
    bh.setting.drawChildLabel = false; // draw a label of child
    bh.setting.drawParent = true; // draw a parent
    bh.setting.drawParentLabel = true; // draw a label of parent
    bh.setting.drawPaddingCircle = false; // draw a circle of padding
    bh.setting.drawHalo = true; // draw a halo
    bh.setting.drawTrack = false; // draw a track of child
    bh.setting.drawVanishingTail = true; // draw a tail of child as dissolved
    bh.setting.drawAsPlasma = true; // draw a child as plasma
    bh.setting.drawParentImg = true; // draw an image of parent
    bh.setting.padding = 25; // parent padding
    bh.setting.blendingLighter = true;
    bh.setting.hasLabelMaxWidth = true;
    bh.setting.realtime = false;
    bh.setting.asyncParsing = false;


    bh.on = function(key, value) {
        if (!key || !(typeof key === 'string'))
            return bh;
        key = key.toLowerCase();
        if (arguments.length < 2)
            return isFun(hashOnAction[key]) ? hashOnAction[key]() : undefined;
        isFun(hashOnAction[key]) && hashOnAction[key](value);
        return bh;
    };

    (function() {
        hashOnAction['calcrightbound'] = processor.onCalcRightBound;
        hashOnAction['processing'] = processor.onProcessing;
        hashOnAction['processed'] = processor.onProcessed;
        hashOnAction['stopped'] = processor.onStopped;

        hashOnAction['beforeparsing'] = parser.setting.onBeforeParsing;
        hashOnAction['parsing'] = parser.setting.onParsing;
        hashOnAction['afterparsing'] = parser.setting.onAfterParsing;


        hashOnAction['getchildlabel'] = render.setting.onGetChildLabel;
        hashOnAction['getparentlabel'] = render.setting.onGetParentLabel;
        hashOnAction['getselectedcolor'] = attachGetSelectedColor;
        hashOnAction['getvisiblebystep'] = attachGetVisibleByStep;
        hashOnAction['getcreatenearparent'] = attachGetCreateNearParent;

        var reg = /^get/;
        d3.map(parser.setting).keys().forEach(function(key) {
            if (reg.test(key))
                hashOnAction[key.toLowerCase()] = parser.setting[key];
        });
    })();

    function defaultSort(a, b) {
        var fn = parser.setting.getGroupBy();
        return d3.ascending(fn(a), fn(b));
    }
    bh.sort = function(arg) {
        if (!arguments.length)
            return bh.sort.value;
        bh.sort.value = arg;
        return bh;
    };
    bh.sort(defaultSort);

    function defaultFilter(l, r) {
        return incData.filter(function (d) {
            var value = parser.setting.getGroupBy()(d);
            return value >= l && value < r;
        });
    }
    bh.filter = function(arg) {
        if (!arguments.length)
            return processor.onFilter();
        if(!isFun(arg))
            arg = defaultFilter;
        processor.onFilter(arg);
        return bh;
    };
    bh.filter(null);

    bh.speed = function(milliseconds) {
        var result = processor.step(milliseconds);
        if (result == processor)
            return bh;
        return result;
    };

    function checkLinks(d, s) {
        if (d.type === typeNode.parent)
            return false;

        var key = parser.setting.getParentKey()(s.nodeValue) + "_" + parser.setting.getChildKey()(d.nodeValue);
        return links.has(key);
    }

    function defaultGetSelectedColor(d) {
        var category = selectedCategory;

        bh.setting.colorlessFlash = d3.rgb(bh.setting.colorlessFlash || 'gray');
        bh.setting.colorless = d3.rgb(bh.setting.colorless || 'lightgray');

        if (!category && selected) {
            if (selected.type == typeNode.parent) {
                return !(d.parent === selected || checkLinks(d, selected))
                    ? d.flash ? bh.setting.colorlessFlash : bh.setting.colorless
                    : d.flash ? d.flashColor : d.d3color;
            }
            if (selected.category)
                category = selected.category;
        }

        return category && category !== d.category
            ? d.flash ? bh.setting.colorlessFlash : bh.setting.colorless
            : d.flash ? d.flashColor : d.d3color;
    }
    function attachGetSelectedColor(arg) {
        if (!arguments.length)
            return render.onGetSelectedColor();
        if(!isFun(arg))
            arg = defaultGetSelectedColor;
        render.onGetSelectedColor(arg);
    }
    bh.on('getSelectedColor', defaultGetSelectedColor);

    function defaultGetVisibleByStep() {
        return true;
    }
    function attachGetVisibleByStep(arg) {
        if(!arguments.length)
            return attachGetVisibleByStep.value;
        if(!isFun(arg))
            arg = defaultGetVisibleByStep;
        attachGetVisibleByStep.value = arg;
    }
    bh.on('getVisibleByStep', defaultGetVisibleByStep);

    function defaultGetCreateNearParent() {
        return false;
    }
    function attachGetCreateNearParent(arg) {
        if(!arguments.length)
            return attachGetCreateNearParent.value;
        if(!isFun(arg))
            arg = defaultGetCreateNearParent;
        attachGetCreateNearParent.value = arg;
    }
    bh.on('getCreateNearParent', defaultGetCreateNearParent);

    bh.on('getParentLabel', function(d) {
        return d.nodeValue.name;
    });

    ['finished', 'starting', 'started', 'mouseovernode', 'mousemove', 'mouseoutnode', 'particleattarget'].forEach(function(key) {
        hashOnAction[key] = func(hashOnAction, key);
    });

    function doFunc(key) {
        return getFun(hashOnAction, key);
    }

    function doStating() {
        return doFunc('starting')();
    }

    function doStarted() {
        return doFunc('started')();
    }

    function doFinished(dl, dr) {
        return doFunc('finished')(dl, dr);
    }

    function doMouseOverNode(d, e) {
        return doFunc('mouseovernode')(d, e);
    }

    function doMouseOutNode(d, e) {
        return doFunc('mouseoutnode')(d, e);
    }

    function doMouseMove(d, e) {
        return doFunc('mousemove')(d, e);
    }

    function doParticleAtTarget(d, p) {
        return doFunc('particleattarget')(d, p);
    }

    bh.size = function(arg) {
        if (!arguments.length)
            return parser.size;
        render.resize(parser.size = arg);

        if (canvas) {
            canvas.width = arg[0];
            canvas.height = arg[1];
        }

        xW && (xW = d3.scale.linear()
            .range([0, arg[0]])
            .domain([0, arg[0]]));

        yH && (yH = d3.scale.linear()
            .range([0, arg[1]])
            .domain([0, arg[1]]));

        updateWHScale();

        forceChild && forceChild.size(arg);
        forceParent && forceParent.size(arg);

        return bh;
    };

    function normalizeRadius(d) {
        return d.size > 0 ? d.size : 0;
    }

    function checkVisible(d, offsetx, offsety) {
        var tx = lastEvent.translate[0]/lastEvent.scale
            , ty = lastEvent.translate[1]/lastEvent.scale
            ;

        offsetx = offsetx || 0;
        if (!(offsetx instanceof Array))
            offsetx = [offsetx, offsetx];
        offsety = offsety || 0;
        if (!(offsety instanceof Array))
            offsety = [offsety, offsety];

        return (
            d.x + d.size > -tx + offsetx[0]
            && d.x - d.size < -tx + offsetx[1] + bh.size()[0]/lastEvent.scale
            && d.y + d.size > -ty + offsety[0]
            && d.y - d.size < -ty + offsety[1] + bh.size()[1]/lastEvent.scale
            );
    }

    function updateWHScale() {
        if(!lastEvent)
            return;

        var tl = lastEvent.translate[0] / lastEvent.scale
            , tt = lastEvent.translate[1] / lastEvent.scale
            , size = bh.size()
            ;

        xW && xW.range([-tl, -tl + size[0] / lastEvent.scale])
            .domain([0, size[0]]);
        yH && yH.range([-tt, -tt + size[1] / lastEvent.scale])
            .domain([0, size[1]]);
        valid = false;
    }

    function zooming() {

        if (!bh.setting.zoomAndDrag)
            return;

        lastEvent.translate = d3.event.translate.slice(0);
        lastEvent.scale = d3.event.scale;

        updateWHScale();
    }

    bh.translate = function(point) {
        if (!arguments.length || !(point instanceof Array))
            return lastEvent.translate;
        lastEvent.translate = point.slice(0);
        updateWHScale();
        return bh;
    };

    bh.scale = function(s) {
        if (!arguments.length)
            return lastEvent.scale;
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
            forceChild.nodes()
                .forEach(function(d) {
                    fn(d);
                    haveVisible = haveVisible || d.visible;
                });

            forceParent.nodes(
                forceParent.nodes()
                    .filter(filterParentNodes)
            );
        }

        var checkParent = bh.setting.parentLife > 0
            && forceParent.nodes()
            && forceParent.nodes().length;

        if (restart
            || !(processor.IsRun()
                 || haveVisible
                 || checkParent)) {
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

            if (restart)
                return;

            blink(d, bh.setting.childLife > 0);
            if (!d.parent || !d.visible)
                return;

            var node = d.parent
                , l
                , r
                , x
                , y
                ;

            if (node == d) return;
            node.links++;

            x = d.x - node.x;
            y = d.y - node.y;
            l = Math.sqrt(x * x + y * y);
            r = render.onGetNodeRadius()(d) / 2 +
                (render.onGetNodeRadius()(node) +
                    bh.setting.padding);

            if (typeof d.lr !== "undefined" && d.lr - l < alpha * 10) {
                if (!d.atTarget) {
                    d.atTarget = true;
                    doParticleAtTarget(d, node);
                }
            }
            d.lr = l;

            if (l != r) {
                l = (l - r) / (l || 1) * (alpha || 1);
                x *= l;
                y *= l;

                d.x -= x;
                d.y -= y;
            }

            d.paths && d.flash && d.paths.push({
                x : d.x,
                y : d.y
            });
        };
    }

    function blink(d, aliveCheck) {
        if (processor.IsPaused())
            return;

        d.flash = (d.flash -= bh.setting.rateFlash) > 0 ? d.flash : 0;

        !d.flash && aliveCheck
        && (d.alive = (d.alive-- > 0 ? d.alive : 0))
        ;

        d.opacity = !d.alive
            ? ((d.opacity -= bh.setting.rateOpacity) > 0 ? d.opacity : 0)
            : d.opacity
        ;

        d.visible && !d.opacity
        && (d.visible = false);
    }

    function filterVisible(d) {
        var vis = checkVisible(d) && (d.visible || d.alive);
        !vis && d.type == typeNode.child && (d.paths = []);
        return vis && (d.type != typeNode.child || !frozenCategory || frozenCategory == d.category);
    }

    function filterChild(d) {
        !d.visible && (d.paths = []);
        return d.type !== typeNode.parent && (d.visible || d.opacity);
    }

    function filterParent(d) {
        return d.type === typeNode.parent && (d.visible || d.opacity);
    }

    render.onGetChildNodes(function() {
        var sort = null;//bh.sort(); //TODO think about this code
        var data = !restart && forceChild ? forceChild.nodes().filter(filterVisible).sort() : [];
        return isFun(sort) ? data.sort(function(a, b) {
            return sort(a.nodeValue, b.nodeValue);
        }) : data;
    });

    render.onGetParentNodes(function() { return !restart && forceParent ? forceParent.nodes().filter(filterVisible) : []; });
    render.onGetLinks(function() {
        return links
            ? links.values().filter(function(d) {
                return d.source && d.target
                    && d.source.opacity
                    && d.target.opacity
            })
            : [];
    });
    render.onGetLastEvent(function() { return lastEvent; });
    render.onGetSelectedNode(function() { return selected; });
    render.onGetNodeRadius(function(d) {
        return d.type == typeNode.child ? Math.sqrt(normalizeRadius(d)) : normalizeRadius(d);
    });

    processor.onRecalc(function reCalc(d) {
        if (!processor.IsRun() || restart)
            return;

        var l = d.nodes.length,
            n, p, fn, ind;

        p = d.parentNode;
        p.fixed = p.permanentFixed || (p == selected);

        if (!l)
            console.log(d);
        else {
            p.alive = bh.setting.parentLife > 0 ? bh.setting.parentLife : 1;
            p.opacity = 100;
            p.flash = 100;
            p.visible = true;
        }

        while(l--) {
            n = d.nodes[l];

            if (n.fixed && n !== selected) {
                if (bh.setting.createNearParent && attachGetCreateNearParent()(d, n)) {
                    n.x = +p.x;
                    n.y = +p.y;
                }
                else {
                    n.x = d.x || xW(n.x);
                    n.y = d.y || yH(n.y);
                }
                n.paths = [];

                if (bh.setting.increaseChildWhenCreated) {
                    n.correctSize = n.size;
                    n.size *= 3;
                }
            }
            else {
                n.size = n.hasOwnProperty("correctSize") ? n.correctSize : n.size;
                delete n["correctSize"];
            }

            n.size += 1;
            n.fixed = false;//n === selected; //TODO bug when zooming. particle become frozen

            n.parent = p;
            delete n.atTarget;
            delete n.lr;

            n.visible = attachGetVisibleByStep()(d, n);
            fn = parser.setting.getChildKey()(n.nodeValue);

            n.flash = 100;
            n.opacity = 100;
            n.alive = bh.setting.childLife > 0 ? bh.setting.childLife : 1;

            if (n.visible) {
                n.category.now.indexOf(fn) < 0
                && n.category.now.push(fn);
            }
            else {
                (ind = n.category.now.indexOf(fn)) > -1
                && n.category.now.splice(ind, 1);

                n.flash *= .5;
                n.alive *= .2;
                n.opacity *= .5;
            }

            var key = parser.setting.getParentKey()(p.nodeValue) + "_" + fn
                ;

            if (links && !links.has(key))
                links.set(key, {
                    key : key,
                    source : p,
                    target : n
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
        if (!rqId)
            doRender();
        doStarted();
    });

    function doRender() {

        if (restart)
            return restartFunction && restartFunction();

        rqId = requestAnimationFrame(doRender, undefined);

        if (!ctx || valid)
            return;

        valid = true;

        ctx.save();
        ctx.clearRect(0, 0, bh.size()[0], bh.size()[1]);

        ctx.drawImage(render.draw(), 0, 0);
        ctx.restore();

        valid = false;
    }

    function contain(d, pos) {
        var px = (lastEvent.translate[0] - pos[0]) / lastEvent.scale
            , py = (lastEvent.translate[1] - pos[1]) / lastEvent.scale
            , r = Math.sqrt( Math.pow( d.x + px , 2) +
                Math.pow( d.y + py , 2 ) )
            , dr = render.onGetNodeRadius()(d)
            ;

        return r < (dr * (d.type == typeNode.parent ? 1.5 : 1));
    }

    function getNodeFromPos(pos) {
        for (var i = nodes.length - 1; i >= 0; i--) {
            var d = nodes[i];
            if ((!d.fixed || d.permanentFixed)
                && d.opacity
                && contain(d, pos)
                && (!frozenCategory || d.category === frozenCategory))
                return d;
        }
        return null;
    }

    function moveMouse(d) {
        var item = arguments.length > 1 && arguments[1] instanceof HTMLCanvasElement ? arguments[1] : this;
        d = null;
        if (selected) {
            var od = selected;
            if (contain(od, d3.mouse(item)))
                d = od;
            if (!d) {
                doMouseOutNode(od, d3.event);
                if (od)
                    od.type == typeNode.child
                        ? (od.fixed &= 3)
                        : (od.permanentFixed || (od.fixed &= 3));
                selected = null;
                layer.style("cursor", null);
            }
        }
        else
            d = getNodeFromPos(d3.mouse(item));

        if (d) {
            selected = d;
            d.fixed |= 4;
            layer && layer.style("cursor", "pointer");
            doMouseOverNode(d, d3.event);
        }
        doMouseMove(d, d3.event);
    }

    function resortNodes(a, b) {
        return a.type == typeNode.child && b.type == typeNode.child
            ? d3.ascending(incData.indexOf(a.nodeValue), incData.indexOf(b.nodeValue))
            : -Infinity;
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

    /**
     * Append data
     * @param {Array} data
     */
    bh.append = function(data) {
        if (!(data instanceof Array) || !nodes)
            return false;

        incData = incData.concat(data);
        nodes = nodes.concat(parser.nodes(data));

        processor.IsRun()
            && processor.pause();

        var bound = d3.extent(data.map(parser.setting.getGroupBy()));
        processor.boundRange = [processor.boundRange[0] > processor.boundRange[1]
            ? processor.boundRange[1] + 1
            : processor.boundRange[0], bound[1]];

        processor.IsRun()
            && processor.resume();
        return true;
    };

    /**
     * Running dynamic visualization
     * @param {Array} inData
     * @param {Number} width
     * @param {Number} height
     * @param {Boolean} reInitData
     * @param {Function} callback
     */
    bh.start = function(inData, width, height, reInitData, callback) {
        restart = true;
        processor.killWorker();

        if (rqId)
            restartFunction = insideRestartShow;
        else
            insideRestartShow();

        function insideRestartShow() {
            restartFunction = null;
            rqId = null;

            if (!reInitData && nodes) {
                nodes.sort(function (a, b) {
                    reInitNode(a);
                    reInitNode(b);

                    return resortNodes(a, b);
                });
                parser.refreshCategories();
            }

            if (!(inData || []).length)
                return;

            layer = parentNode.selectAll ? parentNode : d3.select(parentNode);

            var w = width || layer.node().clientWidth;
            var h = height || layer.node().clientHeight;

            bh.size([w, h]);

            doStating();

            forceChild && forceChild.nodes([]).stop();

            forceParent && forceParent.nodes([]).stop();

            if (!incData || !nodes || reInitData) {
                nodes && nodes.splice(0);

                var sort = bh.sort();
                incData = isFun(sort) ? inData.sort(sort) : inData;

                parser.init();
                /**
                 * WARNING!!!
                 * If uses asyncParsing in true, then the time of parsing increases
                 */
                if (!bh.setting.asyncParsing) {
                    nodes = parser.nodes(incData);
                    initCallback(w, h, callback);
                }
                else {
                    parser.nodes(incData, function (newNodes) {
                        nodes = newNodes;
                        initCallback(w, h, callback);
                    });
                }
            }
            else {
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
            translate: bh.setting.translate instanceof Array ? bh.setting.translate : [0, 0],
            scale : typeof bh.setting.scale !== "undefined" ? bh.setting.scale : 1
        };

        w = bh.size()[0];
        h = bh.size()[1];

        xW = xW || d3.scale.linear()
            .range([0, w])
            .domain([0, w]);

        yH = yH || d3.scale.linear()
            .range([0, h])
            .domain([0, h]);

        zoom = bh.setting.zoom || d3.behavior.zoom()
            .scaleExtent(bh.setting.scaleExtent instanceof Array ? bh.setting.scaleExtent : [.1, 8])
            .scale(lastEvent.scale)
            .translate(lastEvent.translate)
            .on("zoom", zooming);

        ctx = null;

        canvas = layer.append("canvas")
            .text("This browser don't support element type of Canvas.")
            .attr("width", w)
            .attr("height", h)
            .attr("id", "canvas_bh_" + idLayer)
            .call(zoom)
            .on('mousemove.tooltip', moveMouse)
            .node();

        bh.style({
            position: "absolute",
            top: 0,
            left: 0
        });

        var tf = bh.findStyleProperty(['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform']);
        tf && bh.style(tf, 'translate3d(0px, 0px, 0px)');

        applyStyleWhenStart();

        ctx = canvas.getContext("2d");

        forceChild = (forceChild || d3.layout.force()
            .stop()
            .size([w, h])
            .friction(.75)
            .gravity(0)
            .charge(function(d) {return -render.onGetNodeRadius()(d); })
            .on("tick", tick))
            .nodes([])
        ;

        zoomScale = d3.scale.linear()
            .range([5, 1])
            .domain([.1, 1]);

        forceParent = (forceParent || d3.layout.force()
            .stop()
            .size([w, h])
            .gravity(bh.setting.padding * .001)
            .charge(function(d) { return -(bh.setting.padding + d.size) * 8; }))
            .nodes([])
        ;

        restart = false;
        processor.start();
        bh.size([w, h]);

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

    var hashStyle = document.createElement('canvas');
    bh.style = function(name, value, priority) {
        var n = arguments.length;

        var target = d3.selectAll([hashStyle]);
        if (canvas)
            target = d3.selectAll([hashStyle, canvas]);

        if (n < 3) {
            if (typeof name !== "string") {
                target.style(name);
                return bh;
            }
            if (n < 2)
                return d3.select(hashStyle).style(name);
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
    isFun : isFun,
    func : func,
    getFun : getFun,
    emptyFun : emptyFun
};