import '../styles/index.scss';
import * as d3 from "d3";
import * as Papa from 'papaparse';
import {edgeFile, nodeFile} from './fileThing';
import {loadData} from './dataLoad';
import {allPaths, pullPath, getPath} from './pathCalc';
const csv = require('csv-parser');  
import {renderAttributes, renderDistibutions, renderToggles, drawContAtt, drawDiscreteAtt, formatAttributes, renderPaths} from './rendering';

let edgeOb = Papa.parse(edgeFile, {header:true});
let nodeOb = Papa.parse(nodeFile, {header:true});

let wrap = d3.select('#wrapper');
let toolbarDiv = wrap.append('div').attr('id', 'toolbar');
let main = wrap.append('div').attr('id', 'main');
let sidebar = wrap.append('div').attr('id', 'sidebar');

let svg = main.append('svg').attr('id', 'main-path-view'),
    width = +svg.attr("width"),
    height = +svg.attr("height");

let tooltip = wrap.append("div")
.attr("id", "tooltip")
.style("opacity", 0);

loadData(d3.json, './public/data/anolis-edges.json', 'edge').then(async edges => {
    //loadData(d3.json, './public/data/geo-edges.json').then(async edges => {

    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }

    let nodes = edges.rows.map(m=> m.V2).concat(edges.rows.map(m=> m.V1)).unique();

    console.log('node', nodes);
  
    let edgeLen = await loadData(d3.json, './public/data/anolis-edge-length.json', 'edge');

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    let leafChar = await loadData(d3.json, './public/data/anolisLeafChar.json', '');

    ///MAKE A ESTIMATED SCALES THING
    let calculatedAtt = {
        'awesomeness' : await loadData(d3.json, './public/data/anolis-awesomeness-res.json', 'continuous'),
        'island' : await loadData(d3.json, './public/data/anolis-island-res.json', 'discrete'),
        'SVL' : await loadData(d3.json, './public/data/anolis-svl-res.json', 'continuous'),
        'ecomorph': await loadData(d3.json, './public/data/anolis-ecomorph-res.json', 'discrete'),
    }

    let colorKeeper = [
        '#32C1FE','#3AD701','#E2AD01','#E2019E','#f36b2c','#1abc9c','#f36b2c','#a40b0b','#0095b6'
    ]

    let calculatedScales = Object.keys(calculatedAtt).map((d, i)=> {
       
        if(calculatedAtt[d].type == 'continuous'){
            let max = d3.max(calculatedAtt[d].rows.map(m=> m.upperCI95));
            let min = d3.min(calculatedAtt[d].rows.map(m=> m.lowerCI95));
           // console.log(calculatedAtt[d].type, max, min, calculatedAtt)
            return {
                'field': d, 
                'type':'continuous',
                'max': max, 
                'min':  min,
                'yScale': d3.scaleLinear().range([0, 43]).domain([min, max]).clamp(true),
                'catColor': colorKeeper[i],
            };
        }else{
            let scaleCat = calculatedAtt[d].fields.filter(f=> f!= 'nodeLabels');
            return { 
                'field': d,
                'type':'discrete',
                'stateColors': scaleCat.map((sc, i)=> {
                    return {'state': sc, 'color': colorKeeper[i]}
                }),
                'catColor': colorKeeper[i],
                'scales': scaleCat.map(sc=> {
                let scaleName = sc;
               
                let max = 1;
                let min = 0;
                return {
                    'field': d, 
                    'scaleName': scaleName,
                    'max': max, 
                    'min':  min,
                    'yScale': d3.scaleLinear().range([45, 0]).domain([min, max]),
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
                let thisScale = scaleOb.scales.filter(f=> f.scaleName == leafChar.rows[i][k])[0].yScale;
                let states = scaleOb.scales.map(m=> m.scaleName).map(state=> {
                    let value = (state === leafChar.rows[i][k])? 1 : 0;
                   // console.log(thisScale(0), thisScale(value), value)
                    return {'state': state,  scaleVal: thisScale(value), realVal: value}
                })
            
                //let states = {'state': leafChar.rows[i][k],  scaleVal: thisScale(1), realVal: 1}
                attr[k] = {'states': states, 'label': k, 'type': scaleOb.type, leaf: true}
            }else if(scaleOb.type === 'continuous'){
                let scale = scaleOb.yScale;
                attr[k] = {'scaleVal': scale(leafChar.rows[i][k]), 'scaledHigh': 0, 'scaledLow': 0, 'realVal':  leafChar.rows[i][k], 'type': scaleOb.type, leaf: true}

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
        edge.edgelength = edgeLen.rows[i].x;
        edge.node = edge.V2;
        if(index > -1){ 
            attrKeys.forEach(attr=> {

                if(calculatedAtt[attr].type == 'continuous'){
                    let scale = calculatedScales.filter(f=> f.field == attr)[0].yScale;
                    let res = calculatedAtt[attr].rows[index];
                    res.scaleVal = scale(res.estimate);
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

    let root = paths[0][0]

    function getNested(node, edgeArray){
        node.children = edgeArray.filter(f=> String(f.V1) === String(node.node));
        node.name = String(node.node);
        if(node.children.length > 0){
            node.children.forEach(c=> getNested(c, edgeArray))
        }else{
            return node;
        }
        return node;
    }

    let nestedData = getNested(root, edges.rows);
    ////////
    ///testing trees out

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

// append the svg obgect to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
    var treeSvg = sidebar.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom),
    g = treeSvg.append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

// adds the links between the nodes
    var link = g.selectAll(".link")
    .data( treenodes.descendants().slice(1))
    .enter().append("path")
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
    .enter().append("g")
    .attr("class", function(d) { 
    return "node" + 
    (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { 
    return "translate(" + d.y + "," + d.x + ")"; });

    // adds the circle to the node
    node.append("circle")
    .attr("r", 3);

    // adds the text to the node
    /*
    node.append("text")
    .attr("dy", ".35em")
    .attr("x", function(d) { return d.children ? -13 : 13; })
    .style("text-anchor", function(d) { 
    return d.children ? "end" : "start"; })
    .text(function(d) { return d.data.name; });
    */

/////END TREE STUFF
///////////
    console.log(nestedData)
   
    paths.forEach((p, i)=> {
        p[0].attributes = {}
        Object.keys(calculatedAtt).map(att=> { 
            if(calculatedAtt[att].type == 'continuous'){
                let root = calculatedAtt[att].rows.filter(f=> f.nodeLabels == p[0].node)[0]
                p[0].attributes[att] = {}
                let scale = calculatedScales.filter(f=> f.field == att)[0].yScale;
                p[0].attributes[att].scaleVal =  scale(root.estimate);
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
      
        p.xScale = xScale.domain([0, maxBranch - 1]);
       // p.xScale = xScale.domain([0, 1]);
        let leafIndex = p.length - 1;
        return p.map((m, j)=> {
            let node = Object.assign({}, m);

            //INTEGRATE THE DISTNACES HERE WHEN THEY WORK

           // let prevStep = (j > 0) ?  p[j-1].edgelength : 0;
            //let moveStep = (prevStep == 0) ? 0 : (m.edgelength + prevStep); 
            node.move = (j < leafIndex) ? p.xScale(j) : p.xScale(maxBranch - 1);
           // node.move = (j < leafIndex) ? p.xScale(m.edgelength) : p.xScale(1);
          // node.move = p.xScale(step);
            return node;
        });
    });

   // let distSVG  = toolbarDiv.append('svg').classed('distribution-svg', true);
    // renderDistibutions(normedPaths, distSVG, calculatedScales);

    let toggleSVG = toolbarDiv.append('svg').classed('toggle-svg', true);
    let pathGroups = renderPaths(normedPaths, svg);
    

      /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');

    let attributeGroups = formatAttributes(attributeWrapper, calculatedScales, null);

    svg.style('height', ((normedPaths.length + attributeGroups.data().map(m=> m[0]).length)* 30) + 'px');

    let attributeHeight = 45;

    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');

    //let attributeGroups = renderAttributes(attributeWrapper, attributeData, calculatedScales);

    renderToggles(normedPaths, toggleSVG, attributeGroups, calculatedScales);

    drawContAtt(attributeGroups);
    drawDiscreteAtt(attributeGroups, calculatedScales);

});

loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
});




