/**
 * Created by artzub on 26.04.2014.
 */

"use strict";

!function() {
    d3.blackHole = d3.blackHole || {};

    d3.blackHole.legend = function(node, w, h, cats) {

        var that = {parentNode : node || document.body, setting : {
                lengthOfCropName : 55
            }}
            , categories
            , layer
            , lLeg
            , size = [w, h]
            , hashOnAction = {}
            , utils = d3.blackHole.utils
            , selected
            , colorless = d3.rgb('gray')
            , mt = 5
            , ml = 5
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

        !function() {
            ['mouseover', 'mousemove', 'mouseout'].forEach(
                function(d) {

                }
            );
        }();

        ['mouseover', 'mousemove', 'mouseout'].forEach(function(key) {
            hashOnAction[key] = utils.func(hashOnAction, key);
        });
        function doFunc(key) {
            return utils.getFun(hashOnAction, key);
        }

        function lme(d) {
            selected = d.value;
            doFunc('mouseover')(selected, d3.event);
        }

        function lmm(d) {
            doFunc('mousemove')(d.value, d3.event);
        }

        function lml(d) {
            selected = null;
            doFunc('mouseout')(d.value, d3.event);
        }

        function legColor(d) {
            return selected
                ? selected == d.value
                ? d.value.color
                : colorless
                : d.value.color;
        }

        function initLegend() {

            var node = that.parentNode = that.parentNode.selectAll ? that.parentNode : d3.select(that.parentNode);

            layer = layer || node.append('svg');
            size[0] = size[0] || node.node().clientWidth;
            size[1] = size[1] || node.node().clientHeight;
            layer.attr({
                width : size[0],
                height : size[1]
            });

            var h2 = size[1] - mt
                , w3 = size[0]
                ;

            lLeg = (lLeg || layer.append("g"))
                .attr("width", w3)
                .attr("height", h2)
                .attr("transform", "translate(" + [ml, mt] + ")")
            ;

            lLeg.selectAll("*").remove();

            if (!categories)
                return;

            var g = lLeg.selectAll(".gLeg")
                .data(categories.entries(), function(d) { return d.key; });

            g.exit().remove();

            g.enter().append("g")
                .on("mouseover", lme)
                .on("mousemove", lmm)
                .on("mouseout", lml)
                .attr("class", "gLeg")
                .attr("transform", function(d, i) {
                    return "translate(" + [0, i * 18] + ")";
                })
                .style("visibility", "hidden")
            ;
            g.append("rect")
                .attr("height", 16)
                .style("fill", legColor)
            ;
            g.append("text")
                .attr("class", "gttLeg")
                .style("font-size", "13px")
                .text(function(d) {
                    var l = that.setting.lengthOfCropName;
                    return d.key.length > l ? d.key.substr(0, l).trim() + '...' : d.key;
                })
                .style("fill", function(d) { return d3.rgb(d.value.color).brighter(); })
                .append('title')
                .text(function(d) { return d.key; })
            ;

            g.append("text")
                .attr("class", "gtLeg")
                .style("font-size", "11px")
                .attr("transform", "translate(" + [2, 12] + ")")
            ;
        }

        function sortLeg(b, a) {
            return d3.ascending(a.value.now.length, b.value.now.length);
        }

        function sortLegK(b, a) {
            return d3.ascending(a.key, b.key);
        }

        function updateLegend() {
            if (!lLeg || lLeg.empty())
                return;

            var g = lLeg.selectAll(".gLeg");

            function wl(d) {
                return d.value.now.length;
            }

            g.selectAll(".gtLeg")
                .text(wl)
            ;

            var wb = d3.max(g.selectAll(".gtLeg"), function(d) {
                return d[0].clientWidth || d[0].getComputedTextLength();
            }) + 4;

            g.selectAll("rect")
                .style("fill", legColor)
                .attr("width", wb)
            ;

            g.selectAll(".gttLeg")
                .attr("transform", "translate(" + [wb + 2, 12] + ")")
            ;

            g.sort(sortLegK).sort(sortLeg)
                .style("visibility", function(d, i) {
                    return !wl(d) || i * 18 > lLeg.attr("height") ? "hidden" : "visible";
                })
                //.transition()
                //.duration(500)
                .attr("transform", function(d, i) {
                    return "translate(" + [0, i * 18] + ")";
                })
            ;
        }

        that.categories = function(cats) {
            categories = cats;
            initLegend();
            that.update();
        };

        that.update = function() {
            updateLegend();
        };

        that.selectCategory = function(cat) {
            if (!arguments.length)
                return selected;
            selected = cat;
            return that;
        };

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
            var h2 = size[1] - mt
                , w3 = size[0]
                ;

            lLeg && lLeg
                .attr("width", w3)
                .attr("height", h2)
                .attr("transform", "translate(" + [ml, mt] + ")")
            ;

            that.update();
            return that;
        };

        that.categories(cats);

        return that;
    };
}();