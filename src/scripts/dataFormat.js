import * as d3 from "d3";
import { load_data } from "./multinetLoad";
import { discreteTraitList, colorKeeper, calculatedScalesKeeper, dataMaster, nestedData, speciesTest } from ".";
import { allPaths } from "./pathCalc";
import { binGroups } from "./distributionView";
import { addCladeGroup, chosenCladesGroup, addClade } from "./cladeMaker";
import { buildTreeStructure } from "./sidebarComponent";

export const maxTimeKeeper = [];

export async function loadData(readFunction, fileString, type){
    let data = await readFunction(fileString);
    data.type = String(type);
    return data;
}

function generatePairs(pathData){
    return pathData.flatMap((path, i)=> {
        let pairs = pathData.filter((f, j)=> j != i);
        let paired =  pairs.map((p)=> {
            return {'p1': path, 'p2': p}
        });
        return paired.map(m=> {
            
            let key = [m.p1[m.p1.length - 1].node, m.p2[m.p2.length - 1].node].sort();
            m.key = key.join(',');
            let distance = getDistance(m);
            m.distance = distance;
            m.deltas = calculateDelta(m, distance);
            m.closeAll = calculateCloseness(m, distance);
           
            return m;
        });
    });
}

export function pairPaths(pathData){

    let allPairs = generatePairs(pathData);
    let pairSet = [...new Set(allPairs.map(m=> m.key))];
    return pairSet.map(k=> {
        let index = allPairs.map(m=> m.key).indexOf(k);
        return allPairs[index];
    });
}

function getDistance(pair){
    let verts = pair.p2.map(m=> m.node);

    let test = pair.p1.filter(f=> verts.indexOf(f.node) != -1);
    let lastNode = test[test.length - 1].node;

    let p1Index = pair.p1.map(m=> m.node).indexOf(lastNode);
    let p2Index = pair.p2.map(m=> m.node).indexOf(lastNode);
  
    let p1 = pair.p1.filter((f, i)=> i >= p1Index);
    let p2 = pair.p2.filter((f, i)=> i >= p2Index);

    pair.common = pair.p1[p1Index]

    return d3.sum(p1.map(m=> m.edgeLength)) + d3.sum(p2.map(m=> m.edgeLength));
}

function calculateDelta(pair, distance){
   
    let verts = pair.p2.map(m=> m.node);

    let test = pair.p1.filter(f=> verts.indexOf(f.node) != -1);
    let lastNode = test[test.length - 1].node;

    let p1Index = pair.p1.map(m=> m.node).indexOf(lastNode);
    let p2Index = pair.p2.map(m=> m.node).indexOf(lastNode);
  
    let p1 = pair.p1.filter((f, i)=> i >= p1Index);
    let p2 = pair.p2.filter((f, i)=> i >= p2Index);

 
    let range = maxTimeKeeper[maxTimeKeeper.length - 1] - p1[0].combLength;
    let binCount = d3.max([p1.length, p2.length])
    let binStep = range / binCount;
   
    let bins = [...new Array(binCount-1)].map((d, i)=> {
        return {'bottom': p1[0].combLength + (i*binStep), 'top': p1[0].combLength + ((i+1)*binStep) }
    })
   
    bins = bins.map((d, i)=> {
        let one = p1.filter(f=> (f.combLength <= d.top) && (f.combLength >= d.bottom))
        let two = p2.filter(f=> (f.combLength <= d.top) && (f.combLength >= d.bottom))
        d.one = one;
        d.two = two;
        return d;
    });

    bins = bins.map((b, i)=> {
        if(b.one.length === 0){
            b.one = bins[i-1].one;
        }
        if(b.two.length === 0){
            b.two = bins[i-1].two;
        }

        return b;
    })
    
    let attributes = d3.entries(p1[0].attributes)
                    .filter(f => f.value.type === 'continuous')
                    .map(m=> {
                        let name = m.key;
                        let valdiffs = bins.map((b, i)=> {
                            return Math.abs(b.one[0].attributes[name].values.realVal - b.two[0].attributes[name].values.realVal);
                        });
                       // m.value = d3.max(valdiffs) / distance;
                        m.value = d3.max(valdiffs) /// distance;
                        return m;
                    });

return attributes;

}

function calculateCloseness(pair, distance){
 let leaf1 = pair.p1.filter(p=> p.leaf === true)[0].attributes;
 let leaf2 = pair.p2.filter(p=> p.leaf === true)[0].attributes;

 let closeness = d3.entries(leaf1).filter(f=> f.value.type === 'continuous').map(m=> {
     //m.value = Math.abs(m.value.values.realVal - leaf2[m.key].values.realVal) / distance;
     m.value = Math.abs(m.value.values.realVal - leaf2[m.key].values.realVal)// / distance;
     return m
 });

 return closeness;
}

export function calculateNewScales(attributes, keyList, colorKeeper){

    return keyList.map((d, i)=> {

        let attData = attributes.flatMap(f=> f[d]);
        let color = colorKeeper[i] != undefined ? colorKeeper[i][0] : colorKeeper[0][0];
       
        if(attData[0].type == 'continuous'){
            
            let max = d3.max(attData.flatMap(m=> m.values.upperCI95));
            let min = d3.min(attData.flatMap(m=> m.values.lowerCI95));
            let mean = d3.mean(attData.flatMap(m=> m.values.realVal));

            return {
                'field': d, 
                'type':'continuous',
                'max': max, 
                'min':  min,
                'yScale': d3.scaleLinear().range([0, 43]).domain([min, max]).clamp(true),
                'satScale': d3.scaleLinear().range([0, .9]).domain([min, max]),
                'colorScale': d3.scaleLinear().range([color, '#f23929']).domain([min, max]),
                'catColor': color,
            };
        }else{
            let scaleCat = d3.keys(attData[0].values);
            return { 
                'field': d,
                'type':'discrete',
                'stateColors': scaleCat.map((sc, j)=> {
                    return {'state': sc, 'color': colorKeeper[j][0]};
                }),
                'catColor': color,
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
                
            }) };
        }
    });
}

export function calculateScales(calculatedAtt, colorKeeper){
    return Object.keys(calculatedAtt).map((d, i)=> {
       
        if(calculatedAtt[d].type == 'continuous'){
            
            let max = d3.max(calculatedAtt[d].rows.map(m=> m.upperCI95));
            let min = d3.min(calculatedAtt[d].rows.map(m=> m.lowerCI95));
            let mean = d3.mean(calculatedAtt[d].rows.map(m=> m.realVal));
            
            return {
                'field': d, 
                'type':'continuous',
                'max': max, 
                'min':  min,
                'yScale': d3.scaleLinear().range([0, 43]).domain([min, max]).clamp(true),
                'satScale': d3.scaleLinear().range([0, .9]).domain([min, max]),
                'colorScale': d3.scaleLinear().range([colorKeeper[i][0], '#f23929']).domain([min, max]),
                'catColor': colorKeeper[i][0],
            };
        }else{
            let scaleCat = calculatedAtt[d].fields.filter(f=> f!= 'nodeLabels');
            return { 
                'field': d,
                'type':'discrete',
                'stateColors': scaleCat.map((sc, i)=> {
                    return {'state': sc, 'color': colorKeeper[i][0]};
                }),
                'catColor': colorKeeper[i][0],
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
                
            }) };
        }
    });
}

export function matchLeaves(labels, leaves, leafChar, calculatedScales){

        ////MATCHING LABELSS TO THE STUFF/////
    let  mappedLeafLabels = labels.rows.map(m=> {
        let label = m.x;
        return label;
    });

    return leaves.map((leaf, i)=> {
      
        leaf.label = mappedLeafLabels[i];

        //let leafCharIndex = leafChar.rows.map(m=> m[""]);
      
        let leafCharIndex = leafChar.rows[0][""] ? leafChar.rows.map(m=> m[""]) : leafChar.rows.map(m=> m["species"]);
  
        leaf.node = leaf.V2;
        let keys = calculatedScales.map(m=> m.field);
        let attr = {};
         
        let chosenOne = leafChar.rows[leafCharIndex.indexOf(leaf.label)];
 
        keys.forEach((k)=> {
             let scaleOb = calculatedScales.filter(f=> f.field == k)[0];
            
             if(scaleOb.type === 'discrete'){
                 let thisScale = scaleOb.scales.filter(f=> f.scaleName == chosenOne[k])[0].yScale;
                 let states = scaleOb.scales.map(m=> m.scaleName).map(state=> {
                     let value = (state === chosenOne[k])? 1 : 0;
                    // return {'state': state,  scaleVal: thisScale(value), realVal: value};
                     return {'state': state, realVal: value};
                 });
                 //let states = {'state': leafChar.rows[i][k],  scaleVal: thisScale(1), realVal: 1}
                 attr[k] = {'states': states, 'label': k, 'type': scaleOb.type, leaf: true};
             }else if(scaleOb.type === 'continuous'){
                 let scale = scaleOb.yScale;
                 //attr[k] = {'scaleVal': scale(chosenOne[k]), 'scaledHigh': 0, 'scaledLow': 0, 'realVal': chosenOne[k], 'type': scaleOb.type, leaf: true};
                 attr[k] = {'realVal': chosenOne[k], 'type': scaleOb.type, leaf: true};
 
             }else{
                 attr[k] = 'error in leaf matching';
             }
         });

         leaf.clade = chosenOne.clade;
         leaf.attributes = attr;
         leaf.leaf = true;
     
         return leaf;
     });
}

export function matchEdges(edges, edgeLen, calculatedAtt, calculatedScales){
    return edges.rows.map((edge, i)=> {
        let attrKeys = Object.keys(calculatedAtt);
        let index = calculatedAtt[attrKeys[0]].rows.map(m=> m['nodeLabels']).indexOf(edge.V2);
        edge.edgeLength = edgeLen.rows[i].x;
        edge.node = edge.V2;
        if(index > -1){ 
            attrKeys.forEach(attr=> {
                if(calculatedAtt[attr].type == 'continuous'){
                    let scale = calculatedScales.filter(f=> f.field == attr)[0].yScale;
                    let res = calculatedAtt[attr].rows[index];
                   // res.scaleVal = scale(res.estimate);
                   // res.scaledLow = scale(res.lowerCI95);
                    //res.scaledHigh = scale(res.upperCI95);
                    res.realVal = res.estimate;
                    res.type = 'continuous';
                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {};
                    edge.attributes[attr] = res;
                }else{
                    let scales = calculatedScales.filter(f=> f.field == attr)[0].scales;
                    let row = calculatedAtt[attr].rows[index];
                    let states = scales.map(s=> {
                       // return {'state': s.scaleName,  scaleVal: s.yScale(row[s.scaleName]), realVal: row[s.scaleName]};
                        return {'state': s.scaleName, realVal: row[s.scaleName]};
                    });
                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {};
                    edge.attributes[attr] = {'states':states, 'type': 'discrete'};
                }
            });
        }
        return edge;
    });

}
export function rootAttribute(paths, calculatedAtt, calculatedScales){

    let rootAtt = calculatedAtt.filter(f=> f.node === paths[0][0].node)[0];

    Object.keys(rootAtt).filter(f=> f != 'node').map(att=> {
        rootAtt[att].scales = calculatedScales.filter(f=> f.field === att)[0];
    });

    return paths.map((p, i)=> {
        p[0].attributes = rootAtt;
        p[0].root = true;
        return p
    });

};
export function combineLength(paths){

    let maxTime = paths.map(path=> d3.sum(path.map(p=> p.edgeLength)))[0];
    maxTimeKeeper.push(maxTime);
    return paths.map(path=> {
        return path.map((node, i, n)=> {
            node.maxTime = maxTime;
            node.combLength = d3.sum(n.filter((f, j)=> i >= j).map(m=> m.edgeLength));
            return node;
        })
    })

}

export function filterKeeper(){

    this.filterArray = new Array();
    this.attributeFilter = false;

    this.addFilter = function(filter){
        this.filterArray.push(filter);
        return this.filterArray;
    };
    this.removeFilter = function(index){
        this.filterArray = this.filterArray.filter((f, i)=> i != index);
        return this.filterArray;
    };
}

export function formatAttributeData(pathData, scales, filterArray){

  

    let keys = (filterArray == null)? Object.keys(pathData[0][0].attributes).filter(f=> f != 'node' && f != 'leaf' && f != 'length' && f != 'root' && f != 'key'): filterArray;
   
    let newData = pathData.map(path=> {
        return keys.map((key)=> {
            return path.map((m)=> {
                let speciesLabel = path[path.length - 1].node;
                
                if(m.attributes[key].type === 'continuous'){
                    m.attributes[key].species = speciesLabel;
                    m.attributes[key].color = scales.filter(f=> f.field === key)[0].catColor;
                    m.attributes[key].move = m.combineLength;
                    m.attributes[key].combLength = m.combLength;
                    m.attributes[key].node = m.node;
                    m.attributes[key].edgeMove = m.edgeLength;
                    m.attributes[key].edgeLength = m.edgeLength;
                    m.attributes[key].label = key;
                    m.attributes[key].yScale = m.attributes[key].scales.yScale;
                    m.attributes[key].satScale = m.attributes[key].scales.satScale;
                    m.attributes[key].colorScale = m.attributes[key].scales.colorScale;
                    if(m.leaf){
                        m.attributes[key].leaf = m.leaf;
                    }
                    m.attributes[key].leaf = m.leaf;
                    return m.attributes[key];
                }else if(m.attributes[key].type === 'discrete'){
                    if(m.leaf === true){
                        let states = d3.entries(m.attributes[key].values);
                     
                        m.attributes[key].leaf = m.leaf;
                        let state = m.attributes[key];
                        state.states = {field: key, state: m.attributes[key].values[key]}
                        state.species = speciesLabel;
                        state.winState = m.attributes[key].values[key] ?  m.attributes[key].values[key] : d3.entries(m.attributes[key].values);
                        state.color = m.attributes[key].scales.stateColors.filter(f=> {
                            return f.state.includes(state.winState)})[0].color;

                        
                        state.move = m.combLength;
                        state.combLength = m.combLength;
                        state.node = m.node;
                        state.edgeMove = m.edgeLength;
                        state.edgeLength = m.edgeLength;
                        state.attrLabel = key;
                        return state;
                    }else{
                        let states = m.attributes[key].states ? m.attributes[key].states : d3.entries(m.attributes[key].values);//.filter(f => f.state != undefined);

                        return states.map((st, j)=> {
                            st.state = st.key;
                            st.value = st.value;
                            
                            st.color = m.attributes[key].scales.stateColors.filter(f=> f.state === st.key)[0];
                           
                            st.move = m.combLength;
                            st.combLength = m.combLength;
                            st.node = m.node;
                            st.edgeMove = m.edgeLength;
                            st.edgeLength = m.edgeLength;
                            st.attrLabel = key;
                            st.species = speciesLabel;
                            return st;
                        });
                    }
             
                }else{
                    console.error('attribute type not found');
                }
            });
        });
    });
    return newData;
}

export async function dataLoadAndFormatMultinet(workspace, graphName){

    let dataName = graphName;
    let data = await load_data(workspace, graphName);

    let internalIndex = 0;
    let leafIndex = 1;
  
    //helper function to create array of unique elements
    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }

    let attributeList = [];

    let edges = data.links[0].rows;

    let internal = data.nodes[internalIndex].rows//.filter(f=> f._id.includes('internal'));
    let leaves = data.nodes[leafIndex].rows//.filter(f=> f._id.includes('leaf'));

    let notAttributeList = ["_id", "label", "_key", "_rev", "key", "length"];

    ///Creating attribute list to add estimated values in //
    d3.keys(leaves[0]).filter(f=> notAttributeList.indexOf(f) === -1).forEach((d, i)=> {
        if(discreteTraitList.indexOf(d) > -1){
            attributeList.push({field: d, type: 'discrete'});
        }else{
            attributeList.push({field: d, type:'continuous'});
        }
    });

    let calculatedAtt = internal.map((row, i)=> {

        let newRow = {};
        attributeList.forEach((att)=>{
         
            if(d3.entries(row).filter(f=> f.key.includes(att.field)).length > 0){
                newRow[att.field] = {};
                newRow[att.field].field = att.field;
                newRow[att.field].type = att.type;
                let values = {}
                d3.entries(row).filter(f=> f.key.includes(att.field)).map(m=> {
                    
                    if(att.type === 'continuous'){
                       
                        if(m.key.includes('upperCI')){
                            values.upperCI95 = +m.value;
                        }else if(m.key.includes('lowerCI')){
                            values.lowerCI95 = +m.value;
                        }else{
                            values.realVal = +m.value;
                        }
                    }else{
                         values[m.key] = m.value;   
                    }
                });
                newRow[att.field].values = values;

            }
        });
        newRow.node = row.label;
        newRow.key = row._id;
        newRow.length = +row.length;
        newRow.leaf = false;
        return newRow;
    });

    console.log('calc', d3.keys(calculatedAtt[0]), attributeList);
   
    let calcLeafAtt = leaves.map((row, i)=> {
        let newRow = {};
        attributeList.forEach((att)=>{
            newRow[att.field] = {};
            newRow[att.field].field = att.field;
            newRow[att.field].type = att.type;
            let values = {}
            d3.entries(row).filter(f=> f.key.includes(att.field)).map(m=> {
                if(att.type === 'continuous'){
                    values.realVal = +m.value;
                }else{
                    values[m.key] = m.value;   
                }
            });
            newRow[att.field].values = values;
        });
        newRow.node = row.label;
        newRow.label = row.label;
        newRow.length = +row.length;
        newRow.key = row._id;
        newRow.leaf = true;
        return newRow;
    });

    

    let calculatedScales = calculateNewScales(calculatedAtt, attributeList.map(m=> m.field).filter(f=> d3.keys(calculatedAtt[0]).indexOf(f) > -1), colorKeeper);

    let matchedEdges = edges.map((edge, i)=> {

        let edgeSource = '_from';
        let edgeTarget = '_to';

        let attrib = edge[edgeTarget].includes("internal") ? calculatedAtt.filter(f=> f.key === edge[edgeTarget])[0] : calcLeafAtt.filter(f=> f.key === edge[edgeTarget])[0];
        let fromNode = edge[edgeSource].includes("internal") ? calculatedAtt.filter(f=> f.key === edge[edgeSource])[0] : calcLeafAtt.filter(f=> f.key === edge[edgeSource])[0];

        if(attrib){
        
            Object.keys(attrib).filter(f=> (f != 'node') && (f != 'label') && (f != 'length') && (f != 'leaf') && (f != 'key')).map((att, i)=>{
                let scales = calculatedScales.filter(f=> f.field=== att)[0];
                attrib[att].scales = scales;
                return att;
            })
        }
        let newEdge = {
            V1: fromNode.node,
            V2: attrib.node,
            node: attrib.node,
            leaf: attrib.leaf,
            edgeLength: +attrib.length,
            attributes: attrib ? attrib : null
        }
       
        return newEdge;
    });

    let paths = allPaths(matchedEdges, matchedEdges.filter(f=> f.leaf === true), "V1", "V2")
        .map((path, i)=> {
            let root = path[0];
            let attrib = calculatedAtt.filter(f=> f.node === root.node)[0];
            if(attrib){
               
                Object.keys(attrib).filter(f=> (f != 'node') && (f != 'label') && (f != 'length') && (f != 'leaf') && (f != 'key')).map((att, i)=>{
                    let scales = calculatedScales.filter(f=> f.field=== att)[0]
                    attrib[att].scales = scales;
                    return att;
                });
            }
            let rooted = {
                V1: null,
                V2: attrib.node,
                node: attrib.node,
                leaf: attrib.leaf,
                root: true,
                edgeLength: 0,
                attributes: attrib ? attrib : null
            }
            path[0] = rooted;
            return path;
        });

    let normedPaths = combineLength(paths);
    let group = binGroups(normedPaths, dataName, calculatedScales, 8);
    let chosenClade = addCladeGroup(`All ${dataName}`, ['Whole Set'], [{'label': `All ${dataName}`, 'paths': normedPaths, 'groupBins': group}]);
    chosenCladesGroup.push(chosenClade)    
    
    addClade(`All ${dataName}`, normedPaths);

    calculatedScalesKeeper.push(calculatedScales);
    dataMaster.push(normedPaths);
    nestedData.push(buildTreeStructure(normedPaths, matchedEdges));
    speciesTest.push(normedPaths.flatMap(m=> m.filter(f=> f.leaf === true)).map(l=> l.node));

    return [normedPaths, calculatedScales];
}