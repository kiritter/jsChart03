(function(){

init();

function init() {
	window.addEventListener("load", function(){

		var dataset = createDataset();
		drawLineChart(dataset);

	}, false);
}

//--------------------------------------------------
function createDataset() {
	var DATE = LineChart.DATE;
	var UL_NM = LineChart.UL_NM;
	var UL1 = 1.85;
	var UL2 = 1.95;
	var LL_NM = LineChart.LL_NM;
	var LL1 = 1.15;
	var LL2 = 1.05;
	var CL_SWITCH_DAYS = 11 * 3;

	var HEADER_NAMES = ["Tokyo", "Paris", "New York"];
	var ERR_SUFFIX = LineChart.ERR_SUFFIX;

	var DATA_LENGTH = 20 * 3;
	var dataset = [];

	var obj;
	var num;
	var errmsg;

	for (var i = 0; i < DATA_LENGTH; i++) {
		obj = {};
		obj[DATE] = getStringDate(i) + " 080000";

		for (var j = 0; j < HEADER_NAMES.length; j++) {
			num = math_round(Math.random() + 1, 4);
			obj[HEADER_NAMES[j]] = num;
			errmsg = "";
			if (i < CL_SWITCH_DAYS) {
				if (num >= UL1) {
					errmsg = "Err:UL";
				}else if (num <= LL1) {
					errmsg = "Err:LL";
				}
			}else{
				if (num >= UL2) {
					errmsg = "Err:UL";
				}else if (num <= LL2) {
					errmsg = "Err:LL";
				}
			}
			obj[HEADER_NAMES[j] + ERR_SUFFIX] = errmsg;
		}
		if (i < CL_SWITCH_DAYS) {
			obj[UL_NM] = UL1;
			obj[LL_NM] = LL1;
		}else{
			obj[UL_NM] = UL2;
			obj[LL_NM] = LL2;
		}

		dataset.push(obj);
	}

	return dataset;
}

function getStringDate(i) {
	var d = new Date(2013, (7-1), 1 + i);
	var y = "" + d.getFullYear();
	var m = pad_zero(d.getMonth() + 1);
	var sd = pad_zero(d.getDate());
	return y + m + sd;
}

function pad_zero(num) {
	return ("0" + num).slice(-2);
}

function math_round(num, newScale) {
	var s = Math.pow(10, newScale);
	num = num * s;
	num = Math.round(num);
	return num / s;
}

//--------------------------------------------------
function drawLineChart(dataset) {
	LineChart.drawLineChart("#stageSVG", dataset);
}

//--------------------------------------------------

})();
