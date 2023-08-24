alert(`Welcome to "A Day in an American Life"!

This page is not responsive. It only looks good at certain display ratios, so please zoom out (CTRL/CMD + -) until you can see everything. 

This is my submission for QSS19 Advanced Data Visualization's final project. It's a data visualization of 1000 randomly-selected American survey respondents who documented their days in the American Time Use Survey.
`);


var speeds = { "slow": 1000, "fast": 100 };
var SPEED = "slow";
var PAUSE = true;

var schedule_arr = [];
var treemap_arr = [];

var act_codes = [
  { "index": "0", "short": "Sleeping", "desc": "Sleeping" },
  { "index": "1", "short": "Personal Care", "desc": "Personal Care" },
  { "index": "2", "short": "Eat/Drink", "desc": "Eating and Drinking" },
  { "index": "3", "short": "Education", "desc": "Education" },
  { "index": "4", "short": "Work", "desc": "Work and Work-Related Activities" },
  { "index": "5", "short": "Housework", "desc": "Household Activities" },
  { "index": "6", "short": "Volunteering ", "desc": "Volunteer Activities / Care for others" },
  { "index": "7", "short": "Leisure", "desc": "Socializing, Relaxing, and Leisure" },
  { "index": "8", "short": "Sports", "desc": "Sports, Exercise, and Recreation" },
  { "index": "9", "short": "Religion", "desc": "Religious and Spiritual Activities" },
  { "index": "10", "short": "Other", "desc": "Other" },
  // traveling is last instead of other so it can easily sit in the center of the circle
  { "index": "11", "short": "Traveling", "desc": "Traveling" }
];

// load data from tsv file (cleaned in proj3.R from atusact_2021.dat)
d3.tsv("d3_data.tsv", function (error, data) {
  // look at each row in data
  data.forEach(function (d) {
    var day_array = d.x.split(",");
    var activities = [];
    var treemap_obj = [];

    // look at each comma-separated value (activity code, duration) in each line's data array
    // the durations are stored at every other comma,
    // so we only need to look at the odd values in the array
    for (var i = 1; i <= day_array.length - 1; i += 2) {
      // the activity code (an integer) is stored at the index before the duration
      var act = day_array[i - 1];
      activities.push({ 'act': act, 'duration': +day_array[i] });

      // also push the given activity value to the treemap array 
      // thus creating each respondent's personalized plot
      treemap_obj.push({ "name": act, "size": +day_array[i] });
    }
    // then schedule the formatted activity sums by pushing them to schedule_arr
    // thus creating full list of all 1000 respondents' activity logs
    schedule_arr.push(activities);

    // clone a for sorting and merging into one treemap object
    var treemap_clone = JSON.parse(JSON.stringify(treemap_obj));

    // make sure elements with the same id are next to each other
    treemap_clone.sort(function (x, y) {
      if (x['name'] < y['name']) {
        return -1;
      }
      if (x['name'] > y['name']) {
        return 1;
      }
      return 0;
    });

    // iterate over each elt, if this one has the same id as the previous one, accumulate
    // else add to b
    var lastId;
    var treemap_merged = [];
    for (var i = 0; i < treemap_clone.length; i++) {
      if (lastId == treemap_clone[i]['name']) {
        treemap_merged[treemap_merged.length - 1]['size'] += treemap_clone[i]['size'];
      } else {
        treemap_merged[treemap_merged.length] = (treemap_clone[i]);
        lastId = treemap_clone[i]['name'];
      }
    }

    // schedule the accumulated treemap object by pushing it to treemap_arr
    // thus creating full list of all 1000 respondents' treemaps
    treemap_arr.push({
      "name": "timeUse",
      "children": treemap_merged
    });

  });

  // build and run the visualization
  runVis();
  function runVis() {
    let curr_minute = 0;

    var center_pt = { x: 420, y: 280 };

    var foci = {};
    var act_index = act_codes.map(code => {
      if (code.desc === "Traveling") {
        foci[code.index] = center_pt;
      } else {
        var theta = 2 * Math.PI / (act_codes.length - 1);
        var x = 250 * Math.cos(code.index * theta) + 420;
        var y = 260 * Math.sin(code.index * theta) + 310;
        foci[code.index] = { x, y };
      }
      return code.short;
    });

    // start the SVG
    var svg = d3.select("#beehive")
      .append("svg")
      .attr("width", 1000)
      .attr("height", 700);

    var margin = { top: 40, right: 10, bottom: 160, left: 60 };

    var width2 = 300 - margin.left - margin.right;
    var height2 = 430 - margin.top - margin.bottom;

    var svg2 = d3.select("#bar-chart")
      .append("svg")
      .attr("width", 300)
      .attr("height", 430);

    // used for percentages by minute
    // spits out an array like [{index: 0, count: 0}, {index: 1, count: 0} ... ]
    var act_counts = Array.from({ length: 12 }, (_, index) => ({ index, count: 0 }));

    // initialize node for each person's schedule
    var nodes = schedule_arr.map((o, i) => {
      var act = o[0].act;
      act_counts[+act].count += 1;
      var init_x = foci[act].x + Math.random();
      var init_y = foci[act].y + Math.random();
      return {
        act,
        radius: 3,
        x: init_x,
        y: init_y,
        color: "#000000",
        moves: 0,
        next_move_time: o[0].duration,
        schedule: o
      };
    });

    var force = d3.layout.force()
      .nodes(nodes)
      .size([800, 600])
      .gravity(0)
      .charge(0)
      .friction(0.9)
      .on("tick", tick)
      .start();

    var circle = svg.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d => d.radius)
      .attr("class", "dot")
      .on("click", d => {
        svg.selectAll("circle").attr("fill", "#000000");
        d3.select(event.currentTarget).attr("fill", "#FF0000");
        document.getElementById("treeNode").innerHTML = d.index;
        updateTreemap(treemap_arr[d.index])
      });

    // activity labels
    var label = svg.selectAll("text")
      .data(act_codes)
      .enter()
      .append("text")
      .attr("class", "actLabel")
      .attr("x", (d, i) => {
        if (d.desc === "Traveling") {
          return center_pt.x;
        } else {
          var theta = 2 * Math.PI / (act_codes.length - 1);
          if (d.desc === "Sleeping") {
            return 340 * Math.cos(i * theta) + 470;
          } else if (d.desc === "Socializing, Relaxing, and Leisure") {
            return 340 * Math.cos(i * theta) + 380;
          } else {
            return 340 * Math.cos(i * theta) + 420;
          }
        }
      })
      .attr("y", (d, i) => {
        if (d.desc === "Traveling") {
          return center_pt.y + 60;
        } else {
          var theta = 2 * Math.PI / (act_codes.length - 1);
          if (d.desc === "Volunteer Activities / Care for others") {
            return 300 * Math.cos(i * theta) + 480;
          } else if (d.desc === "Socializing, Relaxing, and Leisure") {
            return 300 * Math.cos(i * theta) + 280;
          } else {
            return 300 * Math.sin(i * theta) + 320;
          }
        }
      });

    label.append("tspan")
      .attr("x", function () {
        return d3.select(this.parentNode).attr("x");
      })
      .attr("text-anchor", "middle")
      .text(d => d.short);

    label.append("tspan")
      .attr("dy", "1.3em")
      .attr("x", function () {
        return d3.select(this.parentNode).attr("x");
      })
      .attr("text-anchor", "middle")
      .attr("class", "actPct")
      .text(d => readablePercent(act_counts[d.index].count));

    // Scales
    var x = d3.scale.ordinal().domain(act_index).rangeRoundBands([0, width2], 0.1);
    var y = d3.scale.linear().domain([0, 1000]).range([height2, 0]);
    var yLabel = d3.scale.linear().domain([0, 1]).range([height2, 0]);

    // Axes
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(yLabel).tickFormat(d3.format("%")).orient("left");
    svg2.append("g").attr("class", "x-axis axis")
      .attr("transform", "translate(" + margin.left + "," + (margin.top + height2) + ")");
    svg2.append("g").attr("class", "y-axis axis")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg2.select(".x-axis")
      .transition().duration(1000)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-65)");
    svg2.select(".y-axis")
      .transition().duration(1000)
      .style("font-size", "12px")
      .call(yAxis);

    // axis label
    svg2.append("text")
      .attr("x", -height2 / 2) // x and y positions swap after rotation
      .attr("y", 5)
      .attr("dy", ".7em")
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "middle")
      .text("% of 1000 people");

    var tip = d3.tip().attr('class', 'd3-tip');

    // function to dynamically update bar chart
    function updateBars(data) {
      var rect = svg2.selectAll("rect").data(data);

      tip.html(function (d) {
        return (d.count / 10) + "%";
      });
      svg2.call(tip);

      // enter (initialize the newly added elements)
      rect.enter()
        .append("rect")
        .attr("class", "bar")
        .on("mouseover", tip.show)
        .on('mouseout', tip.hide);

      // update (set the dynamic properties of the elements)
      rect.transition().duration(40)
        .attr("x", function (d, index) {
          return x(act_index[index]);
        })
        .attr("y", function (d) {
          return y(d.count);
        })
        .attr("width", x.rangeBand())
        .attr("height", function (d) {
          return height2 - y(d.count);
        })
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      rect.exit().remove();
    }

    // function to dynamically update ranking texts
    function updateRanking(data) {
      var sortedData = Array.prototype.slice.call(data).sort(function (a, b) {
        // sort by count descending
        return b.count - a.count;
      });
      sortedData.forEach(function (d, index) {
        document.getElementById(index + 1).innerHTML = act_codes[d.index].short;
      });
    }

    updateBars(act_counts);
    updateRanking(act_counts);

    // update nodes based on activity and duration
    function timer() {
      d3.range(nodes.length).map(function (i) {
        var curr_node = nodes[i];
        var curr_moves = curr_node.moves;

        // time to go to next activity
        if (curr_node.next_move_time == curr_minute) {
          if (curr_node.moves == curr_node.schedule.length - 1) {
            curr_moves = 0;
          } else {
            curr_moves += 1;
          }

          // subtract from current activity count
          act_counts[+curr_node.act].count -= 1;

          // move on to next activity
          curr_node.act = curr_node.schedule[curr_moves].act;

          // add to new activity count
          act_counts[+curr_node.act].count += 1;

          curr_node.moves = curr_moves;
          curr_node.cx = foci[curr_node.act].x;
          curr_node.cy = foci[curr_node.act].y;

          nodes[i].next_move_time += nodes[i].schedule[curr_node.moves].duration;
        }
      });

      force.resume();
      curr_minute += 1;

      // update percentages
      label.selectAll("tspan.actPct").text(function (d) {
        return readablePercent(act_counts[+d.index].count);
      });

      updateBars(act_counts);
      updateRanking(act_counts);

      // update times 
      var true_minute = curr_minute % 1440;
      var current_time = minutesToTime(true_minute)
      d3.select('#current_time').text(current_time);

      if (!PAUSE) {
        setTimeout(timer, speeds[SPEED]);
      }
    }

    // time controls
    d3.select("#play").style("display", "initial").on("click", function () {
      setTimeout(timer, speeds[SPEED]);
      PAUSE = false;
      d3.select("#play").style("display", "none");
      d3.select("#pause").style("display", "initial");
    });

    d3.select("#pause").on("click", function () {
      PAUSE = true;
      d3.select("#play").style("display", "initial");
      d3.select("#pause").style("display", "none");
    });

    d3.select("#reset").style("display", "initial").on("click", reset);

    function tick(e) {
      var k = 0.04 * e.alpha;

      // push nodes toward their respective activities
      nodes.forEach(function (o, i) {
        var curr_act = o.act;
        // make sleep slower than all other activity categories
        var damper = curr_act == "0" ? 0.6 : 1;

        o.color = "#000000";
        o.y += (foci[curr_act].y - o.y) * k * damper;
        o.x += (foci[curr_act].x - o.x) * k * damper;
      });

      circle
        .each(collide(0.5))
        .attr("cx", function (d) {
          return d.x;
        })
        .attr("cy", function (d) {
          return d.y;
        })
        .attr("class", "dot");
    }

    // resolve collisions between nodes
    function collide(alpha) {
      var quadtree = d3.geom.quadtree(nodes);
      return function (d) {
        var r = d.radius + 4;
        var nx1 = d.x - r;
        var nx2 = d.x + r;
        var ny1 = d.y - r;
        var ny2 = d.y + r;
        quadtree.visit(function (quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x;
            var y = d.y - quad.point.y;
            var l = Math.sqrt(x * x + y * y);
            var r = d.radius + quad.point.radius + (d.act !== quad.point.act);
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      };
    }

    // speed toggle
    d3.selectAll(".toggleButton")
      .on("click", function () {
        if (d3.select(this).attr("data-val") == "slow") {
          d3.select(".slow").classed("current", true);
          d3.select(".medium").classed("current", false);
          d3.select(".fast").classed("current", false);
        } else if (d3.select(this).attr("data-val") == "medium") {
          d3.select(".slow").classed("current", false);
          d3.select(".medium").classed("current", true);
          d3.select(".fast").classed("current", false);
        } else {
          d3.select(".slow").classed("current", false);
          d3.select(".medium").classed("current", false);
          d3.select(".fast").classed("current", true);
        }
        SPEED = d3.select(this).attr("data-val");
      });

    // =================================================================
    // tree map
    // =================================================================

    var margin_t = { top: 40, right: 10, bottom: 10, left: 10 };
    var width_t = 675 - margin_t.left - margin_t.right;
    var height_t = 260 - margin_t.top - margin_t.bottom;

    var color = d3.scale.ordinal()
      .range(['#000000', '#1C1C1C', '#333333', '#4D4D4D',
      '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC',
      '#E6E6E6', '#F0F0F0', '#FFFFFF']);
    var textColor = d3.scale.ordinal()
      // text colors to correspond so treemap is legible
      .range(['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF',
        '#FFFFFF', '#000000', '#000000', '#000000',
        '#000000', '#000000', '#000000', '#000000'
      ]);

    var treemap = d3.layout.treemap()
      .size([width_t, height_t])
      .sticky(false)
      .value(function (d) {
        return d.size;
      });

    var div = d3.select("#treemap").append("div")
      .style("position", "relative")
      .style("width", (width_t + margin_t.left + margin_t.right) + "px")
      .style("height", (height_t + margin_t.top + margin_t.bottom) + "px");

    function updateTreemap(root) {
      var node = div.datum(root).selectAll(".node").data(treemap.nodes);
      node.enter().append("div").attr("class", "node");
      node.exit().remove();

      node.transition().duration(1500)
        .call(position)
        .style("background", function (d) {
          return d.name == "timeUse" ? "white" : color(d.name);
        })
        .style("color", function (d) {
          return d.name == "timeUse" ? "white" : textColor(d.name);
        })
        .text(function (d) {
          return d.children ? null : act_codes[d.name].short + ': ' +
            (d.value / 60).toFixed(1) + 'hrs (' + (d.value / 14.4).toFixed() + '%)';
        });

      node
        .on("mouseover", function (d) { mouseover(d); })
        .on("mouseout", function () {
          d3.select("#tooltip").style("visibility", "hidden");
        });

      function mouseover(d) {
        d3.select("#tooltip")
          .style("visibility", "visible")
          .html(function () {
            return d.children ? null : act_codes[d.name].short + ': ' +
              (d.value / 60).toFixed(1) + 'hrs (' + (d.value / 14.4).toFixed() + '%)';
          })
          .style("top", function () {
            return (d3.event.pageY - 80) + "px";
          })
          .style("left", function () {
            return (d3.event.pageX - 1100) + "px";
          });
      }

      function position() {
        this.style("left", function (d) {
          return d.x + "px";
        })
        .style("top", function (d) {
          return d.y + "px";
        })
        .style("width", function (d) {
          return Math.max(0, d.dx - 1) + "px";
        })
        .style("height", function (d) {
          return Math.max(0, d.dy - 1) + "px";
        });
      }
    }

    // call on a arbitrary single node to hint interacting to users
    d3.select("#beehive svg :nth-child(963)").attr("fill", "#FF0000");
    document.getElementById("treeNode").innerHTML = "963";
    updateTreemap(treemap_arr[963]);

    function reset() {
      if (!PAUSE) {
        d3.select("#play").style("display", "initial");
        d3.select("#pause").style("display", "none");
        PAUSE = true;
      }
      d3.select("#current_time").html("4:00am");
      d3.selectAll("svg").remove();
      curr_minute = -1;
      runVis();
    }
  }
});

// output readable percent based on count.
function readablePercent(n) {
  var pct = Math.round((n / 10) * 10) / 10;
  return (pct < 1 && pct > 0) ? "<1%" : pct + "%";
}

// data is stored in terms of minutes starting from 4am, so function to convert 
// minutes to a specific time of day via summation
function minutesToTime(m) {
  var minutes = (m + 4 * 60) % 1440;
  var hh = Math.floor(minutes / 60);
  var ampm = hh >= 12 ? "pm" : "am";
  hh = hh % 12 || 12; // Ensure hh is in the range of 1-12
  var mm = String(minutes % 60).padStart(2, "0");

  return hh + ":" + mm + ampm;
}
