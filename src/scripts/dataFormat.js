import * as d3 from "d3";


export function pairPaths(pathData){

    return pathData.flatMap((path, i)=> {
        let pairs = pathData.filter((f, j)=> j != i);
        let paired =  pairs.map((p)=> {
            return {'p1': path, 'p2': p}
        });
        return paired.map(m=> {
            m.distance = getDistance(m);
            m.deltas = calculateDelta(m);
            m.closeness = calculateCloseness(m);
            return m;
        })
    })
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

function calculateDelta(pair){
   
    let verts = pair.p2.map(m=> m.node);

    let test = pair.p1.filter(f=> verts.indexOf(f.node) != -1);
    let lastNode = test[test.length - 1].node;

    let p1Index = pair.p1.map(m=> m.node).indexOf(lastNode);
    let p2Index = pair.p2.map(m=> m.node).indexOf(lastNode);
  
    let p1 = pair.p1.filter((f, i)=> i >= p1Index);
    let p2 = pair.p2.filter((f, i)=> i >= p2Index);

    let range = 1 - p1[0].edgeMove;
    let binCount = d3.max([p1.length, p2.length])
    let binStep = range / binCount;
   
    let bins = [...new Array(binCount-1)].map((d, i)=> {
        return {'bottom': p1[0].edgeMove + (i*binStep), 'top': p1[0].edgeMove + ((i+1)*binStep) }
    })
   
    bins = bins.map((d, i)=> {
        let one = p1.filter(f=> (f.edgeMove <= d.top) && (f.edgeMove >= d.bottom))
        let two = p2.filter(f=> (f.edgeMove <= d.top) && (f.edgeMove >= d.bottom))
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
                            return Math.abs(b.one[0].attributes[name].realVal - b.two[0].attributes[name].realVal);
                        });
                        m.value = d3.max(valdiffs)
                        return m;
                    });

    return attributes;
}

function calculateCloseness(pair){

 let leaf1 = pair.p1.filter(p=> p.leaf === true)[0].attributes;
 let leaf2 = pair.p2.filter(p=> p.leaf === true)[0].attributes;
 
 return d3.entries(leaf1).filter(f=> f.value.type === 'continuous').map(m=> {
     m.value = Math.abs(m.value.realVal - leaf2[m.key].realVal);
     
     return m
 });
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
        return p
    });

};

export function combineLength(paths){

    let maxTime = paths.map(path=> d3.sum(path.map(p=> p.edgeLength)))[0];
    return paths.map(path=> {
        return path.map((node, i, n)=> {
            node.maxTime = maxTime;
            node.combLength = d3.sum(n.filter((f, j)=> i>j).map(m=> m.edgeLength));
            return node;
        })
    })

}

export function normPaths(paths, calculatedAtt, calculatedScales){
    paths.forEach((p, i)=> {
        p[0].attributes = {};
        Object.keys(calculatedAtt).map(att=> { 
            if(calculatedAtt[att].type == 'continuous'){
                let root = calculatedAtt[att].rows.filter(f=> (f.nodeLabels == p[0].node) || (f.nodeLabels == ('node ' + p[0].node)))[0];
                p[0].attributes[att] = {};
                
                let scale = calculatedScales.filter(f=> f.field == att)[0].yScale;
            
                p[0].attributes[att].realVal = root.estimate;
                p[0].attributes[att].upperCI95 = root.upperCI95;
                p[0].attributes[att].lowerCI95 = root.lowerCI95;
                p[0].attributes[att].scale = scale;
                p[0].attributes[att].type = 'continuous';
            }else if(calculatedAtt[att].type == 'discrete'){
                let root = calculatedAtt[att].rows.filter(f=> f.nodeLabels == p[0].node)[0];
                let scales = calculatedScales.filter(f=> f.field == att)[0].scales;
                let rootAttr = scales.map(s=> {
                    //return {'state': s.scaleName,  scaleVal: s.yScale(root[s.scaleName]), realVal: root[s.scaleName]};
                    return {'state': s.scaleName, realVal: root[s.scaleName]};
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
     
        let leafIndex = p.length - 1;
        let lengths = p.map(l=> l.edgeLength);
        let prevStep = 0;
        return p.map((m, j)=> {
            let node = Object.assign({}, m);
            //INTEGRATE THE DISTNACES HERE WHEN THEY WORK
            let step = node.edgeLength + prevStep;
            node.edgeMove = (j < leafIndex) ? step : 1;
            prevStep = prevStep + node.edgeLength;
         
            node.move = (j < leafIndex) ? p.xScale(j) : p.xScale(maxBranch - 1);
        
            return node;
        });
    });

    return normedPaths;
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

    let keys = (filterArray == null)? Object.keys(pathData[0][0].attributes).filter(f=> f != 'node'): filterArray;
   
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
                    //console.log(m)
                    return m.attributes[key];
                }else if(m.attributes[key].type === 'discrete'){
                    //console.log('discrete', m)
                    if(m.leaf){
                        let states = Object.entries(m.attributes[key].values);
                        let state = m.attributes[key];
                        state.species = speciesLabel;
                        state.winState = m.attributes[key].values[key] ?  m.attributes[key].values[key] : Object.entries(m.attributes[key].values)[1];
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
                        
                        let states = m.attributes[key].states ? m.attributes[key].states : Object.entries(m.attributes[key].values);//.filter(f => f.state != undefined);
                        return states.map((st, j)=> {
                            
                            st.state = st[0];
                            st.value = st[1];
                         //   st.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === st.state)[0].color;
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