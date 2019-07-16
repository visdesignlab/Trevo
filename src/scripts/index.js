import '../styles/index.scss';
import * as d3 from "d3";
import {loadData} from './dataLoad';
import {allPaths, pullPath, getPath} from './pathCalc';
import {formatAttributeData} from './dataFormat';
import {renderTree, renderAttributes,  drawContAtt, drawDiscreteAtt, renderPaths} from './rendering';
import {renderDistibutions} from './distributionView';
import {toolbarControl, renderAttToggles} from './toolbarComponent';


let wrap = d3.select('#wrapper');
let main = wrap.select('#main');
let selectedPaths = wrap.select('#selected');
let sidebar = wrap.select('#sidebar');;
let toolbarDiv = wrap.select('#toolbar');


let tooltip = wrap.append("div")
.attr("id", "tooltip")
.style("opacity", 0);

loadData(d3.json, './public/data/anolis-edges.json', 'edge').then(async edges => {

    //helper function to create array of unique elements
    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }

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
        '#32C1FE','#3AD701','#E2AD01','#E2019E','#f36b2c','#1abc9c','#493267','#a40b0b','#0095b6',
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
        edge.edgeLength = edgeLen.rows[i].x;
        edge.node = edge.V2;
        if(index > -1){ 
            attrKeys.forEach(attr=> {

                if(calculatedAtt[attr].type == 'continuous'){
                    let scale = calculatedScales.filter(f=> f.field == attr)[0].yScale;
                    let res = calculatedAtt[attr].rows[index];
                    res.scaleVal = scale(res.estimate);
                    res.scaledLow = scale(res.lowerCI95);
                    res.scaledHigh = scale(res.upperCI95);
                    res.realVal = res.estimate;

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
                p[0].attributes[att].realVal = root.estimate;
                p[0].attributes[att].upperCI95 = root.upperCI95;
                p[0].attributes[att].lowerCI95 = root.lowerCI95;
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
        let lengths = p.map(l=> l.edgeLength);
        let prevStep = 0;
        return p.map((m, j)=> {
            let node = Object.assign({}, m);
            //INTEGRATE THE DISTNACES HERE WHEN THEY WORK
          //  node.edgeLength = (j < leafIndex) ? lengths[j] : 1;
            //console.log(node.edgeLength, prevStep)
            let step = node.edgeLength + prevStep;
            node.edgeMove = (j < leafIndex) ? step : 1;
            prevStep = prevStep + node.edgeLength;
         
            node.move = (j < leafIndex) ? p.xScale(j) : p.xScale(maxBranch - 1);
        
            return node;
        });
    });

    console.log(normedPaths)

   // renderDistibutions(normedPaths, main, calculatedScales);
    toolbarControl(toolbarDiv, normedPaths, main, calculatedScales);
    
    let filterDiv = wrap.select('#filter-tab').classed('hidden', true);
   // let toggleSVG = filterDiv.append('svg').classed('toggle-svg', true);
   
    renderAttToggles(normedPaths, calculatedScales);

    //TREE RENDER
    ////////
    renderTree(nestedData, sidebar);
    renderDistibutions(normedPaths, main, calculatedScales, 'move');


  
    //let pathGroups = renderPaths(normedPaths, main, calculatedScales);
    
      /// LOWER ATTRIBUTE VISUALIZATION ///
      /*
    let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
    let attData = formatAttributeData(normedPaths, calculatedScales)
    let attributeGroups = renderAttributes(attributeWrapper, attData, calculatedScales, null);
   
    let attributeHeight = 45;
    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
    renderAttToggles(normedPaths, calculatedScales);
    drawContAtt(attributeGroups);
    drawDiscreteAtt(attributeGroups, calculatedScales);

    //tranforming elements
    main.select('#main-path-view').style('height', ((normedPaths.length + attributeGroups.data().map(m=> m[0]).length)* 30) + 'px');
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');
*/
});

loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);
});




