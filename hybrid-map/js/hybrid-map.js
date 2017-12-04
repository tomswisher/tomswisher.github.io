// Tom Swisher
// tomswisherlabs@gmail.com
// https://github.com/tomswisher

/* globals d3, console, nodes, count */
/* jshint -W069, unused:false */
'use strict';

// -------------------------------------------------------------------------------------------------
// Globl Settings

var defaultRadius = 20;
var minimumRaidus = 5;
var transitionDuration = 300;
var transitionEase = d3.easeCubic;

// -------------------------------------------------------------------------------------------------
// Performance

var logsLvl0 = 0;
var logsLvl1 = 0;
var logsLvl2 = 0;
var logsTest = 0 && performance && performance.memory;
var memWatch = 0 && performance && performance.memory ? MemoryTester() : 0;
var resizeWait = 200;
var resizingCounter = 0;
var stackLvl = 0;
var nodesCount = 0;
var usedJSHeapSize = 0;
var totalJSHeapSize = 0;
var usedJSHeapDiffs = [];
var totalJSHeapDiffs = [];
var nStr = '';
var uStr = '';
var tStr = '';
var testStr = '';
var mobileOptions = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
var isMobile = navigator && mobileOptions.test(navigator.userAgent);

// -------------------------------------------------------------------------------------------------
// Window Variables

var body = d3.select('body');
var mainSVG = body.select('#main-svg');
var mainBGRect = body.select('#main-bg-rect');
var mainClipPathRect = body.select('#main-clip-path-rect');
var statesG = body.select('#states-g');
var verticesG = body.select('#vertices-g');
var verticeCircles;
var edgesG = body.select('#edges-g');
var edgeLines;
var hoverG = body.select('#hover-g');
var hoverRect = body.select('#hover-rect');
var hoverText = body.select('#hover-text');
var filtersG = body.select('#filters-g');
var defs = filtersG.append('defs');
var statesSelect = body.select('#states-select');
var optionsContainer = body.select('#options-container');
var infoG = body.select('#info-g');
var infoBGRect = infoG.selectAll('rect.info-bg-rect');
var infoImageGs = infoG.selectAll('g.info-image-g');
var infoTextGs = infoG.selectAll('g.info-text-g');
window.onload = function () {
    d3.queue().defer(d3.json, 'data/us-states-features.json').defer(d3.json, 'data/nodes-edges-04-06-2017.json').awaitAll(InitializePage);
};
window.onresize = function () {
    // if (resizingCounter === 0) {
    //     if (logsLvl1) console.log('Waiting to resize...');
    // }
    resizingCounter += 1;
    if (logsLvl1) console.log(''.padStart(resizingCounter * 2, ' ') + resizingCounter);
    setTimeout(function () {
        if (resizingCounter > 1) {
            resizingCounter -= 1;
        } else if (resizingCounter === 1) {
            resizingCounter = 0;
            UpdatePageDimensions();
        }
        if (logsLvl1) console.log(''.padStart(resizingCounter * 2, ' ') + resizingCounter);
    }, resizeWait);
};
var topIds = ['Alice Walton', 'Carrie Walton Penner', 'Jim Walton', 'Dorris Fisher', 'Eli Broad', 'Greg Penner', 'Jonathan Sackler', 'Laurene Powell Jobs', 'Michael Bloomberg', 'Reed Hastings', 'Stacy Schusterman', 'John Arnold', 'Laura Arnold'];
var mapObj = null;
var graphObj = null;
var stateSelected = '';
var nodeSelected = null;
var infoData = [];
var visibleGrades = { 'A': true, 'B': true, 'C': true, 'D': true, 'F': true };

// -------------------------------------------------------------------------------------------------
// Visual Styles

var vs = {
    svg: {
        w: null,
        h: null
    },
    map: {
        w: null,
        wMin: 300,
        h: null,
        ratioMapWH: 1.6,
        projectionScale: 1.3,
        selectedOpacity: 0.3
    },
    info: {
        w: 396 / 2,
        h: 250, // h: 432/2,
        ratioImageWH: 396 / 432
        // margin: 5,
        // strokeWidth: 10,
    },
    filters: {
        w: null,
        h: 0,
        gradeMargin: 2.5
    },
    statesSelect: {
        w: 100,
        h: 0
    },
    hover: {
        w: null,
        h: null,
        margin: 5
    },
    // gradeColorArray: ['rgb(50,50,50)','rgb(28,44,160)','rgb(240,6,55)','rgb(251,204,12)','rgb(239,230,221)'], /*BH1*/
    // gradeColorArray: ['rgb(240,243,247)','rgb(191,162,26)','rgb(20,65,132)','rgb(153,40,26)','rgb(34,34,34)'], /*BH2*/ 
    gradeColorArray: ['#de2d26', '#fb6a4a', '#fc9272', '#fcbba1', '#fee5d9'] /*red*/
};
vs.colorScale = d3.scaleQuantize().domain([0, 5]).range(vs.gradeColorArray);
defs.append('filter').attr('id', 'drop-shadow').attr('height', '130%') // so the shadow is not clipped
.attr('width', '120%').each(function () {
    d3.select(this).append('feGaussianBlur').attr('in', 'SourceAlpha') // opacity of source node
    .attr('stdDeviation', 2) // convolve with Gaussian
    .attr('result', 'blur');
    d3.select(this).append('feOffset').attr('in', 'blur').attr('dx', 2).attr('dy', 2).attr('result', 'offsetBlur');
    d3.select(this).append('feMerge').each(function () {
        d3.select(this).append('feMergeNode').attr('in', 'offsetBlur');
        d3.select(this).append('feMergeNode').attr('in', 'SourceGraphic'); // source node is on top
    });
});

// -------------------------------------------------------------------------------------------------
// Functions

function InitializePage(error, results) {
    TestApp('InitializePage', 1);
    //
    var usStatesFeaturesJSON = results[0];
    var nodesEdgesJSON = results[1];
    //
    mapObj = new MapClass().mapFeatures(usStatesFeaturesJSON.features).vertices(nodesEdgesJSON.nodes).edges(nodesEdgesJSON.links);
    //
    graphObj = new GraphClass();
    //
    vs.hover.h = parseFloat(mainSVG.style('font-size')) + 2 * vs.hover.margin;
    hoverRect.attr('height', vs.hover.h).attr('y', -1 * vs.hover.h - vs.hover.margin).style('filter', 'url(#drop-shadow)');
    hoverText.attr('x', 0).attr('y', -0.5 * vs.hover.h - vs.hover.margin);
    //
    mainBGRect.on('mouseover', function () {
        stateSelected = '';
        // UpdateStatesSelect();
        // mapObj
        //     .UpdateMap();
        // hoverText
        //     .text('');
        // UpdateHover('mouse');
        // graphObj
        //     .UpdateNodesEdges();
    }).attr('x', 0).attr('y', 0);
    //
    statesSelect.style('width', vs.statesSelect.w + 'px').style('height', vs.statesSelect.h + 'px').style('display', vs.statesSelect.h ? 'inline-block' : 'none');
    //
    UpdatePageDimensions();
    //
    requestAnimationFrame(function () {
        graphObj.UpdateForceSliders();
        body.classed('loading', false);
    });
    //
    TestApp('InitializePage', -1);
}

function MapClass() {
    // TestApp('MapClass', 1);
    //
    var that = this;
    var _verticeById = null;
    var _projection = d3.geoAlbersUsa();
    var _path = d3.geoPath();
    var _width = 0;
    that.width = function (_) {
        return arguments.length ? (_width = _, that) : _width;
    };
    var _height = 0;
    that.height = function (_) {
        return arguments.length ? (_height = _, that) : _height;
    };
    var _mapFeatures = null;
    that.mapFeatures = function (_) {
        return arguments.length ? (_mapFeatures = _, that) : _mapFeatures;
    };
    var _centroidByState = {};
    that.centroidByState = function (_) {
        return arguments.length ? (_centroidByState = _, that) : _centroidByState;
    };
    var _$GivenByState = {};
    that.$GivenByState = function (_) {
        return arguments.length ? (_$GivenByState = _, that) : _$GivenByState;
    };
    var _$ReceivedByState = {};
    that.$ReceivedByState = function (_) {
        return arguments.length ? (_$ReceivedByState = _, that) : _$ReceivedByState;
    };
    var _$GivenByStateScale = d3.scaleLinear().range([0, 1]);
    that.$GivenByStateScale = function (_) {
        return arguments.length ? (_$GivenByStateScale = _, that) : _$GivenByStateScale;
    };
    var _$ReceivedByStateScale = d3.scaleLinear().range([0, 1]);
    that.$ReceivedByStateScale = function (_) {
        return arguments.length ? (_$ReceivedByStateScale = _, that) : _$ReceivedByStateScale;
    };
    var _$GivenByVerticeScale = d3.scaleLinear().range([0, 1]);
    that.$GivenByVerticeScale = function (_) {
        return arguments.length ? (_$GivenByVerticeScale = _, that) : _$GivenByVerticeScale;
    };
    var _$ReceivedByVerticeScale = d3.scaleLinear().range([0, 1]);
    that.$ReceivedByVerticeScale = function (_) {
        return arguments.length ? (_$ReceivedByVerticeScale = _, that) : _$ReceivedByVerticeScale;
    };
    var _vertices = null;
    that.vertices = function (vertices) {
        if (!arguments.length) {
            return _vertices;
        }
        _vertices = vertices;
        _vertices.forEach(function (vertice) {
            vertice.$Given = 0;
            vertice.$Received = 0;
            _$GivenByState[vertice.state] = 0;
            _$ReceivedByState[vertice.state] = 0;
        });
        _verticeById = d3.map(_vertices, function (d) {
            return d.id;
        });
        //
        return that;
    };
    var _edges = null;
    that.edges = function (edges) {
        if (!arguments.length) {
            return _edges;
        }
        _edges = edges;
        _edges.forEach(function (edge) {
            edge.source = _verticeById.get(edge.source);
            edge.target = _verticeById.get(edge.target);
            //
            edge.source.$Given += edge.dollars;
            edge.target.$Received += edge.dollars;
            //
            _$GivenByState[edge.source.state] += edge.dollars;
            _$ReceivedByState[edge.target.state] += edge.dollars;
            //
            // edge.topId = topIds.includes(edge.source.id) || topIds.includes(edge.target.id);
            // if (edge.topId) {
            //     edge.source.topId = true;
            //     edge.target.topId = true;
            // }
        });
        // _edges = _edges.filter(function(edge) {
        //     return edge.topId;
        // });
        // _vertices = _vertices.filter(function(vertice) {
        //     return vertice.topId;
        // });
        return that;
    };
    //
    that.UpdateMap = function (source) {
        // TestApp('UpdateMap', 1);
        if (logsLvl2) console.log('UpdateMap');
        //
        var $GivenByStatesArray = Object.keys(_$GivenByState).map(function (d) {
            return _$GivenByState[d];
        });
        _$GivenByStateScale.domain([d3.max($GivenByStatesArray), d3.min($GivenByStatesArray)]);
        var $ReceivedByStatesArray = Object.keys(_$ReceivedByState).map(function (d) {
            return _$ReceivedByState[d];
        });
        _$ReceivedByStateScale.domain([d3.min($ReceivedByStatesArray), d3.max($ReceivedByStatesArray)]);
        _$GivenByVerticeScale.domain([d3.min(_vertices, function (vertice) {
            return vertice.$Given;
        }), d3.max(_vertices, function (vertice) {
            return vertice.$Given;
        })]);
        _$ReceivedByVerticeScale.domain([d3.min(_vertices, function (vertice) {
            return vertice.$Received;
        }), d3.max(_vertices, function (vertice) {
            return vertice.$Received;
        })]);
        //
        _projection.scale(_width * vs.map.projectionScale).translate([_width / 2, _height / 2]);
        _path.projection(_projection);
        //
        statesG.attr('transform', function () {
            return 'translate(' + 0 + ',' + (vs.svg.h - vs.filters.h - vs.map.h) / 2 + ')';
        });
        //
        var statePaths = statesG.selectAll('path.state-path').data(_mapFeatures, function (d) {
            return d.properties.ansi;
        });
        statePaths = statePaths.enter().append('path').classed('state-path', true).each(function (d) {
            d.$Given = parseInt(_$GivenByState[d.properties.ansi]);
            d.$Received = parseInt(_$ReceivedByState[d.properties.ansi]);
        }).on('mouseover', function (d) {
            // if (isMobile === true) { return; }
            stateSelected = d.properties.ansi;
            // UpdateStatesSelect();
            // mapObj
            //     .UpdateMap();
            // hoverText.text(d.properties.ansi+': '+d.$Given+' '+d.$Received);
            // UpdateHover('mouse');
        }).on('mousemove', function (d) {
            // UpdateHover('mouse');
        }).attr('d', _path).merge(statePaths);
        statePaths.each(function (d) {
            _centroidByState[d.properties.ansi] = _path.centroid(d);
        }).classed('inactive', function (d) {
            return true;
            // return isNaN(d.$Given) && isNaN(d.$Received);
        }).attr('d', _path).style('opacity', function (d) {
            // if (stateSelected === d.properties.ansi) { return vs.map.selectedOpacity; }
            return 1;
        }).style('fill', function (d) {
            return vs.colorScale(5 * _$GivenByStateScale(d.$Given));
        });
        //
        TestApp('UpdateMap');
        return that;
    };
    //
    TestApp('MapClass');
}

function UpdateHover(source) {
    // TestApp('UpdateHover', 1);
    //
    vs.hover.w = 0;
    if (hoverText.text() !== '') {
        vs.hover.w = hoverText.node().getBBox().width + 2 * vs.hover.margin;
    }
    hoverRect.attr('width', vs.hover.w).attr('x', -0.5 * vs.hover.w);
    hoverG.attr('transform', function () {
        var tx, ty;
        if (source === 'mouse') {
            tx = d3.mouse(mainSVG.node())[0];
            ty = d3.mouse(mainSVG.node())[1];
        } else if (mapObj && mapObj.centroidByState()[stateSelected]) {
            tx = mapObj.centroidByState()[stateSelected][0];
            ty = mapObj.centroidByState()[stateSelected][1] + 0.5 * (vs.hover.h + 2 * vs.hover.margin);
        } else {
            tx = mapObj.width() / 2;
            ty = mapObj.height() / 2;
        }
        if (tx < vs.hover.w / 2 + 1) {
            tx = vs.hover.w / 2 + 1;
        } else if (tx > parseInt(mainSVG.style('width')) - vs.hover.w / 2 - 1) {
            tx = parseInt(mainSVG.style('width')) - vs.hover.w / 2 - 1;
        }
        if (ty < vs.hover.h + 5 + 1) {
            ty = vs.hover.h + 5 + 1;
        }
        return 'translate(' + tx + ',' + ty + ')';
    });
    //
    TestApp('UpdateHover');
}

function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] = visibleGrades['D'] = visibleGrades['F'] = bool;
}

function UpdateFilters(source) {
    // TestApp('UpdateFilters', 1);
    if (logsLvl2) console.log('UpdateFilters   ' + source);
    //
    filtersG.attr('transform', function () {
        return 'translate(' + 0 + ',' + (vs.svg.h - vs.filters.h) + ')';
    });
    var rectSize = Math.max(0, vs.filters.h - 2 * vs.filters.gradeMargin - 2);
    //
    var filtersText = filtersG.selectAll('text.filters-text').data([null]);
    filtersText = filtersText.enter().append('text').classed('filters-text', true).merge(filtersText).attr('x', 1 / 2 * vs.filters.w - 130).attr('y', 1 / 2 * vs.filters.h).text('$ Given');
    //
    var gradeArray = ['A', 'B', 'C', 'D', 'F'];
    var gradeGs = filtersG.selectAll('g.grade-g').data(gradeArray);
    gradeGs = gradeGs.enter().append('g').classed('grade-g', true).merge(gradeGs);
    gradeGs.attr('transform', function (d, i) {
        var tx = 1 / 2 * vs.filters.w + (1 / 2 - 1 / 2 * gradeArray.length + i) * vs.filters.h;
        var ty = 1 / 2 * vs.filters.h;
        return 'translate(' + tx + ',' + ty + ')';
    }).on('mouseover', function (d) {
        // ToggleGrades(false);
        // visibleGrades[d] = true;
        // UpdateFilters();
        // mapObj
        //     .UpdateMap();
    }).on('mouseout', function (d) {
        // ToggleGrades(true);
        // UpdateFilters();
        // mapObj
        //     .UpdateMap();
    }).each(function (grade) {
        var gradeBG = d3.select(this).selectAll('rect.grade-bg').data([grade]);
        gradeBG = gradeBG.enter().append('rect').classed('grade-bg', true).merge(gradeBG).attr('x', -1 / 2 * vs.filters.h).attr('y', -1 / 2 * vs.filters.h).attr('width', vs.filters.h).attr('height', vs.filters.h);
        //
        var gradeRect = d3.select(this).selectAll('rect.grade-rect').data([grade]);
        gradeRect = gradeRect.enter().append('rect').classed('grade-rect', true).merge(gradeRect).classed('inactive', function (d) {
            return !visibleGrades[d];
        }).attr('x', -0.5 * rectSize).attr('y', -0.5 * rectSize).attr('width', rectSize).attr('height', rectSize).style('filter', function (d) {
            return visibleGrades[d] ? 'url(#drop-shadow)' : null;
        }).style('fill', function (d) {
            return vs.colorScale(['F', 'D', 'C', 'B', 'A'].indexOf(d));
        });
        //
        var gradeLabel = d3.select(this).selectAll('text.grade-label').data([grade]);
        gradeLabel = gradeLabel.enter().append('text').classed('grade-label', true).classed('button-text', true).text(function (d) {
            return d;
        }).merge(gradeLabel).classed('inactive', function (d) {
            return !visibleGrades[d];
        });
    });
    //
    TestApp('UpdateFilters');
}

function UpdateStatesSelect(source) {
    // TestApp('UpdateStatesSelect', 1);
    if (logsLvl2) console.log('UpdateStatesSelect ' + source);
    //
    var statesSelectData = Object.keys(mapObj.$GivenByState());
    statesSelectData.unshift('');
    statesSelect.classed('button-object', true).on('change', function () {
        var source = 'statesSelect change ' + this.value;
        stateSelected = this.value;
        if (stateSelected === '') {
            hoverText.text('');
        } else {
            var d = mainSVG.selectAll('path.state-path').filter(function (d) {
                return d.properties.ansi === stateSelected;
            }).datum();
            hoverText.text(stateSelected + ': ' + d.$Given + ' ' + d.$Received);
        }
        mapObj.UpdateMap(source);
        UpdateStatesSelect(source);
        // UpdateHover(source);
    }).selectAll('option.states-select-option').data(statesSelectData).enter().append('option').classed('states-select-option', true).text(function (d) {
        return d;
    });
    statesSelect.property('value', stateSelected);
    //
    TestApp('UpdateStatesSelect');
}

function UpdateInfo() {
    // TestApp('UpdateInfo', 1);
    if (logsLvl2) console.log('UpdateInfo', nodeSelected);
    //
    if (nodeSelected && !infoData.filter(function (d) {
        return d.id === nodeSelected.id;
    })[0]) {
        infoData.push(nodeSelected);
    }
    //
    infoG.attr('transform', 'translate(' + vs.map.w + ',' + 0 + ')');
    // infoBGRect
    //     .attr('transform', 'translate('+(vs.map.w+vs.info.margin+0.5*vs.info.strokeWidth)+','+(vs.info.margin+0.5*vs.info.strokeWidth)+')');
    //     .style('stroke-width', vs.info.strokeWidth)
    //     .attr('x', -0.5*vs.info.strokeWidth)
    //     .attr('y', -0.5*vs.info.strokeWidth)
    //     .attr('width', vs.info.w-2*vs.info.margin)
    //     .attr('height', vs.info.h-2*vs.info.margin);
    //
    infoImageGs = infoG.selectAll('g.info-image-g').data(infoData);
    infoImageGs = infoImageGs.enter().append('g').classed('info-image-g', true).each(function (datum) {
        d3.select(this).append('image').attr('width', vs.info.w)
        // .attr('width', vs.info.w-2*vs.info.margin-2*vs.info.strokeWidth)
        .attr('height', vs.info.w * vs.info.ratioImageWH).attr('xlink:href', function () {
            if (!topIds.includes(datum.id)) {
                return 'img/mu.png';
            } else {
                return 'img/' + datum.id + '.jpg';
            }
        });
    }).style('opacity', 0).merge(infoImageGs);
    infoImageGs.style('pointer-events', function (d) {
        return nodeSelected && d.id === nodeSelected.id ? 'all' : 'none';
    }).transition().duration(transitionDuration).ease(transitionEase).style('opacity', function (d) {
        return nodeSelected && d.id === nodeSelected.id ? 1 : 0;
    });
    //
    infoTextGs = infoG.selectAll('g.info-text-g').data(infoData);
    infoTextGs = infoTextGs.enter().append('g').classed('info-text-g', true).attr('transform', function () {
        return 'translate(' + vs.info.w / 2 + ',' + vs.info.w * vs.info.ratioImageWH + ')';
    }).each(function (datum) {
        d3.select(this).append('text').attr('x', 0).attr('y', 1 * 15).text(datum.id);
        d3.select(this).append('text').attr('x', 0).attr('y', 2 * 15).text('State: ' + datum.state);
        d3.select(this).append('text').attr('x', 0).attr('y', 3 * 15).text('Given: ' + d3.format('$,')(datum.$Given));
        d3.select(this).append('text').attr('x', 0).attr('y', 4 * 15).text('Received: ' + d3.format('$,')(datum.$Received));
    }).style('opacity', 0).merge(infoTextGs);
    infoTextGs.transition().duration(transitionDuration).ease(transitionEase).style('opacity', function (d) {
        return nodeSelected && d.id === nodeSelected.id ? 1 : 0;
    });
    //
    TestApp('UpdateInfo');
}

function UpdatePageDimensions() {
    TestApp('UpdatePageDimensions', 1);
    //
    var source = 'UpdatePageDimensions';
    var clientWidth = body.node().clientWidth;
    if (clientWidth >= vs.map.wMin + vs.info.w) {
        vs.map.w = clientWidth - vs.info.w;
        vs.svg.w = clientWidth;
    } else {
        vs.map.w = vs.map.wMin;
        vs.svg.w = vs.map.wMin + vs.info.w;
    }
    vs.map.h = vs.map.w / vs.map.ratioMapWH;
    vs.svg.h = Math.max(vs.map.h, vs.info.h) + vs.filters.h;
    vs.filters.w = vs.map.w;
    //
    mainSVG.attr('width', vs.svg.w).attr('height', vs.svg.h);
    //
    mainBGRect.attr('width', vs.map.w).attr('height', vs.svg.h);
    //
    mainClipPathRect.attr('width', vs.map.w).attr('height', vs.svg.h);
    //
    mapObj.width(vs.map.w).height(vs.map.h).UpdateMap('UpdatePageDimensions');
    //
    graphObj.UpdateNodesEdges().UpdateSimulation();
    //
    UpdateInfo();
    //
    statesSelect.style('margin-left', (vs.map.w - vs.statesSelect.w) / 2 + 'px').style('margin-right', (vs.map.w - vs.statesSelect.w) / 2 + 'px');
    //
    if (vs.filters.h) {
        UpdateFilters();
    }
    //
    // UpdateHover('event');
    //
    // UpdateStatesSelect();
    //
    TestApp('UpdatePageDimensions', -1);
}

function GraphClass() {
    // TestApp('GraphClass', 1);
    //
    var that = this;
    //
    var _alphaLabel;
    var _alphaSlider;
    //
    that.bundle = {
        // 'target': true,
    };
    //
    that.simulation = d3.forceSimulation(mapObj.vertices())
    // .alpha(0.1)
    .alphaMin(0.2)
    // .alphaDecay(1-Math.pow(0.001,1/300))
    // .alphaTarget(0.3)
    // .velocityDecay(0.6)
    .on('tick', _Tick);
    //
    that.simulationObj = {
        alpha: {
            value: 1,
            min: 0.05,
            max: 1,
            step: 0.01,
            category: 'simulation',
            name: 'alpha'
        }
    };
    //
    that.forcesObj = {
        // forceCenter: { // visual centering based on mass
        //     x: {
        //         value: 'cx',
        //     },
        //     y: {
        //         value: 'cy',
        //     },
        //     _IsolateForce: true,
        // },
        forceCollide: {
            iterations: {
                value: 1, // 1
                min: 0,
                max: 10,
                step: 1
            },
            strength: {
                value: 1, // 1
                min: 0,
                max: 1,
                step: 0.05
            },
            radius: {
                value: function value(node, i, nodes) {
                    return node.r;
                }
            }
        },
        // forceLink: {
        //     // links: {
        //     //     value: [],
        //     // },
        //     // id: {
        //     //     value: function(node) { return node.index; },
        //     // },
        //     iterations: {
        //         value: 1,
        //         min: 0,
        //         max: 10,
        //         step: 1,
        //     },
        //     // strength: {
        //     //     value: function(link, i, links) { return 1/Math.min(count[link.source.index],count[link.target.index]); },
        //     // },
        //     distance: {
        //         value: 30, // function(link, i, links) { return 30; },
        //         min: 0,
        //         max: 100,
        //         step: 1,
        //     },
        // },
        // forceManyBody: {
        //     strength: {
        //         value: -30, // function(node, i, nodes) { return -30; },
        //         min: -100,
        //         max: 0,
        //         step: 1,
        //     },
        //     distanceMin: {
        //         value: 1,
        //         min: 0,
        //         max: 10000,
        //         step: 1,
        //     },
        //     distanceMax: {
        //         value: 100, // Infinity
        //         min: 0,
        //         max: 200,
        //         step: 1,
        //     },
        //     theta: {
        //         value: 0.81,
        //         min: 0,
        //         max: 1,
        //         step: 0.1,
        //     },
        //     _IsolateForce: true,
        // },
        // forceRadial: {
        //     strength: {
        //         value: 0.1, // function(node, i, nodes) { return 0.1; },
        //         min: 0,
        //         max: 1,
        //         step: 0.01,
        //     },
        //     radius: {
        //         value: function(node, i, nodes) { return node.r; },
        //     },
        //     x: {
        //         value: 'cx',
        //     },
        //     y: {
        //         value: 'cy',
        //     },
        // },
        forceX: {
            strength: {
                value: 0.1, // function(node, i, nodes) { return 0.1; },
                min: 0,
                max: 1,
                step: 0.05
            },
            x: {
                value: 'cx' // value: function(node, i, nodes) { return node.x; },
            },
            _IsolateForce: true
        },
        forceY: {
            strength: {
                value: 0.1, // function(node, i, nodes) { return 0.1; },
                min: 0,
                max: 1,
                step: 0.05
            },
            y: {
                value: 'cy' // value: function(node, i, nodes) { return node.y; },
            },
            _IsolateForce: true
        }
    };
    //
    that.UpdateNodesEdges = function () {
        // TestApp('UpdateNodesEdges', 1);
        verticesG.attr('transform', function () {
            return 'translate(' + 0 + ',' + (vs.svg.h - vs.filters.h - vs.map.h) / 2 + ')';
        });
        //
        var iCount = 0;
        verticeCircles = verticesG.selectAll('circle.vertice-circle').data(mapObj.vertices());
        verticeCircles = verticeCircles.enter().append('circle').each(function (d, i) {
            d.x = mapObj.centroidByState()[d.state][0];
            d.y = mapObj.centroidByState()[d.state][1];
            if (topIds.includes(d.id)) {
                d.i = iCount;
                iCount += 1;
            }
        }).classed('vertice-circle', true)
        // .on('click', function(d) {
        //     if (!d.selected) {
        //         d.selected = true;
        //         d.fx = d.x;
        //         d.fy = d.y;
        //     } else {
        //         delete(d.selected);
        //         d.fx = null;
        //         d.fy = null;
        //     }
        //     that
        //         .UpdateNodesEdges();
        // })
        .on('mouseover', function (d) {
            // d.fx = d.x;
            // d.fy = d.y;
            nodeSelected = d;
            that.UpdateNodesEdges();
            UpdateInfo();
        }).on('mouseout', function (d) {
            // d.fx = null;
            // d.fy = null;
            nodeSelected = null;
            that.UpdateNodesEdges();
            UpdateInfo();
        })
        // .call(d3.drag()
        //     .on('start', _DragStarted)
        //     .on('drag', _Dragged)
        //     .on('end', _DragEnded))
        .attr('cx', function (d) {
            return d.x;
        }).attr('cy', function (d) {
            return d.y;
        }).merge(verticeCircles);
        verticeCircles.each(function (d) {
            if (topIds.includes(d.id)) {
                d.r = defaultRadius;
            } else {
                d.r = minimumRaidus;
            }
            // d.r = defaultRadius;
            // if (nodeSelected && nodeSelected.id === d.id) {
            //     //
            // } else if (nodeSelected) {
            //     d.r = 2+15*Math.sqrt(mapObj.$ReceivedByVerticeScale()(d.$Received));
            // } else {
            //     d.r = 2+15*Math.sqrt(mapObj.$GivenByVerticeScale()(d.$Given));
            // }
        }).style('fill', function (d) {
            if (!topIds.includes(d.id)) {
                return 'white';
            } else {
                return d3.schemeCategory20[d.i];
            }
            // return 'white';
            // if (topIds.includes(d.id)) {
            //     return 'white';
            // }
            // var fillValue = mapObj.$GivenByStateScale()(mapObj.$GivenByState()[d.state]);
            // return vs.colorScale(fillValue);
        }).style('stroke', function (d) {
            return 'black';
            // if (d.i > 12) {
            //     return 'gainsboro';
            // } else {
            //     return d3.schemeCategory10[d.i];
            // }
        }).transition().duration(transitionDuration).ease(transitionEase).attr('r', function (d) {
            return d.r;
        });
        //     .style('opacity', function(d) {
        //         if (!nodeSelected) {
        //             return 1;
        //         } else if (nodeSelected.id === d.id) {
        //             return 1;
        //         } else {
        //             return 0.2;
        //         }
        //     });
        //
        edgesG.attr('transform', function () {
            return 'translate(' + 0 + ',' + (vs.svg.h - vs.filters.h - vs.map.h) / 2 + ')';
        });
        //
        edgeLines = edgesG.selectAll('line.edge-line').data(mapObj.edges());
        edgeLines = edgeLines.enter().append('line').classed('edge-line', true).attr('x1', function (d) {
            return d.source.x;
        }).attr('y1', function (d) {
            return d.source.y;
        }).attr('x2', function (d) {
            return d.target.x;
        }).attr('y2', function (d) {
            return d.target.y;
        }).merge(edgeLines);
        edgeLines.style('stroke', function (d) {
            if (nodeSelected) {
                if (nodeSelected.id === d.source.id) {
                    return 'red';
                } else if (nodeSelected.id === d.target.id) {
                    return 'green';
                }
            } else {
                return 'black';
            }
        });
        // .transition().duration(transitionDuration).ease(transitionEase)
        // .style('opacity', function(d) {
        //     // var opacityValue = 1 - (1/5)*mapObj.$GivenByStateScale()(d.source.$Given);
        //     // if (nodeSelected) {
        //     //     if (d.source.i > 12) {
        //     //         return 1;
        //     //     } else if (d.target.i > 12) {
        //     //         return 1;
        //     //     } else {
        //     //         return 0;
        //     //     }
        //     // } else {
        //         return 1;
        //     // }
        // });
        //
        TestApp('UpdateNodesEdges');
        return that;
    };
    //
    that.UpdateSimulation = function () {
        // TestApp('UpdateSimulation', 1);
        //
        Object.keys(that.forcesObj).forEach(function (forceType) {
            var optionsObj = that.forcesObj[forceType];
            if (optionsObj['_IsolateForce'] === true) {
                Object.keys(mapObj.$GivenByState()).forEach(function (state) {
                    var cx = mapObj.centroidByState()[state][0];
                    var cy = mapObj.centroidByState()[state][1];
                    var forceNew = _IsolateForce(d3[forceType](), function (d) {
                        return d.state === state;
                    });
                    Object.keys(optionsObj).forEach(function (optionName) {
                        if (optionName[0] === '_') {
                            return;
                        }
                        var optionDatum = optionsObj[optionName];
                        var optionValue = optionDatum.value; // do not mutate original value
                        switch (optionValue) {
                            case 'cx':
                                optionValue = cx;
                                break;
                            case 'cy':
                                optionValue = cy;
                                break;
                        }
                        forceNew[optionName](optionValue);
                    });
                    that.simulation.force(forceType + state, forceNew);
                });
            } else {
                var forceNew = d3[forceType]();
                Object.keys(optionsObj).forEach(function (optionName) {
                    if (optionName[0] === '_') {
                        return;
                    }
                    forceNew[optionName](optionsObj[optionName].value);
                });
                that.simulation.force(forceType, forceNew);
            }
        });
        that.simulation.alpha(1).restart();
        //
        TestApp('UpdateSimulation');
        return that;
    };
    //
    that.UpdateForceSliders = function () {
        // TestApp('UpdateForceSliders', 1);
        //
        that.optionsData = [that.simulationObj['alpha']];
        Object.keys(that.forcesObj).forEach(function (forceType) {
            var optionsObj = that.forcesObj[forceType];
            Object.keys(optionsObj).forEach(function (optionName) {
                if (optionName[0] === '_') {
                    return;
                }
                optionsObj[optionName].category = forceType;
                optionsObj[optionName].name = optionName;
                that.optionsData.push(optionsObj[optionName]);
            });
        });
        //
        var optionDivs = optionsContainer.selectAll('div.option-div').data(that.optionsData);
        optionDivs = optionDivs.enter().append('div').classed('option-div', true).each(function (optionDatum) {
            d3.select(this).append('label').classed('label-small', true).text(optionDatum.category);
            d3.select(this).append('label').classed('label-small', true).text(optionDatum.name);
            d3.select(this).append('label').classed('label-small', true).classed('slider-value', true);
            if (optionDatum.min !== undefined) {
                d3.select(this).append('label').classed('label-small', true).text(optionDatum.min);
            }
            if (optionDatum.step !== undefined) {
                d3.select(this).append('input').attr('type', 'range').attr('min', optionDatum.min).attr('max', optionDatum.max).attr('step', optionDatum.step).attr('value', optionDatum.value).on('change', function () {
                    if (optionDatum.step === parseInt(optionDatum.step)) {
                        optionDatum.value = parseInt(this.value);
                    } else {
                        optionDatum.value = parseFloat(this.value);
                    }
                    that.simulation.alpha(0);
                    that.UpdateSimulation().UpdateForceSliders();
                });
            }
            if (optionDatum.max !== undefined) {
                d3.select(this).append('label').classed('label-small', true).text(optionDatum.max);
            }
        }).merge(optionDivs).each(function (optionDatum) {
            d3.select(this).selectAll('label.slider-value').text(function () {
                if (typeof optionDatum.value === 'function') {
                    return 'function';
                } else {
                    return optionDatum.value;
                }
            });
        });
        //
        _alphaLabel = optionsContainer.select('label.slider-value');
        _alphaSlider = optionsContainer.select('input[type="range"]');
        //
        TestApp('UpdateForceSliders');
        return that;
    };
    //
    function _IsolateForce(force, filter) {
        var initialize = force.initialize;
        force.initialize = function () {
            initialize.call(force, mapObj.vertices().filter(filter));
        };
        return force;
    }
    //
    function _DragStarted(d) {
        // if (!d3.event.active) { that.simulation.alphaTarget(0.3).restart(); }
        d.fx = d.x;
        d.fy = d.y;
        // _Tick();
    }
    //
    function _Dragged(d) {
        console.log('_Dragged');
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d.x = d3.event.x;
        d.y = d3.event.y;
        // _Tick();
    }
    //
    function _DragEnded(d) {
        // if (!d3.event.active) { that.simulation.alphaTarget(0); }
        d.fx = null;
        d.fy = null;
        // _Tick();
    }
    //
    function _Tick() {
        // TestApp('_Tick', 1);
        //
        verticeCircles
        // .interrupt('vertices-transition')
        // .transition('vertices-transition')
        .attr('cx', function (d) {
            return d.x;
        }).attr('cy', function (d) {
            return d.y;
        });
        edgeLines
        // .interrupt('edges-transition')
        // .transition('edges-transition')
        .attr('x1', function (d) {
            if (that.bundle.source) {
                return mapObj.centroidByState()[d.source.state][0];
            } else {
                return d.source.x;
            }
        }).attr('y1', function (d) {
            if (that.bundle.source) {
                return mapObj.centroidByState()[d.source.state][1];
            } else {
                return d.source.y;
            }
        }).attr('x2', function (d) {
            if (that.bundle.target) {
                return mapObj.centroidByState()[d.target.state][0];
            } else {
                return d.target.x;
            }
        }).attr('y2', function (d) {
            if (that.bundle.target) {
                return mapObj.centroidByState()[d.target.state][1];
            } else {
                return d.target.y;
            }
        });
        //
        if (!_alphaLabel || !_alphaSlider) {
            return;
        }
        that.simulationObj['alpha'].value = parseFloat(that.simulation.alpha()).toFixed(8);
        _alphaLabel.text(that.simulationObj['alpha'].value);
        _alphaSlider.property('value', that.simulationObj['alpha'].value);
        //
        // TestApp('_Tick', -1);
    }
    //
    TestApp('GraphClass');
}

function MemoryTester() {
    var htmlString = '\n        <div id="memory-container"><!--\n            --><div class="cell"><div>elapsed</div><div id="elapsed"></div></div><!--\n            --><div class="cell"><div>interval</div><div id="interval"></div></div><!--\n            --><br><br><!--\n            --><div class="cell"><div>usedVal</div><div id="usedVal"></div></div><!--\n            --><div class="cell"><div>totalVal</div><div id="totalVal"></div></div><!--\n            --><br><br><!--\n            --><div class="cell"><div>usedRate</div><div id="usedRate"></div></div><!--\n            --><div class="cell"><div>totalRate</div><div id="totalRate"></div></div><!--\n            --><br><br><!--' +
    // --><div class="cell"><div>usedMeanRate</div><div id="usedMeanRate"></div></div><!--
    // --><div class="cell"><div>totalMeanRate</div><div id="totalMeanRate"></div></div><!--
    // --><br><br><!--
    // --><div class="cell"><div>itersForMean</div><div id="itersForMean"></div></div><!--
    // --><div class="cell"><div>iters</div><div id="iters"></div></div><!--
    '-->\n        </div>';
    var memoryContainer = d3.select('body').select('#memory-container').data([null]);
    memoryContainer.enter().append('div').attr('id', 'memory-container').merge(memoryContainer).property('outerHTML', htmlString);
    var elapsedNode = document.querySelector('#elapsed');
    var intervalNode = document.querySelector('#interval');
    var usedValNode = document.querySelector('#usedVal');
    var totalValNode = document.querySelector('#totalVal');
    var usedRateNode = document.querySelector('#usedRate');
    var totalRateNode = document.querySelector('#totalRate');
    var usedMeanRateNode = document.querySelector('#usedMeanRate');
    var totalMeanRateNode = document.querySelector('#totalMeanRate');
    var itersForMeanNode = document.querySelector('#itersForMean');
    // var itersNode = document.querySelector('#iters');
    var start = Date.now();
    var intervalSetting = 0.5;
    var interval = 0;
    var iters = 0;
    var itersForMean = 0;
    var decimals = 7;
    var padding = 15;
    var pad = ' ';
    var scale = 1 / Math.pow(1024, 2);
    var units = ' MB';
    var elapsedOld = 0;
    var elapsed = 0;
    var oldVals = [0, 0];
    var newVals = [performance.memory.usedJSHeapSize, performance.memory.totalJSHeapSize];
    var minVals = [Infinity, Infinity];
    var maxVals = [0, 0];
    var newRates = [0, 0];
    var minRates = [Infinity, Infinity];
    var maxRates = [0, 0];
    var sumRates = [0, 0];
    var newMeanRates = [0, 0];
    var minMeanRates = [Infinity, Infinity];
    var maxMeanRates = [0, 0];
    var myInterval = setInterval(function () {
        iters = iters + 1;
        elapsedOld = elapsed;
        elapsed = (Date.now() - start) / 1000;
        interval = elapsed - elapsedOld;
        // itersNode.innerHTML             = iters;
        elapsedNode.innerHTML = elapsed + ' s';
        intervalNode.innerHTML = interval + ' s';
        oldVals = [newVals[0], newVals[1]];
        newVals = [performance.memory.usedJSHeapSize, performance.memory.totalJSHeapSize];
        minVals = [Math.min(newVals[0], minVals[0]), Math.min(newVals[1], minVals[1])];
        maxVals = [Math.max(newVals[0], maxVals[0]), Math.max(newVals[1], maxVals[1])];
        newRates = [(newVals[0] - oldVals[0]) / interval, (newVals[1] - oldVals[1]) / interval];
        minRates = [Math.min(newRates[0], minRates[0]), Math.min(newRates[1], minRates[1])];
        maxRates = [Math.max(newRates[0], maxRates[0]), Math.max(newRates[1], maxRates[1])];
        usedValNode.innerHTML = MakeDiv(minVals[0], 'min') + MakeDiv(newVals[0], 'new') + MakeDiv(maxVals[0], 'max');
        totalValNode.innerHTML = MakeDiv(minVals[1], 'min') + MakeDiv(newVals[1], 'new') + MakeDiv(maxVals[1], 'max');
        usedRateNode.innerHTML = MakeDiv(minRates[0], 'min', '/s') + MakeDiv(newRates[0], 'new', '/s') + MakeDiv(maxRates[0], 'max', '/s');
        totalRateNode.innerHTML = MakeDiv(minRates[1], 'min', '/s') + MakeDiv(newRates[1], 'new', '/s') + MakeDiv(maxRates[1], 'max', '/s');
        // // if (newRates[0] > 0 && newRates[1] > 0) {
        //     itersForMean                = itersForMean + 1;
        // // }
        // if (itersForMean < 2) { return; }
        // sumRates                        = [sumRates[0]+newRates[0],sumRates[1]+newRates[1]];
        // newMeanRates                    = [sumRates[0]/(itersForMean-1), sumRates[1]/(itersForMean-1)];
        // minMeanRates                    = [Math.min(newMeanRates[0],minMeanRates[0]),Math.min(newMeanRates[1],minMeanRates[1])];
        // maxMeanRates                    = [Math.max(newMeanRates[0],maxMeanRates[0]),Math.max(newMeanRates[1],maxMeanRates[1])];
        // usedMeanRateNode.innerHTML      = MakeDiv(minMeanRates[0],'min','/s')+MakeDiv(newMeanRates[0],'new','/s')+MakeDiv(maxMeanRates[0],'max','/s');
        // totalMeanRateNode.innerHTML     = MakeDiv(minMeanRates[1],'min','/s')+MakeDiv(newMeanRates[1],'new','/s')+MakeDiv(maxMeanRates[1],'max','/s');
        // itersForMeanNode.innerHTML      = itersForMean+'/'+iters+' ('+(100*(itersForMean/iters)).toFixed(3)+'%)';
    }, intervalSetting * 1000);
    //
    function MakeDiv(input, classType, suffix) {
        suffix = suffix !== undefined ? String(suffix) : '';
        return '<div class="' + classType + '">' + String((input * scale).toFixed(decimals)).padStart(padding, pad) + units + suffix + '</div>';
    }
    //
    return myInterval;
}

function TestApp(source, position) {
    // var usedJSHeapDiffs = [];
    // var totalJSHeapDiffs = [];
    if (!logsTest) {
        return;
    }
    usedJSHeapSize = performance.memory.usedJSHeapSize;
    totalJSHeapSize = performance.memory.totalJSHeapSize;
    if (position === 1) {
        testStr = ''.padStart(2 * stackLvl, ' ') + '> ' + String(source);
        stackLvl += 1;
    } else if (position === -1) {
        stackLvl -= 1;
        testStr = ''.padStart(2 * stackLvl, ' ') + '< ' + String(source);
    } else if (position === undefined) {
        testStr = ''.padStart(2 * stackLvl, ' ') + '• ' + String(source);
    }
    testStr = testStr.padEnd(25);
    if (nodesCount !== d3.selectAll('*').size()) {
        nodesCount = d3.selectAll('*').size();
        nStr = 'nodes: ' + String(nodesCount).padStart(3, ' ');
    } else {
        nStr = '';
    }
    if (performance.memory.usedJSHeapSize !== usedJSHeapSize) {
        uStr = 'used: ' + ((usedJSHeapSize / (1024 * 1024)).toFixed(3) + ' Mb').padStart(9, ' ');
    } else {
        uStr = '';
    }
    if (performance.memory.totalJSHeapSize !== totalJSHeapSize) {
        tStr = 'total: ' + ((totalJSHeapSize / (1024 * 1024)).toFixed(3) + ' Mb').padStart(9, ' ');
    } else {
        tStr = '';
    }
    if (nStr || uStr || tStr) {
        testStr = testStr + uStr.padEnd(20, ' ') + tStr.padEnd(20, ' ') + nStr.padEnd(14, ' ');
    }
    // if (position === 0) {
    console.log(testStr);
    // }
}
