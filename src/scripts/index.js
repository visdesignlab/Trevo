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

loadData(d3.json, './public/data/geo-edges.json').then(async edges => {

    

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    let leafChar = await loadData(d3.json, './public/data/geo-char.json');
    let leafLabels = await loadData(d3.json, './public/data/species-labels.json');
   
    let observedScales = leafChar.fields.map(d=> {
        let max = d3.max(leafChar.rows.map(m=> m[d]));
        let min = d3.min(leafChar.rows.map(m=> m[d]));
        return {
            'field': d, 
            'max': max, 
            'min':  min,
            'yScale': d3.scaleLinear().range([0, 30]).domain([min, max]),
        };
    });

    ///MAKE A ESTIMATED SCALES THING

    let matchedLeaves = leaves.map((leaf, i)=> {
        leaf.label = leafChar.rows[i].species;
        leaf.node = leaf.V2
        let keys = Object.keys(leafChar.rows[i]).filter(f=> f!= 'species')
        let attr = {}
        keys.forEach(k=> {
            let scale = observedScales.filter(f=> f.field == k)[0];
            attr[k] = {'scaledVal': scale.yScale(leafChar.rows[i][k]), 'scaledHigh': 0, 'scaledLow': 0 }
        });
        leaf.attributes = attr;
        return leaf;
    });

    let resBreak = await loadData(d3.json, './public/data/geo-res-breakD.json');
    console.log(resBreak.rows.filter(f=> f.nodeLabels == 14)[0])

    let mappedEdges = edges.rows.map((edge, i)=> {
        let index = resBreak.rows.map(m=> m['nodeLabels']).indexOf(edge.V2);
        edge.node = edge.V2;
        if(index > -1){ 
            let res = resBreak.rows[index]
            res.yScale = d3.scaleLinear().range([0, 30])
                    .domain([d3.min(resBreak.rows.map(m=> m.lowerCI95)), d3.max(resBreak.rows.map(m=> m.upperCI95))])
            res.scaledVal = res.yScale(res.estimate);
            res.scaledLow = res.yScale(res.lowerCI95);
            res.scaledHigh = res.yScale(res.upperCI95);
            edge.attributes = {}
            edge.attributes.beakD = res }
        return edge
    });

    let paths = allPaths(mappedEdges, matchedLeaves, "V1", "V2");
    let rootAttrib = resBreak.rows.filter(f=> f.nodeLabels == 14)[0];
    paths.forEach(p=> {
        console.log(p)
        let rootAttr = {};
        let yScale = d3.scaleLinear().range([0, 30])
                    .domain([d3.min(resBreak.rows.map(m=> m.lowerCI95)), d3.max(resBreak.rows.map(m=> m.upperCI95))])
        rootAttr.beakD = {}
        rootAttr.beakD.scaledVal = yScale(rootAttrib.estimate);
        rootAttr.beakD.scaledLow = yScale(rootAttrib.lowerCI95);
        rootAttr.beakD.scaledHigh = yScale(rootAttrib.upperCI95);
        p[0].attributes = rootAttr;
    });
    
    let maxBranch = d3.max(paths.map(r=> r.length));

    //SCALES for X, Y /////
    let xScale = d3.scaleLinear().range([0, 1000]).clamp(true);
    
    
    let normedPaths = paths.map((p, i)=> {
        p.xScale = xScale.domain([0, maxBranch]);
        let leafIndex = p.length - 1;
        return p.map((m, j)=> {
            let node = Object.assign({}, m)
            node.move = (j < leafIndex) ? p.xScale(j) : p.xScale(maxBranch);
            return node;
        });
    });

   /////Counting frequency of nodes//////
    let branchFrequency = normedPaths.flatMap(row=> row.flatMap(f=> f.node)).reduce(function (acc, curr) {
        if (typeof acc[curr] == 'undefined') {
          acc[curr] = 1;
        } else {
          acc[curr] += 1;
        }
        return acc;
      }, {});

    ///Scales for circles ///
    let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))])
    
    /////Rendering ///////
    svg.style('height', (normedPaths.length*70) + 'px');
    let pathWrap = svg.append('g').classed('path-wrapper', true);
    pathWrap.attr('transform', (d, i)=> 'translate(0,20)');
    let pathGroups = pathWrap.selectAll('.paths').data(normedPaths);
    let pathEnter = pathGroups.enter().append('g').classed('paths', true);
    pathGroups = pathEnter.merge(pathGroups);
    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * (35 * (Object.keys(d[1].attributes).length + 1))) +')');
    let pathBars = pathGroups.append('rect').classed('path-rect', true);//.style('fill', 'red');
    pathGroups.on('mouseover', function(d, i){
        return d3.select(this).classed('hover', true);
    }).on('mouseout', function(d, i){
        return d3.select(this).classed('hover', false)
    });
    let speciesTitle = pathGroups.append('text').text(d=> {
        let string = d[d.length - 1].label
        return string.charAt(0).toUpperCase() + string.slice(1);
    });

    speciesTitle.attr('x', 10).attr('y', 15);

    let timelines = pathGroups.append('g').classed('time-line', true);
    timelines.attr('transform', (d, i)=> 'translate(150, 0)');

    let lines = timelines.append('line')
    .attr('x1', 0)
    .attr('x2', 1000)
    .attr('y1', 15)
    .attr('y2', 15);

    let nodeGroups = timelines.selectAll('.node').data((d)=> d);

    let nodeGroupEnter = nodeGroups.enter().append('g').classed('node', true);
    nodeGroups = nodeGroupEnter.merge(nodeGroups);
    nodeGroups.attr('transform', (d)=> 'translate('+ d.move +', 10)');

    let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', d=> {
        return circleScale(branchFrequency[d.node]);
    });
    /*
    let nodeLabels = nodeGroups.append('text').text(d=> {
        let labelText = d.node;
        return labelText;
    }).attr('x', -8).attr('y', 5);*/

    let attributeBars = pathGroups.append('g').classed('attribute', true);
    let attribRect = attributeBars.append('rect').classed('attribute-rect', true);
    attributeBars.attr('transform', (d)=> 'translate(140, 25)');
    let innerTimeline = attributeBars.append('g').classed('time-line', true)//.attr('transform', (d, i)=> 'translate(0, 0)');
    let attributeNodes = attributeBars.selectAll('g').data(d=> d);
    let attrGroupEnter = attributeNodes.enter().append('g').classed('attribute-node', true);
    attributeNodes = attrGroupEnter.merge(attributeNodes);
   // attributeNodes.attr('transform', (d)=> 'translate('+ d.move +', 10)');

    let innerBars = attributeNodes.append('g');

    let lineGen = d3.line()
    .x(d=> {
        console.log(d.move)
        return d.move})
    .y(d=> d.attributes.beakD.scaledVal);

    attributeNodes.append("path")
    .attr("d", d=> lineGen(d))
    .attr("class", "inner-line");

    innerBars.append('rect').classed('attribute-inner-bar', true);
    innerBars.attr('transform', (d)=> 'translate('+ d.move +', 0)');
    let rangeRect = innerBars.append('rect').classed('range-rect', true);
    rangeRect.attr('width', 20).attr('height', (d, i)=> {
        let range = d.attributes? d.attributes.beakD.scaledHigh -  d.attributes.beakD.scaledLow : 1;
        return range;
    });
    rangeRect.attr('transform', (d, i)=> {
        let lowMove = d.attributes? d.attributes.beakD.scaledLow : 0;
        return 'translate(0, '+ lowMove +')';
    });
    innerBars.append('rect').attr('width', 20).attr('height', 5).attr('transform', (d, i)=> {
        let est = d.attributes? d.attributes.beakD.scaledVal : 0;
        return 'translate(0, '+ est +')';
    }).attr('fill', '#32C1FE');

    innerBars.append("path")
    .attr("class", "inner-line")
    .attr("d", d=> lineGen(d)); 
});

loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
});




