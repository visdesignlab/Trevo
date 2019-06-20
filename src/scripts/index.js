import '../styles/index.scss';
import * as d3 from "d3";
import * as Papa from 'papaparse';
import {edgeFile, nodeFile} from './fileThing';
import {allPaths} from './pathCalc';
const csv = require('csv-parser');  

let edgeOb = Papa.parse(edgeFile, {header:true});
let nodeOb = Papa.parse(nodeFile, {header:true});

let linkOb = edgeOb.data.map(m=> {
    return { source: m._from, target: m._to  }
});

//need to fix the id name in this
let graph = {nodes: nodeOb.data.map(function(m, i){return {index: i, name: m["_id "] }}), links: linkOb }

console.log('graph', graph);

let wrap = d3.select('#wrapper');
wrap.append('text').text('is this on');

let svg = wrap.append('svg'),
    width = +svg.attr("width"),
    height = +svg.attr("height");

let xScale = d3.scaleLinear().domain([0,12]).range([0, width])

let filterSample = graph.links.map(m=> m.source);
let leaves = graph.links.filter(l=> !filterSample.includes(l.target));

let paths = allPaths(graph.links, leaves);

/////Rendering ///////

svg.style('height', (paths.length*16) + 'px');

let pathGroups = svg.selectAll('.paths').data(paths);
let pathEnter = pathGroups.enter().append('g').classed('paths', true);
pathGroups = pathEnter.merge(pathGroups);
pathGroups.attr('transform', (d, i)=> 'translate(0,'+ (i * 15)+')');

let branches = pathGroups.selectAll('circle').data(d=> d);
let branchEnter = branches.enter().append('circle').attr('cx', (d, j)=> 20+(j*20)).attr('cy', 10).attr('r', 5);
branches = branchEnter.merge(branches);
//.attr('cy', (d, i)=> i*10).attr('cx', 100).attr('r', 5);







