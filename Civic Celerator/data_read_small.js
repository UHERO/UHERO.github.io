var urls = {
	campaign_contributions_received: "https://data.hawaii.gov/resource/jexd-xbcg.json",
	campaign_contributions_made_to: "https://data.hawaii.gov/resource/6huc-dcuw.json",
	fundraiser: "https://data.hawaii.gov/resource/2g8e-tamb.json"
}

var inset_svg;
var projections_inset;	
var precincts;
var chamber_selected;
var district_selected;

function query_string(table,chamber, district, offset) {
	if (offset ===0)
		return urls[table]+"?$where=office=%27"+chamber+"%27%20and%20district=%27"+district+"%27";
	else
		return urls[table]+"?$where=office=%27"+chamber+"%27%20and%20district=%27"+district+"%27" + "%27&$offset="+offset+"%27";
}
function count_query(table, chamber, district) {
	return urls[table] + "?$select=count(*)&$where=office=%27"+chamber+"%27%20and%20district=%27"+district+"%27";
}

function get_contributions_received(table, chamber, district, callback) {
	var q = queue();
	
	// by default this gets 1000
	$.get(count_query(table, chamber, district), function(data) {
		var count = data[0].count
		q.defer($.get, query_string(table, chamber, district, 0))
		for (i=0; i < count / 1000; i++) {
			q.defer($.get, query_string(table, chamber, district, i * 1000))
		}
		q.awaitAll(function(results) {
			callback(null, results);
		})
	});
}

function draw_map(chamber, district){
	var map_svg = d3.select("#map")
					.append("svg")
					.attr("id", "map")
	
	var map_width = 760//960,
	    map_height = 360//660;

	map_svg.attr("width", map_width)
	    	.attr("height", map_height);

	var readout = d3.select("body").append("div")
		.attr("id", "readout")
		.style("position", "absolute")
		.style("top", 20 + "px")
		
	var readout_title = readout.append("h1").attr("id", "country_name")
	
	var projection = d3.geo.albers()
		.center([0, 18.5])
		.rotate([159.266, -3.049])
		.parallels([15, 25])
		.scale(4000)
		.translate([327, 70]);
		
	var path = d3.geo.path()
	    .projection(projection);
	
	d3.csv("precincts.csv", function(data){	
		precincts = data; 
		d3.json("hawaii_voting_districts_topo.json", function(error, hawaii) {
				//console.log(topojson.feature(hawaii, hawaii.objects.hawaii_voting_districts).features)
				create_inset(topojson.feature(hawaii, hawaii.objects.hawaii_voting_districts).features)
				map_svg.selectAll("path.district")
						 .data(topojson.feature(hawaii, hawaii.objects.hawaii_voting_districts).features)
						 .enter().append("path")
					    .attr("class", function(d) { 
								var desc = d.id.split("-"); 
								if(desc[0][0] === "0"){
									desc[0] = desc[0].slice(1);
								}
								if(desc[1][0] === "0"){
									desc[1] = desc[1].slice(1);
								}
								var senate = "";
								for(var i = 0; i < precincts.length; i++){
									if(precincts[i]["House"] === desc[0] && precincts[i]["Precinct"] === desc[1]){
										senate = precincts[i]["Senate"]; 					
									}
								}
								return "district H" + desc[0] + " P" + desc[1] + " S" + senate;  
								
						 })
					    .attr("d", path)
				highlight_map(chamber, district)
		}) 
	})
}

function create_inset(data){	
	console.log(data)
	var inset_width = 260,
	 	inset_height = 220;

	inset_svg = d3.select("#map")
						.append("svg")
						.attr("id", "inset")
						.attr("width", inset_width)
						.attr("height", inset_height)
	
	inset_projections = {
		"City and County of Honolulu": d3.geo.albers().center([0, 18.5]).rotate([157.967, -2.941]).scale(19284).translate([138, 119]),
		"Hawaii County": d3.geo.albers().center([0, 18.5]).rotate([155.527, -.99]).scale(7016).translate([155, 119]),
	    "Kauai County": d3.geo.albers().center([0, 18.5]).rotate([159.917, -3.374]).scale(12431).translate([108, 150]),
	    "Maui County": d3.geo.albers().center([0, 18.5]).rotate([156.665, -2.290]).scale(11428).translate([125, 129])
	}
	
	inset_svg.selectAll("path.inset")
			 .data(data)
			 .enter()
			 .append("path")
			 .attr("class", function(d) { 
				var desc = d.id.split("-"); 
				if(desc[0][0] === "0") { desc[0] = desc[0].slice(1); }
				if(desc[1][0] === "0") { desc[1] = desc[1].slice(1); }
				var senate = "";
				row_matches = precincts.filter(function(d) { return d["House"] === desc[0] && d["Precinct"] === desc[1]})
				if (row_matches.length > 1) { senate = row_matches[0]["Senate"] }
				return "inset H" + desc[0] + " P" + desc[1] + " S" + senate; 
			 })
}

function highlight_map(chamber, district){
	var county = precincts.filter(function(d) { return parseInt(d[chamber]) === district })[0]["County"]
	d3.selectAll("path.district."+chamber[0]+district).attr("fill", "red")
	d3.selectAll("path.inset."+chamber[0]+district).attr("fill", "red")
	inset_svg
		.selectAll("path.inset")
		.attr("d", d3.geo.path().projection(inset_projections[county]))
	
}
var temp_data

function draw(query_data, election_period, chamber, district) {
	d3.select("#record_count").text(chamber+" "+district+" Race: " +election_period)
	

	d3.selectAll("#controls a").remove();
	d3.select("#controls")
		.selectAll("a")
		.data(["2006-2008","2008-2010","2010-2012","2012-2014"])
		.enter()
		.append("a")
		.text(function(d) {return d+ " | "})
		.attr("href", "javascript:;")
		.on("click", function(d,i) {
			draw(query_data, d, chamber, district);
		;})
		
	populate_table("fundraiser", query_data[2], null, election_period)
	populate_table("campaign_contributions_made_to", query_data[1], "aggregate", election_period)
	populate_table("campaign_contributions_received", query_data[0], "aggregate", election_period)
	
}
function populate_table(table_name, data, sum_field, election_period) {
	if (data.length === 0) return;
	temp_data = data;
	candidate_summaries = d3.entries(d3.nest().key(function(d) {return d.election_period}).map(data))
	year_summaries = d3.nest().key(function(d) {return d.election_period}).map(data)
	
	d3.selectAll("."+table_name).remove()
	if (table_name !== "fundraiser") {
		this_year = year_summaries[election_period]
		if (this_year === undefined) return;
		min_date = new Date (d3.min(this_year, function(d) {return d.date}));
		max_date = new Date (d3.max(this_year, function(d) {return d.date}));
		min_don = d3.min(this_year, function(d) {return d.aggregate});
		max_don = d3.max(this_year, function(d) {return d.aggregate});
		candidates = d3.entries(d3.nest().key(function(d) {return d.candidate_name}).map(this_year))
	
	bubble_scale = d3.scale.sqrt().domain([0,1000]).range([0,25])
	timeline_scale = d3.time.scale().domain([min_date, max_date]).range([200,1100])
	bar_scale = d3.scale.linear().domain([0,100000]).range([0,200])
			
	var svgs = d3.select("#svgs")
		.selectAll("svg."+table_name)
		.data(candidates)
		.enter()
		.append("svg")
		.attr("class", table_name)
		.attr("width",1400)
		.attr("height",100)
		.on("mousemove", function(d) {
			xpos = d3.mouse(this)[0]
			date_string = timeline_scale.invert(xpos).toDateString()
			nearest_date = Date.parse(date_string);
			d3.select("#date").text(date_string)
			//console.log(timeline_scale.invert(xpos))
			d3.select(this).select("circle.marker")
				.attr("cx", timeline_scale(nearest_date))
			
		})
		.on("mouseout", function(d) {
			d3.select("#date").html("&nbsp;")
			d3.select(this).select("circle.marker").attr("cx", -10);
		})
	
	svgs.append("circle")
		.attr("cy", 50)
		.attr("r", 2)
		.attr("fill", "red")
		.attr("class", "marker")
		
	svgs.append("line")
		.attr("x1", 200).attr("x2", 1100)
		.attr("y1", 50).attr("y2", 50)
		.attr("stroke", table_name === "campaign_contributions_made_to" ? "red" : "blue")
	
	svgs.selectAll("text.candidate_name")
		.data(function(d) { return [d.key] })
		.enter()
		.append("text")
		.attr("class", "candidate_name")
		.attr("x", 150)
		.attr("y", 55)
		.attr("text-anchor", "end")
		.text(function(d) {return d })
		
	contributions = svgs.selectAll("circle.contribution")
		.data(function(d) { return d.value })
	
	contributions
		.enter()
		.append("circle")
		.attr("class", "contribution")
		.attr("cy", 50)
		.attr("cx", function(d) { return timeline_scale(new Date(d.date))})
		.attr("fill-opacity",0.1)
		.attr("fill", table_name === "campaign_contributions_made_to" ? "red" : "blue")
		.attr("r",0)
	
	contributions
		.transition()
		.duration(1000)
		.attr("r", function(d) { return bubble_scale(d.aggregate)})
	
	contributions
		.on("mouseover", function(d,i) {
			var contributor = table_name === "campaign_contributions_made_to" ? d.noncandidate_committee_name : d.contributor_name
			d3.select("#contributions").text(d.date.slice(0,10) + " : " + contributor + " : " +d.aggregate)
			var sel_contribution = d3.select(this).attr("stroke", "black").attr("stroke_width", "2")
		})
		.on("mouseout", function(d,i){
			d3.select("#contributions").html("&nbsp;")
			d3.select(this).attr("stroke", "none")
		})
		
	svgs.selectAll("text.funds_raised")
		.data(function(d) { return [d3.sum(d.value, function(e) {return e.aggregate})] })
		.enter()
		.append("text")
		.attr("class", "funds_raised")
		.attr("x", 1150)
		.attr("y", 45)
		.text(function(d) {return "$" + d })
	
	svgs.selectAll("rect")
		.data(function(d) { return [d3.sum(d.value, function(e) {return e.aggregate})] })
		.enter()
		.append("rect")
		.attr("x", 1150)
		.attr("y", 55)
		.attr("height", 20)
		.attr("width", function(d) {return bar_scale(d) })
		.attr("fill", table_name === "campaign_contributions_made_to" ? "red" : "blue")
	
	}
	d3.select("#summary").append("h4").attr("class", table_name).text(table_name+" summary, "+ candidate_summaries.length+" candidate(s)")
	ul = d3.select("#summary").append("ul").attr("class", table_name)
	ul.selectAll("li")
		.data(candidate_summaries)
		.enter()
		.append("li")
		.text(function(d) {
			var detail = ""
			if (sum_field !== null)
				detail = " ($"+ d3.sum(d.value, function(d) {return d[sum_field]}) + ")";
			return d.key + ": " + d.value.length + detail
		})
	d3.select("body").append("h2").attr("class",table_name).text(table_name+": "+data.length+" records");
	if (data.length === 0) return;
	
	table = d3.select("body").append("table").attr("class", table_name+ " small");
	
	table.append("tr")
		.data([data[0]])
		.selectAll("th")
		.data(function(d) {return d3.keys(d)})
		.enter()
		.append("th")
		.text(function(d) {return d;})
		
	contribution_rows = table
		.selectAll("tr.data")
		.data(data)
		.enter()
		.append("tr")
		.attr("class", "data")
	
	contribution_rows
		.selectAll("td")
		.data(function(d) {return d3.values(d)})
		.enter()
		.append("td")
		.text(function(d) {return d });
}

function get_data(chamber, district){
	//d3.select("#record_count").text(chamber+" "+district+" Race: 2006-2008")

	var q1=queue()
	q1.defer(get_contributions_received,"campaign_contributions_received", chamber, district);
	q1.defer(get_contributions_received,"campaign_contributions_made_to", chamber, district);
	q1.defer(get_contributions_received,"fundraiser", chamber, district);
	q1.awaitAll(function(error, results) {
		draw(results, "2006-2008", chamber, district);
	})

}

function load_candidates(office_name, data){
	var div =  d3.select("body").append("div")
	
	div.attr("id", "candidates")
	
	div.selectAll("a.candidates")
		.data(data)
		.enter()
		.append("a")
}

function load_districts(house_districts, senate_districts){

	var div = d3.select("#districts")//("body").append("div")
	div.append("span").text("House District:")
	d3.select("div")
		.selectAll("a.house_race")
		.data(house_districts)
		.enter()
		.append("a")
		.attr("class", "house_race")
		.text(function(d){ return d +" | "; })
		.attr("href", "javascript:;")
		.on("click", function(d,i) { 
			d3.selectAll("path.district").attr("fill", "black")
			d3.selectAll("path.inset").attr("fill", 'black')
			get_data("House", d);
			highlight_map("House",d);
			district_selected = d;
			chamber_selected = "House";
		})
		.on("mouseover", function(d,i){	
			d3.selectAll("path.district").attr("fill", "black")
			d3.selectAll("path.inset").attr("fill", 'black')
			get_data("House", d);
			highlight_map("House",d);
		})
		.on("mouseout", function(d,i){
			d3.selectAll("path.district").attr("fill", "black")
			d3.selectAll("path.inset").attr("fill", 'black')
			get_data(chamber_selected,district_selected)
			highlight_map(chamber_selected, district_selected)
		})

	d3.select("div").append("br")
	d3.select("div").append("span").text("Senate District:")
	d3.select("div")
		.selectAll("a.senate_race")
		.data(senate_districts)
		.enter()
		.append("a")
		.attr("class", "senate_race")
		.text(function(d){ return d +" | "; })
		.attr("href", "javascript:;")
		.on("click", function(d,i) { 
			d3.selectAll("path.district").attr("fill", "black")
			d3.selectAll("path.inset").attr("fill", 'black')
			get_data("Senate", d);
			highlight_map("Senate",d)
			district_selected = d;
			chamber_selected = "Senate";
		;})
		.on("mouseover", function(d,i){	
			d3.selectAll("path.district").attr("fill", "black")
			d3.selectAll("path.inset").attr("fill", 'black')
			get_data("Senate", d);
			highlight_map("Senate",d);
		})
		.on("mouseout", function(d,i){
			d3.selectAll("path.district").attr("fill", "black")
			d3.selectAll("path.inset").attr("fill", 'black')
			get_data(chamber_selected,district_selected)
			highlight_map(chamber_selected, district_selected)
		})
		
	
}

function load_dataset(){	
	var house_districts =[];
	for(var i = 1; i < 52; i++){house_districts.push(i)}
	
	var senate_districts = [];
	for(var i = 1; i < 25; i++){senate_districts.push(i)}

	load_districts(house_districts, senate_districts);
	//d3.select("body").append("h1").attr("id","record_count");
	get_data("House", 1);
	draw_map("House", 1);
	chamber_selected = "House";
	district_selected = 1;
}

load_dataset();