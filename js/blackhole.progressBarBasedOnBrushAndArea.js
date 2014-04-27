/**
 * Created by artzub on 26.04.2014.
 */

"use strict";

!function() {
    d3.blackHole = d3.blackHole || {};

    d3.blackHole.progressBarBasedOnBrushAndArea = function(node, w, h) {

        /**
            .area {
                fill: steelblue;
                stroke: #ccc;
                clip-path: url(#clip);
            }

            .axis path,
            .axis line {
                fill: none;
                stroke: #ccc;
                shape-rendering: crispEdges;
            }

            .axis text {
                fill: #ccc;
            }


            .brush .extent {
                stroke: #fff;
                fill-opacity: .125;
                shape-rendering: crispEdges;
            }
        */

        var that = {
                parentNode : node || document.body,
                setting : {
                    getAxisXValue : null,
                    getAxisYValue : null,
                    margin : {
                        top : 0,
                        left : 0,
                        right : 0,
                        bottom : 0
                    }
                }
            }
            , size = [w, h]
            , layer
            , xScale
            , yScale
            , hashOnAction = {}
            , utils = d3.blackHole.utils
            , context
            , area
            , xAxis
            , brush
            , gBrush
            , initialized
            , offset = 18
            , lastExtent
            ;

        that.on = function(key, value) {
            if (!key || !(typeof key === 'string'))
                return that;
            key = key.toLowerCase();
            if (arguments.length < 2)
                return utils.isFun(hashOnAction[key]) ? hashOnAction[key]() : undefined;
            utils.isFun(hashOnAction[key]) && hashOnAction[key](value);
            return that;
        };

        ['getAxisXValue', 'getAxisYValue'].forEach(function(key) {
            key = key.toLowerCase();
            hashOnAction[key] = utils.func(hashOnAction, key);
        });

        function doFunc(key) {
            if (!key || !(typeof key === 'string'))
                return that;
            key = key.toLowerCase();
            return utils.getFun(hashOnAction, key);
        }

        function initialize(data) {
            var node = that.parentNode = that.parentNode.selectAll ? that.parentNode : d3.select(that.parentNode);

            layer = layer || node.append('svg');
            size[0] = size[0] || node.node().clientWidth;
            size[1] = size[1] || node.node().clientHeight;
            layer.attr({
                width : size[0],
                height : size[1]
            });

            xScale = d3.time.scale().range([0, size[0]]);
            yScale = d3.scale.linear().range([size[1] - offset, 0]);

            xAxis = d3.svg.axis().scale(xScale).orient("bottom");

            brush = d3.svg.brush()
                .x(xScale)
                .on('brush', brushed)//TODO подумать о том чтобы сделать интерактивное перемещение по исории.
                ;

            area = d3.svg.area()
                .interpolate("monotone")
                .x(function(d) { return xScale(doFunc('getAxisXValue')(d)); })
                .y0(size[1] - offset)
                .y1(function(d) { return yScale(doFunc('getAxisYValue')(d)); });

            xScale.domain(d3.extent(data.map(function(d) { return doFunc('getAxisXValue')(d); })));
            yScale.domain([0, d3.max(data.map(function(d) { return doFunc('getAxisYValue')(d); }))]);

            context = layer.append("g")
                .attr("class", "context")
                .attr("transform", "translate(" + that.setting.margin.left + "," + that.setting.margin.top + ")");

            context.append("path")
                .datum(data)
                .attr("class", "area");

            context.append("g")
                .attr("class", "x axis");

            gBrush = context.append("g")
                .attr("class", "x brush")
                .call(brush);

            gBrush
                .selectAll("rect");

            resize();

            initialized = true;
        }

        that.data = function(data) {
            initialize(data);
            return that;
        };

        that.inc = function(lb , rb) {
            gBrush.call(brush.extent([lb, rb]))
                .selectAll('.x.brush')
                .style('pointer-events', 'none')
            ;

            lastExtent = [lb, rb];

            return that;
        };

        function brushed() {
           d3.select(this).call(brush.extent(lastExtent));
        }

        function resize() {

            layer.attr({
                width : size[0],
                height : size[1] + that.setting.margin.top + that.setting.margin.bottom + 2
            });

            xScale.range([0, size[0]]);
            yScale.range([size[1] - offset, 0]);

            area.y0(size[1] - offset);

            context.selectAll('.area')
                .attr("d", area);

            context.selectAll('g.x.axis')
                .attr("transform", "translate(0," + (size[1] - offset) + ")")
                .call(xAxis);

            gBrush.selectAll("rect")
                .attr("height", size[1]);
        }

        that.size = function(x, y) {
            switch (arguments.length) {
                case 0: return size;
                case 1:
                    if (x instanceof Array)
                        size = x;
                    else
                        size = [x, x];
                    break;
                default :
                    if (x instanceof Array)
                        size = x;
                    else
                        size = [x, y];
                    break;
            }

            if (initialized) {
                resize();

                var ext = brush.extent();
                that.inc(ext[0], ext[1]);
            }

            return that;
        };

        return that;
    };
}();