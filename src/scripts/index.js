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

    ///MAKE A ESTIMATED SCALES THING
    let calculatedAtt = {
        'awesomeness' : await loadData(d3.json, './public/data/anolis-awesomeness-res.json', 'continuous'),
        'island' : await loadData(d3.json, './public/data/anolis-island-res.json', 'discrete'),
    }

    let calculatedScales = Object.keys(calculatedAtt).map(d=> {
       
        if(calculatedAtt[d].type == 'continuous'){
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
            let scaleCat = calculatedAtt[d].fields.filter(f=> f!= 'nodeLabels');
            return { 
                'field': d,
                'type':'discrete',
                'scales': scaleCat.map(sc=> {
                let scaleName = sc;
               
                let max = d3.max(calculatedAtt[d].rows.map(m=> m[sc]));
                let min = d3.min(calculatedAtt[d].rows.map(m=> m[sc]));
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


    let matchedLeaves = leaves.map((leaf, i)=> {

        leaf.label = leafChar.rows[i].species ? leafChar.rows[i].species : leafChar.rows[i][""];
        leaf.node = leaf.V2
        let keys = calculatedScales.map(m=> m.field);
        let attr = {};
        
        keys.forEach((k)=> {
            let scaleOb = calculatedScales.filter(f=> f.field == k)[0];
            if(scaleOb.type === 'discrete'){
                attr[k] = {'states': [leafChar.rows[i][k]], 'label': k, 'type': scaleOb.type}
            }else if(scaleOb.type === 'continuous'){
                let scale = scaleOb.yScale;
                attr[k] = {'scaledVal': scale(leafChar.rows[i][k]), 'scaledHigh': 0, 'scaledLow': 0, 'realVal':  leafChar.rows[i][k], 'type': scaleOb.type}

            }else{
                attr[k] = 'error in leaf matching';
            }

        });

        leaf.attributes = attr;
        leaf.leaf = true
    
        return leaf;
    });



    let mappedEdges = edges.rows.map((edge, i)=> {
        let attrKeys = Object.keys(calculatedAtt);
        let index = calculatedAtt[attrKeys[0]].rows.map(m=> m['nodeLabels']).indexOf(edge.V2);
       
        edge.node = edge.V2;
        if(index > -1){ 
            attrKeys.forEach(attr=> {

                if(calculatedAtt[attr].type == 'continuous'){
                    let scale = calculatedScales.filter(f=> f.field == attr)[0].yScale;
                    let res = calculatedAtt[attr].rows[index];
                    res.scaledVal = scale(res.estimate);
                    res.scaledLow = scale(res.lowerCI95);
                    res.scaledHigh = scale(res.upperCI95);
                    res.type = 'continuous'
                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {}
                    edge.attributes[attr] = res;
                }else{
                    let scales = calculatedScales.filter(f=> f.field == attr)[0].scales;
                    let row = calculatedAtt[attr].rows[index];
                    let states = scales.map(s=> {
                        return {'state': s.scaleName,  scaleVal: s.yScale(row[s.scaleName]), realVal: row[s.scaleName]}
                    });
                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {}
                    edge.attributes[attr] = {'states':states, 'type': 'discrete'};
                }
            })
        }
        return edge
    });

    let paths = allPaths(mappedEdges, matchedLeaves, "V1", "V2");
 

    paths.forEach((p, i)=> {
        p[0].attributes = {}
        Object.keys(calculatedAtt).map(att=> { 
            if(calculatedAtt[att].type == 'continuous'){
                let root = calculatedAtt[att].rows.filter(f=> f.nodeLabels == p[0].node)[0]
          
                p[0].attributes[att] = {}
                let scale = calculatedScales.filter(f=> f.field == att)[0].yScale;
                p[0].attributes[att].scaledVal =  scale(root.estimate);
                p[0].attributes[att].scaledLow =  scale(root.lowerCI95);
                p[0].attributes[att].scaledHigh =  scale(root.upperCI95);
                p[0].attributes[att].scale = scale;
                p[0].attributes[att].type = 'continuous';
            }else if(calculatedAtt[att].type == 'discrete'){
                let root = calculatedAtt[att].rows.filter(f=> f.nodeLabels == p[0].node)[0]
                let scales = calculatedScales.filter(f=> f.field == att)[0].scales;
                let rootAttr = scales.map(s=> {
                    return {'state': s.scaleName,  scaleVal: s.yScale(root[s.scaleName]), realVal: root[s.scaleName]}
                });
                p[0].attributes[att] = {'states':rootAttr, 'type': 'discrete'};
               
            }else{
                console.error('type not found');
            }
        });
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




