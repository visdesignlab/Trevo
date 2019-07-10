import '../styles/index.scss';
import * as d3 from "d3";

export function renderDistibutions(normedPaths, distSVG, scales){
    
}

export function renderToggles(normedPaths, toggleSVG, attrGroups, scales){

    let keys = Object.keys(normedPaths[0][0].attributes);

    let labelGroups = toggleSVG.selectAll('g').data(keys);
    let labelGroupEnter = labelGroups.enter().append('g'); 
    
    labelGroupEnter.attr('transform', (d, i)=> {
        console.log(d.length)
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
        let attributeGroups = formatAttributes(attributeWrapper, scales, newKeys.data());

        d3.select('#main-path-view').style('height', ((normedPaths.length + attributeGroups.data().map(m=> m[0]).length)* 30) + 'px');
        d3.selectAll('.paths').attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (newKeys.data().length + 1))) +')');
    
        drawContAtt(attributeGroups);
        drawDiscreteAtt(attributeGroups, scales);

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

export function renderPaths(normedPaths, svg){
    /////Rendering ///////
   
    let pathWrap = svg.append('g').classed('path-wrapper', true);
    pathWrap.attr('transform', (d, i)=> 'translate(0,20)');

    /////Branch Paths/////
    let pathGroups = branchPaths(pathWrap, normedPaths);
    return pathGroups;
}

export function formatAttributes(attributeWrapper, scales, filterArray){

    let attributeHeight = 45;

    let attributeGroups = attributeWrapper.selectAll('g').data((d)=> {
       
        let keys = filterArray == null ? Object.keys(d.map(m=> m.attributes)[0]) : filterArray;
       
        let att = keys.map((key, i)=> {
            //console.log(scales.filter(f=> f.field === key))
            return d.map((m)=> {
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
        
        return att;
    }).enter().append('g');

    attributeGroups.attr('transform', (d, i) => 'translate(0, '+(i * (attributeHeight + 5))+')');

    return attributeGroups;
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

    return pathGroups;
}
export function drawContAtt(attributeGroups){

    let continuousAtt = attributeGroups.filter(d=> {
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
export function drawDiscreteAtt(attributeGroups, scales){

    let discreteAtt = attributeGroups.filter(d=> {
        return d[d.length - 1].type === 'discrete';
    });

    let attributeHeight = 45;
    let attrLabel = discreteAtt.append('text').text(d=> d[d.length - 1].label);
    attrLabel.classed('attribute-label', true);
    attrLabel.attr('transform', 'translate(-15, 20)');

    let innerTimelineDis = discreteAtt.append('g').classed('attribute-time-line', true);

    innerTimelineDis.append('line').classed('half', true).attr('x1', 0).attr('y1', 22).attr('x2', 1010).attr('y2', 22)

///THIS IS WHERE YOU LEFT OFF//////
    
    let statePath = innerTimelineDis.selectAll('g').data(d=> {
      
        let disct = d.map(m=> {
            let test = (m.leaf == true) ? m.states.map(s=> {
                s.move = m.move;
                s.color = m.color;
                return s
            }) : m;
            return test;
        });//.filter(f=> f.leaf != true);
    
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