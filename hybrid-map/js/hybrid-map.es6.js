// tomswisherlabs@gmail.com     https://github.com/tomswisher

'use strict'; /* globals d3, console, nodes, count */ /* jshint -W069, unused:false */

// Selections --------------------------------------------------------------------------------------

const body = d3.select('body');
const svg = body.select('#svg');
const svgDefs = body.select('#svg-defs');
let svgDefsArrows = svgDefs.select(null);
const bgRect = body.select('#bg-rect');
const clipPathRect = body.select('#clip-path-rect');
const statePathsG = body.select('#state-paths-g');
let statePaths = statePathsG.select(null);
const nodesG = body.select('#nodes-g');
let nodeCircles = nodesG.select(null);
const linksG = body.select('#links-g');
let linkLines = linksG.select(null);
const infoG = body.select('#info-g');
const infoBGRect = body.select('#info-bg-rect');
let infoImageGs = infoG.select(null);
let infoTextGs = infoG.select(null);
const filtersDiv = body.select('#filters-div');
let filterGroups = filtersDiv.select(null);
const optionsDiv = body.select('#options-div');
let optionGroups = optionsDiv.select(null);
let optionsAlphaLabel = optionsDiv.select(null);
let optionsAlphaSlider = optionsDiv.select(null);
const debugDiv = body.select('#debug-div');

// Variables ---------------------------------------------------------------------------------------

let mapObj = null;
let isLoaded = false;
let isDragging = false;
const mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    mobileBrowser = navigator && mobileUserAgents.test(navigator.userAgent);
if (mobileBrowser) console.log('mobile browser detected: ' + navigator.userAgent);
let topIds = [
    'Alice Walton', 'Carrie Walton Penner', 'Jim Walton', 'Dorris Fisher', 'Eli Broad',
    'Greg Penner', 'Jonathan Sackler', 'Laurene Powell Jobs', 'Michael Bloomberg',
    'Reed Hastings', 'Stacy Schusterman', 'John Arnold', 'Laura Arnold'
];
let logsTest = 'in',
    logsLvl1 = false;
const resizeWait = 150;
let resizeCounter = 0;
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
let rData = [
    {
        category: 'svg',
        rows: [
            {
                name: 'w',
            }, {
                name: 'h',
            }
        ],
    }, {
        category: 'map',
        rows: [
            {
                name: 'w',
            }, {
                name: 'h',
            }, {
                name: 'wMin',
            }, {
                name: 'whRatioMap',
                value: 1.5,
            }, {
                name: 'projectionScale',
                value: 1.2,
            }, {
                name: 'mode',
                value: 'states',
                inputType: 'select',
            }
        ],
    }, {
        category: 'network',
        rows: [
            {
                name: 'rMin',
                value: 3,
                inputType: 'range',
            }, {
                name: 'rFactor',
                value: 75,
                inputType: 'range',
            }, {
                name: 'swMin',
                value: 1,
                inputType: 'range',
            }, {
                name: 'swFactor',
                value: 250,
                inputType: 'range',
            }, {
                name: 'arrowScale',
                value: 0.25,
                min: 0.05,
                max: 2,
                step: 0.05,
                inputType: 'range',
            }, {
                name: 'fillGeneral',
                value: 'gray',
            }, {
                name: 'strokeGeneral',
                value: 'gray',
            }
        ],
    }, {
        category: 'info',
        rows: [
            {
                name: 'w',
                value: 0.5 * 396,
            }, {
                name: 'h',
            }, {
                name: 'wImage',
            }, {
                name: 'hImage',
            }, {
                name: 'whRatioImage',
                value: 396 / 432,
            }, {
                name: 'margin',
                value: 10,
            }, {
                name: 'textRowH',
                value: 15,
                inputType: 'range',
            }
        ],
    }, {
        category: 'filters',
        rows: [
            {
                name: 'w',
            }, {
                name: 'h',
                value: 70,
            }, {
                name: 'wBox',
                value: 40,
            }
        ],
    }, {
        category: 'options',
        rows: [
            {
                name: 'w',
            }, {
                name: 'wSmall',
                value: 58,
            }, {
                name: 'wMedium',
                value: 115,
            }, {
                name: 'wInput',
                value: 100,
            }, {
                name: 'wGroup',
            }, {
                name: 'hRow',
                value: 20,
            }
        ],
    }, {
        category: 'transition',
        rows: [
            {
                name: 'duration',
                value: 200,
                // inputType: 'range',
            }, {
                name: 'ease',
                value: d3.easeLinear,
            }
        ],
    }, {
        category: 'forceCenter',
        isDisabled: true,
        isIsolated: false,
        rows: [
            {
                name: 'x',
                value: 'cx',
            }, {
                name: 'y',
                value: 'cy',
            }
        ],
    }, {
        category: 'forceCollide',
        isDisabled: false,
        isIsolated: false,
        rows: [
            {
                name: 'iterations',
                inputType: 'range',
                value: 5,
                min: 0,
                max: 10,
                step: 1,
                _default: 1,
            }, {
                name: 'strength',
                inputType: 'range',
                value: 1,
                min: 0,
                max: 1,
                step: 0.01,
                _default: 1,
            }, {
                name: 'radius',
                value: (node, i, nodes) => node.r ? 3 + node.r : 0,
            }
        ],
    }, {
        category: 'forceLink',
        isDisabled: true,
        isIsolated: false,
        rows: [
            {
                name: 'links',
                value: [],
                _default: [],
            }, {
                name: 'id',
                value: node => node.index,

            }, {
                name: 'iterations',
                inputType: 'range',
                value: 1,
                min: 0,
                max: 10,
                step: 1,
                _default: 1,
            }, {
                name: 'strength',
                inputType: 'range',
                value: 0.5,
                min: 0,
                max: 1,
                step: 0.01,
                _default: (link, i, links) => 1 / Math.min(count[link.source.index], count[link.target.index]),
            }, {
                name: 'distance',
                inputType: 'range',
                value: 30,
                min: 0,
                max: 100,
                step: 1,
                _default: (link, i, links) => 30,
            }
        ],
    }, {
        category: 'forceManyBody',
        isDisabled: true,
        isIsolated: false,
        rows: [
            {
                name: 'strength',
                inputType: 'range',
                value: -30,
                min: -100,
                max: 0,
                step: 1,
                _default: (node, i, nodes) => -30,
            }, {
                name: 'distanceMin',
                inputType: 'range',
                value: 1,
                min: 0,
                max: 10000,
                step: 1,
            }, {
                name: 'distanceMax',
                inputType: 'range',
                value: 100,
                min: 0,
                max: 200,
                step: 1,
                _default: Infinity,
            }, {
                name: 'theta',
                inputType: 'range',
                value: 0.81,
                min: 0,
                max: 1,
                step: 0.1,
            }
        ],
    }, {
        category: 'forceRadial',
        isDisabled: true,
        isIsolated: false,
        rows: [
            {
                name: 'strength',
                inputType: 'range',
                value: 0.1,
                min: 0,
                max: 1,
                step: 0.01,
                _default: (node, i, nodes) => 0.1,
            }, {
                name: 'radius',
                value: (node, i, nodes) => node.r,
            }, {
                name: 'x',
                value: 'cx',
            }, {
                name: 'y',
                value: 'cy',
            }
        ],
    }, {
        category: 'forceX',
        isDisabled: false,
        isIsolated: true,
        rows: [
            {
                name: 'strength',
                inputType: 'range',
                value: 0.1,
                min: 0,
                max: 1,
                step: 0.05,
                _default: (node, i, nodes) => 0.1,
            }, {
                name: 'x',
                value: 'cx',
                _default: (node, i, nodes) => node.x,
            }
        ],
    }, {
        category: 'forceY',
        isDisabled: false,
        isIsolated: true,
        rows: [
            {
                name: 'strength',
                inputType: 'range',
                value: 0.1,
                min: 0,
                max: 1,
                step: 0.05,
                _default: (node, i, nodes) => 0.1,
            }, {
                name: 'y',
                value: 'cy',
                _default: (node, i, nodes) => node.y,
            }
        ],
    }, {
        category: 'simulation',
        isDisabled: false,
        rows: [
            {
                name: 'alpha',
                inputType: 'range',
                value: 1,
                min: 0,
                max: 1,
                step: 0.01,
            }, {
                name: 'alphaMin',
                inputType: 'range',
                value: 0.35,
                min: 0,
                max: 1,
                step: 0.05,
                _default: 0.001,
            }, {
                name: 'alphaDecay',
                inputType: 'range',
                value: 0.02276277904418933,
                min: 0.01,
                max: 0.2,
                step: 0.01,
            }, {
                name: 'alphaTarget',
                inputType: 'range',
                value: 0,
                min: 0,
                max: 0.19,
                step: 0.01,
            }, {
                name: 'velocityDecay',
                inputType: 'range',
                value: 0.3,
                min: 0,
                max: 1,
                step: 0.1,
            }
        ],
    }
];
rData = rData.filter(d => !(d.isDisabled));
const r = {};
rData.forEach(optionsObj => {
    r[optionsObj.category] = {};
    optionsObj.rows.forEach(row => {
        row.valueDefault = row.value;
        r[optionsObj.category][row.name] = row.value;
        if (row.inputType === 'range') {
            row.min = (row.min !== undefined) ? row.min : 0;
            row.max = (row.max !== undefined) ? row.max : 5 * row.value;
            row.step = 5 * row.value / 100;
        }
    });
});

// Window Events -----------------------------------------------------------------------------------

window.onload = () => {
    d3.queue()
        .defer(d3.json, 'data/us-states-features.json')
        .defer(d3.csv, 'data/cleaned-data-12-19-2017.csv')
        .awaitAll(InitializePage);
};
window.onresize = () => {
    if (!isLoaded) {
        return;
    }
    if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
    resizeCounter += 1;
    setTimeout(() => {
        if (resizeCounter > 1) {
            resizeCounter -= 1;
            if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
        } else if (resizeCounter === 1) {
            resizeCounter -= 1;
            if (logsLvl1) console.log(''.padStart(resizeCounter * 2, ' ') + resizeCounter);
            UpdateLayout();
            mapObj
                .DrawMap()
                .DrawNetwork()
                .DrawInfo()
                .DrawFilters()
                .UpdateData()
                .DrawMap() // coloring
                .UpdateSimulation()
                .DrawOptions();
        }
    }, resizeWait);
};

// Functions ---------------------------------------------------------------------------------------

function SetRData(category, name, value) {
    let row = rData
        .filter(optionsObj => optionsObj.category === category)[0]
        .rows
        .filter(row => row.name === name)[0];
    row.value = value;
    r[category][name] = value;
}

const InitializePage = (error, results) => {
    TestApp('InitializePage', 1);
    UpdateLayout();
    mapObj = (new HybridMapClass())
        .LoadStates(results[0].features)
        .DrawMap()
        .LoadData(results[1])
        .UpdateData()
        .DrawMap() // coloring
        .DrawNetwork()
        .DrawInfo()
        .DrawFilters()
        .UpdateSimulation()
        .DrawOptions();
    requestAnimationFrame(() => {
        body
            .classed('loading', false);
        isLoaded = true;
    });
    TestApp('InitializePage', -1);
};

function UpdateLayout() {
    TestApp('UpdateLayout', 1);
    SetRData('info', 'wImage', r.info.w - 2 * r.info.margin);
    SetRData('info', 'hImage', r.info.wImage / r.info.whRatioImage);
    SetRData('info', 'h', r.info.hImage + 4 * r.info.textRowH + 3 * r.info.margin);
    SetRData('map', 'wMin', r.info.h * r.map.whRatioMap);
    SetRData('options', 'wGroup', 2 * r.options.wMedium + 3 * r.options.wSmall + r.options.wInput);
    if (body.node().clientWidth >= r.map.wMin + r.info.w) {
        SetRData('map', 'w', body.node().clientWidth - r.info.w);
        SetRData('svg', 'w', body.node().clientWidth);
    } else {
        SetRData('map', 'w', r.map.wMin);
        SetRData('svg', 'w', r.map.wMin + r.info.w);
    }
    SetRData('map', 'w', Math.min(r.map.w, (window.innerHeight - r.filters.h) * r.map.whRatioMap));
    SetRData('map', 'h', r.map.w / r.map.whRatioMap);
    SetRData('svg', 'h', Math.max(r.map.h, r.info.h));
    SetRData('filters', 'w', r.map.w);
    SetRData('options', 'w', r.map.w);
    TestApp('UpdateLayout', -1);
}

function HybridMapClass() {
    TestApp('HybridMapClass', 1);
    let that = this;
    that.infoData = [];
    that.centroidByANSI = {};
    that.$outTotalScale = d3.scaleLinear().range([0, 1]);
    that.projection = d3.geoAlbersUsa();
    that.path = d3.geoPath();
    that.filteredOutObj = {
        year: {},
        report: {}
    };

    that.LoadStates = data => {
        TestApp('UpdateStates', 1);
        that.statesLoaded = data;
        that.states = that.statesLoaded.map(d => d);
        TestApp('UpdateStates', -1);
        return that;
    };

    that.LoadData = data => {
        TestApp('LoadData', 1);
        that.dataLoaded = data;
        that.nodesLoaded = [];
        that.linksLoaded = [];
        that.nodeById = {};
        that.linkByIds = {};
        that.dataLoaded.forEach(d => {
            if (d.sourceState === d.targetState) {
                return;
            }
            if (that.nodeById[d.sourceId] === undefined) {
                that.nodeById[d.sourceId] = {
                    id: d.sourceId,
                    ansi: d.sourceState,
                };
            }
            if (that.nodeById[d.targetId] === undefined) {
                that.nodeById[d.targetId] = {
                    id: d.targetId,
                    ansi: d.targetState,
                };
            }
            if (that.linkByIds[d.sourceId + d.targetId] === undefined) {
                that.linkByIds[d.sourceId + d.targetId] = {
                    sourceId: d.sourceId,
                    targetId: d.targetId,
                };
            }
            Object.keys(d).forEach(key => {
                switch (key) {
                    case 'sourceId':
                    case 'sourceState':
                    case 'targetId':
                    case 'targetState':
                        break;
                    case 'month':
                        that.linkByIds[d.sourceId + d.targetId][key] = d[key];
                        break;
                    case 'report':
                    case 'dollars':
                    case 'year':
                        that.linkByIds[d.sourceId + d.targetId][key] = parseInt(d[key]);
                        break;
                }
            });
        });
        that.nodesLoaded = Object.keys(that.nodeById).map(d => that.nodeById[d]);
        that.linksLoaded = Object.keys(that.linkByIds).map(d => that.linkByIds[d]);
        TestApp('LoadData', -1);
        return that;
    };

    that.UpdateData = () => {
        TestApp('UpdateData', 1);
        let iCount = 0;
        let $outByANSI = {};
        let $inByANSI = {};
        that.nodes = that.nodesLoaded.map(d => d);
        that.nodes.forEach((d, i) => {
            d.$out = 0;
            d.$in = 0;
            $outByANSI[d.ansi] = 0;
            $inByANSI[d.ansi] = 0;
            d.i = undefined;
            if (topIds.includes(d.id)) {
                d.i = iCount;
                iCount += 1;
            }
            // d.x = that.centroidByANSI[d.ansi][0];
            // d.y = that.centroidByANSI[d.ansi][1];
            d.x = (d.x !== undefined) ? d.x : that.centroidByANSI[d.ansi][0];
            d.y = (d.y !== undefined) ? d.y : that.centroidByANSI[d.ansi][1];
            d.vx = 0;
            d.vy = 0;
        });
        that.links = that.linksLoaded.filter(function(d) {
            if (that.filteredOutObj.year[d.year]) {
                return false;
            }
            if (that.filteredOutObj.report[d.report]) {
                return false;
            }
            return true;
        });
        that.$outTotal = 0;
        that.links.forEach(d => {
            d.source = that.nodeById[d.sourceId];
            d.target = that.nodeById[d.targetId];
            d.source.$out += d.dollars;
            d.target.$in += d.dollars;
            $outByANSI[d.source.ansi] += d.dollars;
            $inByANSI[d.target.ansi] += d.dollars;
            that.$outTotal += d.dollars;
        });
        that.nodes = that.nodes.filter(d => d.$in > 0 || d.$out > 0);
        that.$outTotalScale
            .domain([0, that.$outTotal]);
        that.nodes.forEach(d => {
            let $in = that.$outTotalScale(d.$in);
            let $out = that.$outTotalScale(d.$out);
            if ($in > $out) {
                d.r = 0;
                // d.r = Math.max(r.network.rMin, r.network.rFactor * Math.sqrt($in));
            } else {
                d.r = Math.max(r.network.rMin, r.network.rFactor * Math.sqrt($out));
            }
        });
        that.states.forEach(d => {
            d.$in = $inByANSI[d.properties.ansi] || 0;
            d.$out = $outByANSI[d.properties.ansi] || 0;
        });
        TestApp('UpdateData', -1);
        return that;
    };

    that.DrawMap = () => {
        TestApp('DrawMap', 1);
        svg
            .attr('width', r.svg.w)
            .attr('height', r.svg.h);
        bgRect
            .attr('width', r.map.w)
            .attr('height', r.map.h);
        clipPathRect
            .attr('width', r.map.w)
            .attr('height', r.svg.h);
        that.projection
            .scale(r.map.w * r.map.projectionScale)
            .translate([r.map.w / 2, r.map.h / 2]);
        that.path
            .projection(that.projection);
        statePaths = statePathsG.selectAll('path.state-path')
            .data(that.states, d => d.properties.ansi);
        statePaths = statePaths.enter().append('path')
            .classed('state-path', true)
            .merge(statePaths)
            .attr('class', d => {
                if (d.$out !== 0 || d.$in !== 0) {
                    return 'state-path';
                } else {
                    return 'state-path inactive';
                }
            })
            .attr('d', that.path)
            .each(d => that.centroidByANSI[d.properties.ansi] = that.path.centroid(d))
            // .style('opacity', 0.75)
        // .each(function(d) {
        //     let centroid = that.centroidByANSI[d.properties.ansi];
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

    that.DrawInfo = () => {
        TestApp('DrawInfo', 1);
        infoG
            .attr('transform', 'translate(' + (r.map.w + r.info.margin) + ',' + (r.info.margin) + ')');
        infoBGRect
            .attr('transform', 'translate(' + (1 - r.info.margin) + ',' + (1 - r.info.margin) + ')')
            .attr('width', r.info.w - 2)
            .attr('height', r.info.h - 2);
        infoImageGs = infoG.selectAll('g.info-image-g')
            .data(that.infoData);
        infoImageGs = infoImageGs.enter().append('g')
            .classed('info-image-g', true)
            .each(function(datum) {
                d3.select(this).append('image')
                    .attr('width', r.info.wImage)
                    .attr('height', r.info.hImage)
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
            .transition().duration(r.transition.duration).ease(r.transition.ease)
            .style('opacity', d => +(that.nodeSelected && d.id === that.nodeSelected.id));
        infoTextGs = infoG.selectAll('g.info-text-g')
            .data(that.infoData);
        infoTextGs = infoTextGs.enter().append('g')
            .classed('info-text-g', true)
            .attr('transform', 'translate(' + (r.info.wImage / 2) + ',' + (r.info.hImage + r.info.margin) + ')')
            .style('opacity', 0)
            .merge(infoTextGs);
        infoTextGs
            .selectAll('text').remove();
        infoTextGs
            .each(function(datum) {
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 0.5 * r.info.textRowH)
                    .text(datum.id);
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 1.5 * r.info.textRowH)
                    .text('State: ' + datum.ansi);
                // if (datum.$in > 0) {
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 2.5 * r.info.textRowH)
                    .text('Received: ' + d3.format('$,')(datum.$in));
                // }
                // if (datum.$out > 0) {
                d3.select(this).append('text')
                    .attr('x', 0)
                    .attr('y', 3.5 * r.info.textRowH)
                    .text('Donated: ' + d3.format('$,')(datum.$out));
                // }
                // d3.select(this).append('text')
                //     .attr('x', 0)
                //     .attr('y', 4.5 * r.info.textRowH)
                //     .text(() => {
                //         let yearsArray = yearsData.filter(d => !(that.filteredOutObj.year[d]));
                //         if (yearsArray.length === 0) {
                //             return 'Years: None';
                //         } else {
                //             return 'Years: [' + yearsArray + ']';
                //         }
                //     });
            })
            .transition().duration(r.transition.duration).ease(r.transition.ease)
            .style('opacity', d => +(that.nodeSelected && d.id === that.nodeSelected.id));
        TestApp('DrawInfo', -1);
        return that;
    };

    that.UpdateSimulation = () => {
        TestApp('UpdateSimulation', 1);
        that.simulation = d3.forceSimulation()
            .nodes(that.nodes)
            .on('tick', that.Tick)
            .stop();
        rData.forEach(optionsObj => {
            if (optionsObj.category === 'simulation') {
                optionsObj.rows.forEach(row => {
                    that.simulation[row.name](row.value);
                });
            } else if (optionsObj.isDisabled) {
                return;
            } else if (optionsObj.category.substring(0, 5) !== 'force') {
                return;
            } else if (optionsObj.isIsolated === true) {
                that.states.map(d => d.properties.ansi).forEach(ansi => {
                    let cx = that.centroidByANSI[ansi][0];
                    let cy = that.centroidByANSI[ansi][1];
                    let forceNew = d3[optionsObj.category]();
                    let initialize = forceNew.initialize;
                    forceNew.initialize = () => {
                        initialize.call(forceNew, that.nodes.filter(d => d.ansi === ansi));
                    };
                    optionsObj.rows.forEach(row => {
                        let rowValue = row.value; // do not mutate original
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
                    that.simulation
                        .force(optionsObj.category + ansi, forceNew)
                        .stop();
                });
            } else {
                let forceNew = d3[optionsObj.category]();
                optionsObj.rows.forEach(row => {
                    let rowValue = row.value; // do not mutate original
                    switch (rowValue) {
                        case 'cx':
                            rowValue = 0.5 * r.map.w;
                            break;
                        case 'cy':
                            rowValue = 0.5 * r.map.h;
                            break;
                    }
                    forceNew[row.name](rowValue);
                });
                that.simulation
                    .force(optionsObj.category, forceNew)
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
        TestApp('DragStarted', 1);
        isDragging = true;
        // if (!d3.event.active) { that.simulation.alphaTarget(0.3).restart(); }
        d.fx = d.x;
        d.fy = d.y;
        // that.Tick();
        // if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        // d3.event.subject.fx = d3.event.subject.x;
        // d3.event.subject.fy = d3.event.subject.y;
        TestApp('DragStarted', -1);
    };

    that.Dragged = d => {
        TestApp('Dragged', 1);
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d.x = d3.event.x;
        d.y = d3.event.y;
        that.Tick();
        // d3.event.subject.fx = d3.event.x;
        // d3.event.subject.fy = d3.event.y;
        TestApp('Dragged', -1);
    };

    that.DragEnded = d => {
        TestApp('DragEnded', 1);
        isDragging = false;
        // if (!d3.event.active) { that.simulation.alphaTarget(0); }
        d.fx = null;
        d.fy = null;
        if (!d3.event.active) {
            that.simulation
                .alpha(1).restart();
        }
        // if (!d3.event.active) simulation.alphaTarget(0);
        // d3.event.subject.fx = null;
        // d3.event.subject.fy = null;
        TestApp('DragEnded', -1);
    };

    that.DrawNetwork = () => {
        TestApp('DrawNetwork', 1);
        nodeCircles = nodesG.selectAll('circle.node-circle')
            .data(that.nodes);
        nodeCircles.exit()
            .remove();
        nodeCircles = nodeCircles.enter().append('circle')
            .classed('node-circle', true)
            .on('mouseover', d => {
                if (isDragging) {
                    return;
                }
                that.nodeSelected = d;
                that.linksSelected = that.links.filter(d => {
                    return that.nodeSelected.id === d.source.id || that.nodeSelected.id === d.target.id;
                });
                if (!that.infoData.includes(that.nodeSelected)) {
                    that.infoData.push(that.nodeSelected);
                }
                that.DrawNetwork()
                    .DrawInfo();
            })
            .on('mouseout', () => {
                if (isDragging) {
                    return;
                }
                that.nodeSelected = null;
                that.linksSelected = [];
                that.DrawNetwork()
                    .DrawInfo();
            })
            .call(d3.drag()
                // .container(nodesG)
                // .subject(() => that.simulation.find(d3.event.x, d3.event.y, 100))
                .on('start', that.DragStarted)
                .on('drag', that.Dragged)
                .on('end', that.DragEnded)
            )
            .merge(nodeCircles);
        nodeCircles
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .style('fill', function(d) {
                if (topIds.includes(d.id)) {
                    return d3.schemeCategory20[d.i];
                } else if (d.$out > 0) {
                    return r.network.fillGeneral;
                } else {
                    return 'white';
                }
            })
            .attr('r', d => d.r)
            // .transition().duration(r.transition.duration).ease(r.transition.ease)
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
                    return 0;
                }
            });
        svgDefsArrows = svgDefs.selectAll('marker.arrow')
            .data(topIds.concat('misc'));
        svgDefsArrows = svgDefsArrows.enter().append('marker')
            .classed('arrow', true)
            .attr('id', (d, i) => 'arrow-id' + i)
            .merge(svgDefsArrows);
        svgDefsArrows
            .each(function(datum, i) {
                let path = d3.select(this).selectAll('path')
                    .data([null]);
                path = path.enter().append('path')
                    .merge(path)
                    .attr('d', 'M 0 0 12 6 0 12 3 6 Z')
                    .attr('transform', 'scale('+(r.network.arrowScale)+')')
                    .style('stroke', () => (i < topIds.length) ? d3.schemeCategory20[i] : r.network.strokeGeneral)
                    .style('fill', () => (i < topIds.length) ? d3.schemeCategory20[i] : r.network.fillGeneral);
            })
            .attr('refX', (12-2.5)*r.network.arrowScale)
            .attr('refY', 6*r.network.arrowScale)
            // .attr('markerUnits', 'userSpaceOnUse')
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
                    return 'url(#arrow-id' + d.source.i + ')';
                } else {
                    return 'url(#arrow-id' + topIds.length + ')';
                }
            })
            .style('stroke-width', d => {
                return Math.max(r.network.swMin, r.network.swFactor*d.dollars/that.$outTotal) + 'px';
            })
            .style('stroke', d => {
                if (topIds.includes(d.source.id)) {
                    return d3.schemeCategory20[d.source.i];
                } else if (topIds.includes(d.target.id)) {
                    return d3.schemeCategory20[d.target.i];
                } else {
                    return r.network.strokeGeneral;
                }
            })
            // .transition().duration(r.transition.duration).ease(r.transition.ease)
            .style('display', d => {
                if (d.source.ansi === d.target.ansi) {
                    return 'none';
                } else if (that.filteredOutObj.year[d.year]) {
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
        let filtersData = [
            {
                key: 'year',
                row: ['2011', '2012', '2013', '2014', '2015', '2016', '2017']
            }, {
                key: 'report',
                row: [1, 2, 3, 4, 5, 6, 7, 8, 9]
            }
        ];
        filtersDiv
            .style('width', r.filters.w + 'px');
        filterGroups = filtersDiv.selectAll('div.filter-group')
            .data(filtersData);
        filterGroups = filterGroups.enter().append('div')
            .classed('filter-group', true)
            .each(function(datum) {
                d3.select(this).selectAll('div.filters-year')
                    .data(datum.row)
                    .enter().append('div')
                    .classed('filters-year', true)
                    .each(function(d) {
                        d3.select(this).append('div')
                            .text(d);
                        d3.select(this).append('input')
                            .attr('type', 'checkbox')
                            .attr('checked', true)
                            .on('change', function() {
                                that.filteredOutObj[datum.key][d] = !this.checked;
                                that.UpdateData()
                                    .DrawNetwork()
                                    .UpdateSimulation();
                            });
                    })
                    .style('width', r.filters.wBox + 'px')
                    .style('height', (0.5 * r.filters.h) + 'px');
            })
            .merge(filterGroups);
        TestApp('DrawFilters', -1);
        return that;
    };

    that.DrawOptions = () => {
        TestApp('DrawOptions', 1);
        optionsDiv
            .style('width', r.options.w + 'px');
        optionGroups = optionsDiv.selectAll('div.option-group')
            .data(rData);
        optionGroups = optionGroups.enter().append('div')
            .classed('option-group', true)
            .each(function(optionsObj) {
                let rowsFiltered = optionsObj.rows.filter(row => row.inputType);
                d3.select(this)
                    .style('display', rowsFiltered.length ? null : 'none');
                d3.select(this).append('div')
                    .classed('option-category', true)
                    .append('label')
                    .classed('label-medium', true)
                    .text(optionsObj.category);
                d3.select(this).selectAll('div.option-row')
                    .data(rowsFiltered)
                    .enter().append('div')
                    .classed('option-row', true)
                    .each(function(row) {
                        d3.select(this).append('label')
                            .classed('label-medium', true)
                            .text(row.name);
                        d3.select(this).append('label')
                            .classed('label-small', true).classed('option-value', true);
                        switch (row.inputType) {
                            case 'range':
                                d3.select(this).append('label')
                                    .classed('label-small', true)
                                    .text(row.min);
                                d3.select(this).append('input')
                                    .attr('type', 'range')
                                    .attr('min', row.min)
                                    .attr('max', row.max)
                                    .attr('step', row.step)
                                    .attr('value', row.value)
                                    .on('change', function() {
                                        if (row.step === parseInt(row.step)) {
                                            row.value = parseInt(this.value);
                                        } else {
                                            row.value = parseFloat(this.value);
                                        }
                                        if (Object.keys(r).includes(optionsObj.category)) {
                                            SetRData(optionsObj.category, row.name, row.value);
                                            UpdateLayout();
                                            that.UpdateData()
                                                .DrawMap()
                                                .DrawNetwork()
                                                .DrawInfo();
                                        }
                                        that.UpdateSimulation()
                                            .DrawOptions();
                                    });
                                d3.select(this).append('label')
                                    .classed('label-small', true)
                                    .text(row.max);
                                break;
                            case 'select':
                                d3.select(this).append('label')
                                    .classed('label-small', true)
                                    .text('');
                                let dropdown = d3.select(this).append('select')
                                    .on('change', function(d) {
                                        row.value = this.value;
                                        if (Object.keys(r).includes(optionsObj.category)) {
                                            SetRData(optionsObj.category, row.name, row.value);
                                            UpdateLayout();
                                            that.UpdateData()
                                                .DrawMap()
                                                .DrawNetwork()
                                                .DrawInfo();
                                        }
                                        that.UpdateSimulation()
                                            .DrawOptions();
                                    });
                                dropdown.property('value', row.value);
                                dropdown.selectAll('option')
                                    .data(['States', 'Network']).enter().append('option')
                                    .text(d => d);
                                break;
                        }
                        if (row.name === 'alpha') {
                            optionsAlphaLabel = d3.select(this).selectAll('label.option-value');
                            optionsAlphaSlider = d3.select(this).selectAll('input[type="range"]');
                        }
                    })
                    .style('width', (r.options.wGroup - r.options.wMedium) + 'px');
            })
            .merge(optionGroups)
            .style('width', r.options.wGroup + 'px');
        optionGroups.selectAll('label.option-value')
            .text(d => d.value);
        optionGroups.selectAll('label.label-small')
            .style('width', r.options.wSmall + 'px');
        optionGroups.selectAll('label.label-medium')
            .style('width', r.options.wMedium + 'px');
        optionGroups.selectAll('input, select')
            .style('width', r.options.wInput + 'px');
        optionGroups.selectAll('options-row *')
            .style('height', r.options.hRow + 'px')
            .style('line-height', r.options.hRow + 'px');
        TestApp('DrawOptions', -1);
        return that;
    };

    that.Tick = () => {
        // TestApp('Tick', 1);
        nodeCircles
            .attr('cx', d => d.$out > 0 ? d.x : that.centroidByANSI[d.ansi][0])
            .attr('cy', d => d.$out > 0 ? d.y : that.centroidByANSI[d.ansi][1]);
        linkLines
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.$out > 0 ? d.target.x : that.centroidByANSI[d.target.ansi][0])
            .attr('y2', d => d.target.$out > 0 ? d.target.y : that.centroidByANSI[d.target.ansi][1]);
        SetRData('simulation', 'alpha', parseFloat(that.simulation.alpha()).toFixed(8));
        optionsAlphaLabel
            .text(r.simulation.alpha);
        optionsAlphaSlider
            .property('value', r.simulation.alpha);
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
        colorNodes = 'color:' + (sizeNodesNew < sizeNodesOld ? 'green' : 'firebrick');
    } else {
        stringNodes = '';
        colorNodes = 'color:black';
    }
    stringNodes = '%c' + stringNodes.padEnd(8);
    if (sizeUsedNew !== sizeUsedOld) {
        stringUsed = ((sizeUsedNew / (1024 * 1024)).toFixed(2) + ' Mb').padStart(8);
        colorUsed = 'color:' + (sizeUsedNew < sizeUsedOld ? 'green' : 'firebrick');
    } else {
        stringUsed = '';
        colorUsed = 'color:black';
    }
    stringUsed = '%c' + stringUsed.padEnd(12);
    if (sizeTotalNew !== sizeTotalOld) {
        stringTotal = ((sizeTotalNew / (1024 * 1024)).toFixed(2) + ' Mb').padStart(8);
        colorTotal = 'color:' + (sizeTotalNew < sizeTotalOld ? 'green' : 'firebrick');
    } else {
        stringTotal = '';
        colorTotal = 'color:black';
    }
    stringTotal = '%c' + stringTotal.padEnd(12);
    stringCombined = stringSource + stringNodes + stringUsed + stringTotal;
    console.log(stringCombined, colorSource, colorNodes, colorUsed, colorTotal);
}