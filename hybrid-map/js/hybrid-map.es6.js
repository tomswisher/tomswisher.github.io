// tomswisherlabs@gmail.com     https://github.com/tomswisher

'use strict'; /* globals d3, console, nodes, count */ /* jshint -W069, unused:false */

// Performance -------------------------------------------------------------------------------------

var isLoaded = false;
var logsLvl0 = true,
    logsLvl1 = false,
    logsLvl2 = false,
    logsTest = true && performance && performance.memory;
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
var colorSource = 'color:black',
    colorNodes = 'color:black',
    colorUsed = 'color:black',
    colorTotal = 'color:black';
var stringSource = '',
    stringNodes = '',
    stringUsed = '',
    stringTotal = '',
    stringCombined = '',
    stringSymbol = '';
var mobileNavigators = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    mobileBrowser = navigator && mobileNavigators.test(navigator.userAgent);
if (mobileBrowser) { console.log('mobileBrowser', mobileBrowser); }

// D3 Selections -----------------------------------------------------------------------------------

var body = d3.select('body');
var svg = body.select('#svg');
var bgRect = body.select('#bg-rect');
var clipPathRect = body.select('#clip-path-rect');
var statesG = body.select('#states-g'),
    statePaths = d3.select(null);
var verticesG = body.select('#vertices-g'),
    verticeCircles = d3.select(null);
var edgesG = body.select('#edges-g'),
    edgeLines = d3.select(null);
var hoverG = body.select('#hover-g'),
    hoverRect = d3.select(null),
    hoverText = d3.select(null);
var gradesG = body.select('#grades-g'),
    gradeGs = d3.select(null);
var defs = gradesG.append('defs');
var filtersDiv = body.select('#filters-div'),
    filtersYears = d3.select(null),
    filtersReports = d3.select(null);
var optionsDiv = body.select('#options-div'),
    optionRows = d3.select(null),
    optionsAlphaLabel = d3.select(null),
    optionsAlphaSlider = d3.select(null);
var infoG = body.select('#info-g'),
    infoImageGs = d3.select(null),
    infoTextGs = d3.select(null);

// Visual Styling ----------------------------------------------------------------------------------

var vs = {
    svg: {
        w: null,
        h: null,
    },
    states: {
        w: null,
        wMin: 300,
        h: null,
        ratioMapWH: 1.6,
        projectionScale: 1.25,
        selectedOpacity: 0.3,
        strokeWidthStates: 1,
    },
    vertices: {
        minRadius: 4,
        maxRadius: 15,
        strokeWidth: 1,
    },
    edges: {
        strokeWidth: 1,
    },
    info: {
        w: 0.5 * 396,
        h: null,
        wImage: null,
        hImage: null,
        ratioImageWH: 0.5 * 396 / (0.5 * 432),
        margin: 5,
        textRowH: 15,
    },
    grades: {
        w: null,
        h: 0,
        margin: 3,
        // colorArray: ['rgb(50,50,50)','rgb(28,44,160)','rgb(240,6,55)','rgb(251,204,12)','rgb(239,230,221)'], /*BH1*/
        // colorArray: ['rgb(240,243,247)','rgb(191,162,26)','rgb(20,65,132)','rgb(153,40,26)','rgb(34,34,34)'], /*BH2*/
        colorArray: ['#de2d26', '#fb6a4a', '#fc9272', '#fcbba1', '#fee5d9'],
        /*red*/
    },
    hover: {
        w: null,
        h: null,
        margin: 5,
    },
    filters: {
        w: null,
        h: 70,
    },
    options: {
        wSmall: 50,
        wMedium: 90,
        wSlider: 130,
        wRow: null,
        hRow: 25,
    },
    test: {
        colorNeutral: 'black',
        colorBad: 'firebrick',
        colorGood: 'green',
    }
};
vs.info.wImage = vs.info.w - 2 * vs.info.margin;
vs.info.hImage = vs.info.wImage / vs.info.ratioImageWH;
vs.info.h = vs.info.hImage + 4 * vs.info.textRowH + 3 * vs.info.margin;
vs.options.wRow = 2 * vs.options.wSmall + 3 * vs.options.wMedium + vs.options.wSlider;
vs.colorScale = d3.scaleQuantize()
    .domain([0, 5])
    .range(vs.grades.colorArray);
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

// Global Variables --------------------------------------------------------------------------------

var transitionDuration = 200;
var transitionEase = d3.easeLinear;
var topIds = [
    'Alice Walton',
    'Carrie Walton Penner',
    'Jim Walton',
    'Dorris Fisher',
    'Eli Broad',
    'Greg Penner',
    'Jonathan Sackler',
    'Laurene Powell Jobs',
    'Michael Bloomberg',
    'Reed Hastings',
    'Stacy Schusterman',
    'John Arnold',
    'Laura Arnold'
];
var hybridMapObj = null;
var nodesAll = [];
var linksAll = [];
var infoData = [];
var filtersDatum = {};
var stateSelected = '';
var isDragging = false;
var nodeSelected = null;
var linksSelected = [];
var gradesObj = { 'A': true, 'B': true, 'C': true, 'D': true, 'F': true };
var gradesData = ['A', 'B', 'C', 'D', 'F'];
var yearsData = ['2011', '2012', '2013', '2014', '2015', '2016', '2017'];
var reportsData = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Window Events -----------------------------------------------------------------------------------

window.onload = function() {
    TestApp('hybrid-map', 1);
    d3.queue()
        .defer(d3.json, 'data/us-states-features.json')
        .defer(d3.json, 'data/nodes-links-04-06-2017.json')
        .awaitAll(InitializePage);
};
window.onresize = function() {
    if (!isLoaded) { return; }
    if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
    resizeCounter += 1;
    setTimeout(function() {
        if (resizeCounter > 1) {
            resizeCounter -= 1;
            if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
        } else if (resizeCounter === 1) {
            resizeCounter -= 1;
            if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
            UpdatePageDimensions();
        }
    }, resizeWait);
};

// Functions ---------------------------------------------------------------------------------------

function InitializePage(error, results) {
    TestApp('InitializePage', 1);
    results[1].nodes.forEach(node => nodesAll.push(node));
    results[1].links.forEach(link => linksAll.push(link));
    hybridMapObj = (new HybridMapClass())
        .statesFeatures(results[0].features)
        .vertices(results[1].nodes)
        .edges(results[1].links);
    hybridMapObj.simulation = d3.forceSimulation(hybridMapObj.vertices())
        .on('tick', hybridMapObj.Tick);
    vs.hover.h = parseFloat(svg.style('font-size')) + 2 * vs.hover.margin;
    hoverRect
        .attr('height', vs.hover.h)
        .attr('y', -1 * vs.hover.h - vs.hover.margin)
        .style('filter', 'url(#drop-shadow)');
    hoverText
        .attr('x', 0)
        .attr('y', -0.5 * vs.hover.h - vs.hover.margin);
    bgRect
        .on('mouseover', function() {
            stateSelected = '';
            // hybridMapObj
            //     .UpdateMap();
            // hoverText
            //     .text('');
            // that.UpdateHover('mouse');
            // hybridMapObj
            //     .UpdateVerticesEdges();
        });
    UpdatePageDimensions();
    requestAnimationFrame(function() {
        hybridMapObj
            .UpdateOptions();
        body
            .classed('loading', false);
        isLoaded = true;
        TestApp('hybrid-map', -1);
    });
    TestApp('InitializePage', -1);
}

function HybridMapClass() {
    // TestApp('HybridMapClass', 1);
    var that = this;
    var _verticeById = null;
    var _projection = d3.geoAlbersUsa();
    var _path = d3.geoPath();
    var _width = 0;
    that.width = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.width = function(_) {", "color:blue");
        return arguments.length ? (_width = _, that) : _width;
    };
    var _height = 0;
    that.height = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.height = function(_) {", "color:blue");
        return arguments.length ? (_height = _, that) : _height;
    };
    var _statesFeatures = null;
    that.statesFeatures = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.statesFeatures = function(_) {", "color:blue");
        return arguments.length ? (_statesFeatures = _, that) : _statesFeatures;
    };
    var _$GivenByState = {};
    that.$GivenByState = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.$GivenByState = function(_) {", "color:blue");
        return arguments.length ? (_$GivenByState = _, that) : _$GivenByState;
    };
    var _$ReceivedByState = {};
    that.$ReceivedByState = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.$ReceivedByState = function(_) {", "color:blue");
        return arguments.length ? (_$ReceivedByState = _, that) : _$ReceivedByState;
    };
    var _$GivenByStateScale = d3.scaleLinear().range([0, 1]);
    that.$GivenByStateScale = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.$GivenByStateScale = function(_) {", "color:blue");
        return arguments.length ? (_$GivenByStateScale = _, that) : _$GivenByStateScale;
    };
    var _$ReceivedByStateScale = d3.scaleLinear().range([0, 1]);
    that.$ReceivedByStateScale = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.$ReceivedByStateScale = function(_) {", "color:blue");
        return arguments.length ? (_$ReceivedByStateScale = _, that) : _$ReceivedByStateScale;
    };
    var _$GivenByVerticeScale = d3.scaleLinear().range([0, 1]);
    that.$GivenByVerticeScale = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.$GivenByVerticeScale = function(_) {", "color:blue");
        return arguments.length ? (_$GivenByVerticeScale = _, that) : _$GivenByVerticeScale;
    };
    var _$ReceivedByVerticeScale = d3.scaleLinear().range([0, 1]);
    that.$ReceivedByVerticeScale = function(_) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.$ReceivedByVerticeScale = function(_) {", "color:blue");
        return arguments.length ? (_$ReceivedByVerticeScale = _, that) : _$ReceivedByVerticeScale;
    };
    var _vertices = null;
    that.vertices = function(vertices) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.vertices = function(vertices) {", "color:blue");
        if (!arguments.length) { return _vertices; }
        _vertices = vertices;
        _vertices.forEach(function(vertice) {
            vertice.$Given = 0;
            vertice.$Received = 0;
            _$GivenByState[vertice.state] = 0;
            _$ReceivedByState[vertice.state] = 0;
        });
        _verticeById = d3.map(_vertices, function(d) { return d.id; });
        return that;
    };
    var _edges = null;
    that.edges = function(edges) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.edges = function(edges) {", "color:blue");
        if (!arguments.length) { return _edges; }
        _edges = edges;
        _edges.forEach(function(edge) {
            edge.source = _verticeById.get(edge.source);
            edge.target = _verticeById.get(edge.target);
            edge.source.$Given += edge.dollars;
            edge.target.$Received += edge.dollars;
            _$GivenByState[edge.source.state] += edge.dollars;
            _$ReceivedByState[edge.target.state] += edge.dollars;
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
    that.centroidByState = {};

    that.UpdateMap = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateMap = function() {", "color:blue");
        if (logsLvl2) console.log('UpdateMap');
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
        _projection
            .scale(_width * vs.states.projectionScale)
            .translate([_width / 2, _height / 2]);
        _path
            .projection(_projection);
        //
        statePaths = statesG.selectAll('path.state-path')
            .data(_statesFeatures, function(d) { return d.properties.ansi; });
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true)
            .each(function(d) {
                d.$Given = parseInt(_$GivenByState[d.properties.ansi]);
                d.$Received = parseInt(_$ReceivedByState[d.properties.ansi]);
            })
            .on('mouseover', function(d) {
                stateSelected = d.properties.ansi;
                // that
                //     .UpdateMap();
                // hoverText.text(d.properties.ansi+': '+d.$Given+' '+d.$Received);
                // that.UpdateHover('mouse');
            })
            .on('mousemove', function(d) {
                // that.UpdateHover('mouse');
            })
            .attr('d', _path)
            .merge(statePaths);
        statePaths
            .each(function(d) {
                that.centroidByState[d.properties.ansi] = _path.centroid(d);
            })
            .classed('inactive', function(d) {
                return true;
                // return isNaN(d.$Given) && isNaN(d.$Received);
            })
            .attr('d', _path)
            .style('stroke-width', vs.states.strokeWidthStates + 'px')
            .style('opacity', function(d) {
                // if (stateSelected === d.properties.ansi) { return vs.states.selectedOpacity; }
                return 1;
            })
            .style('fill', function(d) {
                return vs.colorScale(5 * _$GivenByStateScale(d.$Given));
            });
        // statePaths.each(function(d) {
        //     var centroid = that.centroidByState[d.properties.ansi];
        //     console.log(d.properties.ansi, centroid);
        //     var rect = d3.select(this.parentNode).append('rect')
        //         .attr('x', centroid[0]-20)
        //         .attr('y', centroid[1]-20)
        //         .attr('width', 40)
        //         .attr('height', 40)
        //         .attr('fill', 'white')
        //         .style('stroke', 'red');
        //     d3.select(this).remove();
        // });
        TestApp('UpdateMap');
        return that;
    };

    that.UpdateGrades = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateGrades = function() {", "color:blue");
        if (vs.grades.h === 0) {
            return that;
        }
        gradesG
            .attr('transform', function() {
                return 'translate(' + (0) + ',' + (vs.states.h) + ')';
            });
        // var gradesText = gradesG.selectAll('text.grades-text')
        //     .data([null]);
        // gradesText = gradesText.enter().append('text')
        //     .classed('grades-text', true)
        //     .merge(gradesText)
        //     .attr('x', 0.5*vs.grades.w-130)
        //     .attr('y', 0.5*vs.grades.h)
        //     .text('$ Given');
        gradeGs = gradesG.selectAll('g.grade-g')
            .data(gradesData);
        gradeGs = gradeGs.enter().append('g')
            .classed('grade-g', true)
            .merge(gradeGs);
        gradeGs
            .attr('transform', function(d, i) {
                var tx = 0.5 * vs.grades.w + (0.5 - 0.5 * gradesData.length + i) * vs.grades.h;
                var ty = 0.5 * vs.grades.h - 2;
                return 'translate(' + tx + ',' + ty + ')';
            })
            .on('mouseover', function(d) {
                // gradesObj.A = gradesObj.B = gradesObj.C = gradesObj.D = gradesObj.F = false;
                // gradesObj[d] = true;
                // UpdateGrades();
                // that
                //     .UpdateMap();
            })
            .on('mouseout', function(d) {
                // gradesObj.A = gradesObj.B = gradesObj.C = gradesObj.D = gradesObj.F = true;
                // UpdateGrades();
                // that
                //     .UpdateMap();
            })
            .each(function(grade) {
                var gradeBG = d3.select(this).selectAll('rect.grade-bg')
                    .data([grade]);
                gradeBG = gradeBG.enter().append('rect')
                    .classed('grade-bg', true)
                    .merge(gradeBG)
                    .attr('x', (-0.5) * vs.grades.h)
                    .attr('y', (-0.5) * vs.grades.h)
                    .attr('width', vs.grades.h)
                    .attr('height', vs.grades.h);
                var gradeRect = d3.select(this).selectAll('rect.grade-rect')
                    .data([grade]);
                gradeRect = gradeRect.enter().append('rect')
                    .classed('grade-rect', true)
                    .merge(gradeRect)
                    .classed('inactive', function(d) {
                        return !gradesObj[d];
                    })
                    .attr('x', -0.5 * Math.max(0, vs.grades.h - 2 * vs.grades.margin))
                    .attr('y', -0.5 * Math.max(0, vs.grades.h - 2 * vs.grades.margin))
                    .attr('width', Math.max(0, vs.grades.h - 2 * vs.grades.margin))
                    .attr('height', Math.max(0, vs.grades.h - 2 * vs.grades.margin))
                    .style('filter', function(d) {
                        return gradesObj[d] ? 'url(#drop-shadow)' : null;
                    })
                    .style('fill', function(d) {
                        return vs.colorScale(['F', 'D', 'C', 'B', 'A'].indexOf(d));
                    });
                var gradeLabel = d3.select(this).selectAll('text.grade-label')
                    .data([grade]);
                gradeLabel = gradeLabel.enter().append('text')
                    .classed('grade-label', true).classed('button-text', true)
                    .text(function(d) { return d; })
                    .merge(gradeLabel)
                    .classed('inactive', function(d) {
                        return !gradesObj[d];
                    });
            });
        TestApp('UpdateGrades');
        return that;
    };

    that.UpdateInfo = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateInfo = function() {", "color:blue");
        if (nodeSelected && !(infoData.filter(d => d.id === nodeSelected.id)[0])) {
            infoData.push(nodeSelected);
        }
        infoG
            .attr('transform', 'translate(' + (vs.states.w + vs.info.margin) + ',' + (vs.info.margin) + ')');
        infoImageGs = infoG.selectAll('g.info-image-g')
            .data(infoData);
        infoImageGs = infoImageGs.enter().append('g')
            .classed('info-image-g', true)
            .each(function(datum) {
                d3.select(this).append('image')
                    .attr('width', vs.info.wImage)
                    .attr('height', vs.info.hImage)
                    .attr('xlink:href', function() {
                        if (!topIds.includes(datum.id)) {
                            return null;
                        } else {
                            return 'img/' + datum.id + '.jpg';
                        }
                    });
            })
            .merge(infoImageGs);
        infoImageGs
            // .style('pointer-events', function(d) {
            //     return (nodeSelected && d.id === nodeSelected.id) ? 'all' : 'none';
            // })
            .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', function(d) {
                return (nodeSelected && d.id === nodeSelected.id) ? 1 : 0;
            });
        infoTextGs = infoG.selectAll('g.info-text-g')
            .data(infoData);
        infoTextGs = infoTextGs.enter().append('g')
            .classed('info-text-g', true)
            .attr('transform', function() {
                return 'translate(' + (vs.info.wImage / 2) + ',' + (vs.info.hImage + vs.info.margin) + ')';
            })
            .each(function(datum) {
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 0.5 * vs.info.textRowH)
                    .text(datum.id);
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 1.5 * vs.info.textRowH)
                    .text('State: ' + datum.state);
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 2.5 * vs.info.textRowH)
                    .text('Given: ' + d3.format('$,')(datum.$Given));
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 3.5 * vs.info.textRowH)
                    .text('Received: ' + d3.format('$,')(datum.$Received));
            })
            .style('opacity', 0)
            .merge(infoTextGs);
        infoTextGs
            .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', function(d) {
                return (nodeSelected && d.id === nodeSelected.id) ? 1 : 0;
            });
        TestApp('UpdateInfo');
        return that;
    };

    that.UpdateHover = function(source) {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateHover = function(source) {", "color:blue");
        vs.hover.w = 0;
        if (hoverText.text() !== '') {
            vs.hover.w = hoverText.node().getBBox().width + 2 * vs.hover.margin;
        }
        hoverRect
            .attr('width', vs.hover.w)
            .attr('x', -0.5 * vs.hover.w);
        hoverG
            .attr('transform', function() {
                var tx, ty;
                if (source === 'mouse') {
                    tx = d3.mouse(svg.node())[0];
                    ty = d3.mouse(svg.node())[1];
                } else if (that.centroidByState[stateSelected]) {
                    tx = that.centroidByState[stateSelected][0];
                    ty = that.centroidByState[stateSelected][1] + 0.5 * (vs.hover.h + 2 * vs.hover.margin);
                } else {
                    tx = that.width() / 2;
                    ty = that.height() / 2;
                }
                if (tx < vs.hover.w / 2 + 1) {
                    tx = vs.hover.w / 2 + 1;
                } else if (tx > parseInt(svg.style('width')) - vs.hover.w / 2 - 1) {
                    tx = parseInt(svg.style('width')) - vs.hover.w / 2 - 1;
                }
                if (ty < vs.hover.h + 5 + 1) {
                    ty = vs.hover.h + 5 + 1;
                }
                return 'translate(' + tx + ',' + ty + ')';
            });
        TestApp('UpdateHover');
    };

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
                step: 1,
            },
            strength: {
                value: 1, // 1
                min: 0,
                max: 1,
                step: 0.01,
            },
            radius: {
                value: function(node, i, nodes) {
                    return Math.max(vs.vertices.minRadius, node.r) + 0.5 * vs.vertices.strokeWidth;
                },
                // value: 5,
                // min: 0,
                // max: 20,
                // step: 0.5,
            },
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
        //     // distanceMin: {
        //     //     value: 1,
        //     //     min: 0,
        //     //     max: 10000,
        //     //     step: 1,
        //     // },
        //     // distanceMax: {
        //     //     value: 100, // Infinity
        //     //     min: 0,
        //     //     max: 200,
        //     //     step: 1,
        //     // },
        //     // theta: {
        //     //     value: 0.81,
        //     //     min: 0,
        //     //     max: 1,
        //     //     step: 0.1,
        //     // },
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
                step: 0.05,
            },
            x: {
                value: 'cx', // value: function(node, i, nodes) { return node.x; },
            },
            _IsolateForce: true,
        },
        forceY: {
            strength: {
                value: 0.1, // function(node, i, nodes) { return 0.1; },
                min: 0,
                max: 1,
                step: 0.05,
            },
            y: {
                value: 'cy', // value: function(node, i, nodes) { return node.y; },
            },
            _IsolateForce: true,
        },
        simulation: {
            alpha: {
                value: 1,
                min: 0,
                max: 1,
                step: 0.01,
            },
            alphaMin: {
                value: 0.2, //0.001,
                min: 0,
                max: 1,
                step: 0.05,
            },
            alphaDecay: {
                value: 0.02276277904418933,
                min: 0.01,
                max: 0.2,
                step: 0.01,
            },
            alphaTarget: {
                value: 0,
                min: 0,
                max: 0.19,
                step: 0.01,
            },
            velocityDecay: {
                value: 0.4,
                min: 0,
                max: 1,
                step: 0.1,
            },
        },
    };

    that.UpdateVerticesEdges = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateVerticesEdges = function() {", "color:blue");
        var iCount = 0;
        verticeCircles = verticesG.selectAll('circle.vertice-circle')
            .data(that.vertices());
        verticeCircles = verticeCircles.enter().append('circle')
            .each(function(d, i) {
                d.x = that.centroidByState[d.state][0];
                d.y = that.centroidByState[d.state][1];
                if (topIds.includes(d.id)) {
                    d.i = iCount;
                    iCount += 1;
                }
            })
            .classed('vertice-circle', true)
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
            //         .UpdateVerticesEdges();
            // })
            .on('mouseover', function(d) {
                if (isDragging) { return; }
                nodeSelected = d;
                linksSelected = that.edges().filter(d => {
                    return nodeSelected.id === d.source.id || nodeSelected.id === d.target.id;
                });
                that
                    .UpdateVerticesEdges();
                that
                    .UpdateInfo();
            })
            .on('mouseout', function(d) {
                if (isDragging) { return; }
                nodeSelected = null;
                linksSelected = [];
                that
                    .UpdateVerticesEdges();
                that
                    .UpdateInfo();
            }).call(d3.drag()
                .on('start', _DragStarted)
                .on('drag', _Dragged)
                .on('end', _DragEnded))
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .merge(verticeCircles);
        verticeCircles
            .each(function(d) {
                if (topIds.includes(d.id)) {
                    d.r = vs.vertices.maxRadius;
                } else {
                    d.r = vs.vertices.minRadius;
                }
                // d.r = vs.vertices.maxRadius;
                // } else if (nodeSelected) {
                //     d.r = 2+15*Math.sqrt(that.$ReceivedByVerticeScale()(d.$Received));
                // } else {
                //     d.r = 2+15*Math.sqrt(that.$GivenByVerticeScale()(d.$Given));
                // }
            })
            .style('stroke-width', vs.vertices.strokeWidth + 'px')
            .style('fill', function(d) {
                if (topIds.includes(d.id)) {
                    return d3.schemeCategory20[d.i];
                } else if (d.$Given > 0) {
                    return 'black';
                } else {
                    return 'white';
                }
                // return 'white';
                // if (topIds.includes(d.id)) {
                //     return 'white';
                // }
                // var fillValue = that.$GivenByStateScale()(that.$GivenByState()[d.state]);
                // return vs.colorScale(fillValue);
            })
            .style('stroke', function(d) {
                if (topIds.includes(d.id)) {
                    return 'black';
                } else if (d.$Given > 0) {
                    return null;
                } else {
                    return 'black';
                }
                // if (d.i > 12) {
                //     return 'gainsboro';
                // } else {
                //     return d3.schemeCategory10[d.i];
                // }
            })
            .attr('r', function(d) { return d.r; })
            // .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', function(d) {
                if (!nodeSelected) {
                    return 1;
                } else if (nodeSelected.id === d.id) {
                    return 1;
                } else if (linksSelected.map(d => d.source.id).includes(d.id)) {
                    return 1;
                } else if (linksSelected.map(d => d.target.id).includes(d.id)) {
                    return 1;
                } else {
                    return 0;
                }
            });
        edgeLines = edgesG.selectAll('line.edge-line')
            .data(that.edges());
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
            .style('stroke-width', vs.edges.strokeWidth + 'px')
            .style('stroke', function(d) {
                if (topIds.includes(d.source.id)) {
                    return d3.schemeCategory20[d.source.i];
                } else if (topIds.includes(d.target.id)) {
                    return d3.schemeCategory20[d.target.i];
                } else {
                    return 'black';
                }
                // if (nodeSelected) {
                //     if (nodeSelected.id === d.source.id) {
                //         if (topIds.includes(d.source.id)) {
                //             return d3.schemeCategory20[d.source.i];
                //         } else if (topIds.includes(d.target.id)) {
                //             return d3.schemeCategory20[d.target.i];
                //         }
                //     } else if (nodeSelected.id === d.target.id) {
                //         if (topIds.includes(d.target.id)) {
                //             return d3.schemeCategory20[d.target.i];
                //         } else if (topIds.includes(d.source.id)) {
                //             return d3.schemeCategory20[d.source.i];
                //         }
                //     }
                // } else {
                //     return 'black';
                // }
            })
            // .transition().duration(transitionDuration).ease(transitionEase)
            .style('display', function(d) {
                if (!filtersDatum[d.year]) {
                    return 'none';
                } else if (!filtersDatum[d.report]) {
                    return 'none';
                } else if (!nodeSelected) {
                    return 'block';
                } else if (nodeSelected.id === d.source.id) {
                    return 'block';
                } else if (nodeSelected.id === d.target.id) {
                    return 'block';
                } else {
                    return 'none';
                }
            });
        TestApp('UpdateVerticesEdges');
        return that;
    };

    that.UpdateSimulation = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateSimulation = function() {", "color:blue");
        Object.keys(that.forcesObj).forEach(function(forceType) {
            if (forceType === 'simulation') { return; }
            var optionsObj = that.forcesObj[forceType];
            if (optionsObj['_IsolateForce'] === true) {
                Object.keys(that.$GivenByState()).forEach(function(state) {
                    var cx = that.centroidByState[state][0];
                    var cy = that.centroidByState[state][1];
                    var forceNew = _IsolateForce(d3[forceType](), function(d) {
                        return d.state === state;
                    });
                    Object.keys(optionsObj).forEach(function(optionName) {
                        if (optionName[0] === '_') { return; }
                        var optionValue = optionsObj[optionName].value; // do not mutate original value
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
                    that.simulation
                        .force(forceType + state, forceNew);
                });
            } else {
                var forceNew = d3[forceType]();
                Object.keys(optionsObj).forEach(function(optionName) {
                    if (optionName[0] === '_') { return; }
                    var optionValue = optionsObj[optionName].value; // do not mutate original value
                    switch (optionValue) {
                        case 'cx':
                            optionValue = 0.5 * vs.states.w;
                            break;
                        case 'cy':
                            optionValue = 0.5 * vs.states.h;
                            break;
                    }
                    forceNew[optionName](optionValue);
                });
                that.simulation
                    .force(forceType, forceNew);
            }
        });
        Object.keys(that.forcesObj.simulation).forEach(function(optionName) {
            that.simulation[optionName](that.forcesObj.simulation[optionName].value);
        });
        that.simulation
            .alpha(1)
            .restart();
        that.optionsData = [];
        Object.keys(that.forcesObj).forEach(function(forceType) {
            var optionsObj = that.forcesObj[forceType];
            Object.keys(optionsObj).forEach(function(optionName) {
                if (optionName[0] === '_') { return; }
                optionsObj[optionName]._category = forceType;
                optionsObj[optionName]._name = optionName;
                that.optionsData.push(optionsObj[optionName]);
            });
        });
        TestApp('UpdateSimulation');
        return that;
    };

    that.UpdateFilters = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateFilters = function() {", "color:blue");
        filtersDiv
            .style('width', vs.filters.w + 'px')
            .style('height', vs.filters.h + 'px')
            .style('left', '0px')
            .style('top', (vs.states.h + vs.grades.h) + 'px');
        filtersYears = filtersDiv.selectAll('div.filters-year')
            .data(yearsData);
        filtersYears = filtersYears.enter().append('div')
            .classed('filters-year', true)
            .each(function(datum) {
                d3.select(this).append('div')
                    .text(datum);
                d3.select(this).append('input')
                    .attr('type', 'checkbox')
                    .each(function(d) {
                        this.checked = true;
                        filtersDatum[d] = this.checked;
                    })
                    .on('change', function(d) {
                        filtersDatum[d] = this.checked;
                        that
                            .UpdateVerticesEdges()
                            .UpdateSimulation();
                    });
            })
            .merge(filtersYears)
            .style('width', (vs.filters.w / yearsData.length) + 'px')
            .style('height', (0.5 * vs.filters.h) + 'px');
        filtersReports = filtersDiv.selectAll('div.filters-report')
            .data(reportsData);
        filtersReports = filtersReports.enter().append('div')
            .classed('filters-report', true)
            .each(function(datum) {
                d3.select(this).append('div')
                    .text(datum);
                d3.select(this).append('input')
                    .attr('type', 'checkbox')
                    .each(function(d) {
                        this.checked = true;
                        filtersDatum[d] = this.checked;
                    })
                    .on('change', function(d) {
                        filtersDatum[d] = this.checked;
                        that
                            .UpdateVerticesEdges()
                            .UpdateSimulation();
                    });
            })
            .merge(filtersReports)
            .style('width', (vs.filters.w / reportsData.length) + 'px')
            .style('height', (0.5 * vs.filters.h) + 'px');
        return that;
    };

    that.UpdateOptions = function() {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateOptions = function() {", "color:blue");
        optionsDiv
            .style('left', '0px')
            .style('top', Math.max(vs.svg.h, vs.states.h + vs.grades.h + vs.filters.h) + 'px');
        optionRows = optionsDiv.selectAll('div.option-row')
            .data(that.optionsData);
        optionRows = optionRows.enter().append('div')
            .classed('option-row', true)
            .each(function(datum) {
                d3.select(this).append('label')
                    .classed('label-medium', true)
                    .text(datum._category);
                d3.select(this).append('label')
                    .classed('label-medium', true)
                    .text(datum._name);
                d3.select(this).append('label')
                    .classed('label-medium', true).classed('option-value', true);
                if (datum.min !== undefined) {
                    d3.select(this).append('label')
                        .classed('label-small', true)
                        .text(datum.min);
                }
                if (datum.step !== undefined) {
                    d3.select(this).append('input')
                        .attr('type', 'range')
                        .attr('min', datum.min)
                        .attr('max', datum.max)
                        .attr('step', datum.step)
                        .attr('value', datum.value)
                        .on('change', function() {
                            if (datum.step === parseInt(datum.step)) {
                                datum.value = parseInt(this.value);
                            } else {
                                datum.value = parseFloat(this.value);
                            }
                            that.simulation
                                .alpha(0);
                            that
                                .UpdateSimulation()
                                .UpdateOptions();
                        });
                }
                if (datum.max !== undefined) {
                    d3.select(this).append('label')
                        .classed('label-small', true)
                        .text(datum.max);
                }
            })
            .merge(optionRows)
            .each(function(datum) {
                d3.select(this).selectAll('label.option-value')
                    .text(function() {
                        if (typeof(datum.value) === 'function') {
                            return 'function';
                        } else {
                            return datum.value;
                        }
                    });
                d3.select(this).selectAll('label.label-small')
                    .style('width', vs.options.wSmall + 'px');
                d3.select(this).selectAll('label.label-medium')
                    .style('width', vs.options.wMedium + 'px');
                d3.select(this).selectAll('input[type=\'Range\']')
                    .style('width', vs.options.wSlider + 'px');
            })
            .style('width', vs.options.wRow + 'px')
            .selectAll('*')
            .style('height', vs.options.hRow + 'px')
            .style('line-height', vs.options.hRow + 'px');
        optionsAlphaLabel = optionsDiv.selectAll('label.option-value')
            .filter(function(d) { return d._category === 'simulation' && d._name === 'alpha'; });
        optionsAlphaSlider = optionsDiv.selectAll('input[type="range"]')
            .filter(function(d) { return d._category === 'simulation' && d._name === 'alpha'; });
        TestApp('UpdateOptions');
        return that;
    };

    function _IsolateForce(force, filter) {
        var initialize = force.initialize;
        force.initialize = function() {
            console.log(''.padStart(2 * stackLevel) + "%cforce.initialize = function() {", "color:blue");
            initialize.call(force, that.vertices().filter(filter));
        };
        return force;
    }

    function _DragStarted(d) {
        isDragging = true;
        // if (!d3.event.active) { that.simulation.alphaTarget(0.3).restart(); }
        d.fx = d.x;
        d.fy = d.y;
        // that.Tick();
    }

    function _Dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d.x = d3.event.x;
        d.y = d3.event.y;
        d.cx = d3.event.x;
        d.cy = d3.event.y;
        that.Tick();
    }

    function _DragEnded(d) {
        isDragging = false;
        // if (!d3.event.active) { that.simulation.alphaTarget(0); }
        d.fx = null;
        d.fy = null;
        if (!d3.event.active) {
            that.simulation
                .alpha(1).restart();
        }
    }

    that.Tick = function() {
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
            });
        if (optionsAlphaLabel.empty() || optionsAlphaSlider.empty()) { return; }
        that.forcesObj.simulation.alpha.value = parseFloat(that.simulation.alpha()).toFixed(8);
        optionsAlphaLabel
            .text(that.forcesObj.simulation.alpha.value);
        optionsAlphaSlider
            .property('value', that.forcesObj.simulation.alpha.value);
        // TestApp('Tick');
    };
    TestApp('GraphClass');
    return that;
}

function UpdatePageDimensions() {
    TestApp('UpdatePageDimensions', 1);
    var clientWidth = body.node().clientWidth;
    if (clientWidth >= vs.states.wMin + vs.info.w) {
        vs.states.w = clientWidth - vs.info.w;
        vs.svg.w = clientWidth;
    } else {
        vs.states.w = vs.states.wMin;
        vs.svg.w = vs.states.wMin + vs.info.w;
    }
    vs.filters.w = vs.states.w;
    vs.states.h = vs.states.w / vs.states.ratioMapWH;
    vs.svg.h = Math.max(vs.states.h, vs.info.h) + vs.grades.h;
    vs.grades.w = vs.states.w;
    svg
        .attr('width', vs.svg.w)
        .attr('height', vs.svg.h);
    bgRect
        .attr('width', vs.states.w)
        .attr('height', vs.states.h);
    clipPathRect
        .attr('width', vs.states.w)
        .attr('height', vs.svg.h);
    hybridMapObj
        .width(vs.states.w)
        .height(vs.states.h)
        .UpdateMap('UpdatePageDimensions')
        .UpdateGrades()
        .UpdateInfo()
        .UpdateFilters()
        .UpdateVerticesEdges()
        .UpdateSimulation()
        .UpdateOptions();
    TestApp('UpdatePageDimensions', -1);
}

function TestApp(source, position) {
    if (!logsTest) { return; }
    stackLevelTemp = stackLevel;
    sizeNodesOld = sizeNodesNew;
    sizeUsedOld = sizeUsedNew;
    sizeTotalOld = sizeTotalNew;
    sizeNodesNew = d3.selectAll('*').size();
    sizeUsedNew = performance.memory.usedJSHeapSize;
    sizeTotalNew = performance.memory.totalJSHeapSize;
    if (position === 1) {
        stringSymbol = '> ';
        stackLevel += 1;
    } else if (position === -1) {
        stackLevel -= 1;
        stringSymbol = '< ';
        stackLevelTemp = stackLevel;
    } else {
        stringSymbol = '• ';
    }
    stringSource = '%c' + (''.padStart(2 * stackLevelTemp) + stringSymbol + String(source)).padEnd(27);
    if (sizeNodesNew !== sizeNodesOld) {
        stringNodes = (sizeNodesNew + ' n').padStart(6);
        colorNodes = 'color:' + (sizeNodesNew < sizeNodesOld ? vs.test.colorGood : vs.test.colorBad);
    } else {
        stringNodes = '';
        colorNodes = 'color:' + vs.test.colorNeutral;
    }
    stringNodes = '%c' + stringNodes.padEnd(8);
    if (sizeUsedNew !== sizeUsedOld) {
        stringUsed = ((sizeUsedNew / (1024 * 1024)).toFixed(2) + ' Mb').padStart(8);
        colorUsed = 'color:' + (sizeUsedNew < sizeUsedOld ? vs.test.colorGood : vs.test.colorBad);
    } else {
        stringUsed = '';
        colorUsed = 'color:' + vs.test.colorNeutral;
    }
    stringUsed = '%c' + stringUsed.padEnd(12);
    if (sizeTotalNew !== sizeTotalOld) {
        stringTotal = ((sizeTotalNew / (1024 * 1024)).toFixed(2) + ' Mb').padStart(8);
        colorTotal = 'color:' + (sizeTotalNew < sizeTotalOld ? vs.test.colorGood : vs.test.colorBad);
    } else {
        stringTotal = '';
        colorTotal = 'color:' + vs.test.colorNeutral;
    }
    stringTotal = '%c' + stringTotal.padEnd(12);
    stringCombined = stringSource + stringNodes + stringUsed + stringTotal;
    console.log(stringCombined, colorSource, colorNodes, colorUsed, colorTotal);
}