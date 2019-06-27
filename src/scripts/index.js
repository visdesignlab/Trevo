import '../styles/index.scss';
import * as d3 from "d3";
import * as Papa from 'papaparse';
import {edgeFile, nodeFile} from './fileThing';
import {loadData} from './dataLoad';
import {allPaths, pullPath} from './pathCalc';
const csv = require('csv-parser');  

let edgeOb = Papa.parse(edgeFile, {header:true});
let nodeOb = Papa.parse(nodeFile, {header:true});

let wrap = d3.select('#wrapper');

let svg = wrap.append('svg'),
    width = +svg.attr("width"),
    height = +svg.attr("height");


/*


let linkOb = edgeOb.data.map(m=> {
    return { source: m._from, target: m._to,  blen: ++m.length}
});

//need to fix the id name in this
let graph = {nodes: nodeOb.data.map(function(m, i){return {index: i, name: m["_id "] }}), links: linkOb }

console.log('graph', graph);

let wrap = d3.select('#wrapper');

let svg = wrap.append('svg'),
    width = +svg.attr("width"),
    height = +svg.attr("height");

let filterSample = graph.links.map(m=> m.source);
let leaves = graph.links.filter(l=> !filterSample.includes(l.target));

let paths2 = allPaths(graph.links, leaves);
console.log(paths2)

let paths = allPaths(graph.links, leaves).map(p=> {
    return p.map((m, i)=> {
        m.x1 = p[i - 1] ? p[i - 1].x2 : 0;
        m.x2 = m.x1 + m.blen
        return m;
    })}
);

let test = paths.map(p=> {
   // let max = 
    return p.map(m=> {
        console.log(d3.max(p.map(d=> d.x2)))
        m.max = d3.max(p.map(d=> d.x2));
        return m;
    })
})

console.log(test);

let maxDepth = d3.max(paths.flatMap(f=> f).map(m=> m.x2));
let xScale = d3.scaleLinear().range([10, 700]).domain([0, maxDepth])

/////Rendering ///////

svg.style('height', (paths.length*16) + 'px');

let pathGroups = svg.selectAll('.paths').data(test);
let pathEnter = pathGroups.enter().append('g').classed('paths', true);
pathGroups = pathEnter.merge(pathGroups);
pathGroups.attr('transform', (d, i)=> 'translate(0,'+ (i * 15)+')');

let nodeGroups = pathGroups.selectAll('.node').data(d=> d);
let nodeGroupEnter = nodeGroups.enter().append('g').classed('node', true);
nodeGroups = nodeGroupEnter.merge(nodeGroups);

let rects = nodeGroups.append('rect');
rects.attr('x', d=> xScale(d.x1))
.attr('y', 5).attr('width', d=> xScale(d.blen)).attr('height', 10).attr('fill', '#DED0DC')

let rects = pathGroups.selectAll('rect').data(d=> d);
let rectsEnter = rects.enter().append('rect');
rects = rectsEnter.merge(rects);
rects.attr('x', d=> xScale(d.x1))
.attr('y', 5).attr('width', d=> xScale(d.blen)).attr('height', 10).attr('fill', '#DED0DC')
*/

/*
let branches = pathGroups.selectAll('circle').data(d=> d);
let branchEnter = branches.enter().append('circle');
branches = branchEnter.merge(branches);
branches.attr('cx', (d)=> xScale(d.x1)).attr('cy', 10).attr('r', 5).attr('fill', '#7B747B');
branches.on('mouseover', (d, i)=> console.log(d) );
*/

/*
let branches = nodeGroups.append('circle');
branches.attr('cx', (d)=> xScale(d.x1)).attr('cy', 10).attr('r', 5).attr('fill', '#7B747B');
branches.on('mouseover', (d, i)=> console.log(d) );

let lab = nodeGroups.append('text').text(d=> d.)

let labels = pathGroups.append('text').text(d=> {
    console.log(d[0])
    return d[d.length - 1].target}).attr('x', (d, i)=> xScale(d[d.length - 1].x2)).attr('y', 15)


let notEmpty = function(childArray){
    if(childArray == undefined){
        return false;
    }else if(childArray.length == 0){
        return false;
    }else{
        return true;
    }
}

let digger = function(nodes, nodeArr, index, parent){
    nodes.forEach((node, i)=> {
        let newIndex = index + (i+1)
        node.id = newIndex
        nodeArr.push(node);
        if(notEmpty(node.children)){
            return digger(node.children, nodeArr, newIndex)
        }else{
            return nodeArr;
        }
    })
    return nodeArr
}*/



loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
    console.log(pathArray)





});



loadData(d3.csv, './public/data/edges.csv');
