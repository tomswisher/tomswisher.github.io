// by Tom Swisher

// window.debug = true;
var hoverWidth = 0, hoverHeight = 0;
var hoverText1 = '', hoverText2 = '';
var rxValue = 15;
var gradeArray = ['A','B','C','D','F'];
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
}
// var invertedGradeScale = function(number) {
// 	if (number >= 4) { return 'A'; }
// 	if (number >= 3) { return 'B'; }
// 	if (number >= 2) { return 'C'; }
// 	if (number >= 1) { return 'D'; }
// 	return 'F';
// }
var body = d3.select('body');
var mapInstance;
var currentVisualizationWidth = 0;
var currentVisualizationHeight = 0;
var animateDuration = 200;
var animateEase = 'linear';
var mapFontSize, categoriesFontSize, infoboxFontSize;
var sizeOfDOM = 0;
var stateHovered = 'National';
var stateClicked = undefined;
var isMobile;

// Visual Styles
var vs = {};
vs.popupDX = 2;
vs.popupDY = 2;
vs.gradeMargin = 3;
vs.gradeRounded = false;
vs.categoryRounded = false;
vs.categoryGradeWidth = 30;
vs.categoryMarginX = 3;
vs.categoryMarginY = 2;

vs.c_salmon = '#ff5232';
vs.c_peagreen = '#6eaa5e';
vs.c_lightgainsboro = '#eeeeee';
// vs.gradeColorArray = ['rgb(40,40,40)','rgb(80,80,80)','rgb(120,120,120)','rgb(160,160,160)','rgb(180,180,180)']; // grayscale
// vs.gradeColorArray = ['#c7e9b4','#7fcdbb','#41b6c4','#2c7fb8','#253494']; // blue - torquise
// vs.gradeColorArray = ['#253494','#2c7fb8','#41b6c4','#7fcdbb','#c7e9b4']; // turqouise - blue
// vs.gradeColorArray = ['#bd0026','#f03b20','#fd8d3c','#fecc5c','#ffffb2']; // tan - red
// vs.gradeColorArray = ['#ffffcc','#c2e699','#78c679','#31a354','#006837']; // green - tan
// vs.gradeColorArray = ['#dc143c', '#f39237', '#feea1b', '#b5d400', '#529c00']; // green - yellow - red
// vs.gradeColorArray = ['darkgreen', 'lightgreen', 'yellow', 'orange', 'red'];
// vs.gradeColorArray = [vs.c_salmon, 'gold', 'lightyellow', 'lightgreen', vs.c_peagreen];
// vs.gradeColorArray = ['#b22222', 'lightgray', 'lightgray', 'lightgray', '#3cb371']; // green - gray - red
// vs.gradeColorArray = ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']; // colorbrewer
vs.gradeColorArray = ['crimson', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'];
//
vs.gradeColorYes = 'crimson';
vs.categoryRectColor = 'white';
vs.categoryTextColor = 'black';
vs.infoboxTextColorHighlighted = 'black';
// vs.infoboxRowColorHighlighted = 'darkorange';
// vs.categoryRectColor = 'black';
vs.infoboxRowColorHighlighted = 'crimson';
vs.gradeColorDefault = 'white';
//
var colorScale = d3.scale.quantize()
	.domain([0, 5])
	.range(vs.gradeColorArray);

vs.stateHoveredOpacity = 0.3;
vs.stateNotClickedOpacity = 0.2;
vs.hoverShowCategoryName = false;
vs.hoverMargin = 5;

window.onload = InitializePage;
window.onresize = ResizePage;

// Selectors
var mapSVG = body.select('#map-svg');
var filtersContainer = body.select('#filters-container');
var filtersSVG = body.select('#filters-svg');
var infoboxSVG = body.select('#infobox-svg');
var statesDropdown = body.select('#states-dropdown');
var headerContainer = body.select('#header-container');
var visualizationContainer = body.select('#visualization-container');
var infoboxContainer = body.select('#infobox-container');
var mapContainer = body.select('#map-container');
var mapBG = body.select('#map-bg');
var infoboxSVG = body.select('#infobox-svg');
var defs = infoboxSVG.append('defs');

// height=130% so that the shadow is not clipped
var dropShadowFilter = defs.append('filter')
    .attr('id', 'drop-shadow')
    .attr('height', '130%')
    .attr('width', '120%');
// SourceAlpha refers to opacity of graphic that this dropShadowFilter will be applied to
// convolve that with a Gaussian with standard deviation 3 and store result in blur
dropShadowFilter.append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 2)
    .attr('result', 'blur');
// translate output of Gaussian blur to the right and downwards with 2px
// store result in offsetBlur
dropShadowFilter.append('feOffset')
    .attr('in', 'blur')
    .attr('dx', 5)
    .attr('dy', 5)
    .attr('result', 'offsetBlur');
// overlay original SourceGraphic over translated blurred opacity by using
// feMerge dropShadowFilter. Order of specifying inputs is important!
var feMerge = dropShadowFilter.append('feMerge');
feMerge.append('feMergeNode')
    .attr('in', 'offsetBlur')
feMerge.append('feMergeNode')
    .attr('in', 'SourceGraphic');


function InitializePage() {
	var csvDataURL = 'data/3_16_reduced_privatization_report_card.csv';
	var jsonDataURL = 'data/us-states.json';
	mapInstance = new MapObject()
		.csvData(csvDataURL)
		.jsonData(jsonDataURL);
	ResizePage();
	requestAnimationFrame(function() {
		body.transition().duration(500).ease('cubic-in')
			.style('opacity', 1);
	});
}


function ToggleGrades(bool) {
    visibleGrades['A'] = visibleGrades['B'] = visibleGrades['C']
        = visibleGrades['D'] = visibleGrades['F'] = bool;
}


function UpdateFilters() {
	// console.log('UpdateFilters');
	var filtersWidth = Math.max(0, parseFloat(filtersContainer.style('width'))); 
	var filtersHeight = Math.max(0, parseFloat(filtersContainer.style('height'))); 
	filtersSVG
		.attr('width', filtersWidth)
		.attr('height', filtersHeight)
        .transition().duration(animateDuration).ease(animateEase)
            .style('opacity', function(d) {
                return mapInstance.Category() !== 'Overall Grade' ? 0 : 1;
            });
	var gradeDataArray = gradeArray.slice();
	// var gradeRectSize = (1/2)*(1/gradeDataArray.length)*filtersWidth;
	var gradeRectSize = filtersHeight-2*vs.gradeMargin;
	//
    var gradeGs = filtersSVG.selectAll('g.grade-g').data(gradeDataArray);
    gradeGs.enter().append('g').attr('class', 'grade-g');
    gradeGs
        .attr('transform', function(d,i) {
            var tx = (1/2)*filtersWidth + (1/2-1/2*gradeDataArray.length+i)*filtersHeight;
            var ty = (1/2)*filtersHeight;
            return 'translate('+tx+','+ty+')';
        })
        .on('mouseover', function(d) {
            console.log('mouseover');
            ToggleGrades(false);
            visibleGrades[d] = true;
            UpdateFilters();
            mapInstance.UpdateMap();
        })
        .on('mouseout', function(d) {
            console.log('mouseout');
            ToggleGrades(true);
            UpdateFilters();
            mapInstance.UpdateMap();
        })
        .each(function(grade) {
            var gradeBG = d3.select(this).selectAll('rect.grade-bg').data([grade]);
            gradeBG.enter().append('rect').attr('class', 'grade-bg')
                .attr('rx', vs.gradeBGRounded ? rxValue : 0)
                .style('fill', vs.gradeColorDefault);
            gradeBG
                .attr('x', (-1/2)*filtersHeight)
                .attr('y', (-1/2)*filtersHeight)
                .attr('width', filtersHeight)
                .attr('height', filtersHeight-2);
            //
            var gradeRect = d3.select(this).selectAll('rect.grade-rect').data([grade]);
            gradeRect.enter().append('rect').attr('class', 'grade-rect')
                .attr('rx', vs.gradeRounded ? rxValue : 0)
                .style('fill', function(d) {
                    return colorScale(gradeScale(d));
                });
            gradeRect
                .attr('x', function(d,i) {
                    return visibleGrades[d] === true ? (-1/2)*gradeRectSize - vs.popupDX : (-1/2)*gradeRectSize;
                })
                .attr('y', function(d) {
                    return visibleGrades[d] === true ? (-1/2)*gradeRectSize - vs.popupDY : (-1/2)*gradeRectSize;
                })
                .attr('width', gradeRectSize)
                .attr('height', gradeRectSize)
                .style('filter', function(d) {
                    return visibleGrades[d] === true ? 'url(#drop-shadow)' : null;
                })
                .style('stroke-width', function(d) {
                    return visibleGrades[d] === true ? '1' : '0';
                })
                .transition().duration(animateDuration).ease(animateEase)
                    .style('fill', function(d) {
                        return visibleGrades[d] === true ? colorScale(gradeScale(d)) : vs.gradeColorDefault;
                    });
            //
            var gradeLabel = d3.select(this).selectAll('text.grade-label').data([grade]);
            gradeLabel.enter().append('text').attr('class', 'grade-label button-text')
                .text(function(d) { return d; });
            gradeLabel
                .attr('x', function(d,i) {
                    return visibleGrades[d] === true ? -1*vs.popupDX : 0;
                })
                .attr('y', function(d,i) {
                    return visibleGrades[d] === true ? -1*vs.popupDY : 0;
                });
        })
}


function UpdateInfobox() {
	if (mapInstance._categoryNames === undefined || mapInstance._csvData === undefined) { return; }
	// console.log('UpdateInfobox');
	var stateDataRow;
	if (stateHovered === 'National') {
		stateDataRow = {
            'State':'National',
            'Privately Managed Charter Schools':'-',
            'Takes Charter Authorization from Local District-Directly or by Appeal':'-',
            'Virtual Charter Schools':'-',
            'Vouchers for Private Schools':'-',
            'Tax Credit Subsidies for Private Schools':'-',
            'Taxpayer Funding for Private Schools and Home Schools (ESAs)':'-',
            'Overall Grade':'-',
        };
	} else {
		stateDataRow = mapInstance._csvData.filter(function(row) {
			return row.State === stateHovered;
		})[0];
	};
	var categoryRowsData = mapInstance._categoryNames.slice();
	statesDropdown
        .attr('class', 'button-object')
		// .style('background', 'url("img/orange-triangle-flipped.png") 90% no-repeat '+vs.categoryRectColor)
        .on('change', function() {
			if (this.value === 'National') {
				stateClicked = undefined;
				stateHovered = 'National';
				mapSVG.selectAll('g.hover-g').selectAll('text.hover-text').text('');	
				mapSVG.selectAll('g.hover-g').selectAll('rect.hover-rect').attr('width', 0);
			} else {
				stateClicked = this.value;
				stateHovered = this.value;
				var d = mapSVG.selectAll('.state-path')
					.filter(function(d) { return d.properties.name === stateClicked; })
					.datum();
				hoverText1 = stateClicked+': '+d.properties[mapInstance._category];
				UpdateHover();
			}
			UpdateInfobox();
			mapInstance.UpdateMap();
		});
	var statesDropdownOptionsData = mapInstance._csvData.slice();
	statesDropdownOptionsData = statesDropdownOptionsData.map(function(row) {
		return row.State;
	});
	statesDropdownOptionsData.unshift('National');
	//
	var statesDropdownOptions = statesDropdown.selectAll('option.states-dropdown-option').data(statesDropdownOptionsData);
	statesDropdownOptions.enter().append('option').classed('states-dropdown-option', true)
		.text(function(d) { return d; });
	statesDropdown[0][0].value = stateHovered;;
	//
	var infoboxContainerWidth = Math.max(0, parseFloat(infoboxContainer.style('width'))); 
	var infoboxContainerHeight = Math.max(0, parseFloat(infoboxContainer.style('height'))); 
	var heightUnit = (infoboxContainerHeight-1)/(categoryRowsData.length);
	var currentHeightAmount = mapInstance._categoryNames.length*heightUnit - 2;
    var rowHeight = currentHeightAmount/mapInstance._categoryNames.length;
    var rowWidth = infoboxContainerWidth;
    //
    // var categoryRows = infoboxContainer.selectAll('div.category-row-div').data(categoryRowsData);
    // categoryRows.enter().append('div').attr('class', 'category-row-div')
    //   .each(function(category) {
    //     d3.select(this).append('div').attr('class', 'col-l')
    //       .style('display', 'inline-block')
    //       .style('width', (3/4)*rowWidth+'px')
    //       .style('height', rowHeight+'px')
    //       .style('line-height', rowHeight+'px')
    //       .style('font-size', '16px')
    //       .style('text-align', 'left')
    //       .text(category);
    //     d3.select(this).append('div').attr('class', 'col-l')
    //       .style('display', 'inline-block')
    //       .style('width', (1/4)*rowWidth+'px')
    //       .style('height', rowHeight+'px')
    //       .style('line-height', rowHeight+'px')
    //       .style('font-size', '16px')
    //       .style('text-align', 'left')
    //       .text(stateDataRow[category]);
    //   });
    //
    infoboxSVG
        .attr('width', infoboxContainerWidth)
        .attr('height', infoboxContainerHeight);
    infoboxFontSize = parseFloat(infoboxSVG.style('font-size'));
    //
	var categoryRowGs = infoboxSVG.selectAll('g.category-row-g').data(categoryRowsData);
    categoryRowGs.enter().append('g').classed('category-row-g', true);
	categoryRowGs
		.attr('transform', function(d,i) {
			return 'translate(1,'+String(1+i*rowHeight)+')';
		})
		.on('mouseover', function(d) {
			if (mapInstance._category === d) { return; }
			mapInstance.Category(d);
			if (stateHovered === 'National') {
				hoverText1 = '';
			} else {
				var stateDataRow = mapInstance._csvData.filter(function(row) {
					return row.State === stateHovered;
				})[0];
				hoverText1 = stateHovered+': '+stateDataRow[mapInstance._category];
			}
            UpdateFilters();
			UpdateHover();
			UpdateInfobox();
		})
		.each(function(categoryName) {
            var categoryLabelWidth = rowWidth - 4*vs.categoryMarginX - vs.categoryGradeWidth;
            //
            // var categoryRowBGs = d3.select(this).selectAll('rect.category-row-bg').data([null]);
            // categoryRowBGs.enter().append('rect').attr('class', 'category-row-bg');
            // categoryRowBGs
            //     .attr('x', 0)
            //     .attr('y', 0)
            //     .attr('rx', vs.categoryRounded ? rxValue : 0)
            //     .attr('width', rowWidth-2)
            //     .attr('height', rowHeight)
            //     .style('fill', vs.categoryRectColor);
            //
			var categoryRowRect = d3.select(this).selectAll('rect.category-row-rect').data([categoryName]);
			categoryRowRect.enter().append('rect').attr('class', 'category-row-rect')
                .style('fill', function(d) {
                    return mapInstance._category === d ? vs.infoboxRowColorHighlighted : vs.categoryRectColor;
                });
			categoryRowRect
                .attr('x', function(d) {
                    return mapInstance._category === d ? vs.categoryMarginX - vs.popupDX : vs.categoryMarginX;
                })
                .attr('y', function(d) {
                    return mapInstance._category === d ? vs.categoryMarginY - vs.popupDY : vs.categoryMarginY;
                })
				.attr('width', categoryLabelWidth)
				.attr('height', rowHeight-2*vs.categoryMarginY)
                .attr('rx', vs.categoryRounded ? rxValue : 0)
                .style('filter', function(d) {
                    return mapInstance._category === d ? 'url(#drop-shadow)' : null;
                })
                .style('stroke-width', function(d) {
                    return mapInstance._category === d ? '1' : '0';
                })
                .transition().duration(animateDuration).ease(animateEase)
    				.style('fill', function(d) {
                        return mapInstance._category === d ? vs.infoboxRowColorHighlighted : vs.categoryRectColor;
                    });
			var categoryRowLabel = d3.select(this).selectAll('text.category-row-label').data([categoryName]);
			categoryRowLabel.enter().append('text').attr('class', 'category-row-label button-text')
				.style('fill', function(d) {
                    return mapInstance._category === d ? vs.infoboxTextColorHighlighted : vs.categoryTextColor;
                });
			categoryRowLabel
                .attr('x', function(d) {
                    if (mapInstance._category === d) {
                        return vs.categoryMarginX + (1/2)*categoryLabelWidth - vs.popupDX;
                    } else {
                        return vs.categoryMarginX + (1/2)*categoryLabelWidth;
                    }
                })
                .attr('y', function(d) {
                    if (mapInstance._category === d) {
                        return (1/2)*rowHeight - vs.popupDY;
                    } else {
                        return (1/2)*rowHeight;
                    }
                })
                .text(function(d) { return d; })
                .call(BostockTextWrap, categoryLabelWidth)
                .transition().duration(animateDuration).ease(animateEase)
                    .style('fill', function(d) {
                        return mapInstance._category === d ? vs.infoboxTextColorHighlighted : vs.categoryTextColor;
                    });
			var categoryRowGrade = d3.select(this).selectAll('text.category-row-grade').data([stateDataRow]);
			categoryRowGrade.enter().append('text').attr('class', 'category-row-grade button-text')
				.style('fill', vs.categoryTextColor);
			categoryRowGrade
				.attr('x', rowWidth-vs.categoryMarginX-(1/2)*vs.categoryGradeWidth)
				.attr('y', (1/2)*rowHeight)
				.text(function(d) { return d[categoryName]; });
		});

	// svg.append('g')
	//     .attr('class', 'x axis')
	//     .attr('transform', 'translate(0,' + height + ')')
	//     .call(xAxis)
	//   .selectAll('.tick text')
	//     .call(wrap, x.rangeBand());

}


function ResizePage() {
	function CheckSize() {
		headerContainer
			.style('width', body.style('width'));
		body.selectAll('div.above-map-text, div.below-map-text')
			.style('width', (parseInt(body.style('width'))-40)+'px');
		var newVisualizationWidth = Math.max(0, parseFloat(visualizationContainer.style('width'))); 
		var newVisualizationHeight = Math.max(0, parseFloat(visualizationContainer.style('height'))); 
		var mapWidth = Math.max(0, parseFloat(mapContainer.style('width'))); 
		var mapHeight = Math.max(0, parseFloat(mapContainer.style('height'))); 
		// Check for a breakpoint change
		if (newVisualizationWidth !== currentVisualizationWidth || newVisualizationHeight !== currentVisualizationHeight) {
			console.log(newVisualizationWidth, newVisualizationHeight);
			currentVisualizationWidth = newVisualizationWidth;
			currentVisualizationHeight = newVisualizationHeight;
			mapInstance
				.Width(mapWidth)
				.Height(mapHeight)
				.Scale(mapWidth*1.3);
			UpdateFilters();
			if (stateClicked !== undefined) {
				UpdateHover();	
			}
			UpdateInfobox();
		}
	}
	requestAnimationFrame(CheckSize);
}


function MapObject() {
	this._category = 'Overall Grade';
	this._width = 0;
	this._height = 0;
	this._scale = 1000;

	this.csvData = function(csvDataURL) {
		if (!arguments.length) { return this._csvData; }
		var that = this;
		d3.csv(csvDataURL, function(csvData) {
			// console.log('d3.csv');
			// console.log(csvData);
			that._csvData = csvData;
			// Get all category names
			that._categoryNames = [];
			for (var name in that._csvData[0]) {
				// if (name !== 'State' && name !== 'Overall Grade') {
				if (name !== 'State') {
				// if (name !== 'State') {
					that._categoryNames.push(name);
				}
			}
			// // calculate the average across categories and add it to the data
			// if (that._categoryNames.indexOf('Overall Grade') === -1) {
			// 	var i, j, numCategories, rowSum, categoryName, csvDataState, csvDataValue;
			// 	for (i=0; i<that._csvData.length; i++) {
			// 		rowSum = 0;
			// 		numCategories = 0;
			// 		for (j=0; j<that._categoryNames.length; j++) {
			// 			categoryName = that._categoryNames[j];
			// 			if (gradeArray.indexOf(that._csvData[i][categoryName]) !== -1) {
			// 				numCategories += 1;
			// 				csvDataValue = gradeScale(that._csvData[i][categoryName]);
			// 				rowSum += csvDataValue;
			// 			}
			// 		}
			// 		that._csvData[i]['Overall Grade'] = invertedGradeScale(rowSum/numCategories);
			// 	}
			// 	that._categoryNames.unshift('Overall Grade');
			// }
            // that._categoryNames.pop();
            // that._categoryNames.unshift('Overall Grade');
			UpdateInfobox();
			that.UpdateMap();
			return that;
		});
		return this;
	}

	this.jsonData = function(jsonDataURL) {
		if (!arguments.length) {
			return this._jsonData;
		}
		var that = this;
		d3.json(jsonDataURL, function(jsonData) {
			console.log('d3.json');
			console.log(jsonData);
			that._jsonData = jsonData;
			that._jsonData.features.push({
				'type':'Feature',
				'id':'00',
				'properties':{'name':'DC'},
			});
			that._jsonData.features = that._jsonData.features.filter(function(d) {
				return d.properties && d.properties.name !== 'Puerto Rico';
			});
			that.UpdateMap();
			return that;
		});
		return this;
	}

	this.Category = function(category) {
		if (!arguments.length) { return this._category; }
		this._category = category;
		this.UpdateMap();
		return this;
	}

	this.Width = function(width) {
		if (!arguments.length) { return this._width; }
		this._width = width;
		// this.UpdateMap();
		return this;
	}
	
	this.Height = function(height) {
		if (!arguments.length) { return this._height; }
		this._height = height;
		// this.UpdateMap();
		return this;
	}

	this.Scale = function(scale) {
		if (!arguments.length) { return this._scale; }
		this._scale = scale;
		this.UpdateMap();
		return this;
	}

	this.UpdateMap = function() {
		if (this._csvData === undefined) {
			return;
		} else if (this._jsonData === undefined) {
			return;
		}
		// console.log('UpdateMap');
		var that = this;

		isMobile = false; //initiate as false
		// device detection
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
	    	|| /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;
		// console.log('isMobile', isMobile);
		// if (isMobile === true) {
		// 	mapSVG.selectAll('g.hover-g').selectAll('text.hover-text').text('');
		// 	mapSVG.selectAll('g.hover-g').selectAll('rect.hover-rect').attr('width', 0);
		// }
		// prepare json data
		var i, j, csvDataState, csvDataValue, jsonDataState;
		for (i = 0; i < this._csvData.length; i++) {
			csvDataState = this._csvData[i].State;
			csvDataValue = this._csvData[i][this._category];
			for (j = 0; j < this._jsonData.features.length; j++) {
				jsonDataState = this._jsonData.features[j].properties.name;
				if (csvDataState == jsonDataState) {
					this._jsonData.features[j].properties[this._category] = csvDataValue;
					break;
				}
			}   
		}
		var projection = d3.geo.albersUsa()
           .translate([this._width/2, this._height/2])
           .scale([this._scale]);
		var path = d3.geo.path()
	       .projection(projection);
        //
		mapSVG
			.on('mousemove', function() { UpdateHover(); })
			.attr('width', this._width)
		    .attr('height', this._height);
        //
		mapBG
            .attr('width', this._width)
            .attr('height', this._height)
			.attr('x', 0)
			.attr('y', 0)
			.on('mouseover', function() {
				// if (isMobile === true) { return; }
				if (stateClicked !== undefined) { return; }
				stateHovered = 'National';
				mapSVG.selectAll('.state-path').filter(function(d) { return d.properties.name !== 'DC'; })
					.style('opacity', 1);
				hoverText1 = '';
                hoverText2 = '';
				UpdateHover();
				UpdateInfobox();
			})
			.on('mousedown', function() {
				if (stateClicked !== undefined) {
					// console.log('background mousedown');
					// if (isMobile === true) {
						stateHovered = 'National';
					// }
					// else {
					// 	stateHovered = stateClicked;
					// }
					stateClicked = undefined;
					mapSVG.selectAll('.state-path').filter(function(d) { return d.properties.name !== 'DC'; })
						.style('pointer-events', 'all');
					hoverText1 = '';
                    hoverText2 = '';
					UpdateHover();
					UpdateInfobox();
					mapInstance.UpdateMap();		
				}
			})
			.style('fill', visualizationContainer.style('background-color'));
		//
		var stateGs = mapSVG.selectAll('g.state-g').data(this._jsonData.features, function(d) { return d.properties.name; });
		stateGs.enter().append('g').classed('state-g', true);
		//
		var statePaths = stateGs.selectAll('.state-path').data(function(d) { return [d]; }, function(d) { return d.properties.name; });
		statePaths.enter().append('path').classed('state-path', true)
			.classed('button-object', true)
			// .classed('unselectable', true)
			// .attr('unselectable', 'on') // IE < 10 and Opera
			.style('fill', function(d) {
				var grade = d.properties[that._category];
				if (grade === undefined) { return '#ccc'; }
				if (grade === '_') { return vs.gradeColorDefault; }
                if (grade === 'Yes') { return vs.gradeColorYes; }
                if (grade === 'No') { return vs.gradeColorDefault; }
				return colorScale(gradeScale(grade));
			})
			.each(function(d) {
				if (d.properties.name === 'DC') {
					d3.select(this).attr('d', 'm25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z');
					d3.select(this).style('opacity', 0);
					// d3.select(this.parentNode).style('pointer-events', 'none');
				} else {
					d3.select(this).attr('d', path);
				}
			});
		statePaths
			.on('mouseover', function(d) {
				if (isMobile === true) { return; }
				if (stateClicked !== undefined) { return; }
				if (visibleGrades[d.properties[that._category]] === false) {
					stateHovered = 'National';
					mapSVG.selectAll('.state-path').filter(function(d) { return d.properties.name !== 'DC'; })
						.style('opacity', 1);
					hoverText1 = '';
                    hoverText2 = '';
					UpdateHover();
					UpdateInfobox();
					return;
				}
				stateHovered = d.properties.name;
				mapSVG.selectAll('.state-path')
					.style('opacity', function(d) {
						if (stateClicked === d.properties.name) { return 1; }
						if (d.properties.name === 'DC') { return 0; }
						if (stateClicked === undefined && stateHovered === d.properties.name) { return vs.stateHoveredOpacity; }
						return 1;
					});
				hoverText1 = d.properties.name+': '+d.properties[that._category];
                hoverText2 = mapInstance._category;
				UpdateHover();
				UpdateInfobox();
				// console.log(projection.invert(d3.mouse(this)));
			})
			.on('mouseup', function() {
				return;
			})
			.on('mousedown', function(d) {
				// console.log('mousedown');
				var that = this;
				if (that === window) {
					that = d.currentNode;
				}
				// if (isMobile === true) {
					stateHovered = d.properties.name;
				// } else {
				// 	stateHovered = 'National';
				// }
				if (stateClicked === undefined) {
					stateClicked = d.properties.name;
					mapSVG.selectAll('.state-path').filter(function(d) { return d.properties.name !== 'DC'; })
						.style('pointer-events', 'all');
					d3.select(this).style('pointer-events', 'none');
				} else { // clicking on an already clicked state
					stateClicked = undefined;
					// if (isMobile === true) {
					// 	stateHovered = 'National';
					// }
					mapSVG.selectAll('.state-path').filter(function(d) { return d.properties.name !== 'DC'; })
						.style('pointer-events', 'all');
				}
				hoverText1 = d.properties.name+': '+d.properties[mapInstance._category];
                hoverText2 = mapInstance._category;
				UpdateHover();
				UpdateInfobox();
				mapInstance.UpdateMap();
			})
			.each(function(d) {
				if (d.properties.name === 'DC') {
					d3.select(this).attr('d', 'm25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z');
					if (stateClicked === 'DC') { d3.select(this).style('opacity', 1); }
					else { d3.select(this).style('opacity', 0); }
				} else {
					d3.select(this).attr('d', path);
				}
			});
		// ---
		stateGs
			.attr('transform', 'scale(1)');	
		statePaths
			.attr('transform', 'scale(1)')
			.each(function(d) {
				var svgBoundingRect = mapSVG[0][0].getBoundingClientRect();
				var stateBoundingRect = d3.select(this)[0][0].getBoundingClientRect();
				d.svgWidth = svgBoundingRect.width;
				d.svgHeight = svgBoundingRect.height;
				d.stateWidth = stateBoundingRect.width;
				d.stateHeight = stateBoundingRect.height;
				d.clickScale = 0.7*Math.min(d.svgWidth/d.stateWidth, d.svgHeight/d.stateHeight);
				d.transformOriginX = stateBoundingRect.left-svgBoundingRect.left+stateBoundingRect.width/2;
				d.transformOriginY = stateBoundingRect.top-svgBoundingRect.top+stateBoundingRect.height/2;
				if (stateHovered === d.properties.name || stateClicked === d.properties.name) {
					this.parentNode.parentNode.appendChild(this.parentNode);
					mapSVG.selectAll('g.hover-g')[0][0].parentNode.appendChild(mapSVG.selectAll('g.hover-g')[0][0]);
				}
			});
		//---
		stateGs
			.attr('transform', function(d) {
				var tx = d.transformOriginX - d.svgWidth/2;
				var ty = d.transformOriginY - d.svgHeight/2;
				if (stateClicked === d.properties.name) {
					return 'translate('+String(-tx)+','+String(-ty)+')';
				}
				return 'scale(1)';
			});
		statePaths
			.attr('transform', function(d) {
				var tx = d.transformOriginX;
				var ty = d.transformOriginY;
				if (d.properties.name === stateClicked) {
					return 'translate('+tx+','+ty+')scale('+d.clickScale+')translate('+String(-1*tx)+','+String(-1*ty)+')';
				} else {
				    return 'translate(0,0)';
                }
			})
			.style('opacity', function(d) {
				var oldOpacity = d3.select(this).style('opacity');
				if (stateClicked === d.properties.name) { return 1; }
				if (d.properties.name === 'DC') { return 0; }
				if (stateHovered === d.properties.name) { return vs.stateHoveredOpacity; }
				if (stateClicked !== undefined) { return vs.stateNotClickedOpacity; }
				return 1;
			})
			.style('stroke-width', function(d) {
				if (d.properties.name === stateClicked) {
					return String(1/d.clickScale) + 'px';
				}
				return '1px';
			})
			.transition().duration(animateDuration).ease(animateEase)
				.style('fill', function(d) {
					var grade = d.properties[that._category];
					if (grade === undefined) { return '#ccc'; }
					if (grade === '_') { return vs.gradeColorDefault; }
                    if (grade === 'Yes') { return vs.gradeColorYes; }
                    if (grade === 'No') { return vs.gradeColorDefault; }
					return colorScale(gradeScale(grade));
				});
		statePaths
			.filter(function(d) { 
				var gradeLetter = d.properties[that._category];
				return visibleGrades[gradeLetter] === false;
			})
			.transition().duration(animateDuration).ease(animateEase)
				.style('fill', vs.gradeColorDefault);
		//
		// stateThumbs = stateGs.selectAll('.state-thumb').data(function(d) { return [d]; }, function(d) { return d.properties.name; });
		// stateThumbs.enter().append('svg:image').classed('state-thumb', true);
		// this.UpdateThumbs();
		// Update font size and dependent objects
		mapFontSize = parseFloat(mapSVG.style('font-size'));
		hoverHeight = (vs.hoverShowCategoryName === true) ? 2*mapFontSize+3*vs.hoverMargin : mapFontSize+2*vs.hoverMargin;

		var hoverG = mapSVG.selectAll('g.hover-g').data([null]);
		var hoverGEnter = hoverG.enter().append('g').classed('hover-g', true);
		hoverGEnter.each(function() {
			d3.select(this).selectAll('rect.hover-rect').data([null])
				.enter().append('rect').classed('hover-rect', true)
					.attr('width', 0) // dynamic
				    .attr('height', hoverHeight)
				    .attr('x', 0) // dynamic
				    .attr('y', -1*hoverHeight-5);
			d3.select(this).selectAll('text.hover-text.row1').data([null])
				.enter().append('text').attr('class', 'hover-text row1')
					.attr('x', 0)
					.attr('y', -0.5*hoverHeight-5)
				    .text(stateHovered !== 'National' ? stateHovered : null);
			if (vs.hoverShowCategoryName === true) {
                d3.select(this).selectAll('text.hover-text.row2').data([null])
                    .enter().append('text').attr('class', 'hover-text row2')
                        .attr('x', 0)
                        .attr('y', -0.25*hoverHeight-5)
                        .text(stateHovered !== 'National' ? mapInstance._category: null);
            }
		});

		var oldSizeOfDom = sizeOfDOM;
		sizeOfDOM = d3.selectAll('*')[0].length;
		if (sizeOfDOM !== oldSizeOfDom) {
			console.log('sizeOfDOM='+String(sizeOfDOM)+' changed by '+String(sizeOfDOM-oldSizeOfDom));
		}

		// DEBUG
		if (window.debug) {
            body.selectAll('*').style('outline', '1px solid green');
			mapSVG.selectAll('rect.vertical-guide').data([null])
				.enter().append('rect').classed('vertical-guide', true);
			mapSVG.selectAll('rect.vertical-guide')
				.attr('x', this._width/2-1)
				.attr('y', 0)
				.attr('width', 2)
				.attr('height', this._height)
				.style('fill', 'darkorange');
		}
	}

	// this.UpdateThumbs = function() {
	// 	var thumbSize = 20;
	// 	body.selectAll('.state-thumb')
	// 		.attr('xlink:href', function(d,i) {
	// 			return i % 2 === 0 ? 'img/thumbs_up_36922.svg' : 'img/thumbs_down_36922.svg';
	// 		})
	// 		.attr('width', thumbSize+'px')
	// 		.attr('height', thumbSize+'px')
	// 		.attr('transform', function(d) {
	// 			var tx = d.transformOriginX-(1/2)*thumbSize;
	// 			var ty = d.transformOriginY-(1/2)*thumbSize;
	// 			return 'translate('+tx+','+ty+')';
	// 		});
	// }
}


function UpdateHover() {
	var hoverWidth, text1, text2, hoverG = mapSVG.selectAll('g.hover-g');
	text1 = hoverG.selectAll('text.hover-text.row1').text(hoverText1);
	if (hoverText1 === '') {
		hoverWidth = 0;
	} else if (vs.hoverShowCategoryName === true) {
		text2 = hoverG.selectAll('text.hover-text.row2').text(hoverText2);
		hoverWidth = Math.max(text1[0][0].getBBox().width, text2[0][0].getBBox().width)+2*vs.hoverMargin;
	} else {
		hoverWidth = text1[0][0].getBBox().width+2*vs.hoverMargin;
	}
	hoverG.selectAll('rect.hover-rect')
		.attr('width', hoverWidth)
		.attr('x', -0.5*hoverWidth);
	hoverG
		.attr('transform', function() {
			var mouseX, mouseY;
			if (stateClicked !== undefined) {
				return 'translate('+String(mapInstance._width/2)+','+String(mapInstance._height/2+3/4*hoverHeight)+')';
			} else {
				mouseX = d3.mouse(mapSVG[0][0])[0];
				mouseY = d3.mouse(mapSVG[0][0])[1];
				if (mouseX < hoverWidth/2 + 1) {
					mouseX = hoverWidth/2 + 1
				} else if (mouseX > parseInt(mapSVG.style('width')) - hoverWidth/2 - 1) {
					mouseX = parseInt(mapSVG.style('width')) - hoverWidth/2 - 1;
				}
				if (mouseY < hoverHeight + 5 + 1) {
				 	mouseY = hoverHeight + 5 + 1;
				}
				return 'translate('+mouseX+','+mouseY+')';
			}
		});
}


function BostockTextWrap(text, width) {
  text.each(function() {
    var text = d3.select(this);
    var x = text.attr('x');
    var numRows = 1;
    var words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr('y'),
        dy = text.attr('dy') === null ? 0 : parseFloat(text.attr('dy')),
        tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em');
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
        numRows += 1;
      }
    }
    var fontSize = parseFloat(getComputedStyle(this)['font-size']);
    text.attr('transform', 'translate(0,'+String(-1/2*(numRows-1)*fontSize)+')');
  });
}