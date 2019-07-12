import '../styles/index.scss';
import * as d3 from "d3";

export function renderDistibutions(normedPaths, mainDiv, scales){
  
    let keys = Object.keys(normedPaths[0][0].attributes);

    let newNormed = [...normedPaths];

    formatAttributeData(newNormed, scales, null);

    let maxBranch = d3.max(newNormed.map(p=> p.length)) - 1;
    let xScale = d3.scaleLinear().domain([0, (maxBranch - 1)]).clamp(true)
  
    let svg = mainDiv.append('svg');
    svg.attr('id', 'main-summary-view');

    let addMoveToAttributes = keys.map(key=> {
            let filtered = newNormed.map(path=> {
                return path.filter(n=> n.leaf != true)
            });
            let data = filtered.map(path=> {
                return path.map((node, i)=> {
                    let attr = node.attributes[key];
                    let lastnode = path.length - 1
                
                    if(attr.type === 'discrete'){
                        let thisScale = xScale;
                        thisScale.range([0, 800]);
                        attr.move = thisScale(i);
                        attr.states = node.attributes[key].states.map(s=> {
                            s.move = attr.move;
                            return s;
                        });
                    }else{
                        let thisScale = xScale;
                        thisScale.range([0, 790]);
                        attr.move = (i < lastnode) ? xScale(i): xScale(maxBranch - 1);
                    }
                    return attr;
                });
            });
            data.attKey = key;
            return data;
    });

    let summarizedData = addMoveToAttributes.map(attr=> {
       
        if(attr[0][0].type === 'discrete'){
            
           // let binCount = d3.max(attr.map(row=> row.length));
            let moveMap = attr.filter(row=> row.length === maxBranch)[0];
            let stateKeys = attr[0][0].states.map(s=> s.state);
            let distrib = {}
            distrib.stateData = {}
            stateKeys.forEach(key => {
              
                 let distribution = Array(maxBranch).fill({'data':[]}).map((u, i)=> {
                     let newOb = {'data': u.data}
                     newOb.move = moveMap[i].move
                     return newOb;
                 });
                 attr.forEach((row)=> {
                     let test = row.filter(r=> r.leaf != true).map(node=> node.states.filter(s=> s.state === key)[0])
                     test.forEach((t, i)=> {
                         let newT = t;
                         distribution[i].data.push(newT);
                        });
                 });
                 
                 distrib.stateData[key] = {};
                 let data = distribution.map(drow=> {
                     let filtered = drow.data.filter(d=> {
                         return d.move === drow.move});
                     return filtered;
                 })
                 let color = data[0][0].color;
               
                 let thisScale = [...scales].filter(f=> f.field == attr.attKey)[0].scales.filter(f=> f.scaleName == key)[0].yScale;
            
                 thisScale.range([0, 80]);
                 thisScale.clamp(true)
               
                 let realMean = data.map(branch=> d3.mean(branch.map(b=> b.realVal)))
                 let realStDev = data.map(branch=> d3.deviation(branch.map(b=> b.realVal)))
                 let realStUp = realMean.map((av, i)=> av + realStDev[i]);
                 let realStDown = realMean.map((av, i)=> av - realStDev[i]);
     
                let scaleMean = data.map(branch=> d3.mean(branch.map(b=> thisScale(b.realVal))))
                let scaleStDev = data.map(branch=> d3.deviation(branch.map(b=> thisScale(b.realVal))))
                let scaleStUp = scaleMean.map((av, i)=> av + scaleStDev[i]);
                let scaleStDown = scaleMean.map((av, i)=> av - scaleStDev[i]);
     
                let moves = distribution.map(d=> d.move)

                let final = moves.map((m, j)=> {
                     return {
                         'x': m,
                         'realMean': realMean[j],
                         'realStDev': realStDev[j],
                         'realStUp': realStUp[j],
                         'realStDown': realStDown[j],
                         'scaleMean': scaleMean[j],
                         'scaleStDev': scaleStDev[j],
                         'scaleStUp': scaleStUp[j],
                         'scaleStDown': scaleStDown[j],
                        }
                 });

                 distrib.stateData[key].pathData = final;
                 distrib.stateData[key].color = color;

             });
             distrib.attKey = attr.attKey;
             distrib.type = 'discrete';
             return distrib;
        }else{
            attr.type = 'continuous';
            let thisScale = [...scales].filter(f=> f.field == attr.attKey)[0].yScale;
            thisScale.range([0, 80]);//.scales.filter(f=> f.scaleName == key)[0].yScale;
            thisScale.clamp(true)
            let newScale = attr.map(row=> {
                return row.map(n=> {
                    n.scaleVal = thisScale(n.realVal)
                    n.scaledHigh = thisScale(n.upperCI95)
                    n.scaledLow = thisScale(n.lowerCI95)
                    return n;
                });
            });
          
            newScale.type = 'continuous';
            newScale.attKey = attr.attKey;
            return newScale;
        }
    })

    ////data for observed traits////
    let observed = keys.map(key=> {

        let leaves = newNormed.map(path=> {
            return path.filter(n=> n.leaf === true)[0];
        });

        let data = leaves.map(leaf=> {
            let attr = leaf.attributes[key];
            if(attr.type === 'continuous'){
                return attr.realVal;
            }else if(attr.type === 'discrete'){
                return attr.winState;
            }else{
                console.error('attribute type not found');
            }
        });

        if(leaves[0].attributes[key].type === 'discrete'){
            let colorScales = scales.filter(f=> f.field === key)[0].stateColors;
            let stateCategories = leaves[0].attributes[key].states.map(m=> m.state);
            let states = stateCategories.map(st=> {
                let color = colorScales.filter(f=> f.state == st)[0].color;
                let xScale = d3.scaleLinear().domain([0, stateCategories.length-1])
                return {'key': st, 'count': data.filter(f=> f === st).length, 'scale': xScale, 'color': color }
            });
            let max = d3.max(states.map(m=> m.count));
            states.forEach(state=> {
                state.max = max;
            });
            return states;
        }else{
            return data.sort();
        };
    });

    let combinedData = observed.map((ob, i)=> {
        return {'observed': ob, 'predicted': summarizedData[i]}
    })

    let attributeGroups = svg.selectAll('.combined-attr-grp').data(combinedData);
    let attEnter = attributeGroups.enter().append('g').classed('combined-attr-grp', true);
    attributeGroups = attEnter.merge(attributeGroups);
    attributeGroups.attr('transform', (d, i)=> 'translate(0,'+(i * 110)+')');

    let predictedAttrGrps = attributeGroups.append('g').classed('summary-attr-grp', true);

    let innerTime = predictedAttrGrps.append('g').classed('inner-attr-summary', true);
    innerTime.attr('transform', 'translate(105, 0)');
    let attrRect = innerTime.append('rect').classed('attribute-rect-sum', true);
    attrRect.attr('x', 0).attr('y', 0).attr('height', 80).attr('width', 800);
    let label = predictedAttrGrps.append('text').text(d=> d.predicted.attKey);
    label.attr('x', 100).attr('y', 25).attr('text-anchor', 'end');
    let cont = innerTime.filter(f=> f.predicted.type === 'continuous');

    //////////experimenting with continuous rendering///////////////////////////////

    let contpaths = cont.selectAll('g.summ-paths').data(d=> d.predicted);
    let contEnter = contpaths.enter().append('g').classed('summ-paths', true);
    contpaths = contEnter.merge(contpaths);

    var lineGen = d3.line()
    .x(d=> d.move)
    .y(d=> d.scaleVal);

    let line = contpaths.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line-sum")
    .style('stroke', (d)=> d[0].color);

    let nodes = contpaths.selectAll('.node-sum').data(d=> d).enter().append('g').attr('class', 'node-sum');
    nodes.attr('transform', (d, i) => 'translate('+d.move+', 0)');
    nodes.append('rect').attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 80).classed('inner-node-wrap', true);
    nodes.append('rect').attr('x', 0).attr('y', (d, i)=> d.scaledLow).attr('width', 10).attr('height', (d, i)=> {
        return (d.scaledHigh - d.scaledLow);
    }).classed('range-rect-sum', true).style('fill', d=> d.color);
    svg.attr('height', (summarizedData.length * 120));

    //////////experimenting with continuous rendering///////////////////////////////
    let disc = innerTime.filter(f=> f.predicted.type === 'discrete').classed('discrete-sum', true);

    let stateGroups = disc.selectAll('.state-sum').data(d=> Object.entries(d.predicted.stateData).map(m=> m[1]));
    let stateEnter = stateGroups.enter().append('g').classed('state-sum', true);
    stateGroups = stateEnter.merge(stateGroups);

    var lineGenD = d3.line()
    .x(d=> d.x)
    .y(d=> d.scaleMean);

    let lineD = stateGroups.append('path')
    .attr("d", d=> lineGenD(d.pathData))
    .attr("class", "inner-line-sum-discrete")
    .style('stroke', (d, i)=> {
        return d.color
    });

    let area = d3.area()
    .x(d => d.x)
    .y0(d => d.scaleStDown)
    .y1(d => d.scaleStUp)
    
    let areaG =   stateGroups.append("path")
    .attr("fill", d=> d.color)
    .attr("d", d=> area(d.pathData))
    .classed('state-area-sum', true);

    let observedDiscrete = attributeGroups.filter(f=> f.predicted.type === 'discrete');
    let observedGroup = observedDiscrete.append('g').classed('observed-discrete', true);
    observedGroup.attr('transform', 'translate(920, 0)')
    let observedWrapRect = observedGroup.append('rect').attr('width', 200).attr('height', 80).attr('x', 0).attr('y', 0);
  
    let stateBars = observedGroup.selectAll('.state-bar').data(d=> d.observed);

    let rectBarEnter = stateBars.enter().append('g').classed('state-bar', true);
    stateBars = rectBarEnter.merge(stateBars);

    stateBars.attr('transform', (d, i)=> {
        d.scale.range([0, 180]);
        return 'translate('+ d.scale(i)+ ',0)'});

    let stateRects = stateBars.append('rect').classed('graph-bars', true);
   
    stateRects.attr('x', 0)
        .attr('height', (d, i)=> {
            let scale = d3.scaleLinear().domain([0, d.max + 10]).range([80, 0])
            return scale(0) - scale(d.count);
        }).attr('y', (d, i)=> {
            let scale = d3.scaleLinear().domain([0, d.max + 10]).range([0, 80])
            let move = 80 - (scale(d.count));
            return move;
        }).attr('width', 20).style('fill', d=> d.color)

    let labelsG = stateBars.append('g').attr('transform', 'translate(0, 80)');
    let labels = labelsG.append('text').text(d=> d.key)
    labels
    .style("text-anchor", "end")
    .attr("dx", "-.1em")
    .attr("dy", ".8em")
    .style('font-size', 9)
    .attr("transform", "rotate(-65)");
}
export function toolbarControl(toolbar, normedPaths, main, calculatedScales){
    let button = toolbar.append('button').attr('id', 'view-toggle').attr('attr' , 'button').attr('class', 'btn btn-outline-secondary') 
    button.text('View Paths');
    button.on('click', function(){
        if(button.text() === 'View Paths'){
            button.text('View Summary');
            main.selectAll('*').remove();//.selectAll('*').remove();

            ////NEED TO SIMPLIFY THIS///////
            let pathGroups = renderPaths(normedPaths, main);

              /// LOWER ATTRIBUTE VISUALIZATION ///
            let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
            let attData = formatAttributeData(normedPaths, calculatedScales)
            let predictedAttrGrps = renderAttributes(attributeWrapper, attData, calculatedScales, null);
        
            let attributeHeight = 45;
            pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
            // renderToggles(normedPaths, toggleSVG, predictedAttrGrps, calculatedScales);
            drawContAtt(predictedAttrGrps);
            drawDiscreteAtt(predictedAttrGrps, calculatedScales);

            //tranforming elements
            main.select('#main-path-view').style('height', ((normedPaths.length + predictedAttrGrps.data().map(m=> m[0]).length)* 30) + 'px');
            attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');
            ///////////////////////////////////

        }else{
            button.text('View Paths');
            main.selectAll('*').remove();
            renderDistibutions(normedPaths, main, calculatedScales)

        }
    })
}

export function renderToggles(normedPaths, toggleSVG, scales){

    let keys = Object.keys(normedPaths[0][0].attributes);

    let labelGroups = toggleSVG.selectAll('g').data(keys);
    let labelGroupEnter = labelGroups.enter().append('g'); 
    
    labelGroupEnter.attr('transform', (d, i)=> {
        return 'translate('+ ( (i* 100) + (d.length * 2))+', 20)'});

    let toggle = labelGroupEnter.append('circle').attr('cx', -10).attr('cy', -4);
    toggle.classed('toggle shown', true);
    toggle.style('fill', (d, i)=>{
        return scales.filter(f=> f.field === d)[0].catColor;
    });
    toggle.on('click', function(d, i){
        let togg = d3.select(this);
        toggleCircle(togg, scales);
        let newKeys = d3.selectAll('.shown');
        let attributeWrapper = d3.selectAll('.attribute-wrapper');
        attributeWrapper.selectAll('g').remove();
        let attributeHeight = 45;
      
          /// LOWER ATTRIBUTE VISUALIZATION ///
      
        let attData =  formatAttributeData(normedPaths, scales, newKeys.data());
        let predictedAttrGrps = renderAttributes(attributeWrapper, attData, scales, null);

        d3.select('#main-path-view').style('height', ((normedPaths.length + predictedAttrGrps.data().map(m=> m[0]).length)* 30) + 'px');
        d3.selectAll('.paths').attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (newKeys.data().length + 1))) +')');
    
        drawContAtt(predictedAttrGrps);
        drawDiscreteAtt(predictedAttrGrps, scales);

    });
    let labelText = labelGroupEnter.append('text').text(d=> d).style('font-size', 10);
    labelGroups = labelGroupEnter.merge(labelGroups);
}

function toggleCircle(circle, scales){
    if(circle.classed('shown')){
        circle.classed('shown', false);
        circle.style('fill', '#fff');
    }else{
        circle.classed('shown', true);
        circle.style('fill', (d, i)=>{
            return scales.filter(f=> f.field === d)[0].catColor;
        });
    }
}

export function renderPaths(normedPaths, main){
    /////Rendering ///////
    let svg = main.append('svg').attr('id', 'main-path-view'),
    width = +svg.attr("width"),
    height = +svg.attr("height");
   
    let pathWrap = svg.append('g').classed('path-wrapper', true);
    pathWrap.attr('transform', (d, i)=> 'translate(0,20)');

    /////Branch Paths/////
    let pathGroups = branchPaths(pathWrap, normedPaths);
    return pathGroups;
}

export function formatAttributeData(normedPaths, scales, filterArray){
    let keys = (filterArray == null)? Object.keys(normedPaths[0][0].attributes): filterArray;
   
    let newData = normedPaths.map(path=> {
        return keys.map((key)=> {
            return path.map((m)=> {
                if(m.attributes[key].type === 'continuous'){
                  
                    m.attributes[key].color = scales.filter(f=> f.field === key)[0].catColor;
                    m.attributes[key].move = m.move;
                    m.attributes[key].label = key;
                    return m.attributes[key];
                }else if(m.attributes[key].type === 'discrete'){
                    if(m.leaf){
                        let state = m.attributes[key];
                       
                        state.winState = m.attributes[key].states.filter(f=> f.realVal === 1)[0].state;
                        state.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === state.winState)[0].color
                        state.move = m.move;
                        state.attrLabel = key;
                        return state;
                    }else{
                        let states = m.attributes[key].states ? m.attributes[key].states : m.attributes[key];//.filter(f => f.state != undefined);
                       
                        return states.map((st, j)=> {
                            st.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === st.state)[0].color;
                            st.move = m.move;
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

export function renderAttributes(attributeWrapper, data, scales, filterArray){

    let attributeHeight = 45;

    let predictedAttrGrps = attributeWrapper.selectAll('g').data((d, i)=> data[i]).enter().append('g');

    predictedAttrGrps.attr('transform', (d, i) => 'translate(0, '+(i * (attributeHeight + 5))+')');

    return predictedAttrGrps;
}

function continuousPaths(innerTimeline){
    //THIS IS THE PATH GENERATOR FOR THE CONTINUOUS VARIABLES1q
    var lineGen = d3.line()
    .x(d=> d.move)
    .y(d=> d.scaleVal);

    let innerPaths = innerTimeline.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', (d)=> d[0].color);

    return innerPaths;
    ///////////////////////////////////////////////////////////
}

export function renderTree(nestedData, sidebar){
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
 
 /////END TREE STUFF
 ///////////
}

function branchPaths(wrapper, pathData) {

    /////Counting frequency of nodes//////
    let branchFrequency = pathData.flatMap(row=> row.flatMap(f=> f.node)).reduce(function (acc, curr) {
        if (typeof acc[curr] == 'undefined') {
          acc[curr] = 1;
        } else {
          acc[curr] += 1;
        }
        return acc;
      }, {});

     ///Scales for circles ///
     let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))])

    let pathGroups = wrapper.selectAll('.paths').data(pathData);
    let pathEnter = pathGroups.enter().append('g').classed('paths', true);
    pathGroups = pathEnter.merge(pathGroups);
   // pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
    let pathBars = pathGroups.append('rect').classed('path-rect', true);//.style('fill', 'red');
    pathBars.attr('y', -8);
    pathGroups.on('mouseover', function(d, i){
        let treeNode  = d3.select('#sidebar').selectAll('.node');//.filter(f=> d.map(m=> m.name).indexOf(f.name) > -1);
        let treeLinks  = d3.select('#sidebar').selectAll('.link');//.filter(f=> d.map(m=> m.name).indexOf(f.name) > -1);
        
        treeNode.filter(f=> d.map(m=> m.name).indexOf(f.data.name) > -1).classed('hover', true);
        treeLinks.filter(f=> d.map(m=> m.name).indexOf(f.data.name) > -1).classed('hover', true);
        return d3.select(this).classed('hover', true);
    }).on('mouseout', function(d, i){
        let treeNode  = d3.select('#sidebar').selectAll('.node').classed('hover', false);//.filter(f=> d.map(m=> m.name).indexOf(f.name) > -1);
        let treeLinks  = d3.select('#sidebar').selectAll('.link').classed('hover', false);
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

    circle.on('mouseover', function(d, i){
       // d3.selectAll('.node-'+d.node).attr('fill', 'red')
        return nodeGroups.selectAll('.node-'+d.node).classed('hover-branch', true);
    }).on('mouseout', function(d, i){
        return d3.selectAll('.node-'+d.node).classed('hover-branch', false);
    });

    let speciesNodeLabel = nodeGroups.filter(f=> f.label != undefined).append('text').text(d=> {
        let string = d.label.charAt(0).toUpperCase() + d.label.slice(1);
        return string;
    }).attr('x', 10).attr('y', 5);

    return pathGroups;
}
export function drawContAtt(predictedAttrGrps){

    let continuousAtt = predictedAttrGrps.filter(d=> {
        return d[0].type === 'continuous';
    });

    let attributeHeight = 45;
    let attrLabel = continuousAtt.append('text').text(d=> d[0].label);
    attrLabel.classed('attribute-label', true);
    attrLabel.attr('transform', 'translate(-15, 20)');
    let innerTimeline = continuousAtt.append('g').classed('attribute-time-line', true);
    let attribRectCont = innerTimeline.append('rect').classed('attribute-rect', true);
    attribRectCont.attr('height', attributeHeight);//.data(normedPaths);//.attr('transform', (d, i)=> 'translate(0, 0)');
    let attributeNodesCont = innerTimeline.selectAll('g').data(d=> d);
    let attrNodesContEnter = attributeNodesCont.enter().append('g').classed('attribute-node', true);
    attributeNodesCont = attrNodesContEnter.merge(attributeNodesCont);

    let innerBars = attributeNodesCont.append('g').classed('inner-bars', true);

 /////DO NOT DELETE THIS! YOU NEED TO SEP CONT AND DICRETE ATTR. THIS DRAWS LINE FOR THE CONT
 /////
    let innerPaths = continuousPaths(innerTimeline);
 ////////

    let innerRect = innerBars.append('rect').classed('attribute-inner-bar', true);
    innerRect.attr('height', attributeHeight)
    innerBars.attr('transform', (d)=> {
        return 'translate('+ d.move +', 0)'});
    let rangeRect = innerBars.append('rect').classed('range-rect', true);
    rangeRect.attr('width', 20).attr('height', (d, i)=> {
        let range = d.scaledHigh -  d.scaledLow;
        return range;
    });
    rangeRect.attr('transform', (d, i)=> {
        let lowMove = d.scaledLow;
        return 'translate(0, '+ lowMove +')';
    });
    rangeRect.style('fill', d=> d.color);
    innerBars.append('rect').attr('width', 20).attr('height', 5)
    .attr('transform', (d, i)=> 'translate(0, '+ d.scaleVal +')')
    .attr('fill', d=> d.color);
}
export function drawDiscreteAtt(predictedAttrGrps, scales){

    let discreteAtt = predictedAttrGrps.filter(d=> {
        return d[d.length - 1].type === 'discrete';
    });

    let attributeHeight = 45;
    let attrLabel = discreteAtt.append('text').text(d=> d[d.length - 1].label);
    attrLabel.classed('attribute-label', true);
    attrLabel.attr('transform', 'translate(-15, 20)');

    let innerTimelineDis = discreteAtt.append('g').classed('attribute-time-line', true);

    innerTimelineDis.append('line').classed('half', true).attr('x1', 0).attr('y1', 22).attr('x2', 1010).attr('y2', 22)
    
    let statePath = innerTimelineDis.selectAll('g').data(d=> {
        let disct = d.map(m=> {
            let test = (m.leaf == true) ? m.states.map(s=> {
                s.move = m.move;
                s.color = m.color;
                return s
            }) : m;
            return test;
        });
        let keys = disct[0].map(s=> s.state);
        let lines = keys.map(key=> {
            return disct.map(m=> m.filter(f=> f.state == key)[0]);
        });
        return lines;
    });

    let pathEnter = statePath.enter().append('g').classed('state-path', true);
    statePath = pathEnter.merge(statePath);

    var lineGen = d3.line()
    .x(d=> {
        return d.move + 7})
    .y(d=> d.scaleVal);

    let innerStatePaths = statePath.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke-width', 0.7)
    .style('stroke', (d)=> {
        return d[0].color});

    let attribRectDisc = innerTimelineDis.append('rect').classed('attribute-rect', true);
    attribRectDisc.attr('height', attributeHeight);//.data(normedPaths);//.attr('transform', (d, i)=> 'translate(0, 0)');
    let attributeNodesDisc = innerTimelineDis.selectAll('.attribute-node-discrete').data(d=> {
        return d});
    let attrNodesDiscEnter = attributeNodesDisc.enter().append('g').classed('attribute-node-discrete', true);
    attributeNodesDisc = attrNodesDiscEnter.merge(attributeNodesDisc);

    attributeNodesDisc.attr('transform', (d)=> {
        let move = d[0] ? d[0].move : d.move;
        let finalMove = move ? move : 0;
        return 'translate('+finalMove+', 0)'});

    attributeNodesDisc.append('line').attr('x1', 10).attr('x2', 10).attr('y1', 0).attr('y2', attributeHeight);

    let stateDots = attributeNodesDisc.filter((att, i)=> att[0] != undefined).selectAll('.dots').data(d=> {
        return d
    });
    let stateDotsEnter = stateDots.enter().append('circle').attr('cx', 10).attr('cy', (d)=> {
        return d.scaleVal;
    }).attr('r', 2).style('fill', d=> d.color);

    stateDotsEnter.filter(f=> f.realVal > 0.5).attr('r', 4);
    stateDots = stateDotsEnter.merge(stateDots);

    stateDots.on("mouseover", function(d) {
        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(200)
          .style("opacity", .9);
        let f = d3.format(".3f")
        tool.html(d.state + ": " + f(d.realVal))
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
        })
      .on("mouseout", function(d) {
        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(500)
          .style("opacity", 0);
        });

    let endStateDot = attributeNodesDisc.filter((att, i)=> {
        return att[0] === undefined});

    endStateDot.append('circle').attr('cx', 10).attr('cy', 2).attr('r', 7).style('fill', d=> {
        let win = d.states.filter(v=> v.realVal === 1)[0].state;
       // return scales.filter(f=> f.type == 'discrete')[0].stateColors.filter(c=> c.state === win)[0].color});
       return d.color
    });
    ////NEED TO MAKE A FUNCTION TO ASSIGN COLOR OF STATES//////

    endStateDot.append('text').text(d=> d.states[0].state).attr('transform', 'translate(15, 17)').style('font-size', 10);
}

