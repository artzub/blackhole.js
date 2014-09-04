/**
 * Created by artzub on 26.04.2014.
 */

"use strict";

!function() {
    d3.blackHole = d3.blackHole || {};

    d3.blackHole.legend = function(node, w, h, cats) {

        var that = {
                parentNode : node || document.body,
                setting : {
                    lengthOfCropName : 55,
                    createTitle : false,
                    counter : true
                }
            }
            , categories
            , layer
            , lLeg
            , gLeg
            , size = [w, h]
            , hashOnAction = {}
            , utils = d3.blackHole.utils
            , selected
            , frozen
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

        ['mouseover', 'mousemove', 'mouseout', 'click'].forEach(function(key) {
            hashOnAction[key] = utils.func(hashOnAction, key);
        });

        function doFunc(key) {
            if (!key || !(typeof key === 'string'))
                return that;
            key = key.toLowerCase();
            return utils.getFun(hashOnAction, key);
        }

        function lme(d) {
            selected = d.value;
            gLeg.selectAll("rect")
                .style("fill", legColor)
            doFunc('mouseover')(selected, d3.event);
        }

        function lmm(d) {
            doFunc('mousemove')(d.value, d3.event);
        }

        function lml(d) {
            selected = null;
            gLeg.selectAll("rect")
                .style("fill", legColor)
            doFunc('mouseout')(d.value, d3.event);
        }

        function lc(d) {
            if (frozen === d.value)
                frozen = null;
            else
                frozen = d.value;
            doFunc('click')(frozen, d3.event);
            that.update();
        }

        function legColor(d) {
            var sel = selected || frozen;
            return selected && frozen
                ? selected === d.value || frozen === d.value
                    ? d.value.color
                    : colorless
                : sel
                    ? sel === d.value
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
                .on("click", lc)
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
                    var name = d.value ? d.value.name || d.key : d.key;
                    var l = that.setting.lengthOfCropName;
                    return name.length > l ? name.substr(0, l).trim() + '...' : name;
                })
                .style("fill", function(d) { return d3.rgb(d.value.color).brighter(); })
                .each(function() {
                    that.setting.createTitle
                        && d3.select(this).append('title')
                        .text(function(d) { return '[' + d.key + ']' + (d.value ? (d.value.name ? ' ' + d.value.name : '') :  ''); })
                })
            ;

            g.append("text")
                .attr("class", "gtLeg")
                .style("font-size", "11px")
                .attr("transform", "translate(" + [2, 12] + ")")
            ;

            gLeg = null;
        }

        function sortLeg(b, a) {
            return d3.ascending(a.value === frozen ? Infinity : a.value.now.length, b.value === frozen ? Infinity : b.value.now.length);
        }

        function sortLegK(b, a) {
            return d3.ascending(a.value.name, b.value.name);
        }

        function updateLegend() {
            if (!lLeg || lLeg.empty())
                return;

            var ec = that.setting.counter;

            gLeg = gLeg || lLeg.selectAll(".gLeg");

            function wl(d) {
                return d.value.now.length;
            }

            gLeg.selectAll(".gtLeg")
                .text(wl)
                .style('display', ec ? null : 'none')
            ;

            var wb = !ec ? 0 : d3.max(gLeg.selectAll(".gtLeg"), function(d) {
                return d[0].clientWidth || d[0].getComputedTextLength();
            }) + 4;

            gLeg.selectAll("rect")
                .style("fill", legColor)
                .attr("width", wb)
                .style('display', ec ? null : 'none')
            ;

            gLeg.selectAll(".gttLeg")
                .attr("transform", "translate(" + [wb + 2, 12] + ")")
            ;

            gLeg.sort(sortLegK).sort(sortLeg)
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
            that.update();
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