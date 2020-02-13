import * as d3 from "d3";
import '../styles/index.scss';
import { changeDropValue } from "./toolbarComponent";

export function dropDown(div, optionArray, dropText, dropId){
    let dropdiv = div.append('div').classed(`dropdown ${dropId}`, true);
    dropdiv.style('display', 'inline-block')
    let button = dropdiv.append('button').classed('btn dropbtn dropdown-toggle', true).text(dropText);
    let dropContent = dropdiv.append('div').attr('id', dropId).classed('dropdown-content', true);
    dropContent.append('a').text('text').attr('font-size', 11);
    let options = dropContent.selectAll('a').data(optionArray).join('a').text(d=> d.field);

    options.on('click', (d, i, n)=> {
        
        changeDropValue(d, button);
        dropContent.classed('show', false);
    });

    button.on('click', (d, i, n)=> {
        if(dropContent.classed('show')){
            dropContent.classed('show', false);
        }else{
            dropContent.classed('show', true);
        }
    });
    options.raise()
    return options;
}

export function updateDropdown(optionArray, dropId){
    d3.select(`#${dropId}`).selectAll('a').data(optionArray).join('a').text(d=> d.field);
}

export function slider(range, trait, svg) {

    console.log(trait, svg)
    // set width and height of svg
    var w = 200
    var h = 100

//     <style>
// svg {
// 	font-family: sans-serif;
// }

// rect.overlay {
// 	stroke: black;
// }

// rect.selection {
// 	stroke: none;
//   fill: steelblue;
//   fill-opacity: 0.6;
// }

// #labelleft, #labelright {
// 	dominant-baseline: hanging;
//   font-size: 12px;
// }

// #labelleft {
// 	text-anchor: end;
// }

// #labelright {
// 	text-anchor: start;
// }
// </style>
    svg.attr('width', w)
        .attr('height', h)

    var margin = {top: 30,
                  bottom: 15,
                  left: 30,
                  right: 20}
  
    // dimensions of slider bar
    var width = w - margin.left - margin.right;
    var height = h - margin.top - margin.bottom;
  
    // create x scale
    var x = d3.scaleLinear()
      .domain(range)  // data space
      .range([0, width]);  // display space
    
    // create svg and translated g
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)
    
    // labels
    var labelL = g.append('text')
      .attr('id', 'labelleft')
      .attr('x', 0)
      .attr('y', height + 5)
      .style('text-anchor', 'end')
  
    var labelR = g.append('text')
      .attr('id', 'labelright')
      .attr('x', 0)
      .attr('y', height + 5)
      .style('text-anchor', 'start')
  
    // define brush
    var brush = d3.brushX()
      .extent([[0,0], [width, height]])
      .on('brush', function() {
        var s = d3.event.selection;
        // update and move labels
        labelL.attr('x', s[0])
          .text((x.invert(s[0]).toFixed(2)))
        labelR.attr('x', s[1])
          .text((x.invert(s[1]).toFixed(2)))
        // move brush handles      
        handle.attr("display", null).attr("transform", function(d, i) { return "translate(" + [ s[i], - height / 4] + ")"; });
        // update view
        // if the view should only be updated after brushing is over, 
        // move these two lines into the on('end') part below
        svg.node().value = s.map(function(d) {var temp = x.invert(d); return +temp.toFixed(2)});
        svg.node().dispatchEvent(new CustomEvent("input"));
      })
  
    // append brush to g
    var gBrush = g.append("g")
        .attr("class", "brush")
        .call(brush)
  
    // add brush handles (from https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a)
    var brushResizePath = function(d) {
        var e = +(d.type == "e"),
            x = e ? 1 : -1,
            y = height / 2;
        return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
          "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
          "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
    }
  
    var handle = gBrush.selectAll(".handle--custom")
      .data([{type: "w"}, {type: "e"}])
      .enter().append("path")
      .attr("class", "handle--custom")
      .attr("stroke", "#000")
      .attr("fill", '#eee')
      .attr("cursor", "ew-resize")
      .attr("d", brushResizePath);
      
    // override default behaviour - clicking outside of the selected area 
    // will select a small piece there rather than deselecting everything
    // https://bl.ocks.org/mbostock/6498000
    gBrush.selectAll(".overlay")
      .each(function(d) { d.type = "selection"; })
      .on("mousedown touchstart", brushcentered)
    
    function brushcentered() {
      var dx = x(1) - x(0), // Use a fixed width when recentering.
      cx = d3.mouse(this)[0],
      x0 = cx - dx / 2,
      x1 = cx + dx / 2;
      d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
    }
    
    // select entire range
    gBrush.call(brush.move, range.map(x))
    
    return svg.node()
  }