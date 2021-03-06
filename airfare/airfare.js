$(document).ready(function() {
    Cufon.replace('#content h4.dash_sub',{
        fontFamily: 'GothamLight'
    });
    Cufon.replace('#content h4.dash_title',{
        fontFamily: 'GothamBold'
    });
    Cufon.replace('h3#county_label',{
        fontFamily: 'GothamBold'
    });
    Cufon.replace('#readout h1',{
        fontFamily: 'GothamBold'
    });
    Cufon.replace('#no_data h1', {
        fontFamily: 'GothamBold'
    });
    Cufon.replace('h3#distribution_band_label',{
        fontFamily: 'GothamBold'
    });
});

var width = 1000,
    height = 400,//860
	ts_width = 670,
	ts_height = 400,
	ts_left  = 20,
	ts_right = 20,
	yoy_height = 200;//100
	inset_width = 150;
	inset_height = 150;
	ts_inset_width = 200;
	ts_inset_height = 30;
	legend_width = 300;
	legend_height = 50;

var all_states_data = []
var us_data = {}
var quarters_array = []
var selected_states = [];
var selected_mode = "fares";
var selected_sort = "alphabetical";
var ticket_max;
var yoy_max;
var yoy_min;
var price_max;
var playing = false;
var state_shown = false;

var sort_array = [];
var sorts = {
	avg_yoy: [],
	avg_fare: [],
	number_of_tickets: [],
	alphabetical: []
}

var legend_labels = {
   fares: ["< 250", "250-400", "400-600", "600-800", "800-1K", "1K+"],
   tickets: ["< 100", "100-500", "500-1K", "1K-10K", "10K+"]
   // .data([100, 200, 500, 1000, 3000, 5000])
}
var column_name ="1993Q1" //quarter to draw initially
var slider_index = 0;
var US_row_index = 51;

var svg = d3.select("#map").attr({ width: width, height: height})
var bar_svg = d3.select("#bar_chart").attr({ width: ts_width, height: yoy_height})
var legend_svg = d3.select("#legend").attr({width: legend_width, height: legend_height})
var button_svg = d3.select("svg#buttons")
              .attr("width", "300")
              .attr("height", "50")
var tooltip = d3.select("#interactive_area").append("div").attr("class", "tooltip")
var slider

var inset_scale;
var inset_time_scale;
var bar_height_scale = d3.scale.linear(); 
var bar_x = d3.scale.ordinal()

var ts_inset_path = d3.svg.line()
	.y(function(d) { return inset_scale(d.value) })
	.x(function(d) { return inset_time_scale(d.key) })

var projection = d3.geo.albersUsa()
	.translate([350,200])
	.scale([800])

var path = d3.geo.path()
	.projection(projection);
	
var data_states = {
	fares: {
		us_desc: "Avg Fare: ",
		state_desc: "Median Fare:",
		path_height: "34px"
	},
	tickets: {
		desc: "Total Tickets: ",
		path_height: "-9px"
	},
	yoy: {
		desc: "YOY: ",
		path_height: "-9px"
	}
};

var color = d3.scale.linear()

function string_formatter(value, mode){
	switch(mode){
		case "fares": return "$" + value;
		
		case "tickets": return value;
		
		//case "yoy": return Math.round(value) + "%";
	}
}

function check_data(data, style){
  if(data === "N/A" || data === "$N/A" || data === "N/A%" || data === "#NaNNaNNaN"){
    switch(style){
      case "value":
        return 0
      case "color":
        return "gray"
      case "text":
        return "N/A"
      default:
        return ""
    }
  }else{
    return data
  }
}
function tooltip_html(d) {
	return d.properties.name 
	+ "<br/>Median airfare: " 
	+ check_data("$" + d.data["fares"]["array"][quarters_array[slider_index]], "text")
	+ "<br/>"
	+ Math.round(d.data["tickets"]["array"][quarters_array[slider_index]] / us_data["tickets"]["array"][quarters_array[slider_index]] * 10000) / 100
	+ "% all US Tickets"
	+ "<br/>YOY: "
	+ check_data(d.data["yoy"]["array"][quarters_array[slider_index]],  "text")
	
}

function highlight_state(state_node, d, i) {
	state_node.attr("stroke", "orange" ).attr("stroke-width", 3)
	
	d3.select("h1#state").text(d.properties.name)
	switching_number_labels(d.data, selected_mode)
	switching_titles(selected_mode)
	var bounds = path.bounds(d)
	tooltip
		.style({
			left: bounds[1][0] + "px",
			top: (bounds[0][1] + (bounds[1][1] - bounds[0][1])/2)+ "px",
			opacity: 1
		})
		.html(tooltip_html(d))
	
	d3.select("g." + d.abbreviation + ' rect').attr("stroke", "orange").attr("stroke-width", 2)
	d3.select("g." + d.abbreviation + " text.bar")
		.text(check_data(string_formatter(d.data[selected_mode]["array"][quarters_array[slider_index]], selected_mode), "text"))
		.attr("fill", "black")
		
	d3.select("g." + d.abbreviation + " line").attr("stroke-width", 2)
}

function clear_tooltip(){
	tooltip.style("opacity", 0);
}

function show_text_for_US(){
	d3.select("h1#state").text("US")
	switching_titles(selected_mode);
	switching_number_labels(us_data, selected_mode)
}

function clear_state(d) {
	d3.select("g.state_g." + d.abbreviation + " path").attr("stroke", "#CCC").attr("stroke-width", 1)
	d3.select("g." + d.abbreviation + " rect").attr("stroke", "none")
	d3.select("g." + d.abbreviation + " text.bar").text("").attr("fill", "black")
	d3.select("g." + d.abbreviation + " line").attr("stroke-width", 0)
	clear_tooltip();
	show_text_for_US();	
}

function mouseover_state(d,i) {
  state_shown = true;
	highlight_state(d3.select(this), d, i)
}

function mouseout_state(d) {
  state_shown = false;
	if(selected_states.indexOf(d.abbreviation) === -1){
		clear_state(d)
	}else{
		clear_tooltip();
		show_text_for_US();
	}
}

function change_inset_header(state_name){
	switch(selected_mode){
		case "fares": return state_name + " Median Fare:";
		
		case "tickets": return state_name + " Ticket Volume:";
		
		case "yoy": return state_name + " YOY:"
	}
}

function add_text_for_selection(state){	
	// d3.select(".inset." + state.abbreviation)
	// 	.append("h4")
	// 	.attr("class", "state_name " + state.abbreviation)
	// 	.text(state.properties.name)
	// 	.style({"position":"absolute", "left":"10px", "top":"70px"})
	
	
	d3.select(".inset." + state.abbreviation)
	  .datum(state)
		.append("h2")
		.attr("class", "label " + state.abbreviation)
		.text(change_inset_header(state.properties.name))
		.style({"font-size": "12px", "position":"absolute", "left": "79px"})
		
	d3.select(".inset." + state.abbreviation)
		.datum(state)
		.append("h2")
		.attr("class", "number_label " + state.abbreviation)
		.text(function(d){ return check_data(string_formatter(d.data[selected_mode]["array"][quarters_array[slider_index]], selected_mode), "text"); })
		.style({"font-size": "12px", "position":"absolute", "left":"79px", "top":"15px"})

}

function zero_array(data){
  var zero_array = d3.entries(data[selected_mode]["array"]).map(function(d){
    return d.value === "N/A" ? {"key": d.key, "value": 0} : {"key": d.key, "value": d.value}        
  })
  return zero_array
}

function add_selected_time_series(abbreviation){
 	var time_inset = d3.select(".inset." + abbreviation)
		.append("svg")
		.attr("class","inset_time " + abbreviation)
		.attr({width: ts_inset_width, height: 107})
		
	var g = time_inset.append("g")
	var datum = d3.select("g."+abbreviation).datum()
	g.append("path")
		.datum(datum)
		.attr("class", "path_inset " + abbreviation)
		.attr("d", function(d) { 
		  if(d.abbreviation !== "DE" || selected_mode !== "fares"){
		    inset_scale = d.data[selected_mode]["scale"]
  			return ts_inset_path(d3.entries(d.data[selected_mode]["array"]))
		  }else{
		      inset_scale = d.data[selected_mode]["scale"]
		      var temp_array = zero_array(d.data)
          var price_min = d3.min(temp_array, function(d){ return d.value})
          var price_max = d3.max(temp_array, function(d){ return d.value})
          inset_scale.domain([price_min, price_max])
  		    return ts_inset_path(temp_array);
		  }
		}) 
		.attr("stroke", "#003e5f")
		.attr("stroke-opacity",1)
		.attr("fill", "none")
		
	g.append("circle").attr("class", "inset_time_marker " + abbreviation) 
	g.select("circle.inset_time_marker." + abbreviation)
			.datum(datum)
			.attr("fill", "#003e5f")
			.attr("fill-opacity", 1)
			.attr("r", 3)
			.attr('cx', function(d) { return inset_time_scale(quarters_array[slider_index]) } )
			.attr("cy", function(d) { return d.data[selected_mode]["scale"](check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value")) })
	
}


function add_selected_state(abbreviation, state){
	var g
	
	zoom = d3.behavior.zoom()
	    .translate([0, 0])
	    .scale(1)
	    .scaleExtent([1, 40])
	    .on("zoom", function() {
			g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		});
	
	
	selected_states.push(abbreviation)
	
	var inset_div = d3.select("#interactive_area")
	                  .datum(state)
	                  .append("div")
                		.attr("class", "inset " + abbreviation)
	                  .on("click", function(d){
	                     clear_state(d)
                   		 remove_selected(d.abbreviation);
	                  })
	                  
	var inset_svg = inset_div.append("svg")
                		.attr("class", "inset_svg " + abbreviation)
                		.attr({width: inset_width, height: inset_height})
		
	g = inset_svg.append("g")
	var path_inset = d3.select("path." + abbreviation).attr("d")
	g.append("path").attr("d", path_inset).attr("fill", "#95b7c0")

	var bounds = path.bounds(state)
	var	  dx = bounds[1][0] - bounds[0][0],
	      dy = bounds[1][1] - bounds[0][1],
	      x = (bounds[0][0] + bounds[1][0]) / 2,
	      y = (bounds[0][1] + bounds[1][1]) / 2,
	      scale = .3 / Math.max(dx / inset_width, dy / inset_height),
	      translate = [inset_width / 2 - scale * x, inset_height / 2 - scale * y];

	if(abbreviation === "AK"){
		  scale = .3 / Math.min(dx / inset_width, dy / inset_height)
	      translate = [inset_width / 2 - scale * x, inset_height / 2 - scale * y]
	}
	g.call(zoom.translate(translate).scale(scale).event)
	
	add_selected_time_series(abbreviation)
	add_text_for_selection(state)
	
}

function click_on_state(d,i){
  	if(selected_states.indexOf(d.abbreviation) === -1){
  	  if(selected_states.length < 6){
  	    highlight_state(d3.select(this), d, i)
    		add_selected_state(d.abbreviation, d);
    		d3.select("g.bar_g." + d.abbreviation + " text.bar").attr("class", "bar selected")
  	  }
  	}else{
  		clear_state(d)
  		remove_selected(d.abbreviation);
  	}
}

function remove_selected(abbreviation){
	selected_states.splice(selected_states.indexOf(abbreviation),1)
	d3.select(".inset." + abbreviation).remove();
	d3.select("g.bar_g." + abbreviation + " text.bar").attr("class", "bar")
}


function text_price_fill(d,i) {
	if (["VT", "NH", "MA", "RI", "CT", "DE", "MD", "HI", "NJ"].indexOf(d.abbreviation) > -1)
		return "#222"
		
	if(selected_mode === "fares"){
	 	if (d.data[selected_mode]["array"][quarters_array[slider_index]] < 550)
			return "#222"
		else 
			return "#d9e3e3"
	}else if(selected_mode === "tickets"){
		if(d.data[selected_mode]["array"][quarters_array[slider_index]] < 700)
			return "#222"
		else
			return "#d9e3e3"
	}
		
}

var other_states = {
	"Vermont" :			{"x-text offset":-20, "y-text offset":-50, "x1":"570px", "y1":"50px",  "x2":"585px", "y2":"90px" },
	"New Hampshire" :	{"x-text offset":70,  "y-text offset":5,   "x1":"600px", "y1":"102px", "x2":"650px", "y2":"102px"},
	"Massachusetts" :	{"x-text offset":70,  "y-text offset":5,   "x1":"600px", "y1":"115px", "x2":"650px", "y2":"115px"},
	"Rhode Island" :	{"x-text offset":60,  "y-text offset":20,  "x1":"605px", "y1":"125px", "x2":"650px", "y2":"140px"},
	"Connecticut" :		{"x-text offset":60,  "y-text offset":30,  "x1":"590px", "y1":"127px", "x2":"640px", "y2":"150px"},
	"Delaware" :		{"x-text offset":75,  "y-text offset":5,   "x1":"580px", "y1":"175px", "x2":"640px", "y2":"175px"},
	"Maryland" :		{"x-text offset":94,  "y-text offset":15,  "x1":"580px", "y1":"185px", "x2":"640px", "y2":"185px"},
	"Louisiana" :		{"x-text offset":-3,  "y-text offset":11,  "x1":"0px", "y1":"0px", "x2":"0px", "y2":"0px"},
	"Florida" :		{"x-text offset":4,  "y-text offset":-4,  "x1":"0px", "y1":"0px", "x2":"0px", "y2":"0px"},
	"Michigan" :		{"x-text offset":4,  "y-text offset":15,  "x1":"0px", "y1":"0px", "x2":"0px", "y2":"0px"},
	"New Jersey": {"x-text offset":40,  "y-text offset":10,  "x1":"580px", "y1":"145px", "x2":"610px", "y2":"155px"},
	"California" :		{"x-text offset":-7,  "y-text offset":0,  "x1":"0px", "y1":"0px", "x2":"0px", "y2":"0px"},
};

function create_states(states){
	var g = svg.selectAll("g.state_g")
		.data(states)
		.enter()
		.append("g")
		.attr("class", function(d) { return "state_g " + d.abbreviation;})
	
	g.append("path")
		.attr("class", function(d) { return "state " + d.properties.name + " " + d.abbreviation;;})
		.attr("fill", function(d){ 
			if (d.data["fares"])
				return check_data(color(d.data["fares"]["array"][column_name]), "color"); 
			else
				console.log(d.abbreviation)
			
		})
		.attr("stroke", "#CCC")
		.attr("d",path)
		.on("mouseover", mouseover_state)
		.on("mouseout", mouseout_state)
		.on("click", click_on_state)
			
	g.append("text")
		.attr("class", function(d) { return "state " + d.properties.name })
		.text(function(d){ return check_data("$" + d.data["fares"]["array"][column_name], "text"); })
		.attr("text-anchor", "middle")
		.attr("font-size", "10px")
		.attr("fill", text_price_fill)
	  .attr("x", function(d) {
		  return other_states[d.properties.name] !== undefined ?  path.centroid(d)[0] + other_states[d.properties.name]["x-text offset"] : path.centroid(d)[0];
    })
    .attr("y", function(d) {
		  return other_states[d.properties.name] !== undefined ?  path.centroid(d)[1] + other_states[d.properties.name]["y-text offset"] : path.centroid(d)[1];
    })
}

function create_label_lines(){
	svg.selectAll("line.states")
		.data(d3.entries(other_states))
		.enter()
		.append("line")
		.attr("class", function(d){ return d.key })
		.attr("x1", function(d){ return d.value["x1"] })
		.attr("y1", function(d){ return d.value["y1"] })
		.attr("x2", function(d){ return d.value["x2"] })
		.attr("y2", function(d){ return d.value["y2"] })
		.attr("stroke", "black")
}

function create_bars(states){
	get_state_names(states);
	sort_array = sorts["alphabetical"].map(function(d){
		return d.state;
	})
	bar_x.domain(sort_array).rangeRoundBands([0, ts_width], 0.5, 0.1)
	bar_height_scale.domain([0, price_max]).range([0, yoy_height - 100])
	
	var g = bar_svg.selectAll("g")
			.data(states)
			.enter()
			.append("g")
			.attr("class", function(d){ return "bar_g " + d.abbreviation})
			.attr("transform", function(d) { return "translate("  + (bar_x(d.abbreviation)) + ",0)"})
	
	g.append("rect")
		.attr("width", bar_x.rangeBand())
		.attr("height", function(d){ return bar_height_scale(check_data(d.data["fares"]["array"][column_name], "value"))})
		.attr("y", function(d){ return (yoy_height - 1) - bar_height_scale(check_data(d.data["fares"]["array"][column_name], "value")) - 85})
		.attr("fill", function(d){ return check_data(color(d.data["fares"]["array"][column_name]), "color")})
		.on("mouseover", mouseover_state)
		.on("mouseout", mouseout_state)
		.on("click", click_on_state)
	
	bar_svg.append("line")
		.attr("x1", "20")
		.attr("y1", yoy_height - 170)
		.attr("x2", ts_width - 10)
		.attr("y2",yoy_height - 170)
		.attr("stroke", "black")
		.attr("stroke-width",0)
	
	g.append("text")
		.attr("class", "bar_state")
		.attr("transform", function(d){ return "translate(0," + (yoy_height - 70) + ")"})
		.style("font-size", "7px")
		.text(function(d){ return d.abbreviation})
		.attr("fill", "black")

	g.append("text")
		.attr("transform", function(d, i){
         if(i % 2 !== 0){
            return "translate(" + (-(bar_x.rangeBand()/2) - 3) + "," + ((yoy_height - 170) - 5) + ")"
         }else{
            return "translate(" + (-(bar_x.rangeBand()/2) - 3) + ","  + ((yoy_height - 170) - 20) + ")"
         }
		})
		.attr("class", "bar")
		.style("font-size", "8px")
  			
	g.append("line")
     .attr("class", "label")
	  .attr("x1", bar_x.rangeBand()/2)
	  .attr("y1", function(d, i) { 
        if(i % 2 !== 0){
           return yoy_height - 170
        }else{
           return yoy_height - 170 - 15   
        }
      })
	  .attr("x2", bar_x.rangeBand()/2)
	  .attr("y2", function(d){ return (yoy_height - 100)- bar_height_scale(check_data(d.data["fares"]["array"][column_name], "value")) + 10})
	  .attr("stroke", "orange")
	  .attr("stroke-width",0)
	  .attr("stroke-opacity", 0.5)
	
}

function initial_draw_map(data){

	d3.json("us-states.json",function(states){
		states.features.pop()
		d3.json("states.json",function(abbrev){
			 
			add_data_to_state_features(abbrev, states.features);
			states.features = states.features
				.filter(function(d) { 
					var exclude = ["DC", "HI"]; 
					return exclude.indexOf(d.abbreviation) === -1 
				})
			create_states(states.features);
			create_label_lines();
			create_bars(states.features)
		});
		
	});
	
	d3.select("#slider").append("h3").attr("class","year").text([column_name]);
	show_text_for_US();
	
}

function add_rect_legend(){
  var legend = legend_svg.selectAll("g.legend")
                  .data([250, 400, 600, 800, 1000, 1200])
                  .enter()
                  .append("g")
                  .attr("class", "legend")
                                  
  var legend_rect_width = 45 , legend_rect_height = 30;
  
  legend.append("rect")
        .attr('x', function(d, i){ return 0 + (i * (legend_rect_width + 6))})
        .attr("y", 10)
        .attr("width", legend_rect_width)
        .attr("height", legend_rect_height)
        .attr("fill", function(d, i){ return color(d)})
  
  legend.append("text")
      .attr('x', function(d, i){ 
         if(i === 5){
            return 0 + (i * (legend_rect_width + 6))
         }else{
            return 0 + (i * (legend_rect_width + 6))
         }
      })
      .attr("y", 50)
      .text(function(d, i){ return legend_labels["fares"][i]})
      .style("font-size", "10px")                  
}

function display_year_and_avg_us_fare(value){
	//var text = d3.select(".d3-slider-handle").style("bottom").split("px");
	d3.select("#slider h3.year").text(quarters_array[value])//.style("bottom", (parseInt(text[0]) + 40) + "px");
	show_text_for_US()
}

function draw_year(s_index) {
	slider_index = s_index
	display_year_and_avg_us_fare(slider_index);

	d3.selectAll("path.state")
 		.attr("fill", function(d){return check_data(color(d.data[selected_mode]["array"][quarters_array[slider_index]]), "color"); })
		.on("mouseover", mouseover_state)
		.on("mouseout", mouseout_state)

	d3.selectAll("text.state")
		.text(function(d){ return check_data(string_formatter(d.data[selected_mode]["array"][quarters_array[slider_index]], selected_mode), "text")})
		.attr("fill", text_price_fill)

  d3.selectAll("text.bar.selected")
  	.text(function(d){ return check_data(string_formatter(d.data[selected_mode]["array"][quarters_array[slider_index]], selected_mode), "text")})
	
	d3.selectAll("circle.inset_time_marker")
		.attr("cx", function(d) { return inset_time_scale(quarters_array[slider_index]) })
		.attr("cy", function(d) { return d.data[selected_mode]["scale"](check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value")) })
	
	d3.selectAll("h2.label")
		.text(function(d){ return change_inset_header(d.properties.name)})
		
	d3.selectAll("h2.number_label")
		.text(function(d){return check_data(string_formatter(d.data[selected_mode]["array"][quarters_array[slider_index]], selected_mode), "text");})
		
	d3.selectAll("path.path_inset")
		.transition()
  	.attr("d", function(d) { 
		  if(d.abbreviation !== "DE" || selected_mode !== "fares"){
		    inset_scale = d.data[selected_mode]["scale"]
  			return ts_inset_path(d3.entries(d.data[selected_mode]["array"]))
		  }else{
		      inset_scale = d.data[selected_mode]["scale"]
		      var temp_array = zero_array(d.data)
          var price_min = d3.min(temp_array, function(d){ return d.value})
          var price_max = d3.max(temp_array, function(d){ return d.value})
          inset_scale.domain([price_min, price_max])
  		    return ts_inset_path(temp_array);
		  }
		})
		
	d3.selectAll("#bar_chart rect")
		.transition()	
		.attr("height", function(d){ return bar_height_scale(check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value"))})
		.attr("y", function(d){ return (yoy_height - 1) - bar_height_scale(check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value")) - 85})
		.attr("fill", function(d){ return check_data(color(d.data[selected_mode]["array"][quarters_array[slider_index]]), "color")})
   
   d3.selectAll("#bar_chart line.label")
      .transition()
       .attr("y2", function(d){ return (yoy_height - 100)- bar_height_scale(check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value")) + 10})
      
}

function create_slider(){
	slider = $("#slider").slider({
		min: 0,
		max: quarters_array.length - 1,
		step: 1,
		value: 0,
		slide:function(evt, value_obj){
			//console.log(value_obj)
			draw_year(value_obj.value)
		},
	})
}


function get_median_of_prices(){
	overall_median_price = d3.median(all_prices)
}

function add_data_to_state_features(abbrev, states){
	var state_lookup = d3.nest().key(function(d) { return d.state }).map(all_states_data)
	var abbrev_lookup = d3.nest().key(function(d) { return d.name }).map(abbrev)
	states.forEach(function(d,i,array) {
		d.abbreviation = abbrev_lookup[d.properties.name][0].abbreviation
		d.data = state_lookup[d.abbreviation] ? state_lookup[d.abbreviation][0] : {} //map has DC and HI which are not in array
	})
	
}

function get_quarterly_values(nest_result, mode) {
	if (!nest_result) return {}
	var csv_row = nest_result[0]
	delete csv_row.State
	d3.keys(csv_row).forEach(function(q) { 
	  if(csv_row[q] !== "N/A"  && csv_row[q] !== ""){
		  if(mode === "yoy"){
        return csv_row[q] = csv_row[q] 
      }else{
        return csv_row[q] = +csv_row[q] 
      }
		}else{
		  return csv_row[q] = "N/A";
		}
	})
	return csv_row
}

function get_state_names(states){
	states.forEach(function(d){
		sorts["alphabetical"].push({state: d.abbreviation, name: d.properties.name})
	})
	sorts["alphabetical"].sort(function(a,b){ return d3.ascending(a.name, b.name)})
}

function get_sum_of_tickets(){
	all_states_data.forEach(function(d){
		sorts["number_of_tickets"].push({state: d["state"], ticket_sum: d3.sum(d3.values(d["tickets"]["array"]), function(d){ return d;})})
	})
	sorts["number_of_tickets"].sort(function(a,b){ return a.ticket_sum - b.ticket_sum})
}

function get_avg_fare(){
	all_states_data.forEach(function(d){
		sorts["avg_fare"].push({state: d["state"], avg_fare: d3.mean(d3.values(d["fares"]["array"]), function(d){ return d;})})
	})
	sorts["avg_fare"].sort(function(a,b){ return a.avg_fare - b.avg_fare})
}

function get_avg_yoy(){
	all_states_data.forEach(function(d){
		sorts["avg_yoy"].push({state: d["state"], avg_yoy: d3.mean(d3.values(d["yoy"]["array"]), function(d){ return d;})})
	})
	sorts["avg_yoy"].sort(function(a,b){ return a.avg_yoy - b.avg_yoy})
}

function load_data_object(results) {
	var ticket_data = d3.nest().key(function(d) { return d.State }).map(results[0])
	var fare_data = d3.nest().key(function(d) { return d.State }).map(results[2])
	var yoy_data = d3.nest().key(function(d) { return d.State }).map(results[1])
	var all_prices = []
	var all_tickets = []
	var all_yoy = []

	all_states_data = d3.keys(ticket_data)
		.filter(function(d) { var exclude = ["DC", "", "PR"]; return exclude.indexOf(d) === -1 })
		.map(function(state) {		  
			var fares_array = get_quarterly_values(fare_data[state], "fares")
			var ticket_array = get_quarterly_values(ticket_data[state], "tickets")
			var yoy_array = get_quarterly_values(yoy_data[state], "yoy")
			all_prices = all_prices.concat(d3.values(fares_array))
			all_tickets = all_tickets.concat(d3.values(ticket_array))
			var price_min = d3.min(d3.values(fares_array))
			var price_max = d3.max(d3.values(fares_array))
			var ticket_min = d3.min(d3.values(ticket_array))
			var ticket_max = d3.max(d3.values(ticket_array))
			return {
				state: state,
				tickets: {array: ticket_array, scale: d3.scale.linear().range([ts_inset_height, 5]).domain([ticket_min, ticket_max]) },
				fares: {array: fares_array, scale: d3.scale.linear().range([ts_inset_height, 5]).domain([price_min, price_max]) },
				yoy: {array: yoy_array }
			}
		})
		
	us_data = all_states_data.splice(0,1)[0]
	quarters_array = d3.keys(us_data.fares.array)

	price_quantiles = d3.scale.quantile().domain(all_prices.sort()).range([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19])
	
   array = all_tickets.sort(function(a,b){return a-b})
   low_array = all_tickets.slice(0, all_tickets.length/2)
   
	color.domain([200, price_quantiles.quantiles()[18]])
		  .range(["#fffcf7","rgb(25, 102, 127)"])//, "white", "orange"])
		  .interpolate()
            
	price_max = d3.max(all_prices)
	ticket_max = d3.max(all_tickets)

}

function change_legend(){
   if(selected_mode === "fares"){
      legend_svg.selectAll("g.legend rect")
         .data([250, 400, 600, 800, 1000, 1200])
      
      d3.selectAll("g.legend rect")
        .attr("fill", function(d, i){ return color(d)})
       
      d3.selectAll("g.legend text")
         .text(function(d, i){ return legend_labels["fares"][i]})
   }else if(selected_mode === "tickets"){
      legend_svg.selectAll("g.legend rect")
         .data([80, 500, 1000, 5000, 20000])
      
      d3.selectAll("g.legend rect")
        .attr("fill", function(d, i){ 
          if(i === 5){
            return "none"
          }else{
            return color(d)
          }  
      })
      d3.selectAll("g.legend text")
         .text(function(d, i){ return legend_labels["tickets"][i]})
   }
}
function change_scale(){
	if(selected_mode === "fares"){
		color.domain([200, price_quantiles.quantiles()[18]])
			  .range(["#fffcf7","rgb(25, 102, 127)"])//, "white", "orange"])
			  .interpolate()
		bar_height_scale.domain([0, price_max]).range([0, yoy_height - 100])
	}else if(selected_mode === "tickets"){
		color.domain([0, 1000, 5000, ticket_max])
			  .range(["#fffcf7", "#6a9ba9", "rgb(25, 102, 127)", "blue"])//, "white", "orange"])
			  .interpolate()
		bar_height_scale.domain([0, 200, 1000, ticket_max]).range([0, 25, 50, yoy_height - 100])
	}
}

function switching_titles(mode){
	if(mode === "fares"){
		d3.select("#title_primary").text(function(){
		  if(state_shown){
		    return data_states["fares"]['state_desc']
		  }else{
		    return data_states["fares"]["us_desc"]	
		  }
		})
		d3.select("#title_secondary_one").text(data_states["tickets"]["desc"])	
		d3.select("#title_secondary_two").text(data_states["yoy"]["desc"])		
	}else if(mode === "tickets"){
		d3.select("#title_primary").text(data_states["tickets"]["desc"])
		d3.select("#title_secondary_one").text(data_states["yoy"]["desc"])
		d3.select("#title_secondary_two").text(function(){
		  if(state_shown){
		    return data_states["fares"]['state_desc']
		  }else{
		    return data_states["fares"]["us_desc"]	
		  }
		})
	}
}

function switching_number_labels(data, mode){
	if(mode === "fares"){
		d3.select(".primary").text(string_formatter(Math.round(data["fares"]["array"][quarters_array[slider_index]]), "fares"))
		d3.select(".secondary_one").text(string_formatter(Math.round(data["tickets"]["array"][quarters_array[slider_index]]), "tickets"))
		d3.select(".secondary_two").text(data["yoy"]["array"][quarters_array[slider_index]])
	}else if(mode === "tickets"){
		d3.select(".primary").text(string_formatter(Math.round(data["tickets"]["array"][quarters_array[slider_index]]), "tickets"))
		d3.select(".secondary_one").text(data["yoy"]["array"][quarters_array[slider_index]])
		d3.select(".secondary_two").text(string_formatter(Math.round(data["fares"]["array"][quarters_array[slider_index]]), "fares"))
	}
}

function tweenTime(){
	var time_interpolator = d3.interpolateRound(slider_index, quarters_array.length - 1)
	return function(t){
		draw_year(time_interpolator(t))
		slider.slider("value", time_interpolator(t))
	}
}
function play_all_years(){
	d3.select("svg#map")
		.transition()
		.duration(10000*((quarters_array.length - 1)-slider_index)/83)
		.tween("slide", tweenTime)
		.each("start", function(){
			d3.selectAll("svg#bar_chart rect")
				.attr("height", function(d){ return bar_height_scale(check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value"))})
    		.attr("y", function(d){ return (yoy_height - 1) - bar_height_scale(check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value")) - 85})
    		.attr("fill", function(d){ return check_data(color(d.data[selected_mode]["array"][quarters_array[slider_index]]), "color")})
				
			d3.selectAll("#bar_chart line.label")
        .attr("y2", function(d){ return (yoy_height - 100)- bar_height_scale(check_data(d.data[selected_mode]["array"][quarters_array[slider_index]], "value")) + 10})
		})
		.each("end", function(){
			playing = false;
		  d3.select("#play_button_image").attr("xlink:href", "Blue+Triangle.png")
		})
}

function change_modes(target_mode){
	selected_mode = target_mode;
	change_scale();
   change_legend();
	draw_year(slider_index);
}

function change_sorts(target_sort){
 	sort_array = []
	sort_array = sorts[target_sort].map(function(d){
		return d.state;
	})
	bar_x.domain(sort_array)
	d3.selectAll("#bar_chart g").transition().duration(1000).attr("transform", function(d) { return "translate("  + (bar_x(d.abbreviation)) + ",0)"})
}

function create_play_button(){
	              
	var play_button = button_svg
      	              .append("g")
      	              .attr('class', "button")
      	              .on("click", function(d){
      	                if (playing){
                           console.log(playing)
                           playing = false;      
                           d3.select("svg#map").transition()
                           d3.select("#play_button_image").attr("xlink:href", "Blue+Triangle.png")
      	                }else {
                          console.log(playing)
                          playing = true;
                          slider_index = slider_index === (quarters_array.length - 1) ? 0 : slider_index
                          play_all_years()  
                          d3.select("#play_button_image").attr("xlink:href", "pause_blue.gif")
                        }
      	              })
	
	play_button.append("rect")
	  .attr("x", "10")
	  .attr("y", "10")
	  .attr("width", "75")
	  .attr("height", "25")
	  .attr("rx", "10")
	  .attr("ry", "10")
	
	play_button.append('text')
	  .attr("x", "45")
	  .attr("y", "25")
	  .text("play")
	  
  play_button.append("image")
    .attr("id", "play_button_image")
	  .attr("xlink:href", "Blue+Triangle.png")
	  .attr("x", "20")
	  .attr("y", "10")
	  .attr("width", "20")
	  .attr("height","20")
}

function deselect_states(){
      selected_states = []; 
      d3.selectAll("div.inset").remove()
      d3.selectAll(".state_g path").attr("stroke", "#CCC").attr("stroke-width", 1)
      d3.selectAll("g.bar_g rect").attr("stroke", "none")
      d3.selectAll("g.bar_g text.bar.selected").attr("class", "bar")
      d3.selectAll("g.bar_g text.bar").text("")
      d3.selectAll("g.bar_g line.label").attr("stroke-width", 0)
}

function move_back_play_button(){
    playing = false;      
    d3.select("svg#map").interrupt()
    d3.select("#play_button_image").attr("xlink:href", "Blue+Triangle.png")
    slider_index = 0;
    d3.select("#slider a").style("left", "0%")
    
}

function revert_to_fares_mode(){
      change_modes("fares");
      d3.selectAll("#modes a").style("font-weight", "normal")
      d3.selectAll("#fares").style("font-weight", "bold")
}

function revert_to_alphabet_sort(){
   change_sorts("alphabetical");
    d3.selectAll("#sorts a").style("font-weight", "normal")
    d3.selectAll("#alphabetical").style("font-weight", "bold")
}

function create_reset_button(){ 
  var reset_button = button_svg.append("g")
	                    .attr("class", "button")
	                    .on('click', function(d){
	                        deselect_states();
  	                      move_back_play_button();
                          revert_to_fares_mode();
                          revert_to_alphabet_sort();
	                    })
	
	reset_button.append("rect")
  	.attr("x", "200")
    .attr("y", "10")
    .attr("width", "65")
    .attr("height", "25")
    .attr("rx", "10")
    .attr("ry", "10")
    
	reset_button.append('text')
	  .attr("x", "215")
	  .attr("y", "25")
	  .text("reset")
}

var q = queue()
q.defer(d3.csv, "total_pass_state.csv")
q.defer(d3.csv, "fareyoy_14Q2.csv")
q.defer(d3.csv, "fare_medians_state.csv")
q.awaitAll(function(error, results){
	load_data_object(results)
	get_sum_of_tickets();
	get_avg_fare();
	initial_draw_map(results[2]);
	add_rect_legend();
	create_slider(); 
	inset_time_scale = d3.scale.ordinal().domain(quarters_array).rangePoints([0 + ts_left, ts_inset_width - ts_right])	
	d3.select("#modes").selectAll("a").data(["fares","tickets"]).on("click", function(d){
		d3.selectAll("#modes a").style("font-weight", "normal")
		d3.select(this).style("font-weight", 'bold')
		change_modes(d);
	})
	d3.select("#sorts").selectAll("a").data(["alphabetical", "number_of_tickets", "avg_fare"]).on("click", function(d){
		d3.selectAll("#sorts a").style("font-weight", "normal")
		d3.select(this).style("font-weight", 'bold')
		change_sorts(d);
	})
	create_play_button();
  create_reset_button();
})
