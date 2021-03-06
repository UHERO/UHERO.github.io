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
    height = 400;//860

var svg = d3.select("#map").attr({
			width: width,
			height: height
})

var projection = d3.geo.albersUsa()
					.translate([350,200])
					.scale([800])

var path = d3.geo.path()
			.projection(projection);
			
var color = d3.scale.linear();
var numbers = [];
var airfares = {};

var tooltip = d3.select("#interactive_area").append("div").attr("class", "tooltip")

function initial_draw_map(column_name, data){
	data.forEach(function(d){
		airfares[d.State] = d
		numbers = numbers.concat(d3.values(d).filter(function(d){
						return !isNaN(d) && d !== "";
					}))
	})

	for(var i = 0; i < numbers.length; i++){
		numbers[i] = +numbers[i];
	}

	numbers.sort(function(a,b){ return a - b;})
	all_prices = numbers.reduce(function (a,b) {return a.concat(b)}, []);
	overall_median = d3.median(all_prices)
	price_quantiles = d3.scale.quantile().domain(all_prices).range([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19])
	console.log(price_quantiles.quantiles())
	console.log(d3.min(numbers))
	color.domain([200, price_quantiles.quantiles()[18]])
		  .range(["#fffcf7","rgb(25, 102, 127)"])//, "white", "orange"])
		  .interpolate()
		//.range(["rgb(247,251,255)", "rgb(222,235,247)", "rgb(198,219,239)", "rgb(158,202,225)", "rgb(107,174,214)","rgb(66,146,198)", "rgb(33,113,181)", "rgb(8,81,156)", "rgb(8,48,107)"])

	
	d3.json("us-states.json",function(states){
		states.features.pop()
		d3.json("states.json",function(abbrev){
			abbrev.forEach(function(d){
				for(var i = 0; i < states.features.length; i++){
					if(states.features[i].properties.name === d.name){
						states.features[i].properties.abbreviation = d.abbreviation;
					}
				}
			});
			svg.selectAll("path.states")
					.data(states.features)
					.enter()
					.append("path")
					.attr("class", function(d) { return "state " + d.properties.name;})
					.attr("fill", function(d){
						if(d.properties.abbreviation === "HI"){
							return 0;
						}else{
							return color(airfares[d.properties.abbreviation][column_name]);
						}
					})
					.attr("stroke", "#CCC")
					.attr("d",path)
					.on("mouseover", function(d){
						d3.select("svg").append("line").attr("class","state").attr("x1", path.bounds(d)[0][0]).attr("y1", path.bounds(d)[0][1]).attr("x2", path.bounds(d)[1][0]).attr("y2", path.bounds(d)[1][1]).attr("stroke", "black")
						console.log(path.bounds(d))
						console.log(document.getElementById("map").offsetTop)
						tooltip.style({
							left: path.bounds(d)[1][0] + "px",
							top: ((path.bounds(d)[1][1] - path.bounds(d)[0][1])/2)+ "px",
							opacity: 1
						})
						tooltip.html(d.properties.name + "<br/>" + "Median airfare: $" + airfares[d.properties.abbreviation][column_name])
						// d3.select("#interactive_area").append("h3").attr("class", "state").text(d.properties.name);
						// 						d3.select("#interactive_area").append("h3").attr("class","price").text("Median airfare: $" + airfares[d.properties.abbreviation][column_name])
					})
					.on("mouseout", function(){
						d3.select("line.state").remove()
						tooltip.style("opacity", 0);
					})
			console.log(states.features)		
			svg.selectAll("text.states")
				.data(states.features)
				.enter()
				.append("text")
				.attr("class", function(d) { return "state " + d.properties.name;})
				.text(function(d){
					if(d.properties.abbreviation === "HI" || airfares[d.properties.abbreviation][column_name] === ""){
						return "$" + 0;
					}else{
						return "$" + airfares[d.properties.abbreviation][column_name];
					}
				})
			    .attr("x", function(d){
					if(d.properties.name === "Vermont"){
						return path.centroid(d)[0] - 20;
					}else if(d.properties.name === "New Hampshire"){
						return path.centroid(d)[0] + 70;
					}else if(d.properties.name === "Massachusetts"){
						return path.centroid(d)[0] + 70;
					}else if(d.properties.name === "Rhode Island"){
						return path.centroid(d)[0] + 60;
					}else if(d.properties.name === "Connecticut"){
						return path.centroid(d)[0] + 60;
					}else if(d.properties.name === "Delaware"){
						return path.centroid(d)[0] + 75;
					}else if(d.properties.name === "Maryland"){
						return path.centroid(d)[0] + 94;
					}else{
						return path.centroid(d)[0];
					}
			    })
			    .attr("y", function(d){
					if(d.properties.name === "Vermont"){
						return path.centroid(d)[1] - 50;
					}else if(d.properties.name === "New Hampshire"){
						return path.centroid(d)[1] + 5;
					}else if(d.properties.name === "Massachusetts"){
						return path.centroid(d)[1] + 5;	
					}else if(d.properties.name === "Rhode Island"){
						return path.centroid(d)[1] + 20;
					}else if(d.properties.name === "Connecticut"){
						return path.centroid(d)[1] + 30;
					}else if(d.properties.name === "Delaware"){
						return path.centroid(d)[1] + 5;
					}else if(d.properties.name === "Maryland"){
						return path.centroid(d)[1] + 15;
					}else{
						return path.centroid(d)[1];
					}
			    })
				.attr("text-anchor", "middle")
				.attr("font-size", "10px")
				.attr("fill", "orange")
			svg.append("line").attr("class", "Vermont").attr("x1", "570px").attr("y1", "50px").attr("x2", "585px").attr("y2", "90px").attr("stroke", "black")
			svg.append("line").attr("class", "New Hampshire").attr("x1", "600px").attr("y1", "102px").attr("x2", "650px").attr("y2", "102px").attr("stroke", "black")
			svg.append("line").attr("class", "Massachusetts").attr("x1", "600px").attr("y1", "115px").attr("x2", "650px").attr("y2", "115px").attr("stroke", "black")
			svg.append("line").attr("class", "Rhode Island").attr("x1", "605px").attr("y1", "125px").attr("x2", "650px").attr("y2", "140px").attr("stroke", "black")
			svg.append("line").attr("class", "Connecticut").attr("x1", "590px").attr("y1", "127px").attr("x2", "640px").attr("y2", "150px").attr("stroke", "black")
			svg.append("line").attr("class", "Delaware").attr("x1", "580px").attr("y1", "175px").attr("x2", "640px").attr("y2", "175px").attr("stroke", "black")
			svg.append("line").attr("class", "Maryland").attr("x1","580px").attr("y1","185px").attr("x2","640px").attr("y2","185px").attr("stroke","black")
		});
		
	});
	d3.select("#interactive_area").append("h3").attr("class","year").text([column_name]);
	
}

/* Added slider*/

d3.csv("Airfares_by_State.csv", function(data){
	initial_draw_map("1993Q1", data)
	$(function(){
		$("#slider").slider({
			min:1,
			max:83,
			slide: function(event, ui){
				d3.select("#interactive_area").selectAll("h3.year").remove();
				d3.selectAll("path.state")
			 		.attr("fill", function(d){
						if(d.properties.abbreviation === "HI"){
							return 0;
						}else{
							return color(airfares[d.properties.abbreviation][d3.keys(data[0])[ui.value]]);
						}
					})
					.on("mouseover", function(d){
						d3.select("#interactive_area").append("h3").attr("class", "state").text(d.properties.name);
						d3.select("#interactive_area").append("h3").attr("class","price").text("Median airfare: $" + airfares[d.properties.abbreviation][d3.keys(data[0])[ui.value]])
					})
					.on("mouseout", function(){
						d3.select("#interactive_area").selectAll("h3.state").remove();
						d3.select("#interactive_area").selectAll("h3.price").remove();
					})
				d3.selectAll("text.state")
					.text(function(d){
						if(d.properties.abbreviation === "HI" || airfares[d.properties.abbreviation][d3.keys(data[0])[ui.value]] === ""){
							return "$" + 0;
						}else{
							return "$" + airfares[d.properties.abbreviation][d3.keys(data[0])[ui.value]];
						}
					})
				d3.select("#interactive_area").append("h3").attr("class","year").text(d3.keys(data[0])[ui.value]);
				
			}
		});
	});
})

// d3.csv("Airfares_by_State.csv", function(data){
// 	draw_map("1993Q1", data)
// 	d3.select("#interactive_area").selectAll("a")
// 		.data(d3.keys(data[0]))
// 		.enter()
// 		.append("a")
// 		.html(function(d){ 
// 			if(d !== "State"){
// 				if(d.indexOf("Q4") === -1){
// 					return d + " | ";
// 				}else{
// 					return d + "<br/>";
// 				}
// 			}
// 		})
// 		.attr("href", "javascript:;")
// 		.on("click", function(d){
// 			draw_map(d,data);
// 		})
// })