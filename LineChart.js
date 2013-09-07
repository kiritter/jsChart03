var LineChart = function() {
	"use strict";

	//--------------------------------------------------------------------------------
	var CONST = {
		DATE : "date"
		, UL_NM : "UL"
		, LL_NM : "LL"
		, ERR_SUFFIX : "_ERR"
	};

	//--------------------------------------------------------------------------------
	var convDateFromString = function(dataset) {
		var parseDate = d3.time.format("%Y%m%d %H%M%S").parse;

		dataset.forEach(function(d) {
			d.date = parseDate(d.date);
		});
	};

	var convDataset = function(dataset, headerNames) {
		var hNms = headerNames.slice(0);
		hNms.push(CONST.UL_NM);
		hNms.push(CONST.LL_NM);

		var series = hNms.map(function(name) {
			return {
				name: name,
				values: dataset.map(function(d) {
					return {date: d.date, data: d[name], err: d[name + CONST.ERR_SUFFIX]};
				})
			};
		});

		return series;
	};

	var getHeaderNames = function(dataset) {
		return d3.keys(dataset[0])
			.filter(function(key) {
				var ret;

				var arr = [CONST.DATE, CONST.UL_NM, CONST.LL_NM];
				ret = arr.indexOf(key);
				if (ret !== -1) {
					return false;
				}

				var pattern = CONST.ERR_SUFFIX + "$";
				ret = (new RegExp(pattern)).test(key);
				if (ret === true) {
					return false;
				}

				return true;
			});
	};

	var getColors = function(headerNames) {
		var colors = d3.scale.category10();
		colors.domain(headerNames);
		return colors;
	};

	var getConstMinMax = function(dataset, headerNames) {
		var MIN_DATA_X = d3.min(dataset, function(d) {return d.date;});
		var MAX_DATA_X = d3.max(dataset, function(d) {return d.date;});
		var MIN_DATA_Y = d3.min(dataset, function(d) {
			var min = 99999;
			for (var i = 0; i < headerNames.length; i++) {
				if (min > d[headerNames[i]]) {
					min = d[headerNames[i]];
				}
			}
			return min;
		});
		var MAX_DATA_Y = d3.max(dataset, function(d) {
			var max = -99999;
			for (var i = 0; i < headerNames.length; i++) {
				if (max < d[headerNames[i]]) {
					max = d[headerNames[i]];
				}
			}
			return max;
		});

		var obj = {};

		var prevDate = new Date(MIN_DATA_X.getFullYear(), MIN_DATA_X.getMonth(), MIN_DATA_X.getDate() - 1, MIN_DATA_X.getHours());
		var nextDate = new Date(MAX_DATA_X.getFullYear(), MAX_DATA_X.getMonth(), MAX_DATA_X.getDate() + 1, MAX_DATA_X.getHours());
		obj.MIN_X = prevDate;
		obj.MAX_X = nextDate;

		var pad_y = (MAX_DATA_Y - MIN_DATA_Y) * 0.2;
		obj.MIN_Y = MIN_DATA_Y - pad_y;
		obj.MAX_Y = MAX_DATA_Y + pad_y;

		return obj;
	};

	var calcScale = function(constObj, chartSize) {
		var scaleX = d3.time.scale()
			.domain([constObj.MIN_X, constObj.MAX_X])
			.range([0, chartSize.WIDTH]);

		var scaleY = d3.scale.linear()
			.domain([constObj.MIN_Y, constObj.MAX_Y])
			.range([chartSize.HEIGHT, 0]);

		return {x: scaleX, y: scaleY};
	};

	var createSVG = function(elementId, outerSize, MARGIN) {
		var svg = d3.select(elementId)
			.append("svg")
			.attr("width", outerSize.WIDTH)
			.attr("height", outerSize.HEIGHT)
			.append("g")
			.attr("class", "innerBox")
			.attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

		return svg;
	};
	var createChartG = function(svg, PADDING) {
		var g = svg.append("g")
			.attr("class", "chartBody")
			.attr("transform", "translate(" + PADDING.left + "," + PADDING.top + ")");

		return g;
	};
	var createClipBox = function(chartG, defs, elementId, width, height) {
		defs.append("clipPath")
			.attr("id", elementId)
			.append("rect")
			.attr("width", width)
			.attr("height", height);

		var clipBox = chartG.append("g")
			.attr("clip-path", "url(#" + elementId + ")");

		return clipBox;
	};
	var createDraggable = function(chartG, chartSize) {
		chartG.append("rect")
			.attr("width", chartSize.WIDTH)
			.attr("height", chartSize.HEIGHT)
			.attr("class", "draggable");
	};

	var createAxis = function(chartG, scaleObj, chartSize) {
		var xAxis = d3.svg.axis()
			.scale(scaleObj.x)
			.orient("bottom")
			.ticks(0);

		var yAxis = d3.svg.axis()
			.scale(scaleObj.y)
			.orient("left")
			.ticks(10);

		chartG.append("g")
			.attr("class", "axis x")
			.attr("transform", "translate(0," + chartSize.HEIGHT + ")");

		chartG.append("g")
			.attr("class", "axis y");

		return {x: xAxis, y: yAxis};
	};

	var createLabelAxisX = function(clipBox, dataset, scaleObj, constObj) {
		var labels = 
		clipBox.append("g")
			.attr("class", "axisX")
			.selectAll("text.labelAxisX")
			.data(dataset)
			.enter()
			.append("text")
			.attr("y", function(d) {
				return scaleObj.y(constObj.MIN_Y - 0.05);
			})
			.attr("class", "labelAxisX")
			.attr("text-anchor", "middle");

		labels.each(function(d, i) {
			var el = d3.select(this);
			var format = d3.time.format("%m/%d %H:%M");
			var strDate = format(d.date);
			var splits = strDate.split(" ");

			var tspan;
			tspan = el.append("tspan")
				.text(splits[0])
				.attr("dy", 0);
			tspan = el.append("tspan")
				.text(splits[1])
				.attr("dy", 10);
		});

		var lineG = 
		clipBox.append("g")
			.attr("class", "axisXTick")
			.selectAll("line.axisXTickLine")
			.data(dataset)
			.enter()
			.append("line")
			.attr("class", "axisXTickLine")
			.attr("y1", scaleObj.y(constObj.MAX_Y))
			.attr("y2", scaleObj.y(constObj.MIN_Y));
	};

	var createPathData = function(clipBox, datasetSeries, scaleObj, colors) {
		var series = 
			clipBox.selectAll("g.series")
				.data(datasetSeries)
				.enter()
				.append("g")
				.attr("class", "series");

		series.append("path")
			.attr("class", function(d) {
				if (d.name === CONST.UL_NM || d.name === CONST.LL_NM) {
					return "pathCL";
				}else{
					return "pathData";
				}
			})
			.style("stroke", function(d) {
				if (d.name === CONST.UL_NM || d.name === CONST.LL_NM) {
					return "red";
				}else{
					return colors(d.name);
				}
			});

		var seriesWithoutCL =
			series.filter(function(d) {
				if (d.name === CONST.UL_NM || d.name === CONST.LL_NM) {
					return false;
				}else{
					return true;
				}
			});

		seriesWithoutCL.selectAll("circle")
			.data(function(d) {
				var len = d.values.length;
				for (var i = 0; i < len; i++) {
					d.values[i].name = d.name;
				}
				return d.values;
			})
			.enter()
			.append("circle")
			.attr("cy", function(d) {
				return scaleObj.y(d.data);
			})
			.attr("r", function(d) {
				var r;
				if (d.err !== "") {
					r = 4;
				}else{
					r = 3.5;
				}
				return r;
			})
			.attr("fill", function(d) {
				return colors(d.name);
			})
			.attr("class", function(d) {
				var classNm;
				if (d.err !== "") {
					classNm = "pointError";
				}else{
					classNm = "point";
				}
				return classNm;
			});

		seriesWithoutCL.selectAll("text.labelData")
			.data(function(d) {
				return d.values;
			})
			.enter()
			.append("text")
			.attr("y", function(d) {
				return scaleObj.y(d.data);
			})
			.text(function(d) {
				return d.data;
			})
			.attr("fill", function(d) {
				return colors(d.name);
			})
			.attr("class", "labelData");

	};

	var drawLegend = function(svg, datasetSeries, innerSize, PADDING, colors) {
		var marginTop = [];
		for (var i = 0; i < datasetSeries.length; i++) {
			marginTop.push(30 * i);
		}
		var legend = 
			svg.append("g")
				.attr("class", "legend")
				.attr("transform", "translate(" + (innerSize.WIDTH - PADDING.right) + "," + (PADDING.top + 20) + ")");

		var legendSeries = 
		legend.selectAll("g.legendSeries")
			.data(datasetSeries)
			.enter()
			.append("g")
			.attr("transform", function(d, i) {
				return "translate(10," + marginTop[i] + ")";
			})
			.attr("class", "legendSeries");

		var lineWidth = 40;
		legendSeries.each(function(d) {
			var el = d3.select(this);

			el.append("line")
				.attr("class", function(d) {
					if (d.name === CONST.UL_NM || d.name === CONST.LL_NM) {
						return "pathCL";
					}else{
						return "pathData";
					}
				})
				.attr("x1", 0)
				.attr("y1", 0)
				.attr("x2", lineWidth)
				.attr("y2", 0)
				.style("stroke", function(d) {
					if (d.name === CONST.UL_NM || d.name === CONST.LL_NM) {
						return "red";
					}else{
						return colors(d.name);
					}
				});

			if (d.name !== CONST.UL_NM && d.name !== CONST.LL_NM) {
				el.append("circle")
					.attr("cx", lineWidth/2)
					.attr("cy", 0)
					.attr("r", 3.5)
					.attr("fill", function(d) {
						return colors(d.name);
					});
			}

			el.append("text")
				.attr("x", 0)
				.attr("y", 15)
				.text(function(d) {
					return d.name;
				})
				.attr("class", "labelSeriesName")
				.attr("fill", function(d) {
					if (d.name === CONST.UL_NM || d.name === CONST.LL_NM) {
						return "red";
					}else{
						return colors(d.name);
					}
				});
		});
	};

	var drawAll = function(zoom, chartG, axisObj, chartSize, scaleObj, intervalWidth) {
		var t = zoom.translate();
		var s = zoom.scale();

		var tx = t[0];
		var ty = t[1];
		tx = Math.min(0, Math.max(chartSize.WIDTH * (1 - s), tx));
		zoom.translate([tx, ty]);

		chartG.select("g.axis.x").call(axisObj.x);
		chartG.select("g.axis.y").call(axisObj.y);

		var line = d3.svg.line()
			.x(function(d) {
				return scaleObj.x(d.date);
			})
			.y(function(d) {
				return scaleObj.y(d.data);
			});

		chartG.selectAll("path.pathData")
			.attr("d", function(d) {
				return line(d.values);
			});
		chartG.selectAll("path.pathCL")
			.attr("d", function(d) {
				return line(d.values);
			});

		chartG.selectAll("circle.pointError")
			.attr("cx", function(d) {
				return scaleObj.x(d.date);
			});
		chartG.selectAll("circle.point")
			.attr("cx", function(d) {
				return scaleObj.x(d.date);
			});

		var labels = chartG.selectAll("text.labelAxisX")
			.attr("x", function(d) {
				return scaleObj.x(d.date);
			});

		intervalWidth = intervalWidth * s;
		var num = Math.ceil(45 / intervalWidth);
		if (num === 3) {
			num = 4;
		}

		labels.each(function(d, i) {
			var el = d3.select(this);
			el.selectAll("tspan")
				.attr("x", el.attr("x"))
				.attr("class", function() {
					if (i % num === 0) {
						return "";
					}else{
						return "nodisplay";
					}
				});
		});

		chartG.selectAll("line.axisXTickLine")
			.attr("x1", function(d) {
				return scaleObj.x(d.date);
			})
			.attr("x2", function(d) {
				return scaleObj.x(d.date);
			})
			.attr("class", function(d, i) {
				if (i % num === 0) {
					return "axisXTickLine";
				}else{
					return "axisXTickLine nodisplay";
				}
			});

		chartG.selectAll("text.labelData")
			.attr("x", function(d) {
				return scaleObj.x(d.date) + 10;
			})
			.attr("class", function(d, i) {
				if (num === 1) {
					return "labelData";
				}else{
					return "labelData nodisplay";
				}
			});
	};


	//--------------------------------------------------------------------------------
	var drawLineChart = function(elementId, dataset) {

		var MARGIN = {top: 0, right: 20, bottom: 0, left: 0};
		var PADDING = {top: 10, right: 50, bottom: 50, left: 30};

		//--------------------------------------------------
		var outerSize = {
			WIDTH: 640
			, HEIGHT: 380
		};
		var innerSize = {
			WIDTH: outerSize.WIDTH - (MARGIN.left + MARGIN.right)
			, HEIGHT: outerSize.HEIGHT - (MARGIN.top + MARGIN.bottom)
		};
		var chartSize = {
			WIDTH: innerSize.WIDTH - (PADDING.left + PADDING.right)
			, HEIGHT: innerSize.HEIGHT - (PADDING.top + PADDING.bottom)
		};

		//--------------------------------------------------
		convDateFromString(dataset);
		var headerNames = getHeaderNames(dataset);
		var colors = getColors(headerNames);

		var constMinMax = getConstMinMax(dataset, headerNames);
		var scaleObj = calcScale(constMinMax, chartSize);

		var datasetSeries = convDataset(dataset, headerNames);

		//--------------------------------------------------
		var svg = createSVG(elementId, outerSize, MARGIN);
		var chartG = createChartG(svg, PADDING);

		var defs = svg.append("defs");
		var clipBox = createClipBox(chartG, defs, "clipBox", chartSize.WIDTH, chartSize.HEIGHT);
		var clipBoxForAxisX = createClipBox(chartG, defs, "clipBoxForAxisX", chartSize.WIDTH, chartSize.HEIGHT + PADDING.bottom);
		createDraggable(chartG, chartSize);

		//--------------------------------------------------
		var axisObj = createAxis(chartG, scaleObj, chartSize);

		createLabelAxisX(clipBoxForAxisX, dataset, scaleObj, constMinMax);

		createPathData(clipBox, datasetSeries, scaleObj, colors);

		drawLegend(svg, datasetSeries, innerSize, PADDING, colors);

		//--------------------------------------------------
		var len = dataset.length - 1;
		var intervalWidth = chartSize.WIDTH / len;

		var zoom = d3.behavior.zoom()
			.scaleExtent([1, 7])
			.x(scaleObj.x)
			.on("zoom", function() {
				drawAll(zoom, chartG, axisObj, chartSize, scaleObj, intervalWidth);
			});
		svg.call(zoom);

		drawAll(zoom, chartG, axisObj, chartSize, scaleObj, intervalWidth);
	};

	//--------------------------------------------------------------------------------
	return {
		DATE : CONST.DATE
		, UL_NM : CONST.UL_NM
		, LL_NM : CONST.LL_NM
		, ERR_SUFFIX : CONST.ERR_SUFFIX
		, drawLineChart: function(elementId, dataset) {
			drawLineChart(elementId, dataset);
		}
	};

}();
