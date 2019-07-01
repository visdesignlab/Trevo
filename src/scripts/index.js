import '../styles/index.scss';
import * as d3 from "d3";
import * as Papa from 'papaparse';
import {edgeFile, nodeFile} from './fileThing';
import {loadData} from './dataLoad';
import {allPaths, pullPath, getPath} from './pathCalc';
const csv = require('csv-parser');  

let edgeOb = Papa.parse(edgeFile, {header:true});
let nodeOb = Papa.parse(nodeFile, {header:true});

let wrap = d3.select('#wrapper');

let toolbarDiv = wrap.append('div').attr('id', 'toolbar');

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


*/

loadData(d3.json, './public/data/geo-edges.json').then(async edges => {

    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    let leafChar = await loadData(d3.json, './public/data/geo-char.json');

    let matchedLeaves = leaves.map((leaf, i)=> {
        leaf.attributes = [leafChar.rows[i]];
        return leaf;
    });

    let resBreak = await loadData(d3.json, './public/data/geo-res-breakD.json');

    let mappedEdges = edges.rows.map((edge, i)=> {
        let index = resBreak.rows.map(m=> m['nodeLabels']).indexOf(edge.V2);
        if(index > -1){ edge.attributes = [resBreak.rows[index]] }
        return edge
    })

    let paths = allPaths(mappedEdges, matchedLeaves, "V1", "V2");

    console.log(paths)

   // let maxDepth = d3.max(paths.flatMap(f=> f).map(m=> m.x2));
    let xScale = d3.scaleLinear().range([0, 1000]).clamp(true)//.domain([0, maxDepth])

    /////Rendering ///////

    svg.style('height', (paths.length*60) + 'px');

    let pathWrap = svg.append('g').classed('path-wrapper', true);

    let pathGroups = pathWrap.selectAll('.paths').data(paths);
    let pathEnter = pathGroups.enter().append('g').classed('paths', true);
    pathGroups = pathEnter.merge(pathGroups);
    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * (35 * (d[1].attributes.length + 1))) +')');

    let pathBars = pathGroups.append('rect').classed('path-rect', true);//.style('fill', 'red');

    pathGroups.on('mouseover', function(d, i){
        return d3.select(this).classed('hover', true);
    }).on('mouseout', function(d, i){
        return d3.select(this).classed('hover', false)
    })

    let speciesTitle = pathGroups.append('text').text('SPECIES NAME');
    speciesTitle.attr('x', 10).attr('y', 15)

    let timelines = pathGroups.append('g').classed('time-line', true);
    timelines.attr('transform', (d, i)=> 'translate(150, 0)');

    let lines = timelines.append('line')
    .attr('x1', 0)
    .attr('x2', 1000)
    .attr('y1', 15)
    .attr('y2', 15);

    let nodeGroups = timelines.selectAll('.node').data((d)=> {
        d.xScale = xScale.domain([0, d.length-1]);
        d.map((m, i)=> {
            m.move = d.xScale(i);
            return m;
        });
        return d;
    });

    let nodeGroupEnter = nodeGroups.enter().append('g').classed('node', true);
    nodeGroups = nodeGroupEnter.merge(nodeGroups);
    nodeGroups.attr('transform', (d)=> 'translate('+ d.move +', 10)');

    let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 10)
    
    let speciesLabel = nodeGroups.filter(f=> leaves.map(l=> l.V2).indexOf(f.V2) > -1)
    speciesLabel.append('text').text(f=> f.V2);

    let attributeBars = pathGroups.append('g').classed('attribute', true);
    let attribRect = attributeBars.append('rect').classed('attribute-rect', true);
    attributeBars.attr('transform', (d)=> 'translate(0, 25)');
    let innerTimeline = attributeBars.append('g').classed('time-line', true).attr('transform', (d, i)=> 'translate(150, 0)');
    let attributeNodes = attributeBars.selectAll('g').data(d=> d);
    let attrGroupEnter = attributeNodes.enter().append('g').classed('attribute-node', true);
    attributeNodes = attrGroupEnter.merge(attributeNodes);
   // attributeNodes.attr('transform', (d)=> 'translate('+ d.move +', 10)');

    let innerBars = attributeNodes.append('rect').classed('attribute-inner-bar', true);
    innerBars.attr('transform', (d)=> 'translate('+ d.move +', 0)');




});

loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
   
});



loadData(d3.csv, './public/data/edges.csv');
