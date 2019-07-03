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

    let colorKeeper = [
        '#32C1FE',
        '#3AD701'
    ]
    

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    let leafChar = await loadData(d3.json, './public/data/geo-char.json');
    let leafLabels = await loadData(d3.json, './public/data/species-labels.json');

    console.log(leafChar)

    ///MAKE A ESTIMATED SCALES THING
    let calculatedAtt = {
        'beakD' : await loadData(d3.json, './public/data/geo-res-breakD.json'),
        'culmenL' : await loadData(d3.json, './public/data/geo-res-cumlu.json'),
    }
    
    let calculatedScales = Object.keys(calculatedAtt).map(d=> {
        let max = d3.max(calculatedAtt[d].rows.map(m=> m.upperCI95));
        let min = d3.min(calculatedAtt[d].rows.map(m=> m.lowerCI95));
        return {
            'field': d, 
            'max': max, 
            'min':  min,
            'yScale': d3.scaleLinear().range([0, 30]).domain([min, max]),
        };
    });

    let matchedLeaves = leaves.map((leaf, i)=> {
        leaf.label = leafChar.rows[i].species;
        leaf.node = leaf.V2
        //let keys = Object.keys(leafChar.rows[i]).filter(f=> f!= 'species')
        let keys = calculatedScales.map(m=> m.field);
        let attr = {}
        keys.forEach(k=> {
            let scale = calculatedScales.filter(f=> f.field == k)[0].yScale;
            attr[k] = {'scaledVal': scale(leafChar.rows[i][k]), 'scaledHigh': 0, 'scaledLow': 0 }
        });
        leaf.attributes = attr;
        return leaf;
    });


    let mappedEdges = edges.rows.map((edge, i)=> {
        let index = calculatedAtt.beakD.rows.map(m=> m['nodeLabels']).indexOf(edge.V2);
        edge.node = edge.V2;
        if(index > -1){ 
            let resB = calculatedAtt.beakD.rows[index]
            let scaleB = calculatedScales.filter(f=> f.field == 'beakD')[0].yScale;
            resB.scaledVal = scaleB(resB.estimate);
            resB.scaledLow = scaleB(resB.lowerCI95);
            resB.scaledHigh = scaleB(resB.upperCI95);

            let scaleC = calculatedScales.filter(f=> f.field == 'culmenL')[0].yScale;
            let resC = calculatedAtt.culmenL.rows[index]
            resC.scaledVal = scaleC(resC.estimate);
            resC.scaledLow = scaleC(resC.lowerCI95);
            resC.scaledHigh = scaleC(resC.upperCI95);

            edge.attributes = (edge.attributes != undefined)? edge.attributes : {}
            edge.attributes.beakD = resB 
            edge.attributes.culmenL = resC
        }
        return edge
    });

    let paths = allPaths(mappedEdges, matchedLeaves, "V1", "V2");
    let rootAttribBeak = calculatedAtt.beakD.rows.filter(f=> f.nodeLabels == 14)[0];
    let rootAttribCul = calculatedAtt.culmenL.rows.filter(f=> f.nodeLabels == 14)[0];

    paths.forEach(p=> {
       
        let rootAttr = {};

        let scaleB = calculatedScales.filter(f=> f.field == 'beakD')[0].yScale;
        let scaleC = calculatedScales.filter(f=> f.field == 'culmenL')[0].yScale;

        rootAttr.beakD = {};
        rootAttr.beakD.scaledVal =  scaleB(rootAttribBeak.estimate);
        rootAttr.beakD.scaledLow =  scaleB(rootAttribBeak.lowerCI95);
        rootAttr.beakD.scaledHigh =  scaleB(rootAttribBeak.upperCI95);

        rootAttr.culmenL = {};
        rootAttr.culmenL.scaledVal = scaleC(rootAttribCul.estimate);
        rootAttr.culmenL.scaledLow = scaleC(rootAttribCul.lowerCI95);
        rootAttr.culmenL.scaledHigh = scaleC(rootAttribCul.upperCI95);

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
    }).attr('class', (d, i)=> 'node-'+d.node);

    nodeGroups.on('mouseover', function(d, i){
        d3.selectAll('.node-'+d.node).attr('fill', 'red')
        return d3.selectAll('.node-'+d.node).classed('hover-branch', true);
    }).on('mouseout', function(d, i){
        return d3.selectAll('.node-'+d.node).classed('hover-branch', false);
    });
/*
    let nodeLabels = nodeGroups.append('text').text(d=> {
        let labelText = d.node;
        return labelText;
    }).attr('x', -8).attr('y', 5);
*/
    let speciesNodeLabel = nodeGroups.filter(f=> f.label != undefined).append('text').text(d=> {
        let string = d.label.charAt(0).toUpperCase() + d.label.slice(1);
        return string;
    }).attr('x', 10).attr('y', 5);

    /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');
  
    let attributeGroups = attributeWrapper.selectAll('g').data((d)=> {
        let keys = Object.keys(d.map(m=> m.attributes)[0]);
        let att = keys.map((key, i)=> {
            return d.map((m)=> {
            m.attributes[key].color = colorKeeper[i];
            m.attributes[key].move = m.move;
            m.attributes[key].label = key;
            return m.attributes[key];
        })}
        );
        return att;
    }).enter().append('g');
    attributeGroups.attr('transform', (d, i) => 'translate(0, '+(i * 35)+')');

    let attrLabel = attributeGroups.append('text').text(d=> d[0].label);
    attrLabel.classed('attribute-label', true);
    attrLabel.attr('transform', 'translate(-15, 20)');

    let attribRect = attributeGroups.append('rect').classed('attribute-rect', true);

    let innerTimeline = attributeGroups.append('g').classed('time-line', true);//.data(normedPaths);//.attr('transform', (d, i)=> 'translate(0, 0)');
    let attributeNodes = innerTimeline.selectAll('g').data(d=> d);
    let attrGroupEnter = attributeNodes.enter().append('g').classed('attribute-node', true);
    attributeNodes = attrGroupEnter.merge(attributeNodes);

    let innerBars = attributeNodes.append('g');

    var lineGen = d3.line()
    .x(d=> d.move)
    .y(d=> d.scaledVal);

    let innerPaths = innerTimeline.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', (d)=> d[0].color);

    innerBars.append('rect').classed('attribute-inner-bar', true);
    innerBars.attr('transform', (d)=> 'translate('+ d.move +', 0)');
    let rangeRect = innerBars.append('rect').classed('range-rect', true);
    rangeRect.attr('width', 20).attr('height', (d, i)=> {
        let range = d.scaledHigh -  d.scaledLow;
        return range;
    });
    rangeRect.attr('transform', (d, i)=> {
        let lowMove = d.scaledLow;
        return 'translate(0, '+ lowMove +')';
    });
    rangeRect.style('fill', d=> d.color)
    innerBars.append('rect').attr('width', 20).attr('height', 5)
    .attr('transform', (d, i)=> 'translate(0, '+ d.scaledVal +')')
    .attr('fill', d=> d.color);
});

loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
});




