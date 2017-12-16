// tomswisherlabs@gmail.com     https://github.com/tomswisher

'use strict'; /* globals d3, console, nodes, count */ /* jshint -W069, unused:false */

// Performance -------------------------------------------------------------------------------------

var logsTest = 'in',
    logsLvl1 = false,
    logsLvl2 = false;
var resizeWait = 150,
    resizeCounter = 0;
var stackLevel = 0,
    stackLevelTemp = 0;
var sizeNodesOld = -1,
    sizeUsedOld = -1,
    sizeTotalOld = -1;
var sizeNodesNew = 0,
    sizeUsedNew = 0,
    sizeTotalNew = 0;
var colorSource = '',
    colorNodes = '',
    colorUsed = '',
    colorTotal = '';
var stringSource = '',
    stringNodes = '',
    stringUsed = '',
    stringTotal = '',
    stringCombined = '',
    stringSymbol = '';
var mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    mobileBrowser = navigator && mobileUserAgents.test(navigator.userAgent);
if (mobileBrowser) console.log('mobileBrowser', mobileBrowser);
var isLoaded = false;

// D3 Selections -----------------------------------------------------------------------------------

var body = d3.select('body');
var svg = body.select('#svg');
var svgDefs = body.select('#svg-defs');
var svgDefsArrowheads = svgDefs.selectAll('marker.arrowhead');
var bgRect = body.select('#bg-rect');
var clipPathRect = body.select('#clip-path-rect');
var statePathsG = body.select('#state-paths-g');
var statePaths = statePathsG.select(null);
var nodesG = body.select('#nodes-g');
var nodeCircles = nodesG.select(null);
var linksG = body.select('#links-g');
var linkLines = linksG.select(null);
var filtersDiv = body.select('#filters-div');
var filtersYears = filtersDiv.select(null);
var filtersReports = filtersDiv.select(null);
var optionsDiv = body.select('#options-div');
var optionGroups = optionsDiv.select(null);
var optionsAlphaLabel = optionsDiv.select(null);
var optionsAlphaSlider = optionsDiv.select(null);
var infoG = body.select('#info-g');
var infoImageGs = infoG.select(null);
var infoTextGs = infoG.select(null);

// Visual Styling ----------------------------------------------------------------------------------

var vs = {
    svg: {
        w: {},
        h: {}
    },
    map: {
        w: {},
        h: {},
        wMin: {
            val: 300
        },
        ratioMapWH: {
            val: 1.6
        },
        projectionScale: {
            val: 1.2
        },
        strokeWidthState: {
            val: 1,
            inputType: 'range'
        }
    },
    network: {
        rMin: {
            val: 4,
            inputType: 'range'
        },
        rFactor: {
            val: 60,
            inputType: 'range'
        },
        strokeWidthNode: {
            val: 1,
            inputType: 'range'
        },
        strokeWidthLink: {
            val: 1.5,
            inputType: 'range'
        }
    },
    info: {
        w: {
            val: 0.5 * 396
        },
        h: {},
        wImage: {},
        hImage: {},
        ratioImageWH: {
            val: 0.5 * 396 / (0.5 * 432)
        },
        margin: {
            val: 5
        },
        textRowH: {
            val: 15
        }
    },
    filters: {
        w: {},
        h: {
            val: 70
        }
    },
    options: {
        wSmall: {
            val: 58
        },
        wMedium: {
            val: 110
        },
        wSlider: {
            val: 100
        },
        wGroup: {},
        hRow: {
            val: 20
        },
        margin: {
            val: 3
        }
    },
    transition: {
        duration: {
            val: 200,
            inputType: 'range'
        },
        ease: {
            val: d3.easeLinear
        }
    },
    test: {
        colorNeutral: {
            val: 'black'
        },
        colorBad: {
            val: 'firebrick'
        },
        colorGood: {
            val: 'green'
        }
    }
};

// Global Variables --------------------------------------------------------------------------------

var topIds = ['Alice Walton', 'Carrie Walton Penner', 'Jim Walton', 'Dorris Fisher', 'Eli Broad', 'Greg Penner', 'Jonathan Sackler', 'Laurene Powell Jobs', 'Michael Bloomberg', 'Reed Hastings', 'Stacy Schusterman', 'John Arnold', 'Laura Arnold'];
var mapObj = null;
var isDragging = false;
var yearsData = ['2011', '2012', '2013', '2014', '2015', '2016', '2017'];
var reportsData = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Window Events -----------------------------------------------------------------------------------

window.onload = function () {
    d3.queue().defer(d3.json, 'data/us-states-features.json').defer(d3.json, 'data/nodes-links-04-06-2017.json').awaitAll(InitializePage);
};
window.onresize = function () {
    if (!isLoaded) {
        return;
    }
    if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
    resizeCounter += 1;
    setTimeout(function () {
        if (resizeCounter > 1) {
            resizeCounter -= 1;
            if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
        } else if (resizeCounter === 1) {
            resizeCounter -= 1;
            if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
            UpdateVSValues();
            mapObj.DrawMap().DrawNetwork().DrawInfo().DrawFilters().UpdateData().UpdateSimulation().DrawOptions();
        }
    }, resizeWait);
};

// Functions ---------------------------------------------------------------------------------------

function UpdateVSValues() {
    TestApp('UpdateVSValues', 1);
    vs.info.wImage.val = vs.info.w.val - 2 * vs.info.margin.val;
    vs.info.hImage.val = vs.info.wImage.val / vs.info.ratioImageWH.val;
    vs.info.h.val = vs.info.hImage.val + 4 * vs.info.textRowH.val + 3 * vs.info.margin.val;
    vs.options.wGroup.val = 2 * vs.options.wMedium.val + 3 * vs.options.wSmall.val + vs.options.wSlider.val + 2 * vs.options.margin.val;
    var clientWidth = body.node().clientWidth;
    if (clientWidth >= vs.map.wMin.val + vs.info.w.val) {
        vs.map.w.val = clientWidth - vs.info.w.val;
        vs.svg.w.val = clientWidth;
    } else {
        vs.map.w.val = vs.map.wMin.val;
        vs.svg.w.val = vs.map.wMin.val + vs.info.w.val;
    }
    vs.filters.w.val = vs.map.wMin.val;
    vs.map.w.val = Math.min(vs.map.w.val, (window.innerHeight - vs.filters.h.val) * vs.map.ratioMapWH.val);
    vs.map.h.val = vs.map.w.val / vs.map.ratioMapWH.val;
    vs.svg.h.val = Math.max(vs.map.h.val, vs.info.h.val);
    TestApp('UpdateVSValues', -1);
}

var InitializePage = function InitializePage(error, results) {
    TestApp('InitializePage', 1);
    UpdateVSValues();
    mapObj = new HybridMapClass().LoadStates(results[0].features).DrawMap().LoadNodes(results[1].nodes).LoadLinks(results[1].links).UpdateData().DrawNetwork().DrawInfo().UpdateSimulation().DrawOptions();
    requestAnimationFrame(function () {
        body.classed('loading', false);
        isLoaded = true;
    });
    TestApp('InitializePage', -1);
};

function HybridMapClass() {
    TestApp('HybridMapClass', 1);
    var that = this;
    that.filteredOutObj = {
        year: {},
        report: {}
    };
    that.states = [];
    that.nodes = [];
    that.links = [];
    that.statesLoaded = [];
    that.nodesLoaded = [];
    that.linksLoaded = [];
    that.nodeSelected = null;
    that.linksSelected = [];
    that.infoData = [];
    that.centroidByState = {};
    that.$inByState = {};
    that.$outByState = {};
    that.$inById = {};
    that.$outById = {};
    that.$nodeScale = d3.scaleLinear().range([0, 1]);
    that.nodeById = {};
    that.projection = d3.geoAlbersUsa();
    that.path = d3.geoPath();

    that.LoadStates = function (d) {
        TestApp('UpdateStates', 1);
        that.statesLoaded = d;
        that.states = that.statesLoaded;
        that.filteredOutObj = {
            year: {},
            report: {}
        };
        that.DrawFilters();
        TestApp('UpdateStates', -1);
        return that;
    };

    that.LoadNodes = function (d) {
        TestApp('LoadNodes', 1);
        that.nodesLoaded = d;
        that.filteredOutObj = {
            year: {},
            report: {}
        };
        that.DrawFilters();
        TestApp('LoadNodes', -1);
        return that;
    };

    that.LoadLinks = function (d) {
        TestApp('LoadLinks', 1);
        that.linksLoaded = d;
        that.linksLoaded.forEach(function (d) {
            d.sourceId = d.source;
            d.targetId = d.target;
        });
        that.filteredOutObj = {
            year: {},
            report: {}
        };
        that.DrawFilters();
        TestApp('LoadLinks', -1);
        return that;
    };

    that.UpdateData = function () {
        TestApp('UpdateData', 1);
        that.states = that.statesLoaded;
        var iCount = 0;
        that.nodes = that.nodesLoaded;
        that.nodes.forEach(function (d, i) {
            that.$outById[d.id] = 0;
            that.$inById[d.id] = 0;
            that.$outByState[d.state] = 0;
            that.$inByState[d.state] = 0;
            if (topIds.includes(d.id)) {
                d.i = iCount;
                iCount += 1;
            }
            // d.x = that.centroidByState[d.state][0];
            // d.y = that.centroidByState[d.state][1];
            d.x = d.x !== undefined ? d.x : that.centroidByState[d.state][0];
            d.y = d.y !== undefined ? d.y : that.centroidByState[d.state][1];
            d.vx = 0;
            d.vy = 0;
        });
        that.nodeById = d3.map(that.nodes, function (d) {
            return d.id;
        });
        that.links = that.linksLoaded.filter(function (d) {
            if (that.filteredOutObj.year[d.year]) {
                return false;
            }
            if (that.filteredOutObj.report[d.report]) {
                return false;
            }
            return true;
        });
        that.$total = 0;
        that.links.forEach(function (d) {
            d.source = that.nodeById.get(d.sourceId);
            d.target = that.nodeById.get(d.targetId);
            that.$outById[d.source.id] += d.dollars;
            that.$inById[d.target.id] += d.dollars;
            that.$outByState[d.source.state] += d.dollars;
            that.$inByState[d.target.state] += d.dollars;
            that.$total += d.dollars;
        });
        that.$nodeScale.domain([0, that.$total]);
        that.nodes.forEach(function (d) {
            var $in = that.$nodeScale(that.$inById[d.id]);
            var $out = that.$nodeScale(that.$outById[d.id]);
            if ($in === 0 && $out === 0) {
                d.r = 0;
            } else if ($in > $out) {
                d.r = Math.max(vs.network.rMin.val, vs.network.rFactor.val * Math.sqrt($in));
            } else {
                d.r = Math.max(vs.network.rMin.val, vs.network.rFactor.val * Math.sqrt($out));
            }
        });
        TestApp('UpdateData', -1);
        return that;
    };

    that.DrawMap = function () {
        TestApp('DrawMap', 1);
        svg.attr('width', vs.svg.w.val).attr('height', vs.svg.h.val);
        bgRect.attr('width', vs.map.w.val).attr('height', vs.map.h.val);
        clipPathRect.attr('width', vs.map.w.val).attr('height', vs.svg.h.val);
        that.projection.scale(vs.map.w.val * vs.map.projectionScale.val).translate([vs.map.w.val / 2, vs.map.h.val / 2]);
        that.path.projection(that.projection);
        statePaths = statePathsG.selectAll('path.state-path').data(that.states, function (d) {
            return d.properties.ansi;
        });
        statePaths = statePaths.enter().append('path').classed('state-path', true).classed('inactive', true).merge(statePaths).attr('d', that.path).each(function (d) {
            return that.centroidByState[d.properties.ansi] = that.path.centroid(d);
        }).style('stroke-width', vs.map.strokeWidthState.val + 'px')
        // .each(function(d) {
        //     let centroid = that.centroidByState[d.properties.ansi];
        //     let rect = d3.select(this.parentNode).append('rect')
        //         .classed('path-rect', true)
        //         .attr('x', centroid[0]-20)
        //         .attr('y', centroid[1]-20)
        //         .attr('width', 40)
        //         .attr('height', 40)
        //         .attr('fill', 'white')
        //         .style('stroke', 'red');
        //     d3.select(this).remove();
        // })
        ;
        TestApp('DrawMap', -1);
        return that;
    };

    that.DrawInfo = function () {
        TestApp('DrawInfo', 1);
        infoG.attr('transform', 'translate(' + (vs.map.w.val + vs.info.margin.val) + ',' + vs.info.margin.val + ')');
        infoImageGs = infoG.selectAll('g.info-image-g').data(that.infoData);
        infoImageGs = infoImageGs.enter().append('g').classed('info-image-g', true).each(function (datum) {
            d3.select(this).append('image').attr('width', vs.info.wImage.val).attr('height', vs.info.hImage.val).attr('xlink:href', function () {
                if (!topIds.includes(datum.id)) {
                    return null;
                } else {
                    return 'img/' + datum.id + '.jpg';
                }
            });
        }).merge(infoImageGs);
        infoImageGs.transition().duration(vs.transition.duration.val).ease(vs.transition.ease.val).style('opacity', function (d) {
            return +(that.nodeSelected && d.id === that.nodeSelected.id);
        });
        infoTextGs = infoG.selectAll('g.info-text-g').data(that.infoData);
        infoTextGs = infoTextGs.enter().append('g').classed('info-text-g', true).attr('transform', 'translate(' + vs.info.wImage.val / 2 + ',' + (vs.info.hImage.val + vs.info.margin.val) + ')').style('opacity', 0).merge(infoTextGs);
        infoTextGs.selectAll('text').remove();
        infoTextGs.each(function (datum) {
            d3.select(this).append('text').attr('x', 0).attr('y', 0.5 * vs.info.textRowH.val).text(datum.id);
            d3.select(this).append('text').attr('x', 0).attr('y', 1.5 * vs.info.textRowH.val).text('State: ' + datum.state);
            // if (that.$inById[datum.id] > 0) {
            d3.select(this).append('text').attr('x', 0).attr('y', 2.5 * vs.info.textRowH.val).text('Received: ' + d3.format('$,')(that.$inById[datum.id]));
            // }
            // if (that.$outById[datum.id] > 0) {
            d3.select(this).append('text').attr('x', 0).attr('y', 3.5 * vs.info.textRowH.val).text('Donated: ' + d3.format('$,')(that.$outById[datum.id]));
            // }
            // d3.select(this).append('text')
            //     .attr('x', 0)
            //     .attr('y', 4.5 * vs.info.textRowH.val)
            //     .text(() => {
            //         let yearsArray = yearsData.filter(d => !(that.filteredOutObj.year[d]));
            //         if (yearsArray.length === 0) {
            //             return 'Years: None';
            //         } else {
            //             return 'Years: [' + yearsArray + ']';
            //         }
            //     });
        }).transition().duration(vs.transition.duration.val).ease(vs.transition.ease.val).style('opacity', function (d) {
            return +(that.nodeSelected && d.id === that.nodeSelected.id);
        });
        TestApp('DrawInfo', -1);
        return that;
    };

    that.forcesData = [{
        category: 'forceCenter',
        isEnabled: false,
        isIsolated: false,
        rows: [{
            name: 'x',
            val: 'cx'
        }, {
            name: 'y',
            val: 'cy'
        }]
    }, {
        category: 'forceCollide',
        isEnabled: true,
        isIsolated: false,
        rows: [{
            name: 'iterations',
            inputType: 'range',
            val: 5,
            min: 0,
            max: 10,
            step: 1,
            _default: 1
        }, {
            name: 'strength',
            inputType: 'range',
            val: 1,
            min: 0,
            max: 1,
            step: 0.01,
            _default: 1
        }, {
            name: 'radius',
            val: function val(node, i, nodes) {
                return node.r ? 1.5 + node.r : 0;
            }
        }]
    }, {
        category: 'forceLink',
        isEnabled: false,
        isIsolated: false,
        rows: [{
            name: 'links',
            val: [],
            _default: []
        }, {
            name: 'id',
            val: function val(node) {
                return node.index;
            }

        }, {
            name: 'iterations',
            inputType: 'range',
            val: 1,
            min: 0,
            max: 10,
            step: 1,
            _default: 1
        }, {
            name: 'strength',
            inputType: 'range',
            val: 0.5,
            min: 0,
            max: 1,
            step: 0.01,
            _default: function _default(link, i, links) {
                return 1 / Math.min(count[link.source.index], count[link.target.index]);
            }
        }, {
            name: 'distance',
            inputType: 'range',
            val: 30,
            min: 0,
            max: 100,
            step: 1,
            _default: function _default(link, i, links) {
                return 30;
            }
        }]
    }, {
        category: 'forceManyBody',
        isEnabled: false,
        isIsolated: false,
        rows: [{
            name: 'strength',
            inputType: 'range',
            val: -30,
            min: -100,
            max: 0,
            step: 1,
            _default: function _default(node, i, nodes) {
                return -30;
            }
        }, {
            name: 'distanceMin',
            inputType: 'range',
            val: 1,
            min: 0,
            max: 10000,
            step: 1
        }, {
            name: 'distanceMax',
            inputType: 'range',
            val: 100,
            min: 0,
            max: 200,
            step: 1,
            _default: Infinity
        }, {
            name: 'theta',
            inputType: 'range',
            val: 0.81,
            min: 0,
            max: 1,
            step: 0.1
        }]
    }, {
        category: 'forceRadial',
        isEnabled: false,
        isIsolated: false,
        rows: [{
            name: 'strength',
            inputType: 'range',
            val: 0.1,
            min: 0,
            max: 1,
            step: 0.01,
            _default: function _default(node, i, nodes) {
                return 0.1;
            }
        }, {
            name: 'radius',
            val: function val(node, i, nodes) {
                return node.r;
            }
        }, {
            name: 'x',
            val: 'cx'
        }, {
            name: 'y',
            val: 'cy'
        }]
    }, {
        category: 'forceX',
        isEnabled: true,
        isIsolated: true,
        rows: [{
            name: 'strength',
            inputType: 'range',
            val: 0.1,
            min: 0,
            max: 1,
            step: 0.05,
            _default: function _default(node, i, nodes) {
                return 0.1;
            }
        }, {
            name: 'x',
            val: 'cx',
            _default: function _default(node, i, nodes) {
                return node.x;
            }
        }]
    }, {
        category: 'forceY',
        isEnabled: true,
        isIsolated: true,
        rows: [{
            name: 'strength',
            inputType: 'range',
            val: 0.1,
            min: 0,
            max: 1,
            step: 0.05,
            _default: function _default(node, i, nodes) {
                return 0.1;
            }
        }, {
            name: 'y',
            val: 'cy',
            _default: function _default(node, i, nodes) {
                return node.y;
            }
        }]
    }, {
        category: 'simulation',
        isEnabled: true,
        rows: [{
            name: 'alpha',
            inputType: 'range',
            val: 1,
            min: 0,
            max: 1,
            step: 0.01
        }, {
            name: 'alphaMin',
            inputType: 'range',
            val: 0.4,
            min: 0,
            max: 1,
            step: 0.05,
            _default: 0.001
        }, {
            name: 'alphaDecay',
            inputType: 'range',
            val: 0.02276277904418933,
            min: 0.01,
            max: 0.2,
            step: 0.01
        }, {
            name: 'alphaTarget',
            inputType: 'range',
            val: 0,
            min: 0,
            max: 0.19,
            step: 0.01
        }, {
            name: 'velocityDecay',
            inputType: 'range',
            val: 0.3,
            min: 0,
            max: 1,
            step: 0.1
        }]
    }];
    that.optionsData = that.forcesData.filter(function (d) {
        return d.isEnabled;
    });
    that.optionDatumAlpha = that.optionsData[that.optionsData.length - 1];
    Object.keys(vs).forEach(function (category) {
        var optionsObj = {
            category: category,
            rows: []
        };
        Object.keys(vs[category]).forEach(function (categoryKey) {
            if (categoryKey[0] === '_') {
                return;
            }
            var rowOld = vs[category][categoryKey];
            console.log(category, categoryKey, rowOld);
            optionsObj.rows.push({
                name: categoryKey,
                inputType: rowOld.inputType,
                val: rowOld.val,
                min: rowOld.min !== undefined ? rowOld.min : 0,
                max: rowOld.max !== undefined ? rowOld.max : 5 * rowOld.val,
                step: 5 * rowOld.val / 100
            });
        });
        that.optionsData.push(optionsObj);
    });

    that.UpdateSimulation = function () {
        TestApp('UpdateSimulation', 1);
        that.simulation = d3.forceSimulation().nodes(that.nodes).on('tick', that.Tick).stop();
        that.optionsData.forEach(function (optionsObj) {
            if (optionsObj.category === 'simulation') {
                optionsObj.rows.forEach(function (row) {
                    that.simulation[row.name](row.val);
                });
            } else if (optionsObj.isEnabled !== true) {
                return;
            } else if (optionsObj.category.substring(0, 5) !== 'force') {
                return;
            } else if (optionsObj.isIsolated === true) {
                Object.keys(that.$outByState).forEach(function (state) {
                    var cx = that.centroidByState[state][0];
                    var cy = that.centroidByState[state][1];
                    var forceNew = d3[optionsObj.category]();
                    var initialize = forceNew.initialize;
                    forceNew.initialize = function () {
                        initialize.call(forceNew, that.nodes.filter(function (d) {
                            return d.state === state;
                        }));
                    };
                    optionsObj.rows.forEach(function (row) {
                        var rowValue = row.val; // do not mutate original
                        switch (rowValue) {
                            case 'cx':
                                rowValue = cx;
                                break;
                            case 'cy':
                                rowValue = cy;
                                break;
                        }
                        forceNew[row.name](rowValue);
                    });
                    that.simulation.force(optionsObj.category + state, forceNew).stop();
                });
            } else {
                var forceNew = d3[optionsObj.category]();
                optionsObj.rows.forEach(function (row) {
                    var rowValue = row.val; // do not mutate original
                    switch (rowValue) {
                        case 'cx':
                            rowValue = 0.5 * vs.map.w.val;
                            break;
                        case 'cy':
                            rowValue = 0.5 * vs.map.h.val;
                            break;
                    }
                    forceNew[row.name](rowValue);
                });
                that.simulation.force(optionsObj.category, forceNew).stop();
            }
        });
        that.simulation.stop().alpha(1).restart();
        TestApp('UpdateSimulation', -1);
        return that;
    };

    that.DragStarted = function (d) {
        // TestApp('DragStarted', 1);
        isDragging = true;
        // if (!d3.event.active) { that.simulation.alphaTarget(0.3).restart(); }
        d.fx = d.x;
        d.fy = d.y;
        // that.Tick();
        // TestApp('DragStarted', -1);
    };

    that.Dragged = function (d) {
        // TestApp('Dragged', 1);
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d.x = d3.event.x;
        d.y = d3.event.y;
        d.cx = d3.event.x;
        d.cy = d3.event.y;
        that.Tick();
        // TestApp('Dragged', -1);
    };

    that.DragEnded = function (d) {
        // TestApp('DragEnded', 1);
        isDragging = false;
        // if (!d3.event.active) { that.simulation.alphaTarget(0); }
        d.fx = null;
        d.fy = null;
        if (!d3.event.active) {
            that.simulation.alpha(1).restart();
        }
        // TestApp('DragEnded', -1);
    };

    that.DrawNetwork = function () {
        TestApp('DrawNetwork', 1);
        nodeCircles = nodesG.selectAll('circle.node-circle').data(that.nodes);
        nodeCircles = nodeCircles.enter().append('circle').classed('node-circle', true).on('mouseover', function (d) {
            if (isDragging) {
                return;
            }
            that.nodeSelected = d;
            that.linksSelected = that.links.filter(function (d) {
                return that.nodeSelected.id === d.source.id || that.nodeSelected.id === d.target.id;
            });
            if (!that.infoData.includes(that.nodeSelected)) {
                that.infoData.push(that.nodeSelected);
            }
            that.DrawNetwork().DrawInfo();
        }).on('mouseout', function () {
            if (isDragging) {
                return;
            }
            that.nodeSelected = null;
            that.linksSelected = [];
            that.DrawNetwork().DrawInfo();
        }).call(d3.drag().on('start', that.DragStarted).on('drag', that.Dragged).on('end', that.DragEnded)).merge(nodeCircles);
        nodeCircles.attr('cx', function (d) {
            return d.x;
        }).attr('cy', function (d) {
            return d.y;
        }).style('stroke-width', vs.network.strokeWidthNode.val + 'px').style('fill', function (d) {
            if (topIds.includes(d.id)) {
                return d3.schemeCategory20[d.i];
            } else if (d.$out > 0) {
                return 'gainsboro';
            } else {
                return 'white';
            }
        }).style('stroke', 'gray').attr('r', function (d) {
            return d.r;
        })
        // .transition().duration(vs.transition.duration.val).ease(vs.transition.ease.val)
        .style('opacity', function (d) {
            if (!that.nodeSelected) {
                return 1;
            } else if (that.nodeSelected.id === d.id) {
                return 1;
            } else if (that.linksSelected.map(function (d) {
                return d.source.id;
            }).includes(d.id)) {
                return 1;
            } else if (that.linksSelected.map(function (d) {
                return d.target.id;
            }).includes(d.id)) {
                return 1;
            } else {
                return 0.05;
            }
        });
        svgDefsArrowheads = svgDefs.selectAll('marker.arrowhead').data(topIds.concat('misc'));
        svgDefsArrowheads = svgDefsArrowheads.enter().append('marker').classed('arrowhead', true).attr('id', function (d, i) {
            return 'arrowhead-id' + i;
        }).each(function (datum, i) {
            d3.select(this).selectAll('path').data([null]).enter().append('path').attr('d', 'M 0 0 12 6 0 12 3 6 Z').style('stroke', function () {
                return i < topIds.length ? d3.schemeCategory20[i] : 'gray';
            }).style('fill', function () {
                return i < topIds.length ? d3.schemeCategory20[i] : 'gainsboro';
            });
        }).merge(svgDefsArrowheads);
        svgDefsArrowheads.attr('refX', 12).attr('refY', 6).attr('markerUnits', 'userSpaceOnUse').attr('markerWidth', 112).attr('markerHeight', 118).attr('orient', 'auto');
        linkLines = linksG.selectAll('line.link-line').data(that.links);
        linkLines.exit().remove();
        linkLines = linkLines.enter().append('line').classed('link-line', true).attr('x1', function (d) {
            return d.source.x;
        }).attr('y1', function (d) {
            return d.source.y;
        }).attr('x2', function (d) {
            return d.target.x;
        }).attr('y2', function (d) {
            return d.target.y;
        }).merge(linkLines);
        linkLines.attr('marker-end', function (d) {
            if (topIds.includes(d.source.id)) {
                return 'url(#arrowhead-id' + d.source.i + ')';
            } else {
                return 'url(#arrowhead-id' + topIds.length + ')';
            }
        }).style('stroke-width', vs.network.strokeWidthLink.val + 'px').style('stroke', function (d) {
            if (topIds.includes(d.source.id)) {
                return d3.schemeCategory20[d.source.i];
            } else if (topIds.includes(d.target.id)) {
                return d3.schemeCategory20[d.target.i];
            } else if (d.source.$out > 0) {
                return 'gray';
            } else if (d.target.$out > 0) {
                return 'gray';
            } else {
                return 'gainsboro';
            }
        })
        // .transition().duration(vs.transition.duration.val).ease(vs.transition.ease.val)
        .style('display', function (d) {
            if (that.filteredOutObj.year[d.year]) {
                return 'none';
            } else if (that.filteredOutObj.report[d.report]) {
                return 'none';
            } else if (!that.nodeSelected) {
                return 'block';
            } else if (that.nodeSelected.id === d.source.id) {
                return 'block';
            } else if (that.nodeSelected.id === d.target.id) {
                return 'block';
            } else {
                return 'none';
            }
        });
        TestApp('DrawNetwork', -1);
        return that;
    };

    that.DrawFilters = function () {
        TestApp('DrawFilters', 1);
        filtersDiv.style('width', vs.filters.w.val + 'px').style('height', vs.filters.h.val + 'px').style('left', 0.5 * (vs.map.w.val - vs.filters.w.val) + 'px').style('top', vs.map.h.val + 'px');
        filtersYears = filtersDiv.selectAll('div.filters-year').data(yearsData);
        filtersYears = filtersYears.enter().append('div').classed('filters-year', true).each(function (datum) {
            d3.select(this).append('div').text(datum);
            d3.select(this).append('input').attr('type', 'checkbox').each(function (d) {
                this.checked = true;
            }).on('change', function (d) {
                that.filteredOutObj.year[d] = !this.checked;
                that.UpdateData().DrawNetwork().UpdateSimulation();
            });
        }).merge(filtersYears).style('width', vs.filters.w.val / yearsData.length + 'px').style('height', 0.5 * vs.filters.h.val + 'px');
        filtersReports = filtersDiv.selectAll('div.filters-report').data(reportsData);
        filtersReports = filtersReports.enter().append('div').classed('filters-report', true).each(function (datum) {
            d3.select(this).append('div').text(datum);
            d3.select(this).append('input').attr('type', 'checkbox').each(function (d) {
                this.checked = true;
            }).on('change', function (d) {
                that.filteredOutObj.report[d] = !this.checked;
                that.UpdateData().DrawNetwork().UpdateSimulation();
            });
        }).merge(filtersReports).style('width', vs.filters.w.val / reportsData.length + 'px').style('height', 0.5 * vs.filters.h.val + 'px');
        TestApp('DrawFilters', -1);
        return that;
    };

    that.DrawOptions = function () {
        TestApp('DrawOptions', 1);
        optionsDiv.style('top', Math.max(vs.svg.h.val, vs.map.h.val + vs.filters.h.val) + 'px').style('width', Math.max(vs.options.wGroup.val, vs.map.w.val) + 'px');
        optionGroups = optionsDiv.selectAll('div.option-group').data(that.optionsData);
        optionGroups = optionGroups.enter().append('div').classed('option-group', true).each(function (optionsObj) {
            var rowsFiltered = optionsObj.rows.filter(function (row) {
                return row.inputType;
            });
            d3.select(this).style('display', rowsFiltered.length ? null : 'none');
            d3.select(this).append('div').classed('option-category', true).append('label').classed('label-medium', true).text(optionsObj.category);
            d3.select(this).selectAll('div.option-row').data(rowsFiltered).enter().append('div').classed('option-row', true).each(function (row) {
                d3.select(this).append('label').classed('label-medium', true).text(row.name);
                d3.select(this).append('label').classed('label-small', true).classed('option-value', true);
                d3.select(this).append('label').classed('label-small', true).text(row.min);
                d3.select(this).append('input').attr('type', 'range').attr('min', row.min).attr('max', row.max).attr('step', row.step).attr('value', row.val).on('change', function () {
                    if (row.step === parseInt(row.step)) {
                        row.val = parseInt(this.value);
                    } else {
                        row.val = parseFloat(this.value);
                    }
                    if (Object.keys(vs).includes(optionsObj.category)) {
                        vs[optionsObj.category][row.name].val = row.val;
                        that.UpdateData().UpdateSimulation().DrawMap().DrawNetwork().DrawOptions();
                    } else {
                        that.UpdateSimulation().DrawOptions();
                    }
                });
                d3.select(this).append('label').classed('label-small', true).text(row.max);
                if (row.name === 'alpha') {
                    optionsAlphaLabel = d3.select(this).selectAll('label.option-value');
                    optionsAlphaSlider = d3.select(this).selectAll('input[type="range"]');
                }
            }).style('width', vs.options.wGroup.val - vs.options.wMedium.val + 'px');
        }).merge(optionGroups).style('width', vs.options.wGroup.val + 'px').style('margin', vs.options.margin.val + 'px');
        optionGroups.selectAll('label.option-value').text(function (d) {
            return typeof d.val !== 'number' ? '' : d.val;
        });
        optionGroups.selectAll('label.label-small').style('width', vs.options.wSmall.val + 'px');
        optionGroups.selectAll('label.label-medium').style('width', vs.options.wMedium.val + 'px');
        optionGroups.selectAll('input[type=\'Range\']').style('width', vs.options.wSlider.val + 'px');
        optionGroups.selectAll('options-row *').style('height', vs.options.hRow.val + 'px').style('line-height', vs.options.hRow.val + 'px');
        TestApp('DrawOptions', -1);
        return that;
    };

    that.Tick = function () {
        // TestApp('Tick', 1);
        nodeCircles.attr('cx', function (d) {
            return d.x;
        }).attr('cy', function (d) {
            return d.y;
        });
        linkLines.attr('x1', function (d) {
            return d.source.x;
        }).attr('y1', function (d) {
            return d.source.y;
        }).attr('x2', function (d) {
            return d.target.x;
        }).attr('y2', function (d) {
            return d.target.y;
        });
        that.optionDatumAlpha.val = parseFloat(that.simulation.alpha()).toFixed(8);
        optionsAlphaLabel.text(that.optionDatumAlpha.val);
        optionsAlphaSlider.property('value', that.optionDatumAlpha.val);
        // TestApp('Tick', -1);
    };

    TestApp('HybridMapClass', -1);
    return that;
}

function TestApp(source, position) {
    if (!logsTest || !performance || !performance.memory) {
        return;
    }
    if (position === 1) {
        stackLevel += 1;
        stackLevelTemp = stackLevel;
        stringSymbol = '> ';
        if (logsTest === 'out') {
            return;
        }
    } else if (position === -1) {
        stackLevelTemp = stackLevel;
        stackLevel -= 1;
        stringSymbol = '< ';
        if (logsTest === 'in') {
            return;
        }
    } else {
        stringSymbol = '• ';
    }
    stringSource = '%c' + (''.padStart(2 * stackLevelTemp) + stringSymbol + String(source)).padEnd(24);
    colorSource = 'color:black';
    sizeNodesOld = sizeNodesNew;
    sizeUsedOld = sizeUsedNew;
    sizeTotalOld = sizeTotalNew;
    sizeNodesNew = d3.selectAll('*').size();
    sizeUsedNew = performance.memory.usedJSHeapSize;
    sizeTotalNew = performance.memory.totalJSHeapSize;
    if (sizeNodesNew !== sizeNodesOld) {
        stringNodes = (sizeNodesNew + ' n').padStart(6);
        colorNodes = 'color:' + (sizeNodesNew < sizeNodesOld ? vs.test.colorGood.val : vs.test.colorBad.val);
    } else {
        stringNodes = '';
        colorNodes = 'color:' + vs.test.colorNeutral.val;
    }
    stringNodes = '%c' + stringNodes.padEnd(8);
    if (sizeUsedNew !== sizeUsedOld) {
        stringUsed = ((sizeUsedNew / (1024 * 1024)).toFixed(2) + ' Mb').padStart(8);
        colorUsed = 'color:' + (sizeUsedNew < sizeUsedOld ? vs.test.colorGood.val : vs.test.colorBad.val);
    } else {
        stringUsed = '';
        colorUsed = 'color:' + vs.test.colorNeutral.val;
    }
    stringUsed = '%c' + stringUsed.padEnd(12);
    if (sizeTotalNew !== sizeTotalOld) {
        stringTotal = ((sizeTotalNew / (1024 * 1024)).toFixed(2) + ' Mb').padStart(8);
        colorTotal = 'color:' + (sizeTotalNew < sizeTotalOld ? vs.test.colorGood.val : vs.test.colorBad.val);
    } else {
        stringTotal = '';
        colorTotal = 'color:' + vs.test.colorNeutral.val;
    }
    stringTotal = '%c' + stringTotal.padEnd(12);
    stringCombined = stringSource + stringNodes + stringUsed + stringTotal;
    console.log(stringCombined, colorSource, colorNodes, colorUsed, colorTotal);
}
