import '../styles/index.scss';
import * as d3 from "d3";
import {renderSelectedView, pathSelected} from './selectedPaths';
import {formatAttributeData} from './dataFormat';

export function renderTree(nestedData, sidebar){
    // set the dimensions and margins of the diagram
    var margin = {top: 10, right: 90, bottom: 50, left: 20},
    width = 400 - margin.left - margin.right,
    height = 680 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
    var treemap = d3.tree()
    .size([height, width]);

//  assigns the data to a hierarchy using parent-child relationships
    var treenodes = d3.hierarchy(nestedData);

// maps the node data to the tree layout
    treenodes = treemap(treenodes);

    var treeSvg = sidebar.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom),
    g = treeSvg.append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

// adds the links between the nodes
    var link = g.selectAll(".link")
    .data( treenodes.descendants().slice(1))
    .join("path")
    .attr("class", "link")
    .attr("d", function(d) {
        return "M" + d.y + "," + d.x
        + "C" + (d.y + d.parent.y) / 2 + "," + d.x
        + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
        + " " + d.parent.y + "," + d.parent.x;
    });

    // adds each node as a group
    var node = g.selectAll(".node")
    .data(treenodes.descendants())
    .join("g")
    .attr("class", function(d) { 
    return "node" + 
    (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { 
    return "translate(" + d.y + "," + d.x + ")"; });

    // adds the circle to the node
    node.append("circle")
    .attr("r", 3);

    return node;
/////END TREE STUFF
///////////
}