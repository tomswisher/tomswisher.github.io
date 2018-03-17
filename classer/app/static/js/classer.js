'use strict';

// Settings
var logs = true;
var debug = false;
var groupsArray = [
	{'name':'Laughter',},
	{'name':'Speech',  },
	// {'name':'Clapping',},
];
groupsArray.forEach(function(d, i) {
	d.color = d3.select('span.color-ref.group'+i).style('color');
});
var arrowJumpDuration = 0.5;
var minPxPerSec = 20;
var secondsHeight = 20;
var blocksHeight = 60;
var blocksPerSec = 10;
var playbackSpeed = 1.0;
var svgsMargin = 10;
var wavesurferOpts = {
    height        : 128,
    // waveColor     : 'black', //'#999',
    // progressColor : '#999', //'#555',
    // cursorColor   : '#333',
    // cursorWidth   : 1,
    // skipLength    : 2,
    // minPxPerSec   : minPxPerSec, //20,
    // pixelRatio    : window.devicvicePixelRatio,
    fillParent    : false, //true,
    // scrollParent  : false,
    // hideScrollbar : false,
    // normalize     : false,
    // audioContext  : null,
    container     : '#wavesurfer-container', //null,
    // dragSelection : true,
    // loopSelection : true,
    // audioRate     : 1,
    // interact      : true,
    // splitChannels : false,
    // mediaContainer: null,
    // mediaControls : false,
    // renderer      : 'Canvas',
    // backend       : 'WebAudio',
    // mediaType     : 'audio',
    // autoCenter    : true,
};
var body = d3.select('body');
var trackLoadButton = body.select('#track-load-button');
var trackClearButton = body.select('#track-clear-button');
var trackURLLabel = body.select('#track-url-label');
var trackInput = body.select('#track-input');
var loadingLabel = body.select('#loading-label');
var appContainer = body.select('#app-container');
var wavesurferContainer = body.select('#wavesurfer-container');
var svgsContainer = body.select('#svgs-container');
var secondsSvg;
var blocksSvgs, blocksData, blocksRects;
var playPauseButton = body.select('#play-pause-button');
var currentTimeLabel = body.select('#current-time-label');
var stopButton = body.select('#stop-button');
// var keyPressedLabel = body.select('#key-pressed-label');
// var zoomSlider = body.select('#zoom-slider');
// var zoomLabel = body.select('#zoom-label');
var speedLabel = body.select('#speed-label');
var speedSlider = body.select('#speed-slider');
var exportDataButton = body.select('#export-data-button');
var debugContainer = body.select('#debug-container');
var playerLine = body.select('#player-line');
var wavePlaying, waveformWidth;
var numSeconds, startTime, exportTime, oldTime, oldSecondsFloat, secondsFloat;
var exportedData, symbols, previousGroup;
// var zoomValue;
// var brushes, brushNodes, oldExtent, isResizing;

var trackPromptText = 'Click to choose a track';
// var defaultTrackURL = 'Yoko Kanno & Origa - Inner Universe (jamiemori remix).mp3';
// var defaultTrackURL = '08 Smashed Pennies.m4a';
var defaultTrackURL = '08_smashed_pennies_(m4a)_7.wav';
var trackURL = defaultTrackURL;
try {
	if (sessionStorage.trackURL === undefined) {
		sessionStorage.setItem('trackURL', trackURL);
	} else {
		trackURL = sessionStorage.trackURL;
	}
} catch(e) {
	console.log(e);
}

var wavesurfer = WaveSurfer.create(wavesurferOpts);
wavesurfer.on('loading', function(a) {
	// Fires continuously when loading via XHR or drag'n'drop. Callback will receive (integer) loading progress in percents [0..100] and (object) event target.
	// loadingLabel.text('Loading at '+a+'%');
	loadingLabel.text('Loading...');
});
wavesurfer.on('error', function(xhrError) {
	// Occurs on error. Callback will receive (string) error message.
	loadingLabel.text('Error in loading '+trackURL);
});
wavesurfer.on('ready', function() {
	// When audio is loaded, decoded and the waveform drawn.
	// SetLoadedClass('loaded');
	loadingLabel.text('Space = play & pause, X = apply class, Z = remove class, Arrows & IJKL = move');
	Main();
});

loadingLabel.text('');
trackLoadButton
	.on('click', function() {
		SetLoadedClass('unloaded');
		$(document).off();
		svgsContainer.selectAll('*').remove();
		loadingLabel.text('');
		trackURLLabel.text(trackURL);
		wavesurfer.load('../static/audio/'+trackURL);
	});
trackClearButton
	.on('click', function() {
		SetLoadedClass('unloaded');
		stopButton.node().dispatchEvent(new Event('click'));
		speedSlider.node().value = '1.0';
		speedSlider.node().dispatchEvent(new Event('change'));
		$(document).off();
		svgsContainer.selectAll('*').remove();
		loadingLabel.text('');
		trackURLLabel.text(trackPromptText);
		trackURL = defaultTrackURL;
		trackInput.node().value = ''; // Clear the FileList
		try {
			sessionStorage.setItem('trackURL', defaultTrackURL);
		} catch(e) {
			console.log(e);
		}
	});
trackURLLabel
	.text((trackURL !== defaultTrackURL) ? trackURL : trackPromptText)
	.on('click', function() {
		if (!wavesurfer.backend.isPaused()) {
			playPauseButton.node().dispatchEvent(new Event('click'));
		}
		trackInput.node().click();
	})
	.on('keydown', function() {
		if (d3.event.code === 'Enter') {
			this.dispatchEvent(new Event('click'));
		}
	});
trackInput
    .on('change', function() {
    	trackURL = this.files[0].name;
    	try {
    		sessionStorage.setItem('trackURL', trackURL);
    	} catch(e) {
    		console.log(e);
    	}
    	trackURLLabel.text(trackURL);
    });

if (debug) { debugContainer.classed('hidden', false); }


// ---------------------------------------------------------------------


function SetLoadedClass(state) {
	if (state === 'loaded') {
		body.classed('loaded', true);
	} else if (state === 'unloaded') {
		body.classed('loaded', false);
	}
};

function Main() {
	previousGroup = 0;
	oldTime = 0;
	oldSecondsFloat = 0;
	secondsFloat = 0;
	numSeconds = Math.ceil(wavesurfer.getDuration());
	// var wsZoomScale = d3.scale.linear()
	// 	.domain([1,2])
	// 	.range([wavesurfer.drawer.params.minPxPerSec, 2*wavesurfer.drawer.params.minPxPerSec]);
	// zoomValue = Number(zoomSlider.node().value);
	// minPxPerSec = wsZoomScale(zoomValue);
	// wavesurfer.zoom(minPxPerSec); // this is not initialized by WaveSurfer for some reason
	// zoomLabel.text(zoomValue.toFixed(1)+' ('+parseInt(minPxPerSec)+'\tpixels/s)');
	startTime = new Date().getTime();
	waveformWidth = Math.ceil(minPxPerSec*wavesurfer.getDuration());
	appContainer.style('width', waveformWidth+2*10+'px');
	wavesurferContainer.selectAll('wave')
		.style('width', waveformWidth+'px')
		.style('height', wavesurferOpts.height+'px');
	wavePlaying = wavesurferContainer.select('wave wave');

	blocksData = [];
	for (var groupIndex=0; groupIndex<(groupsArray.length); groupIndex++) {
		blocksData[groupIndex] = d3.range(numSeconds*blocksPerSec)
			.map(function(d) { return {'classified':false, 'time':(d/blocksPerSec)}; });
	}
	symbols = [];
	blocksRects = [];
	blocksSvgs = svgsContainer.selectAll('svg.blocks-svg').data(blocksData).enter().append('svg')
		.attr('class', 'blocks-svg inlineblock')
		.attr('width', waveformWidth)
		.attr('height', blocksHeight)
		.attr('tabindex', function(d, i) { return 4+i; })
		.each(function(d, groupIndex) {
			blocksRects[groupIndex] = d3.select(this).selectAll('rect.block').data(d).enter().append('rect')
				.attr('class', function(d) { return 'block group'+groupIndex; })
				.attr('x', function(d, i) { return i*minPxPerSec/blocksPerSec; })
				.attr('y', 0)
				.attr('width', minPxPerSec/blocksPerSec)
				.attr('height', blocksHeight)
				.on('mousedown', function(d, i) {
					if (logs) console.log('seekTo '+d.time/numSeconds+'s');
					wavesurfer.seekTo(d.time/numSeconds);
				});
		});

	secondsSvg = svgsContainer.append('svg')
		.attr('class', 'seconds-svg inlineblock')
		.attr('width', waveformWidth+2*10)
		.attr('height', secondsHeight)
		.append('g')
			.attr('class', 'text-origin')
			.attr('transform', 'translate('+svgsMargin+',0)');
	var secondLabels = secondsSvg.selectAll('text.label').data(d3.range(numSeconds+1));
	secondLabels.enter().append('text')
		.classed('label', true)
		.attr('x', function(d) { return d*minPxPerSec; })
		.attr('y', 0.5*secondsHeight)
		.text(function(d) { return d; });

	wavesurfer.on('audioprocess', function(time) {
		// Fires continuously as the audio plays. Also fires on seeking.
		if (time < oldTime) { return; } // bug in audioprocess that sets time to 0.xxx secondsFloat
		oldTime = time;
		secondsFloat = Math.round(10*time)/10;
		// if (secondsFloat === wavesurfer.getDuration()) {
		// 	stopButton.node().dispatchEvent(new Event('click'));
		// 	return;
		// }
		if (secondsFloat !== oldSecondsFloat && secondsFloat !== wavesurfer.getDuration()) {
			oldSecondsFloat = secondsFloat;
			UpdateBlock('audioprocess', parseInt(secondsFloat*blocksPerSec));
		}
	});
	wavesurfer.on('seek', function(progress) {
		// On seeking. Callback will receive (float) progress [0..1].
		oldTime = progress*wavesurfer.getDuration();
		secondsFloat = Math.round(10*oldTime)/10;
		currentTimeLabel.text(secondsFloat.toFixed(1)+' s');
		UpdatePlayerLine();
		// UpdateBlock('seek', parseInt(secondsFloat*blocksPerSec));
	});
	wavesurfer.on('play', function() {
		// When play starts.
		UpdateBlock('audioprocess', parseInt(secondsFloat*blocksPerSec));
	});
	wavesurfer.on('finish', function() {
		// – When it finishes playing.
		wavesurfer.backend.pause();
	});
	// wavesurfer.on('zoom', function(minPxPerSec) {
	// 	On zooming. Callback will receive (integer) minPxPerSec.
	// });
	// wavesurfer.on('error', function(a, b, c, d, e, f) {
	// 	// Occurs on error. Callback will receive (string) error message.
	// 	if (logs) console.log('error');
	// 	if (logs) console.log(a, b, c, d, e, f);
	// });
	// wavesurfer.on('pause', function() {
	// 	// When audio is paused.
	// 	if (logs) console.log('pause');
	// });
	// wavesurfer.on('scroll', function(scrollEvent) {
	// 	// When the scrollbar is moved. Callback will receive a ScrollEvent object.
	// 	if (logs) console.log('scroll');
	// 	if (logs) console.log(scrollEvent);
	// });

	playPauseButton
        .text('Play')
		.on('click', function() {
			if (secondsFloat === wavesurfer.getDuration()) {
				wavesurfer.backend.pause();
				stopButton.node().dispatchEvent(new Event('click'));
			} else {
				wavesurfer.playPause();
				playPauseButton.text(wavesurfer.backend.isPaused()?'Play':'Pause');
			}
		});

	stopButton
		.on('click', function() {
			if (wavesurfer.backend.isPaused() === false) {
				playPauseButton.node().dispatchEvent(new Event('click'));
			}
			oldTime = 0;
			secondsFloat = 0;
			wavesurfer.seekTo(0);
			currentTimeLabel.text(secondsFloat.toFixed(1)+' s');
			body.select('wave').node().scrollLeft = 0;
		});

    speedSlider
        .on('change', function(thing) {
        	console.log('speedSlider', this.value);
        	// ClearBrushes();
            playbackSpeed = this.value;
            speedLabel.text('Playback Speed: x '+parseFloat(playbackSpeed).toFixed(1));
            wavesurfer.setPlaybackRate(playbackSpeed);
            // UpdateBlock('speed-slider', parseInt(secondsFloat*blocksPerSec));
        });

	// zoomSlider
	// 	.on('change', function() {
	// 		ClearBrushes();
 //            UpdateBlock('zoom-sliderStart', parseInt(secondsFloat*blocksPerSec));
	// 		zoomValue = Number(this.value);
	// 		minPxPerSec = wsZoomScale(zoomValue);
	// 		wavesurfer.zoom(minPxPerSec);
	// 		zoomLabel.text(zoomValue.toFixed(1)+' ('+parseInt(minPxPerSec)+'\tpixels/s)');
	// 		waveformWidth = Math.ceil(minPxPerSec*wavesurfer.getDuration());
	// 		blocksIndexToPx.range([0, waveformWidth]);
	// 		svg.attr('width', waveformWidth);
	// 		blocksRects
	// 			.attr('transform', function(d, i) {
	// 				var xT = i*minPxPerSec/blocksPerSec;
	// 				var yT = 0;
	// 				return 'translate('+xT+','+yT+')';
	// 			})
	// 			.each(function(d) {
	// 				d3.select(this).selectAll('rect')
	// 					.attr('width', minPxPerSec/blocksPerSec);
	// 				// d3.select(this).selectAll('text')
	// 				// 	.attr({
	// 				// 		x: 0.5*minPxPerSec/blocksPerSec,
	// 				// 	});
	// 			});
	// 		secondLabels
	// 			.attr({
	// 				x: function(d) { return d*minPxPerSec; },
	// 			});
 //            UpdateBlock('zoom-sliderEnd', parseInt(secondsFloat*blocksPerSec));
	// 	});

	exportDataButton
		.on('click', function() {
			stopButton.node().dispatchEvent(new Event('click'));
			ExportData();
		});

	body
		.on('keydown',  function() { HandleKeyEvent(d3.event); })
		// .on('keypress', function() { HandleKeyEvent(d3.event); })
		.on('keyup',    function() { HandleKeyEvent(d3.event); });
	// $(document)
	// 	.on('keydown', OnKeydown)
	// 	.on('keyup', OnKeyup);

	wavesurfer.play(); // Initialize the AudioBufferSourceNode
	wavesurfer.pause();
	wavesurfer.seekTo(1);
	wavesurfer.seekTo(0);
	setTimeout(function() {
		SetLoadedClass('loaded');
		UpdateBlock('load', parseInt(secondsFloat*blocksPerSec));
		blocksSvgs.nodes()[0].focus();
		playerLine
			.style('height', appContainer.node().getBoundingClientRect().height+'px')
			.style('top', appContainer.node().getBoundingClientRect().top+'px');
	}, 100);

	function IsClassed(symbol) {
		switch (symbol.toUpperCase()) {
			case 'Z':
			// case 'X':
				return false;
			case 'X':
			// case 'C':
			// case 'V':
				return true;
			default:
				return null;
		};
	};

	function HandleKeyEvent(event) {
		if (body.classed('loaded') === false) { return; }
		// if (logs) console.log((event.type==='keydown'?'keydown':'keyup  '), event.key, symbols);
		
		if (event.key === 'Tab') { return; }
		if (event.key === 'Enter') { return; }
		if (event.key === 'CapsLock') {
			event.preventDefault();
		}
		if (event.code === 'Space') {
			event.preventDefault();
			if (event.type === 'keydown') {
				playPauseButton.node().dispatchEvent(new Event('click'));
			}
		}
		var newSymbol = event.key.toUpperCase();
		if (['Z','X','I','K','J','L','ARROWUP','ARROWDOWN','ARROWLEFT','ARROWRIGHT'].indexOf(newSymbol) === -1) { return; }
		if (document.activeElement === speedSlider.node()) { return; }

		event.preventDefault();
		var activeGroup = blocksSvgs.nodes().indexOf(document.activeElement);
		if ((newSymbol === 'I' || newSymbol === 'ARROWUP') && event.type === 'keydown') {
			activeGroup = Math.max(0, activeGroup-1);
		}
		if ((newSymbol === 'K' || newSymbol === 'ARROWDOWN') && event.type === 'keydown') {
			activeGroup = Math.min(activeGroup+1, groupsArray.length-1);
		}
		var oldSecondsFloat = secondsFloat;
		if ((newSymbol === 'J' || newSymbol === 'ARROWLEFT') && event.type === 'keydown') {
			secondsFloat = Math.max(secondsFloat-arrowJumpDuration, 0);
			if (symbols[0] !== undefined) {
				for (var i=parseInt(oldSecondsFloat*blocksPerSec); i>parseInt(secondsFloat*blocksPerSec); i--) {
					if (i < numSeconds*blocksPerSec) {
						UpdateBlock('J/ARROWLEFT', i);
					}
				}
			}
			wavesurfer.seekTo(secondsFloat/numSeconds);
		}
		if ((newSymbol === 'L' || newSymbol === 'ARROWRIGHT') && event.type === 'keydown') {
			if (secondsFloat+arrowJumpDuration >= wavesurfer.getDuration()) {
				secondsFloat = wavesurfer.getDuration();
				wavesurfer.backend.pause();
			} else {
				secondsFloat = secondsFloat+arrowJumpDuration;
			}
			if (symbols[0] !== undefined) {
				for (var i=parseInt(oldSecondsFloat*blocksPerSec); i<parseInt(secondsFloat*blocksPerSec); i++) {
					UpdateBlock('L/ARROWRIGHT', parseInt(i));
				}
			}
			wavesurfer.seekTo(secondsFloat/numSeconds);
		}
		if (activeGroup === -1) {
			activeGroup = previousGroup;
		}
		previousGroup = activeGroup;
		blocksSvgs.nodes()[activeGroup].focus();
		if (['Z','X'].indexOf(newSymbol) === -1) { return; }

		var symbolIndex = symbols.indexOf(newSymbol);
		if (event.type === 'keydown') {
			if (symbolIndex === -1) {
				symbols.push(newSymbol);
			}
		}
		if (event.type === 'keyup') {
			if (symbolIndex !== -1) {
				symbols.splice(symbolIndex, 1);
			}
		}
	};

	function UpdatePlayerLine() {
		playerLine
			.style('left', (-1+wavePlaying.node().getBoundingClientRect().right)+'px');
	};

	function UpdateBlock(source, blocksIndex) {
		if (body.classed('loaded') === false) { return; }
		currentTimeLabel.text(secondsFloat.toFixed(1)+'s');
		UpdatePlayerLine();
		if (symbols.length === 0) { return; }
		var activeGroup = blocksSvgs.nodes().indexOf(document.activeElement);
		if (activeGroup === -1) { return; }
		// if (logs) console.log(secondsFloat.toFixed(1)+'s', source, blocksIndex, activeGroup, symbols);
		var isClassed = IsClassed(symbols[0]);
		if (isClassed === null || isClassed === blocksData[activeGroup][blocksIndex]['classified']) {
			return;
		}

	    blocksData[activeGroup][blocksIndex]['classified'] = isClassed;
	    d3.select(blocksRects[activeGroup].nodes()[blocksIndex]).classed('classified', isClassed);

	    // if (debug) {
	    // 	var keyValueArray = [];
	    // 	var usedKeyHash = {};
	    // 	var valueString;
	    // 	var testRegExp = new RegExp('^get');
	    // 	var skippedKeysHash = {
	    // 		'wavesurfer.backend': ['gainNode', 'getAudioContext', 'getOfflineAudioContext', 'handlers'],
	    // 		'wavesurfer': ['backend', 'defaultParams', 'drawer', 'Drawer', 'getArrayBuffer', 'handlers', 'WebAudio']
	    // 	};
	    // 	var indentString;
	    // 	function addKeyValuePairs(myObject, keyText, indent) {
	    // 		var indentString = Array(indent).join('    ');
	    // 		var skippedKeys = (skippedKeysHash[keyText] !== undefined) ? skippedKeysHash[keyText] : [];
	    // 		// if (logs) console.log('Looping over key '+keyText+'" skipping:', skippedKeys);
	    // 		$.each(myObject, function(key, value) {
	    // 			// if (logs) console.log(indentString+'"'+key+'", '+typeof(value));
	    // 			if (skippedKeys.indexOf(key) !== -1) { return; }
	    // 			if (usedKeyHash[key] !== undefined) { return; }
	    // 			if (typeof(value) === 'function' && testRegExp.test(key) === true) {
	    // 				// if (logs) console.log(indentString, value, myObject);
	    // 				valueString = JSON.stringify(value.apply(myObject));
	    // 			} else {
	    // 				valueString = JSON.stringify(value);
	    // 			}
	    // 			if ([undefined, '{}'].indexOf(valueString) !== -1) { return; }
	    // 			if (typeof(value) === 'object' && value !== null) {
	    // 				// if (logs) console.log(indentString+'Stepping in to  "'+key+'" from "'+keyText+'" skipping:', skippedKeys);
	    // 				addKeyValuePairs(value, key, indent+1);
	    // 			} else {
	    // 				usedKeyHash[key] = valueString;
	    // 			}
	    // 		});
	    // 		// if (logs) console.log(indentString+'Done looping for "'+keyText+'"\n\n');
	    // 	};
	    // 	addKeyValuePairs(wavesurfer.backend, 'wavesurfer.backend', 0);
	    // 	addKeyValuePairs(wavesurfer, 'wavesurfer', 0);
	    // 	var metadata = {
	    // 		trackURL:trackURL,
	    // 		trackDurationSec:wavesurfer.getDuration(),
	    // 		blocksPerSec:blocksPerSec,
	    // 		startTime:startTime,
	    // 		exportTime:exportTime,
	    // 		elapsedSec:(exportTime-startTime)/1000,
	    // 		playbackSpeed:playbackSpeed,
	    // 		// zoomValue:zoomValue,
	    // 	};
	    // 	addKeyValuePairs(metadata, 'metadata', 0);

	    // 	$.each(usedKeyHash, function(key, value) {
	    // 		keyValueArray.push({ 'key':key, 'value':value });
	    // 	});

	    // 	var rows = debugContainer.selectAll('div.plain-text').data(keyValueArray);
	    // 	rows.exit().remove();
	    // 	rows.enter().append('div').attr('class', 'plain-text').each(function(d) {
    	// 		d3.select(this).append('span').attr('class', 'key-text');
    	// 		d3.select(this).append('span').attr('class', 'value-text');
    	// 	});
	    // 	rows.each(function(d) {
	    // 		var oldValue = d3.select(this).selectAll('span.value-text').attr('old-value');
	    // 		if (String(d.value) !== String(oldValue)) {
	    // 			d3.select(this).selectAll('span').interrupt()
	    // 				.style('color', 'red').transition().duration(1000).style('color', 'black');
	    // 		}
    	// 		d3.select(this).selectAll('span.key-text').text(d.key);
    	// 		d3.select(this).selectAll('span.value-text').text(d.value);
    	// 		d3.select(this).selectAll('span.value-text').attr('old-value', d.value);
    	// 	});
	    // };
	};

	function ExportData() {
		exportTime = new Date().getTime();
		exportedData = {};
		exportedData.metadata = {
			trackURL: trackURL,
			trackDurationSec: wavesurfer.getDuration(),
			blocksPerSec: blocksPerSec,
			startTime: startTime,
			exportTime: exportTime,
			elapsedSec: (exportTime-startTime)/1000,
			groupsArray: groupsArray,
			playbackSpeed: playbackSpeed,
			// zoomValue: zoomValue,
		};
		exportedData.blocksData = blocksData;
		exportedData.blocksDataRefined = [];
		var blocksDataTranspose = blocksData[0].map(function(col, i) {
			return blocksData.map(function(row, j) {
				return row[i];
			});
		});
		$.each(blocksDataTranspose, function(blocksIndex, blockDatum) {
			var classifiedArray = [];
			$.each(blockDatum, function(groupIndex, d) {
				if (d['classified'] === true) { classifiedArray.push(groupIndex); }
			});
			exportedData.blocksDataRefined.push([blockDatum[0].time, classifiedArray]);
		});
		if (logs) console.log(exportedData.metadata);
		if (logs) console.log(exportedData.blocksDataRefined);
		$.ajax({
			type: 'POST',
			url: 'exportedData',
			dataType: 'json',
			data: JSON.stringify(exportedData),
            async: false,
			success: function() {
                if (logs) console.log('success');
            },
		});
	};
};