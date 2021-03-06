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



function size_divs() {
	d3.select("#major_controls").style({ height: controls_height+"px", width:page_width+"px", left:"0px", top:"0px" })
	d3.select("#map_container").style({ height: map_height+"px", width: map_width+"px", left:"0px", top: controls_height+"px"})
  d3.select("#tract_data").style({ height: data_height+"px", width: map_width+"px", left:"0px", top:(map_height+controls_height)+"px" })
	d3.select("#map_scales").style({ height: map_scales_height+"px", width:map_scales_width+"px", right:10+"px", top:controls_height+"px"})
	d3.selectAll("#map_scales .map_scale").style({height: (map_scales_height/3)+"px"}).append("svg")
	d3.selectAll("#column_header").style({ right:"0px" })
	d3.selectAll("#tract_controls").style({ height: controls_height+"px", width:page_width+"px", left:"0px", top:(data_height+map_height+controls_height)+"px" })
}

function set_price_nav(d) {
  d3.selectAll("#column_header li").classed("selected", false)
  d3.select("#"+d).classed("selected", true)
  var data = []
  if(d === "owner_occupied") {
    data = [
      {label:"All", col:"Owner_occupied"},
      {label:"<$299K", col:"VALUE_Less299k"},
      {label:"$300-499K", col:"VALUE_300_499k"},
      {label:"$500-999K", col:"VALUE_500_999k"},
      {label:"> $1M", col:"VALUE_1Mup"},
    ]
  } else if (d === "renter_occupied") {
    data = [
      {label:"All", col:"Renter_occupied"},
      {label:"< $749", col:"RENT_Less749"},
      {label:"$750-999", col:"RENT_750_999"},
      {label:"$1K-1499", col:"RENT_1k_1499"},
      {label:"> $1500", col:"RENT_1k5up"}
    ]
  } else if (d === "year_built") {
    data = [
    //BLT_After2010,BLT_2000_2009,BLT_1990_1999,BLT_1980_1989,BLT_1970_1979,BLT_1960_1969,BLT_1950_1959,BLT_1940_1949,BLT_Before1939
      {label:"All", col:"Total_units"},
      {label:"> 2010", col:"BLT_After2010"},
      {label:"2000-2009", col:"BLT_2000_2009"},
      {label:"1990-1999", col:"BLT_1990_1999"},
      {label:"1980-1989", col:"BLT_1980_1989"},
      {label:"1970-1979", col:"BLT_1970_1979"},
      {label:"1960-1969", col:"BLT_1960_1969"},
      {label:"1950-1959", col:"BLT_1950_1959"},
      {label:"1940-1949", col:"BLT_1940_1949"},
      {label:"< 1939", col:"BLT_Before1939"},
    ]
  } else {
    data = [
      {label:"All", col:"Total_units"},
      {label:"Rented", col:"Renter_occupied"},
      {label:"Owned", col:"Owner_occupied"},
      {label:"Vacant", col:"Vacant"}
    ]
  }
  
  var options = d3.select(".unit_nav ul")
    .selectAll("li")
    .data(data)
    
  options.enter().append("li")
  options.exit().remove()
  options
    .text(function(d) { return d.label})
    .classed("selected", false)
    .on("click", function(d) { 
      d3.selectAll(".unit_nav ul li").classed("selected", false)
      d3.select(this).classed("selected", true)
      units_scale_y(d.col)
    })
  
  d3.select(".unit_nav ul li").classed("selected", true)
  units_scale_y(data[0].col)
}

function sum_tract_data(tracts_data){
  var new_obj = {}
  fields.forEach(function(col) { 
    new_obj[col] = d3.sum(tracts_data.map(function(d) { return +d[col] }) ) 
  })
  return new_obj 
   
}

function calc_sum_data(tract_data) {
  var counties = ["Honolulu", "Maui", "Hawaii", "Kauai"]

  tracts_by_county = d3.nest()
    .key(function(d) { return d.County })
    .rollup(sum_tract_data)
    .map(tract_data)

  tracts_by_county["Statewide"] = sum_tract_data(tract_data)
  return tracts_by_county
}

function bind_unit_type_nav() {
  d3.select("#all_occupied").datum("all_occupied").on("click", set_price_nav)
  d3.select("#owner_occupied").datum("owner_occupied").on("click", set_price_nav)
  d3.select("#renter_occupied").datum("renter_occupied").on("click", set_price_nav)
  d3.select("#year_built").datum("year_built").on("click", set_price_nav)
}

// --------------- Run Main instructions ----------------

size_divs()
bind_unit_type_nav()
set_price_nav("all_occupied")

d3.json("data/map/final_shape.geojson", function(json_data) { 
  render_leaflet_map(json_data);
})

d3.csv("data/acs_condensed_match_tracts.csv", function(data) {
	ct_data = data
	sum_data = calc_sum_data(data)
  var q = queue()
  q.defer(d3.json,"data/map/tracts_topo.json")
	q.defer(d3.json,"data/dot_positions.json")
	q.awaitAll(function(error, results ) {
  	draw_d3_maps(results)
    draw_d3_bars(ct_data)
    select_tract_id("15003940002")
    update_statewide_text()
	})
})


// topojson \
// -o tracts_topo.json \
// --id-property GEOID10 \
// --properties tract_id=GEOID10 \
// --properties tract_name=NAME10 \
// -- \
// tracts_final_simplified.geojson 

