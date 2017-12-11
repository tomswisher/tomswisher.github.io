// tomswisherlabs@gmail.com     https://github.com/tomswisher

'use strict'; /* globals d3, console, nodes, count */ /* jshint -W069, unused:false */

// Performance -------------------------------------------------------------------------------------

let isLoaded = false;
let logsLvl0 = true,
    logsLvl1 = false,
    logsLvl2 = false,
    logsTest = true && performance && performance.memory;
let resizeWait = 150,
    resizeCounter = 0;
let stackLevel = 0,
    stackLevelTemp = 0;
let sizeNodesOld = -1,
    sizeUsedOld = -1,
    sizeTotalOld = -1;
let sizeNodesNew = 0,
    sizeUsedNew = 0,
    sizeTotalNew = 0;
let colorSource = '',
    colorNodes = '',
    colorUsed = '',
    colorTotal = '';
let stringSource = '',
    stringNodes = '',
    stringUsed = '',
    stringTotal = '',
    stringCombined = '',
    stringSymbol = '';
let mobileNavigators = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    mobileBrowser = navigator && mobileNavigators.test(navigator.userAgent);
if (mobileBrowser) console.log('mobileBrowser', mobileBrowser);

// D3 Selections -----------------------------------------------------------------------------------

const body = d3.select('body');
const svg = body.select('#svg');
const bgRect = body.select('#bg-rect');
const clipPathRect = body.select('#clip-path-rect');
const statesG = body.select('#states-g');
let statePaths = statesG.select(null);
const verticesG = body.select('#vertices-g');
let verticeCircles = verticesG.select(null);
const edgesG = body.select('#edges-g');
let edgeLines = edgesG.select(null);
const filtersDiv = body.select('#filters-div');
let filtersYears = filtersDiv.select(null);
let filtersReports = filtersDiv.select(null);
const optionsDiv = body.select('#options-div');
let optionRows = optionsDiv.select(null);
let optionsAlphaLabel = optionsDiv.select(null);
let optionsAlphaSlider = optionsDiv.select(null);
const infoG = body.select('#info-g');
let infoImageGs = infoG.select(null);
let infoTextGs = infoG.select(null);

// Visual Styling ----------------------------------------------------------------------------------

const vs = {
    svg: {
        w: null,
        h: null,
    },
    states: {
        w: null,
        wMin: 300,
        h: null,
        ratioMapWH: 1.6,
        projectionScale: 1.2,
        selectedOpacity: 0.3,
        strokeWidthStates: 1,
    },
    vertices: {
        rMin: 3,
        rFactor: 50,
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
    filters: {
        w: null,
        h: 70,
    },
    options: {
        wSmall: 50,
        wMedium: 90,
        wSlider: 130,
        wRow: null,
        hRow: 20,
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

// Global Variables --------------------------------------------------------------------------------

let transitionDuration = 200;
let transitionEase = d3.easeLinear;
let topIds = [
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
let hybridMapObj = null;
let nodesAll = [];
let linksAll = [];
let infoData = [];
let filtersDatum = {};
let isDragging = false;
let nodeSelected = null;
let linksSelected = [];
let yearsData = ['2011', '2012', '2013', '2014', '2015', '2016', '2017'];
let reportsData = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Window Events -----------------------------------------------------------------------------------

window.onload = () => {
    TestApp('hybrid-map', 1);
    d3.queue()
        .defer(d3.json, 'data/us-states-features.json')
        .defer(d3.json, 'data/nodes-links-04-06-2017.json')
        .awaitAll(InitializePage);
};
window.onresize = () => {
    if (!isLoaded) { return; }
    if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
    resizeCounter += 1;
    setTimeout(() => {
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

const InitializePage = (error, results) => {
    TestApp('InitializePage', 1);
    results[1].nodes.forEach(node => nodesAll.push(node));
    results[1].links.forEach(link => linksAll.push(link));
    hybridMapObj = (new HybridMapClass())
        .statesFeatures(results[0].features)
        .vertices(results[1].nodes)
        .edges(results[1].links);
    hybridMapObj.simulation = d3.forceSimulation(hybridMapObj.vertices())
        .on('tick', hybridMapObj.Tick);
    UpdatePageDimensions();
    requestAnimationFrame(() => {
        hybridMapObj
            .UpdateOptions();
        body
            .classed('loading', false);
        isLoaded = true;
        TestApp('hybrid-map', -1);
    });
    TestApp('InitializePage', -1);
};

function HybridMapClass() {
    // TestApp('HybridMapClass', 1);
    let that = this;
    that.centroidByState = {};
    that.$total = 0;
    that.$inState = {};
    that.$outState = {};
    that.$verticeScale = d3.scaleLinear().range([0, 1]);
    that.verticeById = null;
    that.projection = d3.geoAlbersUsa();
    that.path = d3.geoPath();
    let _statesFeatures = null;
    that.statesFeatures = d => {
        return d !== undefined ? (_statesFeatures = d, that) : _statesFeatures;
    };
    let _vertices = null;
    that.vertices = d => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.vertices = function(vertices) {", "color:blue");
        if (d === undefined) { return _vertices; }
        _vertices = d;
        _vertices.forEach(vertice => {
            vertice.$in = 0;
            vertice.$out = 0;
            that.$inState[vertice.state] = 0;
            that.$outState[vertice.state] = 0;
        });
        that.verticeById = d3.map(_vertices, d => d.id);
        return that;
    };
    let _edges = null;
    that.edges = d => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.edges = function(edges) {", "color:blue");
        if (d === undefined) { return _edges; }
        _edges = d;
        _edges.forEach(edge => {
            edge.target = that.verticeById.get(edge.target);
            edge.source = that.verticeById.get(edge.source);
            edge.target.$in += edge.dollars;
            edge.source.$out += edge.dollars;
            that.$inState[edge.target.state] += edge.dollars;
            that.$outState[edge.source.state] += edge.dollars;
            that.$total += edge.dollars;
            // edge.topId = topIds.includes(edge.source.id) || topIds.includes(edge.target.id);
            // if (edge.topId) {
            //     edge.source.topId = true;
            //     edge.target.topId = true;
            // }
        });
        // _edges = _edges.filter(edge => edge.topId);
        // _vertices = _vertices.filter(vertice => vertice.topId);
        that.$verticeScale
            .domain([0, that.$total]);
        return that;
    };

    that.UpdateSVG = () => {
        svg
            .attr('width', vs.svg.w)
            .attr('height', vs.svg.h);
        TestApp('UpdateSVG');
        return that;
    };

    that.UpdateStates = () => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateStates = function() {", "color:blue");
        if (logsLvl2) console.log('UpdateStates');
        bgRect
            .attr('width', vs.states.w)
            .attr('height', vs.states.h);
        clipPathRect
            .attr('width', vs.states.w)
            .attr('height', vs.svg.h);
        that.projection
            .scale(vs.states.w * vs.states.projectionScale)
            .translate([vs.states.w / 2, vs.states.h / 2]);
        that.path
            .projection(that.projection);
        statePaths = statesG.selectAll('path.state-path')
            .data(_statesFeatures, d => d.properties.ansi);
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true)
            .attr('d', that.path)
            .merge(statePaths);
        statePaths
            .each(d => that.centroidByState[d.properties.ansi] = that.path.centroid(d))
            .classed('inactive', true)
            .attr('d', that.path)
            .style('stroke-width', vs.states.strokeWidthStates + 'px');
        // statePaths.each(d => {
        //     let centroid = that.centroidByState[d.properties.ansi];
        //     console.log(d.properties.ansi, centroid);
        //     let rect = d3.select(this.parentNode).append('rect')
        //         .attr('x', centroid[0]-20)
        //         .attr('y', centroid[1]-20)
        //         .attr('width', 40)
        //         .attr('height', 40)
        //         .attr('fill', 'white')
        //         .style('stroke', 'red');
        //     d3.select(this).remove();
        // });
        TestApp('UpdateStates');
        return that;
    };

    that.UpdateInfo = () => {
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
                    .attr('xlink:href', () => {
                        if (!topIds.includes(datum.id)) {
                            return null;
                        } else {
                            return 'img/' + datum.id + '.jpg';
                        }
                    });
            })
            .merge(infoImageGs);
        infoImageGs
            .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', d => +(nodeSelected && d.id === nodeSelected.id));
        infoTextGs = infoG.selectAll('g.info-text-g')
            .data(infoData);
        infoTextGs = infoTextGs.enter().append('g')
            .classed('info-text-g', true)
            .attr('transform', 'translate(' + (vs.info.wImage / 2) + ',' + (vs.info.hImage + vs.info.margin) + ')')
            .each(function(datum) {
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 0.5 * vs.info.textRowH)
                    .text(datum.id);
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 1.5 * vs.info.textRowH)
                    .text('State: ' + datum.state);
                if (datum.$in > 0) {
                    d3.select(this).append('text')
                        .attr('x', 0)
                        .attr('y', 2.5 * vs.info.textRowH)
                        .text('Received: ' + d3.format('$,')(datum.$in));
                }
                if (datum.$out > 0) {
                    d3.select(this).append('text')
                        .attr('x', 0)
                        .attr('y', 3.5 * vs.info.textRowH)
                        .text('Donated: ' + d3.format('$,')(datum.$out));
                }
            })
            .style('opacity', 0)
            .merge(infoTextGs);
        infoTextGs
            .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', d => +(nodeSelected && d.id === nodeSelected.id));
        TestApp('UpdateInfo');
        return that;
    };

    that.forcesObj = {
        // forceCenter: { // visual centering based on mass
        //     x: {
        //         value: 'cx',
        //     },
        //     y: {
        //         value: 'cy',
        //     },
        //     _isIsolated: true,
        // },
        forceCollide: {
            iterations: {
                value: 10, // 1
                min: 0,
                max: 10,
                step: 1,
            },
            strength: {
                value: 1, // 1
                min: 0,
                max: 1,
                step: 0.1,
            },
            radius: {
                value: (node, i, nodes) => 1.5 + node.r,
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
        //     //     value: node => node.index,
        //     // },
        //     iterations: {
        //         value: 1,
        //         min: 0,
        //         max: 10,
        //         step: 1,
        //     },
        //     // strength: {
        //     //     value: (link, i, links) => 1/Math.min(count[link.source.index],count[link.target.index]),
        //     // },
        //     distance: {
        //         value: 30, // (link, i, links) => return 30,
        //         min: 0,
        //         max: 100,
        //         step: 1,
        //     },
        // },
        // forceManyBody: {
        //     strength: {
        //         value: -30, // (node, i, nodes) => return -30,
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
        //     _isIsolated: true,
        // },
        // forceRadial: {
        //     strength: {
        //         value: 0.1, // (node, i, nodes) => return 0.1,
        //         min: 0,
        //         max: 1,
        //         step: 0.01,
        //     },
        //     radius: {
        //         value: (node, i, nodes) => node.r,
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
                value: 0.1, // (node, i, nodes) => return 0.1,
                min: 0,
                max: 1,
                step: 0.05,
            },
            x: {
                value: 'cx', // (node, i, nodes) => return node.x,
            },
            _isIsolated: true,
        },
        forceY: {
            strength: {
                value: 0.1, // (node, i, nodes) => return 0.1,
                min: 0,
                max: 1,
                step: 0.05,
            },
            y: {
                value: 'cy', // (node, i, nodes) => return node.y,
            },
            _isIsolated: true,
        },
        simulation: {
            alpha: {
                value: 1,
                min: 0,
                max: 1,
                step: 0.01,
            },
            alphaMin: {
                value: 0.4, // 0.001,
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
                value: 0.3,
                min: 0,
                max: 1,
                step: 0.1,
            },
        },
    };

    that.DragStarted = d => {
        isDragging = true;
        // if (!d3.event.active) { that.simulation.alphaTarget(0.3).restart(); }
        d.fx = d.x;
        d.fy = d.y;
        // that.Tick();
    };

    that.Dragged = d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d.x = d3.event.x;
        d.y = d3.event.y;
        d.cx = d3.event.x;
        d.cy = d3.event.y;
        that.Tick();
    };

    that.DragEnded = d => {
        isDragging = false;
        // if (!d3.event.active) { that.simulation.alphaTarget(0); }
        d.fx = null;
        d.fy = null;
        if (!d3.event.active) {
            that.simulation
                .alpha(1).restart();
        }
    };

    that.UpdateVerticesEdges = () => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateVerticesEdges = function() {", "color:blue");
        let iCount = 0;
        verticeCircles = verticesG.selectAll('circle.vertice-circle')
            .data(that.vertices());
        verticeCircles = verticeCircles.enter().append('circle')
            .each((d, i) => {
                d.x = that.centroidByState[d.state][0];
                d.y = that.centroidByState[d.state][1];
                if (topIds.includes(d.id)) {
                    d.i = iCount;
                    iCount += 1;
                }
            })
            .classed('vertice-circle', true)
            .on('mouseover', d => {
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
            .on('mouseout', () => {
                if (isDragging) { return; }
                nodeSelected = null;
                linksSelected = [];
                that
                    .UpdateVerticesEdges();
                that
                    .UpdateInfo();
            }).call(d3.drag()
                .on('start', that.DragStarted)
                .on('drag', that.Dragged)
                .on('end', that.DragEnded))
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .merge(verticeCircles);
        verticeCircles
            .each(d => {
                let $in = that.$verticeScale(d.$in);
                let $out = that.$verticeScale(d.$out);
                if ($in > $out) {
                    d.r = Math.max(vs.vertices.rMin, vs.vertices.rFactor * Math.sqrt($in));
                } else {
                    d.r = Math.max(vs.vertices.rMin, vs.vertices.rFactor * Math.sqrt($out));
                }
            })
            .style('stroke-width', vs.vertices.strokeWidth + 'px')
            .style('fill', d => {
                if (topIds.includes(d.id)) {
                    return d3.schemeCategory20[d.i];
                } else if (d.$out > 0) {
                    return 'gainsboro';
                } else {
                    return 'white';
                }
            })
            .style('stroke', 'gray')
            .attr('r', d => d.r)
            // .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', d => {
                if (!nodeSelected) {
                    return 1;
                } else if (nodeSelected.id === d.id) {
                    return 1;
                } else if (linksSelected.map(d => d.source.id).includes(d.id)) {
                    return 1;
                } else if (linksSelected.map(d => d.target.id).includes(d.id)) {
                    return 1;
                } else {
                    return 0.05;
                }
            });
        edgeLines = edgesG.selectAll('line.edge-line')
            .data(that.edges());
        edgeLines = edgeLines.enter().append('line')
            .classed('edge-line', true)
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .merge(edgeLines);
        edgeLines
            .style('stroke-width', vs.edges.strokeWidth + 'px')
            .style('stroke', d => {
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
            // .transition().duration(transitionDuration).ease(transitionEase)
            .style('display', d => {
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

    that.IsolateForce = (force, filter) => {
        let initialize = force.initialize;
        force.initialize = () => {
            console.log(''.padStart(2 * stackLevel) + "%cforce.initialize = function() {", "color:blue");
            initialize.call(force, that.vertices().filter(filter));
        };
        return force;
    };

    that.UpdateSimulation = () => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateSimulation = function() {", "color:blue");
        Object.keys(that.forcesObj).forEach(forceType => {
            if (forceType === 'simulation') { return; }
            let optionsObj = that.forcesObj[forceType];
            if (optionsObj['_isIsolated'] === true) {
                Object.keys(that.$outState).forEach(state => {
                    let cx = that.centroidByState[state][0];
                    let cy = that.centroidByState[state][1];
                    let forceNew = that.IsolateForce(d3[forceType](), d => d.state === state);
                    Object.keys(optionsObj).forEach(optionName => {
                        if (optionName[0] === '_') { return; }
                        let optionValue = optionsObj[optionName].value; // do not mutate original value
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
                let forceNew = d3[forceType]();
                Object.keys(optionsObj).forEach(optionName => {
                    if (optionName[0] === '_') { return; }
                    let optionValue = optionsObj[optionName].value; // do not mutate original value
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
        Object.keys(that.forcesObj.simulation).forEach(optionName => {
            that.simulation[optionName](that.forcesObj.simulation[optionName].value);
        });
        that.simulation
            .alpha(1)
            .restart();
        that.optionsData = [];
        Object.keys(that.forcesObj).forEach(forceType => {
            let optionsObj = that.forcesObj[forceType];
            Object.keys(optionsObj).forEach(optionName => {
                if (optionName[0] === '_') { return; }
                optionsObj[optionName]._category = forceType;
                optionsObj[optionName]._name = optionName;
                that.optionsData.push(optionsObj[optionName]);
            });
        });
        TestApp('UpdateSimulation');
        return that;
    };

    that.UpdateFilters = () => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateFilters = function() {", "color:blue");
        filtersDiv
            .style('width', vs.filters.w + 'px')
            .style('height', vs.filters.h + 'px')
            .style('left', '0px')
            .style('top', (vs.states.h) + 'px');
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

    that.UpdateOptions = () => {
        console.log(''.padStart(2 * stackLevel) + "%cthat.UpdateOptions = function() {", "color:blue");
        optionsDiv
            .style('left', '0px')
            .style('top', Math.max(vs.svg.h, vs.states.h + vs.filters.h) + 'px');
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
                if (datum._category === 'simulation' && datum._name === 'alpha') {
                    optionsAlphaLabel = d3.select(this).selectAll('label.option-value');
                    optionsAlphaSlider = d3.select(this).selectAll('input[type="range"]');
                }
            })
            .merge(optionRows)
            .each(function(datum) {
                d3.select(this).selectAll('label.option-value')
                    .text(() => typeof(datum.value) === 'function' ? 'function' : datum.value);
                d3.select(this).selectAll('label.label-small')
                    .style('width', vs.options.wSmall + 'px');
                d3.select(this).selectAll('label.label-medium')
                    .style('width', vs.options.wMedium + 'px');
                d3.select(this).selectAll('input[type=\'Range\']')
                    .style('width', vs.options.wSlider + 'px');
                d3.select(this).selectAll('*')
                    .style('height', vs.options.hRow + 'px')
                    .style('line-height', vs.options.hRow + 'px');
            })
            .style('width', vs.options.wRow + 'px');
        TestApp('UpdateOptions');
        return that;
    };

    that.Tick = () => {
        verticeCircles
            // .interrupt('vertices-transition')
            // .transition('vertices-transition')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        edgeLines
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
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
    let clientWidth = body.node().clientWidth;
    if (clientWidth >= vs.states.wMin + vs.info.w) {
        vs.states.w = clientWidth - vs.info.w;
        vs.svg.w = clientWidth;
    } else {
        vs.states.w = vs.states.wMin;
        vs.svg.w = vs.states.wMin + vs.info.w;
    }
    vs.filters.w = vs.states.w;
    vs.states.h = vs.states.w / vs.states.ratioMapWH;
    vs.svg.h = Math.max(vs.states.h, vs.info.h);
    hybridMapObj
        .UpdateSVG()
        .UpdateStates()
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
    colorSource = 'color:black';
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