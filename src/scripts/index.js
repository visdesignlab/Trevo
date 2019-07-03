import '../styles/index.scss';
import * as d3 from "d3";
import * as Papa from 'papaparse';
import {edgeFile, nodeFile} from './fileThing';
import {loadData} from './dataLoad';
import {allPaths, pullPath, getPath} from './pathCalc';
const csv = require('csv-parser');  
import {renderAttributes} from './rendering';

let edgeOb = Papa.parse(edgeFile, {header:true});
let nodeOb = Papa.parse(nodeFile, {header:true});

let wrap = d3.select('#wrapper');

let toolbarDiv = wrap.append('div').attr('id', 'toolbar');

let svg = wrap.append('svg'),
    width = +svg.attr("width"),
    height = +svg.attr("height");

loadData(d3.json, './public/data/anolis-edges.json').then(async edges => {
    //loadData(d3.json, './public/data/geo-edges.json').then(async edges => {
    
    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    let leafChar = await loadData(d3.json, './public/data/anolisLeafChar.json', '');
   

    console.log(leafChar)

    ///MAKE A ESTIMATED SCALES THING
    let calculatedAtt = {
        'awesomeness' : await loadData(d3.json, './public/data/anolis-awesomeness-res.json', 'continuous'),
        'island' : await loadData(d3.json, './public/data/anolis-island-res.json', 'discrete'),
    }

    console.log('calculated att',calculatedAtt)
    
    let calculatedScales = Object.keys(calculatedAtt).map(d=> {
        console.log(calculatedAtt[d])
        if(calculatedAtt[d].type == 'continuous'){
            console.log('gahh')
            let max = d3.max(calculatedAtt[d].rows.map(m=> m.upperCI95));
            let min = d3.min(calculatedAtt[d].rows.map(m=> m.lowerCI95));
            return {
                'field': d, 
                'type':'continuous',
                'max': max, 
                'min':  min,
                'yScale': d3.scaleLinear().range([0, 30]).domain([min, max]),
            };
        }else{
            console.log('gahh');
            let scaleCat = calculatedAtt[d].fields.filter(f=> f!= 'nodeLabels');
            return { 
                'field': d,
                'type':'discrete',
                'scales': scaleCat.map(sc=> {
                let scaleName = sc;
                let max = d3.max(calculatedAtt[d].rows.map(m=> m.sc));
                let min = d3.min(calculatedAtt[d].rows.map(m=> m.sc));
                return {
                    'field': d, 
                    'scaleName': sc,
                    'max': max, 
                    'min':  min,
                    'yScale': d3.scaleLinear().range([0, 30]).domain([min, max]),
                };
            }) }
        }
    });

    console.log(calculatedScales)

    let matchedLeaves = leaves.map((leaf, i)=> {
        leaf.label = leafChar.rows[i].species;
        leaf.node = leaf.V2
        //let keys = Object.keys(leafChar.rows[i]).filter(f=> f!= 'species')
        let keys = calculatedScales.map(m=> m.field);
        let attr = {}
        keys.forEach(k=> {
            let scaleOb = calculatedScales.filter(f=> f.field == k)[0];
            
            if(scaleOb.type == 'continuous'){
                let scale = calculatedScales.filter(f=> f.field == k)[0].yScale;
                attr[k] = {'scaledVal': scale(leafChar.rows[i][k]), 'scaledHigh': 0, 'scaledLow': 0 }
            }else{
                console.log('char',leafChar.rows[i][k])
                attr[k] = {'scaledVal': leafChar.rows[i][k], 'scaledHigh': 0, 'scaledLow': 0 }
            }
           
        });
        leaf.attributes = attr;
        return leaf;
    });


    let mappedEdges = edges.rows.map((edge, i)=> {
        let attrKeys = Object.keys(calculatedAtt);
        let index = calculatedAtt[attrKeys[0]].rows.map(m=> m['nodeLabels']).indexOf(edge.V2);
        console.log('index', index)
        edge.node = edge.V2;
        if(index > -1){ 
            attrKeys.forEach(attr=> {

                if(calculatedAtt[attr].type == 'consinuous'){

                    let scale = calculatedScales.filter(f=> f.field == attr)[0].yScale;
                    let res = calculatedAtt[attr].rows[index];
                    console.log('res', res);
                    res.scaledVal = scale(res.estimate);
                    res.scaledLow = scale(res.lowerCI95);
                    res.scaledHigh = scale(res.upperCI95);

                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {}
                    edge.attributes[attr] = res

                    //THIS IS WHERE YOU LEFT OFF

                }
                

                

            })
        }
        return edge
    });

    let paths = allPaths(mappedEdges, matchedLeaves, "V1", "V2");
   // let rootAttribBeak = calculatedAtt.beakD.rows.filter(f=> f.nodeLabels == 14)[0];
    //let rootAttribCul = calculatedAtt.culmenL.rows.filter(f=> f.nodeLabels == 14)[0];

    paths.forEach(p=> {
       
        let rootAttr = {};
/*
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
*/

        calculatedAtt.forEach(att=> {
            let root= calculatedAtt[att].rows.filter(f=> f.nodeLabels == 14)[0];
            rootAttr[att] = {};
            rootAtt[att].scale = calculatedScales.filter(f=> f.field == att)[0].yScale;
            rootAttr[att].scaledVal =  rootAtt[att].scale(rootAttribBeak.estimate);
            rootAttr[att].scaledLow =  rootAtt[att].scale(rootAttribBeak.lowerCI95);
            rootAttr[att].scaledHigh =  rootAtt[att].scale(rootAttribBeak.upperCI95);
        })
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

    renderAttributes(normedPaths, svg);

    
  

});

loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
});




