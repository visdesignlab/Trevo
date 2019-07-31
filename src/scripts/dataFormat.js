import * as d3 from "d3";


export function calculateScales(calculatedAtt, colorKeeper){
    return Object.keys(calculatedAtt).map((d, i)=> {
       
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
                'satScale': d3.scaleLinear().range([0, 1]).domain([min, max]),
                'catColor': colorKeeper[i],
            };
        }else{
            let scaleCat = calculatedAtt[d].fields.filter(f=> f!= 'nodeLabels');
            return { 
                'field': d,
                'type':'discrete',
                'stateColors': scaleCat.map((sc, i)=> {
                    return {'state': sc, 'color': colorKeeper[i]};
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
        
         let leafCharIndex = leafChar.rows.map(m=> m[""]);
     
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
                     return {'state': state,  scaleVal: thisScale(value), realVal: value};
                 });
             
                 //let states = {'state': leafChar.rows[i][k],  scaleVal: thisScale(1), realVal: 1}
                 attr[k] = {'states': states, 'label': k, 'type': scaleOb.type, leaf: true};
             }else if(scaleOb.type === 'continuous'){
                 let scale = scaleOb.yScale;
                 attr[k] = {'scaleVal': scale(chosenOne[k]), 'scaledHigh': 0, 'scaledLow': 0, 'realVal': chosenOne[k], 'type': scaleOb.type, leaf: true};
 
             }else{
                 attr[k] = 'error in leaf matching';
             }
         });
 
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
                    res.scaleVal = scale(res.estimate);
                    res.scaledLow = scale(res.lowerCI95);
                    res.scaledHigh = scale(res.upperCI95);
                    res.realVal = res.estimate;

                    res.type = 'continuous';
                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {};
                    edge.attributes[attr] = res;
                }else{
                    let scales = calculatedScales.filter(f=> f.field == attr)[0].scales;
                    let row = calculatedAtt[attr].rows[index];
                    let states = scales.map(s=> {
                        return {'state': s.scaleName,  scaleVal: s.yScale(row[s.scaleName]), realVal: row[s.scaleName]};
                    });
                    edge.attributes = (edge.attributes != undefined)? edge.attributes : {};
                    edge.attributes[attr] = {'states':states, 'type': 'discrete'};
                }
            });
        }
        return edge;
    });

}

export function normPaths(paths, calculatedAtt, calculatedScales){
    paths.forEach((p, i)=> {
        p[0].attributes = {};
        Object.keys(calculatedAtt).map(att=> { 
            if(calculatedAtt[att].type == 'continuous'){
                let root = calculatedAtt[att].rows.filter(f=> f.nodeLabels == p[0].node)[0];
                p[0].attributes[att] = {};
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
                let root = calculatedAtt[att].rows.filter(f=> f.nodeLabels == p[0].node)[0];
                let scales = calculatedScales.filter(f=> f.field == att)[0].scales;
                let rootAttr = scales.map(s=> {
                    return {'state': s.scaleName,  scaleVal: s.yScale(root[s.scaleName]), realVal: root[s.scaleName]};
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

export function formatAttributeData(normedPaths, scales, filterArray){
    console.log('filterArray',filterArray);
    console.log('normedpaths',normedPaths);
    let keys = (filterArray == null)? Object.keys(normedPaths[0][0].attributes): filterArray;
   
    let newData = normedPaths.map(path=> {
        return keys.map((key)=> {
            return path.map((m)=> {
                if(m.attributes[key].type === 'continuous'){
                    m.attributes[key].color = scales.filter(f=> f.field === key)[0].catColor;
                    m.attributes[key].move = m.move;
                    m.attributes[key].edgeMove = m.edgeMove;
                    m.attributes[key].label = key;
                    m.attributes[key].yScale = scales.filter(s=> s.field === key)[0].yScale;
                    m.attributes[key].satScale = scales.filter(s=> s.field === key)[0].satScale;
                    return m.attributes[key];
                }else if(m.attributes[key].type === 'discrete'){
                    if(m.leaf){
                        let state = m.attributes[key];
                        state.winState = m.attributes[key].states.filter(f=> f.realVal === 1)[0].state;
                        state.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === state.winState)[0].color;
                        state.move = m.move;
                        state.edgeMove = m.edgeMove;
                        state.attrLabel = key;
                        return state;
                    }else{
                        let states = m.attributes[key].states ? m.attributes[key].states : m.attributes[key];//.filter(f => f.state != undefined);
                        return states.map((st, j)=> {
                            st.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === st.state)[0].color;
                            st.move = m.move;
                            st.edgeMove = m.edgeMove;
                            st.attrLabel = key;
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