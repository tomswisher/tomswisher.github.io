// tomswisherlabs@gmail.com     https://github.com/tomswisher

'use strict'; /* globals d3, console, nodes, count */ /* jshint -W069, unused:false */

// Performance -------------------------------------------------------------------------------------

let logsTest = 'in',
    logsLvl1 = false,
    logsLvl2 = false;
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
let mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    mobileBrowser = navigator && mobileUserAgents.test(navigator.userAgent);
if (mobileBrowser) console.log('mobileBrowser', mobileBrowser);
let isLoaded = false;

// D3 Selections -----------------------------------------------------------------------------------

const body = d3.select('body');
const svg = body.select('#svg');
const svgDefs = body.select('#svg-defs');
let svgDefsArrowheads = svgDefs.selectAll('marker.arrowhead');
const bgRect = body.select('#bg-rect');
const clipPathRect = body.select('#clip-path-rect');
const statesG = body.select('#states-g');
let statePaths = statesG.select(null);
const nodesG = body.select('#nodes-g');
let nodeCircles = nodesG.select(null);
const linksG = body.select('#links-g');
let linkLines = linksG.select(null);
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
    map: {
        w: null,
        wMin: 300,
        h: null,
        ratioMapWH: 1.6,
        projectionScale: 1.2,
        selectedOpacity: 0.3,
        strokeWidthStates: 1,
    },
    network: {
        rMin: 4,
        rFactor: 60,
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
let mapObj = null;
let isDragging = false;
let yearsData = ['2011', '2012', '2013', '2014', '2015', '2016', '2017'];
let reportsData = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Window Events -----------------------------------------------------------------------------------

window.onload = () => {
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
            UpdateVSValues();
            mapObj
                .DrawMap()
                .DrawNetwork()
                .DrawInfo()
                .DrawFilters()
                .UpdateSimulation()
                .DrawOptions();
        }
    }, resizeWait);
};

// Functions ---------------------------------------------------------------------------------------

function UpdateVSValues() {
    TestApp('UpdateVSValues', 1);
    let clientWidth = body.node().clientWidth;
    if (clientWidth >= vs.map.wMin + vs.info.w) {
        vs.map.w = clientWidth - vs.info.w;
        vs.svg.w = clientWidth;
    } else {
        vs.map.w = vs.map.wMin;
        vs.svg.w = vs.map.wMin + vs.info.w;
    }
    vs.filters.w = vs.map.w;
    vs.map.h = vs.map.w / vs.map.ratioMapWH;
    vs.svg.h = Math.max(vs.map.h, vs.info.h);
    TestApp('UpdateVSValues', -1);
}

const InitializePage = (error, results) => {
    TestApp('InitializePage', 1);
    UpdateVSValues();
    mapObj = (new HybridMapClass())
        .LoadStates(results[0].features)
        .DrawMap()
        .LoadNodes(results[1].nodes)
        .LoadLinks(results[1].links)
        .CalculateData()
        .DrawNetwork()
        .DrawInfo()
        .UpdateSimulation()
        .DrawOptions();
    requestAnimationFrame(() => {
        body
            .classed('loading', false);
        isLoaded = true;
    });
    TestApp('InitializePage', -1);
};

function HybridMapClass() {
    TestApp('HybridMapClass', 1);
    let that = this;
    that.filteredOutObj = { year: {}, report: {} };
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
    that.$total = 0;
    that.$inByState = {};
    that.$outByState = {};
    that.$inById = {};
    that.$outById = {};
    that.$nodeScale = d3.scaleLinear().range([0, 1]);
    that.nodeById = {};
    that.projection = d3.geoAlbersUsa();
    that.path = d3.geoPath();

    that.LoadStates = d => {
        TestApp('UpdateStates', 1);
        that.statesLoaded = d;
        that.states = that.statesLoaded;
        that.filteredOutObj = { year: {}, report: {} };
        that
            .DrawFilters();
        TestApp('UpdateStates', -1);
        return that;
    };

    that.LoadNodes = d => {
        TestApp('LoadNodes', 1);
        that.nodesLoaded = d;
        that.filteredOutObj = { year: {}, report: {} };
        that
            .DrawFilters();
        TestApp('LoadNodes', -1);
        return that;
    };

    that.LoadLinks = d => {
        TestApp('LoadLinks', 1);
        that.linksLoaded = d;
        that.$total = 0;
        that.linksLoaded.forEach(d => {
            d.sourceId = d.source;
            d.targetId = d.target;
            that.$total += d.dollars;
        });
        that.$nodeScale
            .domain([0, that.$total]);
        that.filteredOutObj = { year: {}, report: {} };
        that
            .DrawFilters();
        TestApp('LoadLinks', -1);
        return that;
    };

    that.CalculateData = () => {
        TestApp('CalculateData', 1);
        that.states = that.statesLoaded;
        let iCount = 0;
        that.nodes = that.nodesLoaded;
        that.nodes.forEach((d, i) => {
            that.$outById[d.id] = 0;
            that.$inById[d.id] = 0;
            that.$outByState[d.state] = 0;
            that.$inByState[d.state] = 0;
            if (topIds.includes(d.id)) {
                d.i = iCount;
                iCount += 1;
            }
            d.x = d.x === undefined ? that.centroidByState[d.state][0] : d.x;
            d.y = d.y === undefined ? that.centroidByState[d.state][1] : d.y;
        });
        that.nodeById = d3.map(that.nodes, d => d.id);
        that.links = that.linksLoaded.filter(function(d) {
            if (that.filteredOutObj.year[d.year]) { return false; }
            if (that.filteredOutObj.report[d.report]) { return false; }
            return true;
        });
        that.links.forEach(d => {
            d.source = that.nodeById.get(d.sourceId);
            d.target = that.nodeById.get(d.targetId);
            that.$outById[d.source.id] += d.dollars;
            that.$inById[d.target.id] += d.dollars;
            that.$outByState[d.source.state] += d.dollars;
            that.$inByState[d.target.state] += d.dollars;
        });
        that.nodes.forEach(d => {
            let $in = that.$nodeScale(that.$inById[d.id]);
            let $out = that.$nodeScale(that.$outById[d.id]);
            if ($in === 0 && $out === 0) {
                d.r = 0;
            } else if ($in > $out) {
                d.r = Math.max(vs.network.rMin, vs.network.rFactor * Math.sqrt($in));
            } else {
                d.r = Math.max(vs.network.rMin, vs.network.rFactor * Math.sqrt($out));
            }
        });
        TestApp('CalculateData', -1);
        return that;
    };

    that.DrawMap = () => {
        TestApp('DrawMap', 1);
        svg
            .attr('width', vs.svg.w)
            .attr('height', vs.svg.h);
        bgRect
            .attr('width', vs.map.w)
            .attr('height', vs.map.h);
        clipPathRect
            .attr('width', vs.map.w)
            .attr('height', vs.svg.h);
        that.projection
            .scale(vs.map.w * vs.map.projectionScale)
            .translate([vs.map.w / 2, vs.map.h / 2]);
        that.path
            .projection(that.projection);
        statePaths = statesG.selectAll('path.state-path')
            .data(that.states, d => d.properties.ansi);
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true).classed('inactive', true)
            .merge(statePaths);
        statePaths
            .attr('d', that.path)
            .each(d => that.centroidByState[d.properties.ansi] = that.path.centroid(d))
            .style('stroke-width', vs.map.strokeWidthStates + 'px');
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
        TestApp('DrawMap', -1);
        return that;
    };

    that.DrawInfo = () => {
        TestApp('DrawInfo', 1);
        infoG
            .attr('transform', 'translate(' + (vs.map.w + vs.info.margin) + ',' + (vs.info.margin) + ')');
        infoImageGs = infoG.selectAll('g.info-image-g')
            .data(that.infoData);
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
            .style('opacity', d => +(that.nodeSelected && d.id === that.nodeSelected.id));
        infoTextGs = infoG.selectAll('g.info-text-g')
            .data(that.infoData);
        infoTextGs = infoTextGs.enter().append('g')
            .classed('info-text-g', true)
            .attr('transform', 'translate(' + (vs.info.wImage / 2) + ',' + (vs.info.hImage + vs.info.margin) + ')')
            .style('opacity', 0)
            .merge(infoTextGs);
        infoTextGs
            .selectAll('text').remove();
        infoTextGs
            .each(function(datum) {
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 0.5 * vs.info.textRowH)
                    .text(datum.id);
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 1.5 * vs.info.textRowH)
                    .text('State: ' + datum.state);
                // if (that.$inById[datum.id] > 0) {
                    d3.select(this).append('text')
                        .attr('x', 0)
                        .attr('y', 2.5 * vs.info.textRowH)
                        .text('Received: ' + d3.format('$,')(that.$inById[datum.id]));
                // }
                // if (that.$outById[datum.id] > 0) {
                    d3.select(this).append('text')
                        .attr('x', 0)
                        .attr('y', 3.5 * vs.info.textRowH)
                        .text('Donated: ' + d3.format('$,')(that.$outById[datum.id]));
                // }
                // d3.select(this).append('text')
                //     .attr('x', 0)
                //     .attr('y', 4.5 * vs.info.textRowH)
                //     .text(() => {
                //         let yearsArray = yearsData.filter(d => !(that.filteredOutObj.year[d]));
                //         if (yearsArray.length === 0) {
                //             return 'Years: None';
                //         } else {
                //             return 'Years: [' + yearsArray + ']';
                //         }
                //     });
            })
            .transition().duration(transitionDuration).ease(transitionEase)
            .style('opacity', d => +(that.nodeSelected && d.id === that.nodeSelected.id));
        TestApp('DrawInfo', -1);
        return that;
    };

    that.optionsDataMaster = [{
            _category: 'forceCenter',
            _isDisabled: true,
            x: {
                _name: 'x',
                _category: 'forceCenter',
                value: body.node().clientWidth / 2,
            },
            y: {
                _name: 'y',
                _category: 'forceCenter',
                value: body.node().clientHeight / 2,
            },
        },
        {
            _category: 'forceCollide',
            // _isDisabled: true,
            iterations: {
                _name: 'iterations',
                _category: 'forceCollide',
                value: 10, // 1
                min: 0,
                max: 10,
                step: 1,
            },
            strength: {
                _name: 'strength',
                _category: 'forceCollide',
                value: 1, // 1
                min: 0,
                max: 1,
                step: 0.01,
            },
            radius: {
                _name: 'radius',
                _category: 'forceCollide',
                value: (node, i, nodes) => node.r ? 1.5 + node.r : 0,
            },
        },
        {
            _category: 'forceLink',
            _isDisabled: true,
            links: {
                _name: 'links',
                _category: 'forceLink',
                value: [],
            },
            id: {
                _name: 'id',
                _category: 'forceLink',
                value: node => node.index,
            },
            iterations: {
                _name: 'iterations',
                _category: 'forceLink',
                value: 1,
                min: 0,
                max: 10,
                step: 1,
            },
            strength: {
                _name: 'strength',
                _category: 'forceLink',
                value: (link, i, links) => 1 / Math.min(count[link.source.index], count[link.target.index]),
            },
            distance: {
                _name: 'distance',
                _category: 'forceLink',
                value: 30, // (link, i, links) => return 30,
                min: 0,
                max: 100,
                step: 1,
            },
        },
        {
            _category: 'forceManyBody',
            _isDisabled: true,
            _isIsolated: true,
            strength: {
                _name: 'strength',
                _category: 'forceManyBody',
                value: -30, // (node, i, nodes) => return -30,
                min: -100,
                max: 0,
                step: 1,
            },
            distanceMin: {
                _name: 'distanceMin',
                _category: 'forceManyBody',
                value: 1,
                min: 0,
                max: 10000,
                step: 1,
            },
            distanceMax: {
                _name: 'distanceMax',
                _category: 'forceManyBody',
                value: 100, // Infinity
                min: 0,
                max: 200,
                step: 1,
            },
            theta: {
                _name: 'theta',
                _category: 'forceManyBody',
                value: 0.81,
                min: 0,
                max: 1,
                step: 0.1,
            },
        },
        {
            _category: 'forceRadial',
            _isDisabled: true,
            strength: {
                _name: 'strength',
                _category: 'forceRadial',
                value: 0.1, // (node, i, nodes) => return 0.1,
                min: 0,
                max: 1,
                step: 0.01,
            },
            radius: {
                _name: 'radius',
                _category: 'forceRadial',
                value: (node, i, nodes) => node.r,
            },
            x: {
                _name: 'x',
                _category: 'forceRadial',
                value: 'cx',
            },
            y: {
                _name: 'y',
                _category: 'forceRadial',
                value: 'cy',
            },
        },
        {
            _category: 'forceX',
            _isDisabled: false,
            _isIsolated: true,
            strength: {
                _name: 'strength',
                _category: 'forceX',
                value: 0.1, // (node, i, nodes) => return 0.1,
                min: 0,
                max: 1,
                step: 0.05,
            },
            x: {
                _name: 'x',
                _category: 'forceX',
                value: 'cx', // (node, i, nodes) => return node.x,
            },
        },
        {
            _category: 'forceY',
            // _isDisabled: true,
            _isIsolated: true,
            strength: {
                _name: 'strength',
                _category: 'forceY',
                value: 0.1, // (node, i, nodes) => return 0.1,
                min: 0,
                max: 1,
                step: 0.05,
            },
            y: {
                _name: 'y',
                _category: 'forceY',
                value: 'cy', // (node, i, nodes) => return node.y,
            },
        },
        {
            _category: 'simulation',
            alpha: {
                _name: 'alpha',
                _category: 'simulation',
                value: 1,
                min: 0,
                max: 1,
                step: 0.01,
            },
            alphaMin: {
                _name: 'alphaMin',
                _category: 'simulation',
                value: 0.4, // 0.001,
                min: 0,
                max: 1,
                step: 0.05,
            },
            alphaDecay: {
                _name: 'alphaDecay',
                _category: 'simulation',
                value: 0.02276277904418933,
                min: 0.01,
                max: 0.2,
                step: 0.01,
            },
            alphaTarget: {
                _name: 'alphaTarget',
                _category: 'simulation',
                value: 0,
                min: 0,
                max: 0.19,
                step: 0.01,
            },
            velocityDecay: {
                _name: 'velocityDecay',
                _category: 'simulation',
                value: 0.3,
                min: 0,
                max: 1,
                step: 0.1,
            },
        }
    ];
    that.optionRowDatumAlpha = {};

    that.UpdateSimulation = () => {
        TestApp('UpdateSimulation', 1);
        if (that.simulation === undefined) {
            that.simulation = d3.forceSimulation()
                .on('tick', that.Tick);
        }
        that.simulation
            .nodes(that.nodes)
            .stop();
        that.optionsData = that.optionsDataMaster;
        that.optionRowsData = [];
        that.optionsDataMaster.forEach(optionsObj => {
            if (optionsObj._isDisabled) {
                return;
            }
            Object.keys(optionsObj).forEach(optionName => {
                if (optionName[0] === '_') {
                    return;
                }
                if (optionName === 'alpha') {
                    that.optionRowDatumAlpha = optionsObj[optionName];
                }
                that.optionRowsData.push(optionsObj[optionName]);
            });
        });
        that.optionsDataMaster.forEach(optionsObj => {
            if (optionsObj._isDisabled) {
                return;
            } else if (optionsObj._category === 'simulation') {
                Object.keys(optionsObj).forEach(optionName => {
                    if (optionName[0] === '_') {
                        return;
                    }
                    that.simulation[optionName](optionsObj[optionName].value);
                });
            } else if (optionsObj._isIsolated === true) {
                Object.keys(that.$outByState).forEach(state => {
                    let cx = that.centroidByState[state][0];
                    let cy = that.centroidByState[state][1];
                    let forceNew = d3[optionsObj._category]();
                    let initialize = forceNew.initialize;
                    forceNew.initialize = () => {
                        initialize.call(forceNew, that.nodes.filter(d => d.state === state));
                    };
                    Object.keys(optionsObj).forEach(optionName => {
                        if (optionName[0] === '_') {
                            return;
                        } else {
                            let optionValue = optionsObj[optionName].value; // do not mutate original
                            switch (optionValue) {
                                case 'cx':
                                    optionValue = cx;
                                    break;
                                case 'cy':
                                    optionValue = cy;
                                    break;
                            }
                            forceNew[optionName](optionValue);
                        }
                    });
                    that.simulation
                        .force(optionsObj._category + state, forceNew)
                        .stop();
                });
            } else {
                let forceNew = d3[optionsObj._category]();
                Object.keys(optionsObj).forEach(optionName => {
                    if (optionName[0] === '_') { return; }
                    let optionValue = optionsObj[optionName].value; // do not mutate original
                    switch (optionValue) {
                        case 'cx':
                            optionValue = 0.5 * vs.map.w;
                            break;
                        case 'cy':
                            optionValue = 0.5 * vs.map.h;
                            break;
                    }
                    forceNew[optionName](optionValue);
                });
                that.simulation
                    .force(optionsObj._category, forceNew)
                    .stop();
            }
        });
        that.simulation
            .stop()
            .alpha(1)
            .restart();
        TestApp('UpdateSimulation', -1);
        return that;
    };


    that.DragStarted = d => {
        // TestApp('DragStarted', 1);
        isDragging = true;
        // if (!d3.event.active) { that.simulation.alphaTarget(0.3).restart(); }
        d.fx = d.x;
        d.fy = d.y;
        // that.Tick();
        // TestApp('DragStarted', -1);
    };

    that.Dragged = d => {
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

    that.DragEnded = d => {
        // TestApp('DragEnded', 1);
        isDragging = false;
        // if (!d3.event.active) { that.simulation.alphaTarget(0); }
        d.fx = null;
        d.fy = null;
        if (!d3.event.active) {
            that.simulation
                .alpha(1).restart();
        }
        // TestApp('DragEnded', -1);
    };

    that.DrawNetwork = () => {
        TestApp('DrawNetwork', 1);
        nodeCircles = nodesG.selectAll('circle.node-circle')
            .data(that.nodes);
        nodeCircles = nodeCircles.enter().append('circle')
            .classed('node-circle', true)
            .on('mouseover', d => {
                if (isDragging) { return; }
                that.nodeSelected = d;
                that.linksSelected = that.links.filter(d => {
                    return that.nodeSelected.id === d.source.id || that.nodeSelected.id === d.target.id;
                });
                if (!that.infoData.includes(that.nodeSelected)) {
                    that.infoData.push(that.nodeSelected);
                }
                that
                    .DrawNetwork()
                    .DrawInfo();
            })
            .on('mouseout', () => {
                if (isDragging) { return; }
                that.nodeSelected = null;
                that.linksSelected = [];
                that
                    .DrawNetwork()
                    .DrawInfo();
            })
            .call(d3.drag()
                .on('start', that.DragStarted)
                .on('drag', that.Dragged)
                .on('end', that.DragEnded)
            )
            .merge(nodeCircles);
        nodeCircles
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .style('stroke-width', vs.network.strokeWidth + 'px')
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
                if (!that.nodeSelected) {
                    return 1;
                } else if (that.nodeSelected.id === d.id) {
                    return 1;
                } else if (that.linksSelected.map(d => d.source.id).includes(d.id)) {
                    return 1;
                } else if (that.linksSelected.map(d => d.target.id).includes(d.id)) {
                    return 1;
                } else {
                    return 0.05;
                }
            });
        svgDefsArrowheads = svgDefs.selectAll('marker.arrowhead')
            .data(topIds.concat('misc'));
        svgDefsArrowheads = svgDefsArrowheads.enter().append('marker')
            .classed('arrowhead', true)
            .attr('id', (d, i) => 'arrowhead-id' + i)
            .each(function(datum, i) {
                d3.select(this).selectAll('path')
                    .data([null]).enter().append('path')
                    .attr('d', 'M 0 0 12 6 0 12 3 6 Z')
                    .style('stroke', () => (i < topIds.length) ? d3.schemeCategory20[i] : 'gray')
                    .style('fill', () => (i < topIds.length) ? d3.schemeCategory20[i] : 'gainsboro');
            })
            .merge(svgDefsArrowheads);
        svgDefsArrowheads
            .attr('refX', 12)
            .attr('refY', 6)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('markerWidth', 112)
            .attr('markerHeight', 118)
            .attr('orient', 'auto');
        linkLines = linksG.selectAll('line.link-line')
            .data(that.links);
        linkLines.exit()
            .remove();
        linkLines = linkLines.enter().append('line')
            .classed('link-line', true)
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .merge(linkLines);
        linkLines
            .attr('marker-end', d => {
                if (topIds.includes(d.source.id)) {
                    return 'url(#arrowhead-id' + d.source.i + ')';
                } else {
                    return 'url(#arrowhead-id' + topIds.length + ')';
                }
            })
            .style('stroke-width', vs.network.strokeWidth + 'px')
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

    that.DrawFilters = () => {
        TestApp('DrawFilters', 1);
        filtersDiv
            .style('width', vs.filters.w + 'px')
            .style('height', vs.filters.h + 'px')
            .style('left', '0px')
            .style('top', (vs.map.h) + 'px');
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
                    })
                    .on('change', function(d) {
                        that.filteredOutObj.year[d] = !this.checked;
                        that
                            .CalculateData()
                            .DrawNetwork()
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
                    })
                    .on('change', function(d) {
                        that.filteredOutObj.report[d] = !this.checked;
                        that
                            .CalculateData()
                            .DrawNetwork()
                            .UpdateSimulation();
                    });
            })
            .merge(filtersReports)
            .style('width', (vs.filters.w / reportsData.length) + 'px')
            .style('height', (0.5 * vs.filters.h) + 'px');
        TestApp('DrawFilters', -1);
        return that;
    };

    that.DrawOptions = () => {
        TestApp('DrawOptions', 1);
        optionsDiv
            .style('left', '0px')
            .style('top', Math.max(vs.svg.h, vs.map.h + vs.filters.h) + 'px');
        optionRows = optionsDiv.selectAll('div.option-row')
            .data(that.optionRowsData);
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
                            that
                                .UpdateSimulation()
                                .DrawOptions();
                        });
                }
                if (datum.max !== undefined) {
                    d3.select(this).append('label')
                        .classed('label-small', true)
                        .text(datum.max);
                }
                if (datum._name === 'alpha') {
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
        TestApp('DrawOptions', -1);
        return that;
    };

    that.Tick = () => {
        // TestApp('Tick', 1);
        nodeCircles
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        linkLines
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        that.optionRowDatumAlpha.value = parseFloat(that.simulation.alpha()).toFixed(8);
        optionsAlphaLabel
            .text(that.optionRowDatumAlpha.value);
        optionsAlphaSlider
            .property('value', that.optionRowDatumAlpha.value);
        // TestApp('Tick', -1);
    };

    TestApp('HybridMapClass', -1);
    return that;
}

function TestApp(source, position) {
    if (!logsTest || !performance || !performance.memory) { return; }
    if (position === 1) {
        stackLevel += 1;
        stackLevelTemp = stackLevel;
        stringSymbol = '> ';
        if (logsTest === 'out') { return; }
    } else if (position === -1) {
        stackLevelTemp = stackLevel;
        stackLevel -= 1;
        stringSymbol = '< ';
        if (logsTest === 'in') { return; }
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