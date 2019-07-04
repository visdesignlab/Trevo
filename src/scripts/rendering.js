import '../styles/index.scss';
import * as d3 from "d3";

export function renderAttributes(normedPaths, svg){
    let colorKeeper = [
        '#32C1FE',
        '#3AD701',
        '#E2AD01',
        '#E2019E',
    ]
         
    /////Rendering ///////
    svg.style('height', (normedPaths.length* 120) + 'px');
    let pathWrap = svg.append('g').classed('path-wrapper', true);
    pathWrap.attr('transform', (d, i)=> 'translate(0,20)');

    /////Branch Paths/////
    let pathGroups = branchPaths(pathWrap, normedPaths);

    /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');
  
    let attributeGroups = attributeWrapper.selectAll('g').data((d)=> {
       
        let keys = Object.keys(d.map(m=> m.attributes)[0]);
        let att = keys.map((key, i)=> {
            return d.map((m)=> {
                console.log('m', m)
                if(m.attributes[key].type === 'continuous'){
                  
                    m.attributes[key].color = colorKeeper[i];
                    m.attributes[key].move = m.move;
                    m.attributes[key].label = key;
                    return m.attributes[key];
                }else if(m.attributes[key].type === 'discrete'){
                    let states = m.attributes[key].states;//.filter(f => f.state != undefined);
                    return states.map((st, j)=> {
                        st.color = colorKeeper[j];
                        st.move = m.move;
                        st.attrLabel = key;
                        return st
                    })
                }else{
                    console.error('attribute type not found')
                }
            })
        });
        console.log(att)
        return att;
    }).enter().append('g');

    attributeGroups.attr('transform', (d, i) => 'translate(0, '+(i * 35)+')');

    console.log(attributeGroups);

    let testCont = attributeGroups.filter(d=> {
        console.log(d);
        return d.type === 'continuous'
    })

    console.log(testCont)

    ////SPLIT THIS UP
/*
    let attrLabel = attributeGroups.append('text').text(d=> d[0].label);
    attrLabel.classed('attribute-label', true);
    attrLabel.attr('transform', 'translate(-15, 20)');
*/
    let attribRect = attributeGroups.append('rect').classed('attribute-rect', true);

    let innerTimeline = attributeGroups.append('g').classed('time-line', true);//.data(normedPaths);//.attr('transform', (d, i)=> 'translate(0, 0)');
    let attributeNodes = innerTimeline.selectAll('g').data(d=> d);
    let attrGroupEnter = attributeNodes.enter().append('g').classed('attribute-node', true);
    attributeNodes = attrGroupEnter.merge(attributeNodes);

    let innerBars = attributeNodes.append('g');

    //THIS IS THE PATH GENERATOR FOR THE CONTINUOUS VARIABLES
    var lineGen = d3.line()
    .x(d=> d.move)
    .y(d=> d.scaledVal);

    let innerPaths = innerTimeline.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', (d)=> d[0].color);
    ///////////////////////////////////////////////////////////


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
    rangeRect.style('fill', d=> d.color);
    innerBars.append('rect').attr('width', 20).attr('height', 5)
    .attr('transform', (d, i)=> 'translate(0, '+ d.scaledVal +')')
    .attr('fill', d=> d.color);

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
    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * (35 * (Object.keys(d[1].attributes).length + 1))) +')');
    let pathBars = pathGroups.append('rect').classed('path-rect', true);//.style('fill', 'red');
    pathGroups.on('mouseover', function(d, i){
        return d3.select(this).classed('hover', true);
    }).on('mouseout', function(d, i){
        return d3.select(this).classed('hover', false)
    });

///DO NOT GET RID OF THIS> YOU NEED TO ADD SPECIES AND THEN ADD THIS BACK
/*
    let speciesTitle = pathGroups.append('text').text(d=> {
        let string = d[d.length - 1].label
        return string.charAt(0).toUpperCase() + string.slice(1);
    });

    speciesTitle.attr('x', 10).attr('y', 15);
*/

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

    return pathGroups;
}