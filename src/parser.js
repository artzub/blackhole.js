import "common";

/**
 * Parser of data
 * @returns {Object}
 * @constructor
 */
function Parser() {

    var parser = {
            size : [500, 500]
            , categoryMax : 0
            , categoryHash : null
            , childHash : null
            , parentHash : null
            , setting : {
                getName : null,
                getCategoryKey : null,
                getCategoryName : null,
                getKey : null,
                getChildKey : null,
                getParentKey : null,
                getParent : null,
                getParentImage : null,
                getGroupBy : null,
                getValue : null,
                getParentRadius : null,
                getChildRadius : null,
                getParentPosition : null,
                getParentFixed : null,

                onBeforeParsing : null,
                onParsing : null,
                onAfterParsing : null,

                parentColor: d3.scale.category20b(),
                childColor: d3.scale.category20()
            }
        }
        , rd3 = d3.random.irwinHall(8)
        ;

    function randomTrue() {
        return Math.floor(rd3() * 8) % 2;
    }

    /**
     * default methods for getting different parameters from an item
     */
    (function() {

        var reg = new RegExp("^[get|on]");
        d3.keys(parser.setting).forEach(function(key) {
            if (reg.test(key))
                parser.setting[key] = func(parser.setting, key);
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

        parser.setting.getValue(function(/*d*/) {
            return 1;
        });

        parser.setting.getParentRadius(function(/*d*/) {
            return 25;
        });

        parser.setting.getChildRadius(function(/*d*/) {
            return 2;
        });

        parser.setting.getParentPosition(function(/*d, position*/) {
            return null;
        });

        parser.setting.getParentFixed(function(/*d*/) {
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

    /**
     * Create a Category
     * @param c
     * @param name
     * @returns {Object}
     * @constructor
     */
    function Category(c, name) {
        var cat = parser.categoryHash.get(c);
        if (!cat) {
            cat = {
                key: c,
                name : name || c,
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

    /**
     * Create a random position for node
     * @param d
     * @param {typeNode} type
     * @returns {{x: number, y: number}}
     */
    function createPosition(d, type) {
        var x, y
            , w = parser.size[0]
            , h = parser.size[1]
            , w2 = w / 2
            , w5 = w / 5
            , h2 = h / 2
            , h5 = h / 5
            , parentPos
            ;

        x = w * Math.random();
        y = h * Math.random();
        !type == typeNode.child &&
        (parentPos = parser.setting.getParentPosition()(d, [x, y]));
        if (type == typeNode.parent) {
            if (!parentPos || parentPos.length < 2) {
                if (randomTrue()) {
                    x = x > w5 && x < w2
                        ? x / 5
                        : x > w2 && x < w - w5
                        ? w - x / 5
                        : x
                    ;
                }
                else {
                    y = y > h5 && y < h2
                        ? y / 5
                        : y > h2 && y < h - h5
                        ? h - y / 5
                        : y
                    ;
                }
            }
            else {
                x = parentPos[0];
                y = parentPos[1];
            }
        }
        return {x: x, y: y};
    }

    /**
     * Create a Node
     * @param d
     * @param type
     * @returns {Object}
     * @constructor
     */
    function Node(d, type) {
        var isChild = type == typeNode.child
            , c = isChild
                ? parser.setting.getCategoryKey()(d)
                : parser.setting.parentColor(parser.setting.getParentKey()(d))
            , cat
            , x
            , y
            ;

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
        var parent
            , key
            , n
            ;

        if (!d || !(parent = parser.setting.getParent()(d)))
            return null;

        key = parser.setting.getParentKey()(parent);
        if (typeof key === "undefined" || key == null)
            key = "undefined";

        n = parser.parentHash.get(key);

        if (!n) {
            n = Node(parent, typeNode.parent);
            parser.parentHash.set(key, n);
        }
        return n;
    }

    function getChild(d) {
        var key
            , n
            ;

        if (!d)
            return null;

        key = parser.setting.getChildKey()(d);

        if (typeof key === "undefined" || key == null)
            key = "undefined";

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
        console.time('parser');
        var ns = [];

        doBeforeParsing(data);

        if (isFun(callback)) {
//            async.each(data,
//                function (d, callback) {
//                    parseNode(d, ns);
//                    callback();
//                },
//                function(err) {
//                    doAfterParsing(ns);
//                    callback(ns);
//                    console.timeEnd('parser');
//                }
//            )
            asyncForEach(data, function (d) {
                parseNode(d, ns);
            }, 1, function(err) {
                doAfterParsing(ns);
                callback(ns);
                console.timeEnd('parser');
            });
        }
        else {
            parse(data, ns);
            console.timeEnd('parser');
            return ns;
        }
    };

    function parse(inData, outData) {
        if (!inData)
            return;

        var i = inData.length;
        while(--i > -1)
            parseNode(inData[i], outData);
        doAfterParsing(outData);
    }

    function parseNode(d, ns) {
        var j
            , n
            , groupBy
            ;


        if (!d || !ns || !(ns instanceof Array))
            return;

        d.nodes = [];

        n = getParent(d);
        d.parentNode = n;
        !n.inserted && (n.inserted = ns.push(n));

        groupBy = parser.setting.getGroupBy()(d);

        n = getChild(d);

        d.nodes.push(n);
        n.category.currents[groupBy] = (n.category.currents[groupBy] || 0);
        n.category.currents[groupBy]++;
        n.category.values['_' + n.id] = parser.setting.getValue()(d);
        !n.inserted && (n.inserted = ns.push(n));

        j = parser.categoryHash.values().reduce((function(id) { return function(a, b) {
            return (a || 0) + (b.currents[id] || 0);
        }})(groupBy), null);

        parser.categoryMax = Math.max(parser.categoryMax, j);

        doParsing(n);
    }

    parser.setInitState = function(node) {
        var pos = createPosition(node.nodeValue, node.type);
        node.x = pos.x;
        node.y = pos.y;

        node.size = node.type === typeNode.parent
            ? parser.setting.getParentRadius()(node.nodeValue)
            : parser.setting.getChildRadius()(node.nodeValue);
    };

    parser.refreshCategories = function() {
        parser.categoryHash.forEach(function(key, value) {
            value.now.splice(0);
        });
    };

    return parser;
}