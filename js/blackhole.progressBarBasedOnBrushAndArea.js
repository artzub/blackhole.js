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

            .areaEvent {
                fill: steelblue;
                stroke: #ccc;
                clip-path: url(#clip);
            }

            .maxline path,
            .axis path,
            .axis line {
                fill: none;
                stroke: #ccc;
                shape-rendering: crispEdges;
            }

            .maxline text,
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
            , yScaleII
            , hashOnAction = {}
            , utils = d3.blackHole.utils
            , context
            , area
            , areaII
            , xAxis
            , brush
            , gBrush
            , initialized
            , offset = 18
            , lastExtent
            , maxLine
            , maxLineEvent
            , df = d3.format(',.2f')
            , label = 'max: '

            , offsetEvent = 16
            , maxLineEvent
            , dfEvent = d3.format('')
            , labelEvent = 'max: '
            ;

        that.maxLabelValue = function(value) {
            if (!arguments.length)
                return label;
            label = value;
            return that;
        }

        that.maxFormatValue = function(value) {
            if (!arguments.length)
                return df;
            df = value;
            return that;
        }

        that.maxLabelEvent = function(value) {
            if (!arguments.length)
                return labelEvent;
            labelEvent = value;
            return that;
        }

        that.maxFormatEvent = function(value) {
            if (!arguments.length)
                return dfEvent;
            dfEvent = value;
            return that;
        }

        that.on = function(key, value) {
            if (!key || !(typeof key === 'string'))
                return that;
            key = key.toLowerCase();
            if (arguments.length < 2)
                return utils.isFun(hashOnAction[key]) ? hashOnAction[key]() : undefined;
            utils.isFun(hashOnAction[key]) && hashOnAction[key](value);
            return that;
        };

        ['getAxisXValue', 'getAxisYValue', 'getAxisYEvent'].forEach(function(key) {
            key = key.toLowerCase();
            hashOnAction[key] = utils.func(hashOnAction, key);
        });

        function doFunc(key) {
            if (!key || !(typeof key === 'string'))
                return that;
            key = key.toLowerCase();
            return utils.getFun(hashOnAction, key);
        }

        function interpolateSankey(points) {
            var x0 = points[0][0], y0 = points[0][1], x1, y1, x2,
                path = [x0, ",", y0],
                i = 0,
                n = points.length;
            while (++i < n) {
                x1 = points[i][0];
                y1 = points[i][1];
                x2 = (x0 + x1) / 2;
                path.push("C", x2, ",", y0, " ", x2, ",", y1, " ", x1, ",", y1);
                x0 = x1;
                y0 = y1;
            }
            return path.join("");
        }

        function initialize(data) {
            var node = that.parentNode = that.parentNode.selectAll ? that.parentNode : d3.select(that.parentNode);

            node.selectAll('*').remove();

            layer = node.append('svg');
            size[0] = size[0] || node.node().clientWidth;
            size[1] = size[1] || node.node().clientHeight;
            layer.attr({
                width : size[0],
                height : size[1] + that.setting.margin.top + that.setting.margin.bottom + 2
            });

            xScale = d3.time.scale().range([0, size[0]]);
            yScale = d3.scale.linear().range([size[1] - offset, 0]);
            yScaleII = d3.scale.linear().range([size[1] - offset - offsetEvent, 0]);

            xAxis = d3.svg.axis().scale(xScale).orient("bottom");

            brush = d3.svg.brush()
                .x(xScale)
                .on('brush', brushed)//TODO подумать о том чтобы сделать интерактивное перемещение по исории.
                ;

            area = d3.svg.area()
                .interpolate(interpolateSankey)
                .x(function(d) { return xScale(doFunc('getAxisXValue')(d)); })
                .y0(size[1] - offset)
                .y1(function(d) { return yScale(doFunc('getAxisYValue')(d)); });

            areaII = d3.svg.area()
                .interpolate(interpolateSankey)
                .x(function(d) { return xScale(doFunc('getAxisXValue')(d)); })
                .y0(size[1] - offset - offsetEvent)
                .y1(function(d) { return yScaleII(doFunc('getAxisYEvent')(d)); });

            xScale.domain(d3.extent(data.map(function(d) { return doFunc('getAxisXValue')(d); })));
            yScale.domain([0, d3.max(data.map(function(d) { return doFunc('getAxisYValue')(d); })) || 0]);
            yScaleII.domain([0, d3.max(data.map(function(d) { return doFunc('getAxisYEvent')(d); })) || 0]);

            context = layer.append("g")
                .attr("class", "context")
                .attr("transform", "translate(" + that.setting.margin.left + "," + that.setting.margin.top + ")");

            context.append("path")
                .datum(data)
                .attr("class", "area");

            context.append("path")
                .datum(data)
                .attr('transform', 'translate(0, ' + offsetEvent + ')')
                .attr("class", "areaEvent");

            context.append("g")
                .attr("class", "x axis");

            gBrush = context.append("g")
                .attr("class", "x brush")
                .call(brush);

            gBrush
                .selectAll("rect");

            maxLine = context.append('g')
                .attr('class', 'maxline');
            maxLine.append('path');
            maxLine.append('text')
                .attr('transform', 'translate(3, 8)')
                .attr('y','.3em')
                .text(label + df(yScale.domain()[1] || 0));

            maxLineEvent = context.append('g')
                .attr('class', 'maxlineEvent');
            maxLineEvent.append('path');
            maxLineEvent.append('text')
                .attr('transform', 'translate(3, 8)')
                .attr('y','.3em')
                .text(labelEvent + df(yScaleII.domain()[1] || 0));

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
            yScaleII.range([size[1] - offset - offsetEvent, 0]);

            area.y0(size[1] - offset);
            areaII.y0(size[1] - offset - offsetEvent);

            var ymax = -yScale(yScale.domain()[1] || 0)
                , ymaxII = -yScaleII(yScaleII.domain()[1] || 0)
                ;

            maxLine.style('display', (-ymax == (size[1] - offset)) ? 'none' : null);
            maxLine.attr('transform', 'translate(0, ' + ymax + ')');
            maxLine.selectAll('path')
                .attr('d', 'M0,1V0H' + size[0] + 'V1');

            maxLineEvent.style('display', (-ymaxII == (size[1] - offset - offsetEvent)) ? 'none' : null);
            maxLineEvent.attr('transform', 'translate(0, ' + ymaxII + offsetEvent + ')');
            maxLineEvent.selectAll('path')
                .attr('d', 'M0,1V0H' + size[0] + 'V1');

            context.selectAll('.area')
                .attr("d", area);

            context.selectAll('.areaEvent')
                .attr("d", areaII);

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