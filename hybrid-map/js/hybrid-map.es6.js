// Tom Swisher
// tomswisherlabs@gmail.com
// https://github.com/tomswisher

/* globals d3, console, nodes, count */
/* jshint -W069, unused:false */

'use strict';

// -------------------------------------------------------------------------------------------------
// Event Listeners

window.onload = function() {
    d3.queue()
        .defer(d3.json, 'data/us-states-features.json')
        .defer(d3.json, 'data/nodes-edges-04-06-2017.json')
        .awaitAll(InitializePage);
};
window.onresize = function() {
    // requestAnimationFrame(ResizePage);
    ResizePage();
};

// -------------------------------------------------------------------------------------------------
// Global Variables

var logsTest = true;
var logs0 = true;
var logs1 = false;
var debugLayoutEnabled = false;
var mapObj = null;
var graphObj = null;
var sizeOfDOM = 0;
var usedJSHeapSize = 0;
var totalJSHeapSize = 0;
var stateSelected = '';
var idSelected = '';
var verticesSelected = [];
var edgesSelected = [];
var visibleGrades = {'A':true,'B':true,'C':true,'D':true,'F':true};
var gradeScale = function(letter) {
    switch (letter) {
        case 'A': return 4;
        case 'B': return 3;
        case 'C': return 2;
        case 'D': return 1;
        case 'F': return 0;
        default: return NaN;
    }
};
var topIds = [
    'Alice Walton',
    'Carrie Walton Penner',
    'Dorris Fisher',
    'Eli Broad',
    'Greg Penner',
    'Jim Walton',
    'John Arnold',
    'Jonathan Sackler',
    'Laura Arnold',
    'Laurene Powell Jobs',
    'Michael Bloomberg',
    'Reed Hastings',
    'Stacy Schusterman'
];

// -------------------------------------------------------------------------------------------------
// Global Selectors

var body = d3.select('body');
var box1 = d3.select('#box1');
var box2 = d3.select('#box2');
var box3 = d3.select('#box3');
var mainSVG = body.select('#main-svg');
var mainBGRect = body.select('#main-bg-rect');
var statesG = body.select('#states-g');
var verticesG = body.select('#vertices-g');
var verticeCircles;
var edgesG = body.select('#edges-g');
var edgeLines;
var hoverG = body.select('#hover-g');
var hoverRect = body.select('#hover-rect');
var hoverText = body.select('#hover-text');
var filtersSVG = body.select('#filters-svg');
var statesSelect = body.select('#states-select');
var forcesContainer = body.select('#forces-container');
var simulationDiv = body.select('#simulation-div');
var alphaLabel = simulationDiv.selectAll('label.slider-value');
var alphaSlider = simulationDiv.selectAll('input[type="range"');
var infoSVG = body.select('#info-svg');
var defs = filtersSVG.append('defs');

// -------------------------------------------------------------------------------------------------
// Detected Settings

var isMobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    if (logsTest) console.log('isMobile', isMobile = true);
}

// -------------------------------------------------------------------------------------------------
// Visual Styles

var vs = {};
vs.box1Width = null;
vs.box1WidthMin = 400;
vs.box2Width = null;
vs.box2WidthMin = 200;
vs.box2WidthMax = 200;
vs.box2Height = 300;
vs.mapWidthHeightRatio = 1.7;
vs.mapProjectionScale = 1.3;
vs.statesSelectWidth = 100;
vs.filtersHeight = 40;
vs.stateSelectedOpacity = 0.3;
vs.stateNotClickedOpacity = 0.2;
vs.hoverMargin = 5;
vs.gradeMargin = 2.5;
vs.gradeRounded = false;
vs.infoSVGMargin = 10;
// /*BH1*/ vs.gradeColorArray = ['rgb(50,50,50)','rgb(28,44,160)','rgb(240,6,55)','rgb(251,204,12)','rgb(239,230,221)'];
// /*BH2*/ vs.gradeColorArray = ['rgb(240,243,247)','rgb(191,162,26)','rgb(20,65,132)','rgb(153,40,26)','rgb(34,34,34)'];
/*red*/ vs.gradeColorArray = ['#de2d26','#fb6a4a','#fc9272','#fcbba1','#fee5d9'];
vs.colorScale = d3.scaleQuantize()
    .domain([0, 5])
    .range(vs.gradeColorArray);

defs.append('filter')
    .attr('id', 'drop-shadow')
    .attr('height', '130%') // so the shadow is not clipped
    .attr('width', '120%')
    .each(function() {
        d3.select(this).append('feGaussianBlur')
            .attr('in', 'SourceAlpha') // opacity of source node
            .attr('stdDeviation', 2) // convolve with Gaussian
            .attr('result', 'blur');
        d3.select(this).append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 2)
            .attr('dy', 2)
            .attr('result', 'offsetBlur');
        d3.select(this).append('feMerge')
            .each(function() {
                d3.select(this).append('feMergeNode')
                    .attr('in', 'offsetBlur');
                d3.select(this).append('feMergeNode')
                    .attr('in', 'SourceGraphic'); // source node is on top
            });
    });

// -------------------------------------------------------------------------------------------------
// Functions

function InitializePage(error, results) {
    var usStatesFeaturesJSON = results[0];
    var nodesEdgesJSON = results[1];
    //
    mapObj = (new MapClass())
        .mapFeatures(usStatesFeaturesJSON.features)
        .vertices(nodesEdgesJSON.nodes)
        .edges(nodesEdgesJSON.links);
    //
    graphObj = (new GraphClass());
    //
    vs.hoverHeight = parseFloat(mainSVG.style('font-size'))+2*vs.hoverMargin;
    hoverRect
        .attr('height', vs.hoverHeight)
        .attr('y', -1*vs.hoverHeight-vs.hoverMargin)
        .style('filter', 'url(#drop-shadow)');
    hoverText
        .attr('x', 0)
        .attr('y', -0.5*vs.hoverHeight-vs.hoverMargin);
    //
    mainBGRect
        .on('mouseover', function() {
            var source = 'mainBGRect mouseover';
            stateSelected = '';
            // idSelected = '';
            hoverText.text('');
            mapObj
                .UpdateMap(source);
            UpdateStatesDropdown(source);
            UpdateHover('mouse');
            graphObj
                .UpdateNodesEdges();
        })
        .attr('x', 0)
        .attr('y', 0);
    //
    filtersSVG
        .attr('width', 0)
        .attr('height', 0);
    //
    statesSelect
        .style('width', vs.statesSelectWidth+'px');
    //
    UpdateInfo([undefined]);
    //
    ResizePage();
    requestAnimationFrame(function() {
        body
            .classed('loading', false);
    });
}

function MapClass() {
    var _verticeById = null;
    var _projection = d3.geoAlbersUsa();
    var _path = d3.geoPath();
    var _width = 0;
    this.width = function(_) {
        return arguments.length ? (_width = _, this) : _width;
    };
    var _height = 0;
    this.height = function(_) {
        return arguments.length ? (_height = _, this) : _height;
    };
    var _mapFeatures = null;
    this.mapFeatures = function(_) {
        return arguments.length ? (_mapFeatures = _, this) : _mapFeatures;
    };
    var _centroidByState = {};
    this.centroidByState = function(_) {
        return arguments.length ? (_centroidByState = _, this) : _centroidByState;
    };
    var _$GivenByState = {};
    this.$GivenByState = function(_) {
        return arguments.length ? (_$GivenByState = _, this) : _$GivenByState;
    };
    var _$ReceivedByState = {};
    this.$ReceivedByState = function(_) {
        return arguments.length ? (_$ReceivedByState = _, this) : _$ReceivedByState;
    };
    var _$GivenByStateScale = d3.scaleLinear().range([0, 5]);
    this.$GivenByStateScale = function(_) {
        return arguments.length ? (_$GivenByStateScale = _, this) : _$GivenByStateScale;
    };
    var _$ReceivedByStateScale = d3.scaleLinear().range([0, 5]);
    this.$ReceivedByStateScale = function(_) {
        return arguments.length ? (_$ReceivedByStateScale = _, this) : _$ReceivedByStateScale;
    };
    var _$EdgeScale = d3.scaleLinear().range([0.5, 10]);
    this.$EdgeScale = function(_) {
        return arguments.length ? (_$EdgeScale = _, this) : _$EdgeScale;
    };
    var _$GivenByVerticeScale = d3.scaleLinear().range([3, 20]);
    this.$GivenByVerticeScale = function(_) {
        return arguments.length ? (_$GivenByVerticeScale = _, this) : _$GivenByVerticeScale;
    };
    var _$ReceivedByVerticeScale = d3.scaleLinear().range([1, 10]);
    this.$ReceivedByVerticeScale = function(_) {
        return arguments.length ? (_$ReceivedByVerticeScale = _, this) : _$ReceivedByVerticeScale;
    };
    var _vertices = null;
    this.vertices = function(vertices) {
        if (!arguments.length) { return _vertices; }
        _vertices = vertices;
        _vertices.forEach(function(vertice) {
            vertice.$Given = 0;
            vertice.$Received = 0;
            _$GivenByState[vertice.state] = 0;
            _$ReceivedByState[vertice.state] = 0;
        });
        _verticeById = d3.map(_vertices, function(d) { return d.id; });
        return this;
    };
    var _edges = null;
    this.edges = function(edges) {
        if (!arguments.length) { return _edges; }
        _edges = edges;
        _edges.forEach(function(edge) {
            edge.source = _verticeById.get(edge.source);
            edge.target = _verticeById.get(edge.target);
            //
            edge.source.$Given += edge.dollars;
            edge.target.$Received += edge.dollars;
            //
            _$GivenByState[edge.source.state] += edge.dollars;
            _$ReceivedByState[edge.target.state] += edge.dollars;
            //
            edge.keep = topIds.includes(edge.source.id) || topIds.includes(edge.target.id);
            if (edge.keep) {
                edge.source.keep = true;
                edge.target.keep = true;
            }
        });
        _edges = _edges.filter(function(edge) {
            return edge.keep;
        });
        _vertices = _vertices.filter(function(vertice) {
            return vertice.keep;
        });
        return this;
    };
    //
    this.UpdateMap = function(source) {
        // if (logs0) console.log('UpdateMap');
        var $GivenByStatesArray = Object.keys(_$GivenByState)
            .map(function(d) { return _$GivenByState[d]; });
        _$GivenByStateScale.domain([
            d3.max($GivenByStatesArray),
            d3.min($GivenByStatesArray)
        ]);
        var $ReceivedByStatesArray = Object.keys(_$ReceivedByState)
            .map(function(d) { return _$ReceivedByState[d]; });
        _$ReceivedByStateScale.domain([
            d3.min($ReceivedByStatesArray),
            d3.max($ReceivedByStatesArray)
        ]);
        _$GivenByVerticeScale.domain([
            d3.min(_vertices, function(vertice) { return vertice.$Given; }),
            d3.max(_vertices, function(vertice) { return vertice.$Given; })
        ]);
        _$ReceivedByVerticeScale.domain([
            d3.min(_vertices, function(vertice) { return vertice.$Received; }),
            d3.max(_vertices, function(vertice) { return vertice.$Received; })
        ]);
        _$EdgeScale.domain([
            d3.min(_edges, function(edge) { return edge.dollars; }),
            d3.max(_edges, function(edge) { return edge.dollars; })
        ]);
        //
        _projection
            .scale(_width*vs.mapProjectionScale)
            .translate([_width/2, _height/2]);
        _path
            .projection(_projection);
        //
        var statePaths = statesG.selectAll('path.state-path')
            .data(_mapFeatures, function(d) { return d.properties.ansi; });
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true)
            .each(function(d) {
                d.$Given = parseInt(_$GivenByState[d.properties.ansi]);
                d.$Received = parseInt(_$ReceivedByState[d.properties.ansi]);
            })
            .on('mouseover', function(d) {
                // if (isMobile === true) { return; }
                stateSelected = d.properties.ansi;
                var source = 'statePaths mouseover '+stateSelected;
                hoverText.text(d.properties.ansi+': '+d.$Given+' '+d.$Received);
                mapObj
                    .UpdateMap(source);
                UpdateStatesDropdown(source);
                UpdateHover('mouse');
            })
            .on('mousemove', function(d) {
                UpdateHover('mouse');
            })
            .attr('d', _path)
            .merge(statePaths);
        statePaths
            .each(function(d) {
                _centroidByState[d.properties.ansi] = _path.centroid(d);
            })
            .classed('inactive', function(d) {
                return isNaN(d.$Given) && isNaN(d.$Received);
            })
            .attr('d', _path)
            .style('opacity', function(d) {
                if (stateSelected === d.properties.ansi) { return vs.stateSelectedOpacity; }
                return 1;
            })
            .style('fill', function(d) {
                return vs.colorScale(_$GivenByStateScale(d.$Given));
            });
        //
        if (debugLayoutEnabled === true) { DebugMap(); }
        if (logsTest) TestApp('UpdateMap');
        return this;
    };
}

function UpdateHover(source) {
    if (logs1) console.log('UpdateHover', source);
    // var hoverWidth = 0;
    // if (hoverText.text() !== '') {
    //     hoverWidth = hoverText.node().getBBox().width+2*vs.hoverMargin;
    // }
    // hoverRect
    //     .attr('width', hoverWidth)
    //     .attr('x', -0.5*hoverWidth);
    // hoverG
    //     .attr('transform', function() {
    //         var tx, ty;
    //         if (source === 'mouse') {
    //             tx = d3.mouse(mainSVG.node())[0];
    //             ty = d3.mouse(mainSVG.node())[1];
    //         } else if (mapObj && mapObj.centroidByState()[stateSelected]) {
    //             tx = mapObj.centroidByState()[stateSelected][0];
    //             ty = mapObj.centroidByState()[stateSelected][1]+0.5*(vs.hoverHeight+2*vs.hoverMargin);
    //         } else {
    //             tx = mapObj.width()/2;
    //             ty = mapObj.height()/2;
    //         }
    //         if (tx < hoverWidth/2 + 1) {
    //             tx = hoverWidth/2 + 1;
    //         } else if (tx > parseInt(mainSVG.style('width')) - hoverWidth/2 - 1) {
    //             tx = parseInt(mainSVG.style('width')) - hoverWidth/2 - 1;
    //         }
    //         if (ty < vs.hoverHeight + 5 + 1) {
    //             ty = vs.hoverHeight + 5 + 1;
    //         }
    //         return 'translate('+tx+','+ty+')';
    //     });
    if (logsTest) TestApp('UpdateHover');
}

function DebugMap() {
    body.selectAll('*').style('outline', '1px solid green');
    var verticalGuid = mainSVG.selectAll('rect.vertical-guide').data([null]);
    verticalGuid = verticalGuid
        .enter().append('rect')
            .classed('vertical-guide', true)
            .merge(verticalGuid);
    verticalGuid
        .attr('x', mapObj.width()/2-1)
        .attr('y', 0)
        .attr('width', 2)
        .attr('height', mapObj.height())
        .style('fill', 'darkorange');
}

function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C'] =
        visibleGrades['D'] = visibleGrades['F'] = bool;
}

function UpdateFilters(source) {
    if (logs1) console.log('UpdateFilters   '+source);
    var filtersWidth = mapObj.width();
    filtersSVG
        .attr('width', filtersWidth)
        .attr('height', vs.filtersHeight+3);
    var rectSize = vs.filtersHeight - 2*vs.gradeMargin;
    //
    var filtersText = filtersSVG.selectAll('text.filters-text')
        .data([null]);
    filtersText = filtersText.enter().append('text')
        .classed('filters-text', true)
        .merge(filtersText)
        .attr('x', (1/2)*filtersWidth - 150)
        .attr('y', (1/2)*vs.filtersHeight + 1)
        .text('$ Given / State');
    //
    var gradeArray = ['A','B','C','D','F'];
    var gradeGs = filtersSVG.selectAll('g.grade-g')
        .data(gradeArray);
    gradeGs = gradeGs.enter().append('g')
        .classed('grade-g', true)
        .merge(gradeGs);
    gradeGs
        .attr('transform', function(d,i) {
            var tx = (1/2)*filtersWidth + (1/2-1/2*gradeArray.length+i)*vs.filtersHeight;
            var ty = (1/2)*vs.filtersHeight + 1;
            return 'translate('+tx+','+ty+')';
        })
        // .on('mouseover', function(d) {
        //     var source = 'gradeGs    mouseover '+d;
        //     ToggleGrades(false);
        //     visibleGrades[d] = true;
        //     mapObj
        //         .UpdateMap(source);
        //     UpdateFilters(source);
        // })
        // .on('mouseout', function(d) {
        //     var source = 'gradeGs    mouseout  '+d;
        //     ToggleGrades(true);
        //     mapObj
        //         .UpdateMap(source);
        //     UpdateFilters(source);
        // })
        .each(function(grade) {
            var gradeBG = d3.select(this).selectAll('rect.grade-bg')
                .data([grade]);
            gradeBG = gradeBG.enter().append('rect')
                .classed('grade-bg', true)
                .merge(gradeBG);
            gradeBG
                .attr('x', (-1/2)*vs.filtersHeight)
                .attr('y', (-1/2)*vs.filtersHeight)
                .attr('width', vs.filtersHeight)
                .attr('height', vs.filtersHeight-2);
            //
            var gradeRect = d3.select(this).selectAll('rect.grade-rect')
                .data([grade]);
            gradeRect = gradeRect
                .enter().append('rect')
                    .classed('grade-rect', true)
                .merge(gradeRect)
                    .classed('inactive', function(d) {
                        return !visibleGrades[d];
                    })
                    .attr('x', -0.5*rectSize)
                    .attr('y', -0.5*rectSize)
                    .attr('width', rectSize)
                    .attr('height', rectSize)
                    .style('filter', function(d) {
                        return visibleGrades[d] ? 'url(#drop-shadow)' : null;
                    })
                    .style('fill', function(d) {
                        return vs.colorScale(gradeScale(d));
                    });
            //
            var gradeLabel = d3.select(this).selectAll('text.grade-label')
                .data([grade]);
            gradeLabel = gradeLabel
                .enter().append('text')
                    .classed('grade-label', true).classed('button-text', true)
                    .text(function(d) { return d; })
                .merge(gradeLabel)
                    .classed('inactive', function(d) {
                        return !visibleGrades[d];
                    });
        });
}

function UpdateStatesDropdown(source) {
    if (logs1) console.log('UpdateStatesDropdown '+source);
    var statesSelectOptionsData = Object.keys(mapObj.$GivenByState());
    statesSelectOptionsData.unshift('');
    statesSelect
        .classed('button-object', true)
        .on('change', function() {
            var source = 'statesSelect change '+this.value;
            stateSelected = this.value;
            if (stateSelected === '') {
                hoverText.text('');
            } else {
                var d = mainSVG.selectAll('path.state-path')
                    .filter(function(d) { return d.properties.ansi === stateSelected; })
                    .datum();
                hoverText.text(stateSelected+': '+d.$Given+' '+d.$Received);
            }
            mapObj
                .UpdateMap(source);
            UpdateStatesDropdown(source);
            UpdateHover(source);
        })
        .selectAll('option.states-select-option')
            .data(statesSelectOptionsData)
            .enter().append('option')
                .classed('states-select-option', true)
                .text(function(d) { return d; });
    statesSelect.node().value = stateSelected;
}

function UpdateInfo(data) {
    if (logs1) console.log(data, infoSVG.data());
    if (data === undefined) {
        if (infoSVG.data()[0] === undefined) {
            return;
        }
    } else {
        infoSVG.data(data);
        if (infoSVG.data()[0] === undefined) {
            infoSVG.selectAll('*')
                .transition()
                .style('opacity', 0);
            return;    
        }
    }
    //
    var infoText = infoSVG.selectAll('text.info-text')
        .data(function(d) {
            return [d.id, 'State: '+d.state];
        });
    infoText = infoText.enter().append('text')
        .classed('info-text', true)
        .attr('x', +infoSVG.attr('width')*(1/2))
        .attr('y', function(d, i) {
            return +infoSVG.attr('height') - (3-i)*15 - 5;
        })
        .style('opacity', 0)
        .merge(infoText)
        .text(function(d) { return d; });
    //
    var infoImage = infoSVG.selectAll('image')
        .data(function(d) {
            return [d.id];
        });
    infoImage = infoImage.enter().append('image')
        .style('opacity', 0)
        .merge(infoImage)
        .attr('xlink:href', function(d) {
            if (!topIds.includes(d)) {
                return null;
            } else {
                return 'img/'+d+'.jpg';
            }
        });
    var imageInterval = setInterval(function() {
        var bbox = infoImage.node().getBBox();
        var heightWidthRatio = bbox.height/bbox.width;
        if (isNaN(heightWidthRatio)) { return; }
        clearInterval(imageInterval);
        infoImage
            .attr('width', +infoSVG.attr('width'))
            .attr('height', +infoSVG.attr('width')*heightWidthRatio)
            .transition()
            .style('opacity', 1);
        //
        infoText
            .transition()
            .style('opacity', 1);
    }, 10);
    //
    if (logsTest) TestApp('UpdateInfo');
}

function ResizePage() {
    var source = 'ResizePage';
    var clientWidth = body.node().clientWidth;
    if (clientWidth-vs.box2WidthMin > vs.box1WidthMin) {
        vs.box1Width = clientWidth-vs.box2WidthMin;
        vs.box2Width = vs.box2WidthMin;
        vs.box2Margins = 0;
    } else {
        vs.box1Width = vs.box1WidthMin;
        vs.box2Width = vs.box2WidthMax;
        vs.box2Margins = (vs.box1Width - vs.box2Width)/2;
    }
    box1
        .style('width', vs.box1Width+'px');
    box2
        .style('width', vs.box2Width+'px')
        .style('margin-left', vs.box2Margins+'px')
        .style('margin-right', vs.box2Margins+'px');
    //
    mainSVG
        .attr('width', vs.box1Width)
        .attr('height', vs.box1Width/vs.mapWidthHeightRatio);
    mainBGRect
        .attr('width', vs.box1Width)
        .attr('height', vs.box1Width/vs.mapWidthHeightRatio);
    //
    mapObj
        .width(vs.box1Width)
        .height(vs.box1Width/vs.mapWidthHeightRatio)
        .UpdateMap('ResizePage');
    //
    graphObj
        .UpdateNodesEdges()
        .UpdateSimulation()
        .UpdateForceSliders();
    //
    statesSelect
        .style('margin-left', (vs.box1Width - vs.statesSelectWidth)/2+'px')
        .style('margin-right', (vs.box1Width - vs.statesSelectWidth)/2+'px');
    //
    infoSVG
        .attr('width', vs.box2Width - 2*vs.infoSVGMargin)
        .attr('height', vs.box2Height - 2*vs.infoSVGMargin)
        .style('margin', vs.infoSVGMargin+'px');
    //
    UpdateFilters(source);
    UpdateStatesDropdown(source);
    UpdateHover('event');
    UpdateInfo();
    if (logsTest) TestApp('ResizePage');
}

function GraphClass() {
    var that = this;
    //
    that.bundle = {
        // 'target': true,
    };
    //
    that.simulation = d3.forceSimulation(mapObj.vertices())
        // .alpha(0.1)
        .alphaMin(0.05)
        // .alphaDecay(1-Math.pow(0.001,1/300))
        // .alphaTarget(0)
        // .velocityDecay(0.6)
        .on('tick', _Tick);
    //
    alphaSlider
        .on('mousedown', function() {
            that.simulation
                .stop();
        })
        .on('change', function() {
            alphaLabel
                .text(parseFloat(this.value).toFixed(8));
            that.simulation
                .alpha(this.value)
                .restart();
        });
    //
    that.forcesObj = {
        
        // forceCenter: { // visual centering based on mass
        //     x: {
        //         name: 'x',
        //         value: 'cx',
        //         // min: 0,
        //         // max: 1,
        //         // step: 0.1,
        //     },
        //     y: {
        //         name: 'y',
        //         value: 'cy',
        //         // min: 0,
        //         // max: 1,
        //         // step: 0.1,
        //     },
        // },
        
        forceCollide: {
            iterations: {
                name: 'iterations',
                value: 10,
                min: 0,
                max: 20,
                step: 1,
            },
            strength: {
                name: 'strength',
                value: 1,
                min: 0,
                max: 10,
                step: 0.5,
            },
            radius: {
                name: 'radius',
                value: function(node, i, nodes) { return node.r; },
                // min: 0,
                // max: 1,
                // step: 0.1,
            },
        },
        
        // forceLink: {
        //     // links: {
        //     //     name: 'links',
        //     //     value: [],
        //     // },
        //     // id: {
        //     //     name: 'id',
        //     //     value: function(node) { return node.index; },
        //     // },
        //     iterations: {
        //         name: 'iterations',
        //         value: 1,
        //         min: 0,
        //         max: 10,
        //         step: 1,
        //     },
        //     // strength: {
        //     //     name: 'strength',
        //     //     value: function(link, i, links) { return 1/Math.min(count[link.source.index],count[link.target.index]); },
        //     // },
        //     distance: {
        //         name: 'distance',
        //         value: 30, // function(link, i, links) { return 30; },
        //         min: 0,
        //         max: 100,
        //         step: 1,
        //     },
        // },
        
        // forceManyBody: {
        //     strength: {
        //         name: 'strength',
        //         value: -30, // function(node, i, nodes) { return -30; },
        //         min: -100,
        //         max: 0,
        //         step: 1,
        //     },
        //     // distanceMin: {
        //     //     name: 'distanceMin',
        //     //     value: 1,
        //     //     min: 0,
        //     //     max: 10000,
        //     //     step: 1,
        //     // },
        //     // distanceMax: {
        //     //     name: 'distanceMax',
        //     //     value: 100, // Infinity
        //     //     min: 0,
        //     //     max: 200,
        //     //     step: 1,
        //     // },
        //     theta: {
        //         name: 'theta',
        //         value: 0.81,
        //         min: 0,
        //         max: 1,
        //         step: 0.1,
        //     },
        // },
        
        // forceRadial: {
        //     strength: {
        //         name: 'strength',
        //         value: 0.1, // function(node, i, nodes) { return 0.1; },
        //         min: 0,
        //         max: 1,
        //         step: 0.01,
        //     },
        //     radius: {
        //         name: 'radius',
        //         value: function(node, i, nodes) { return node.r; },
        //         // min: 0,
        //         // max: 1,
        //         // step: 0.1,
        //     },
        //     x: {
        //         name: 'x',
        //         value: 'cx',
        //         // min: 0,
        //         // max: 1,
        //         // step: 0.1,
        //     },
        //     y: {
        //         name: 'y',
        //         value: 'cy',
        //         // min: 0,
        //         // max: 1,
        //         // step: 0.1,
        //     },
        // },
        
        forceX: {
            strength: {
                name: 'strength',
                value: 1, // function(node, i, nodes) { return 0.1; },
                min: 0,
                max: 2,
                step: 0.1,
            },
            x: {
                name: 'x',
                value: 'cx',
                // value: function(node, i, nodes) { return node.x; },
            },
        },
        
        forceY: {
            strength: {
                name: 'strength',
                value: 1, // function(node, i, nodes) { return 0.1; },
                min: 0,
                max: 2,
                step: 0.1,
            },
            y: {
                name: 'y',
                value: 'cy',
                // value: function(node, i, nodes) { return node.y; },
            },
        }
    };
    //
    that.UpdateNodesEdges = function() {
        verticeCircles = verticesG.selectAll('circle.vertice-circle')
            .data(mapObj.vertices());
        verticeCircles = verticeCircles.enter().append('circle')
            .classed('vertice-circle', true)
            .on('mouseover', function(d) {
                idSelected = d.id;
                that.UpdateNodesEdges();
                // console.log('mouseover', idSelected);
                UpdateInfo([d]);
            })
            .on('mouseout', function() {
                idSelected = '';
                that.UpdateNodesEdges();
                // console.log('mouseout ', idSelected);
                UpdateInfo([undefined]);
            })
            .each(function(d) {
                d.x = mapObj.centroidByState()[d.state][0];
                d.y = mapObj.centroidByState()[d.state][1];
                // d.r = 5;
                d.r = mapObj.$GivenByVerticeScale()(d.$Given);
            })
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .attr('r', function(d) { return d.r; })
            .style('fill', function(d) {
                return 'white';
                // if (topIds.includes(d.id)) {
                //     return 'white';
                // }
                // var fillValue = mapObj.$GivenByStateScale()(mapObj.$GivenByState()[d.state]);
                // return vs.colorScale(fillValue);
            })
            .merge(verticeCircles);
        verticeCircles
            .transition()
            .style('opacity', function(d) {
                return 1;
                // if (idSelected === '') {
                //     return 1;
                // }
                // if (d.id === idSelected) {
                //     return 1;
                // } else {
                //     return 0.05;
                // }
            });
        //
        edgeLines = edgesG.selectAll('line.edge-line')
            .data(mapObj.edges());
        edgeLines = edgeLines.enter().append('line')
            .classed('edge-line', true)
            .attr('x1', function(d) {
                return d.source.x;
            })
            .attr('y1', function(d) {
                return d.source.y;
            })
            .attr('x2', function(d) {
                return d.target.x;
            })
            .attr('y2', function(d) {
                return d.target.y;
            })
            .merge(edgeLines);
        edgeLines
            .transition()
            .style('opacity', function(d) {
                var opacityValue = 1 - (1/5)*mapObj.$GivenByStateScale()(d.source.$Given);
                if (idSelected !== '') {
                    if (d.source.id === idSelected) {
                        // opacityValue = 1;
                    } else {
                        opacityValue = 0.0;
                    }
                }
                return opacityValue;
            });
        //
        if (logsTest) TestApp('UpdateNodesEdges');
        return that;
    };
    //
    that.UpdateSimulation = function() {
        Object.keys(mapObj.$GivenByState()).forEach(function(state) {
            var cx = mapObj.centroidByState()[state][0];
            var cy = mapObj.centroidByState()[state][1];
            Object.keys(that.forcesObj).forEach(function(forceType) {
                var forceNew = _IsolateForce(d3[forceType](), function(d) {
                    return d.state === state;
                });
                var optionsObj = that.forcesObj[forceType];
                Object.keys(optionsObj).forEach(function(optionName) {
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
                    if (logs1) console.log(state, forceType, optionName, (optionValue.toString) ? optionValue.toString().split('\n')[0] : optionValue);
                });
                that.simulation
                    .force(forceType+state, forceNew);
            });
        });
        that.simulation
            .alpha(1)
            .restart();
        //
        if (logsTest) TestApp('UpdateSimulation');
        return that;
    };
    //
    that.UpdateForceSliders = function() {
        that.forcesData = Object.keys(that.forcesObj).map(function(forceType) {
            var optionsObj = that.forcesObj[forceType];
            var optionsDataFiltered = [];
            Object.keys(optionsObj).forEach(function(optionName) {
                var optionDatum = optionsObj[optionName];
                if (optionDatum.min !== undefined && optionDatum.max !== undefined) {
                    optionDatum.forceType = forceType;
                    optionsDataFiltered.push(optionDatum);
                }
            });
            return [
                forceType,
                optionsDataFiltered,
            ];
        });
        //
        var forceDivs = forcesContainer.selectAll('div.force-div')
            .data(that.forcesData);
        forceDivs = forceDivs.enter().append('div')
            .classed('force-div', true)
            .merge(forceDivs)
            // .classed('collapsed', function(d) { return d[1].length === 0; })
            ;
        //
        var forceOptionDivs = forceDivs.selectAll('div.force-option-div')
            .data(function(d) { return d[1]; });
        forceOptionDivs = forceOptionDivs.enter().append('div')
            .classed('force-option-div', true)
            .each(function(optionDatum) {
                d3.select(this).append('label')
                    .classed('label-small', true)
                    .text(optionDatum.forceType);
                d3.select(this).append('label')
                    .classed('label-small', true)
                    .text(optionDatum.name);
                d3.select(this).append('label')
                    .classed('label-small', true).classed('slider-value', true)
                    .text(optionDatum.value);
                d3.select(this).append('label')
                    .classed('label-small', true)
                    .text(optionDatum.min);
                d3.select(this).append('input')
                    .attr('type', 'range')
                    .attr('min', optionDatum.min)
                    .attr('max', optionDatum.max)
                    .attr('step', optionDatum.step)
                    .attr('value', optionDatum.value)
                    .on('change', function() {
                        if (optionDatum.step === parseInt(optionDatum.step)) {
                            optionDatum.value = parseInt(this.value);
                        } else {
                            optionDatum.value = parseFloat(this.value);
                        }
                        that.simulation.alpha(0);
                        that
                            .UpdateNodesEdges()
                            .UpdateSimulation()
                            .UpdateForceSliders()
                            ;
                    });
                d3.select(this).append('label')
                    .classed('label-small', true)
                    .text(optionDatum.max);
            })
            .merge(forceOptionDivs)
            .each(function(optionDatum) {
                d3.select(this).selectAll('label.slider-value')
                    .text(optionDatum.value);
            });
        // forceOptionDivs.selectAll('label.slider-value')
        //     .text(function(d) { return d.value; });
        //
        if (logsTest) TestApp('UpdateForceSliders');
        return that;
    };
    //
    function _IsolateForce(force, filter) {
        var initialize = force.initialize;
        force.initialize = function() {
            initialize.call(force, mapObj.vertices().filter(filter));
        };
        return force;
    }
    //
    function _Tick() {
        verticeCircles
            // .interrupt('vertices-transition')
            // .transition('vertices-transition')
            .attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            });
        edgeLines
            // .interrupt('edges-transition')
            // .transition('edges-transition')
            .attr('x1', function(d) {
                if (that.bundle.source) {
                    return mapObj.centroidByState()[d.source.state][0];
                } else {
                    return d.source.x;
                }
            })
            .attr('y1', function(d) {
                if (that.bundle.source) {
                    return mapObj.centroidByState()[d.source.state][1];
                } else {
                    return d.source.y;
                }
            })
            .attr('x2', function(d) {
                if (that.bundle.target) {
                    return mapObj.centroidByState()[d.target.state][0];
                } else {
                    return d.target.x;
                }
            })
            .attr('y2', function(d) {
                if (that.bundle.target) {
                    return mapObj.centroidByState()[d.target.state][1];
                } else {
                    return d.target.y;
                }
            });
        //
        alphaLabel
            .text(parseFloat(that.simulation.alpha()).toFixed(8));
        alphaSlider
            .property('value', that.simulation.alpha());
        // if (logsTest) TestApp('_Tick');
    }
}

function TestJSHeapSize() {
    if (!window.performance || !window.performance.memory) {
        return '';
    }
    var usedString = '';
    var totalString = '';
    if (window.performance.memory.usedJSHeapSize > usedJSHeapSize) {
        usedJSHeapSize = window.performance.memory.usedJSHeapSize;
        usedString = 'usedJSHeapSize: '+((usedJSHeapSize/(1024*1024)).toFixed(2)+' Mb');
    }
    if (window.performance.memory.totalJSHeapSize > totalJSHeapSize) {
        totalJSHeapSize = window.performance.memory.totalJSHeapSize;
        totalString = 'totalJSHeapSize: '+((totalJSHeapSize/(1024*1024)).toFixed(2)+' Mb');
    }
    if (usedString || totalString) {
        return usedString.padEnd(30)+totalString.padEnd(30);
    } else {
        return '';
    }
}

function TestDOMSize() {
    if (sizeOfDOM !== d3.selectAll('*').size()) {
        sizeOfDOM = d3.selectAll('*').size();
        return (sizeOfDOM+' nodes').padStart(13);
    } else {
        return '';
    }
}

function TestApp(source) {
    var result = TestJSHeapSize()+TestDOMSize();
    if (result !== '') {
        console.log(String(source).padEnd(20)+result);
    }
}