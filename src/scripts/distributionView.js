import '../styles/index.scss';
import {formatAttributeData, maxTimeKeeper} from './dataFormat';
import * as d3 from "d3";
import {filterMaster, getLatestData, getScales} from './filterComponent';
import { pullPath, calculateMovingAverage } from './pathCalc';
import { renderTree } from './sidebarComponent';
import { chosenCladesGroup } from './cladeMaker';
import { updateMainView } from './viewControl';
import { calculatedScalesKeeper } from '.';

const dimensions = {
    height: 80,
    observedWidth : 200,
    predictedWidth : 900,
    margin : 20,
    squareDim : 15,
    timeRange: 895
}

const brushColors = [
    ['#64B5F6', '#F39C12'],
    ['#6A1B9A', '#FDD835'],
]

const compareColors = [{light: '#F8C471', dark: '#F39C12'}, {light: '#A3E4D7', dark: '#17A589'}]

const defaultBarColor = '#baaaaa'//#DCD4D4';

let colorBool = 0;
const selectedClades = [[]];

export function groupDistributions(pathData, mainDiv, groupAttr){

    let scales = getScales();

    let groupKeys = scales.filter(f=> f.field === groupAttr)[0].scales.map(s=> s.scaleName)
  
    let branchBinCount = d3.median(pathData.map(m=> m.length)) - d3.min(pathData.map(m=> m.length))
   
    let pathGroups = groupKeys.map(group => {
        let paths = pathData.filter(path => {
            return group.includes(path[path.length - 1].attributes[groupAttr].values[groupAttr]);
        });

        let groupBins = binGroups(paths, group, scales, branchBinCount);
        return {'label': group, 'paths': paths, 'groupBins': groupBins}
    });

    renderDistStructure(mainDiv, pathGroups);
}
export function binGroups(pathData, groupLabel, scales, branchCount){

    let attrHide = filterMaster.filter(f=> f.type === 'hide-attribute').map(m=> m.attribute);
    
    let keys = scales.map(s=> s.field).filter(f=> attrHide.indexOf(f) === -1);

    let newNormed = [...pathData];
    let keysToHide = attrHide.length > 0 ? scales.filter(f=> attrHide.indexOf(f.field) === -1).map(m=> m.field) : null;

    formatAttributeData(newNormed, scales, keysToHide);
  
    let max = maxTimeKeeper[0]

    let normBins = new Array(branchCount)
        .fill().map((m, i)=> {
            let step = max / branchCount;
            let base = (i * step);
            let top = ((i + 1)* step);
            return {'base': base, 'top': top, 'binI': i , 'step':step}
        });

    let internalNodes = newNormed.map(path => path.filter(node=> (node.leaf != true) && (node.root != true)));
    let leafNodes = newNormed.flatMap(path => path.filter(node=> node.leaf === true));
    let rootNodes = newNormed.flatMap(path => path.filter(node=> node.root === true));

    normBins.map((n, i)=> {
       
        let edges = internalNodes.flatMap(path => path.filter(node=> {
            return node.combLength > n.base && node.combLength <= n.top;
        } ));

        let nodeSet = [...new Set(edges.map(e=> e.node))].map(m=> edges.filter(f=> f.node === m)[0]);

        n.data = nodeSet.map(m=> {
            m.range = [...new Set(edges.map(e=> e.node))].length;
            return m;
        });

        return n;
    });

    let sortedBins = keys.map(key=> {
        let scale = scales.filter(f=> f.field === key)[0];
    
        let mapNorm = normBins.map(bin => {
            if(bin.data.length > 0){
                bin.fData = bin.data.map(d=> {
                    let attrib = d.attributes[key];
                    attrib.node = d.node;
                    return attrib;
                })
            }else{
                bin.fData = [];
            }
            return {'data': bin.fData, 'range': [bin.base, bin.top], 'index': bin.binI, 'key': key };
        });
       
        let leafAttr = leafNodes.map(m=> m.attributes[key]);
        let leafData = {'data': leafAttr};
   
        if(scale.type === 'continuous'){
            let x = d3.scaleLinear().domain([scale.min, scale.max]).range([0, dimensions.height]);
    
            let histogram = d3.histogram()
            .value(function(d) { return d.values.realVal; })  
            .domain(x.domain())  
            .thresholds(x.ticks(20)); 
  
            mapNorm.map((n, i, nodeArray)=> {
                n.type = scale.type;
                n.bins = histogram(n.data);
                n.domain = [scale.max, scale.min];
                n.bins.count = branchCount;
                n.bins.groupLabel = groupLabel;

                if(d3.mean(n.bins.map(m=> m.length)) === 0){
                    if(i === 0){
                        n.bins = histogram(rootNodes.map(m=> m.attributes[key]));
                        n.data = rootNodes.map(m=> m.attributes[key]);
                        n.bins.count = branchCount;
                    }else{
                        n.bins = nodeArray[i-1].bins;
                        n.data = nodeArray[i-1].data;
                    }
                }
                return n;
            });

            //Histogram for observed////
            let maxO = d3.max(leafAttr.flatMap(v=> +v.values.realVal));
            let minO = d3.min(leafAttr.flatMap(v=> +v.values.realVal));
            let xO = d3.scaleLinear().domain([minO, maxO]).range([0, dimensions.height]);

            let histogramO = d3.histogram()
            .value(function(d) { 
                return +d.values.realVal; })  
            .domain(xO.domain())  
            .thresholds(xO.ticks(20)); 

            leafData.bins = histogramO(leafAttr);
      
            let newK = {'key': key, 
                    'branches': [...mapNorm], 
                    'type': scale.type, 
                    'leafData': leafData, 
                    'rootData': rootNodes.map(m=> m.attributes[key])[0]}
   
            return newK;

        }else{
            //HANDLING DISCRETE//
            let states = leafAttr[0].scales.scales;
            let stateKeys = states[0].state? states.map(s=> s.state) : states.map(s=> s.scaleName);
          
            let rootNode = rootNodes[0].attributes[key]
            rootNode.bins = d3.entries(rootNodes[0].attributes[key].values).map(m=> {       
                let states = [{'state': m.key, 'value':m.value}];
                return {state: states, branchCount:branchCount, color : scale.stateColors.filter(f=> f.state === m.key)[0], max:80};
               });
            
            mapNorm.bins = null;
            leafData.bins = states.map(s=> {
                return leafAttr.filter(f=> s.scaleName.includes(f.states.state))});
   
            let y = d3.scaleLinear().domain([0, 1]).range([0, 40]);

            let histogram = d3.histogram()
                .value(function(d) { return d.value; })  
                .domain(y.domain())  
                .thresholds(y.ticks(10)); 
  
            mapNorm.map((n, i, nodeArray)=> {
                let colors = scale.stateColors;
                n.bins = stateKeys.map(state=> {
                    let test = n.data.flatMap(m=> Object.entries(m.values).filter(f=> f[0] === state))
                    .map(m=> {
                        return {'state': m[0], 'value':m[1]};
                    });
                    
                    return {state: test, branchCount:branchCount, histogram: histogram(test), color : colors.filter(f=> f.state === state)[0], max:80};
                });
                //IF WE DONT HAVE ANY BRANCHES< WE ASSUME THAT THEY ARE THE SAME AS THE PREVIOUS
                if(n.bins[0].state.length === 0){
                    if(i === 0){
                        n.bins = d3.entries(rootNode.values).map(m=> {
                            let histo = histogram([+m.value]).map(h=>{
                                if(m.value <= h.x1 && m.value >= h.x0){
                                    h.push(+m.value);
                                }
                                return h;
                             });
                             let states = [{'state': m.key, 'value':m.value}];
                             return {state: states, branchCount:branchCount, histogram: histo, color:colors.filter(f=> f.state === m.key)[0], max:80};
                            });
                        
                    }else{
                        n.bins = nodeArray[i-1].bins;
                    }
                }

                n.type = scale.type;
                return n;
            });

            let newK = {'key': key, 
                        'branches': [...mapNorm], 
                        'type': scale.type, 
                        'leafData': leafData, 
                        'rootData': rootNodes.map(m=> m.attributes[key])[0],
                        'stateKeys': stateKeys,
                        'maxCount': d3.max(mapNorm.map(n=> n.data.length)),
                    }
            return newK;
        }
    });

    sortedBins.group = groupLabel;
    sortedBins.branchCount = branchCount;
    sortedBins.keys = keys;
    return sortedBins;
}
export function drawBranchPointDistribution(data, svg){

    let branchBar = svg.append('g').classed('branch-bar', true);
    branchBar.attr('transform', 'translate(150, 0)')

    branchBar.append('rect').classed('point-dis-rect', true)
        .attr('height', 25)
        .attr('x', -10)
        .attr('y', -10)
       .attr('fill', 'none');

    let binWrap = branchBar.append('g').attr('transform', 'translate(115, -10)');

    branchBar.append('line')
        .attr('y1', 2)
        .attr('y2', 2)
        .attr('x1', '100')
        .attr('x2', dimensions.predictedWidth)
        .attr('stroke', 'gray')
        .attr('stroke-width', .25);

    branchBar.append('text').text('Root').attr('transform', 'translate(80, 7)');
    let leafLabel = branchBar.append('g').classed('leaf-label', true).attr('transform', `translate(${dimensions.predictedWidth + 200}, 7)`);
    leafLabel.append('text').text('Leaves');

    let nodeLengthArray = [];
    let nodeDuplicateCheck = [];

    data.paths.map(path=> {
        path.filter(n=> n.leaf != true).map(node=> {
            if(nodeDuplicateCheck.indexOf(node.node) == -1){
                nodeDuplicateCheck.push(node.node);
                nodeLengthArray.push({'node': node.node, 'eMove': node.combLength });
            }
        })
    });

    let bPointScale = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange]);
    let pointGroups = branchBar.selectAll('g.branch-points').data(nodeLengthArray)
        .join('g').attr('class', (d, i)=> d.node).classed('branch-points', true);

    pointGroups.attr('transform', (d, i) => {
        return `translate(${(115 + bPointScale(d.eMove))}, 0)`});
    pointGroups.append('circle').attr('r', 5).attr('fill', '#fff').attr('opacity', 0.5);

    let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange]);
    
    let binsRects = binWrap
        .selectAll('rect.bin')
        .data(data.groupBins[0].branches.map(m=> m.range))
        .join('rect')
        .classed('bin', true);

    binsRects.attr('width', (d, i, n)=> {
        return x(d[1]) - x(d[0]);
    }).attr('height', 20);

    binsRects.attr('transform', (d, i, n)=> {
        let step = x(d[1]) - x(d[0]);
        return `translate(${step*i},0)`});

    binsRects.attr('fill', 'gray').attr('stroke-width', 2).attr('stroke', 'white');

    let axis = d3.axisBottom(x);
    let axGroup = branchBar.append('g').call(axis);
    axGroup.attr('transform', 'translate(113, 10)');
    axGroup.select('path').attr('stroke-width', 0);

    return branchBar;
}
export function drawGroupLabels(pathData, svg, groupLabel){

    let leafNames = pathData[0].leafData.data.map(m=> m.node);
    let nodeNames = getLatestData().filter(f=> leafNames.indexOf(f[f.length - 1].node) > -1).flatMap(fl=> fl.map(m=> m.node));

    let shownAttributes = d3.select('#attribute-show').selectAll('input').filter((f, i, n)=> n[i].checked === true).data();

    let cladeLabel = svg.append('g').classed('clade-label', true).attr('transform', 'translate(10, 0)');
    cladeLabel.append('rect')
        .attr('width', 50)
        .attr('height', (pathData.keys.length * (dimensions.height+ 15)))
        .attr('fill', 'gray')
        .style('opacity', 0.2)
        .on('mouseover', (d, i)=>{
            let treeNode  = d3.select('#sidebar').selectAll('.node');
            let treeLinks  = d3.select('#sidebar').selectAll('.link');
            treeNode.filter(f=> {
                return nodeNames.indexOf(f.data.node) > -1;
            }).classed('hover clade', true);
        
        treeLinks.filter(f=> {
            return nodeNames.indexOf(f.data.node) > -1;
        }).classed('hover clade', true);

        let species = d.paths.map(m=> m[m.length - 1].label);
        }).on('mouseout', (d, i)=> {
            let treeNode  = d3.select('#sidebar').selectAll('.node');
            let treeLinks  = d3.select('#sidebar').selectAll('.link');
            treeNode.classed('hover clade', false);
            treeLinks.classed('hover clade', false);
        });

    cladeLabel.append('text').text(d=> d.label)
    .style('text-anchor', 'middle')
    .attr('transform', `translate(23, ${(shownAttributes.length * (dimensions.height+ 15)/2)}), rotate(-90)`);

    return cladeLabel;
}
/**
 * 
 * @param {*} mainDiv 
 * @param {*} pathGroups 
 */
export async function renderDistStructure(mainDiv, pathGroups){

    let compareTooltipFlag = false;
   
    let shownAttributes = d3.select('#attribute-show').selectAll('input').filter((f, i, n)=> n[i].checked === true).data();
   
    let groupWrap = mainDiv.append('div').attr('id', 'summary-view');
    let groupDivs = groupWrap.selectAll('.group-div').data(pathGroups).join('div').classed('group-div', true);

    groupDivs.each((d, i, node)=> {

       let filteredAttributes = d.groupBins.filter(f=> shownAttributes.indexOf(f.key) > -1);

        let group = d3.select(node[i]);
        group.classed(d.label, true);
        group.style('text-align', 'center');
        group.append('text').text(d.label);
        group.append('text').text(` : ${d.paths.length} Paths` );

        //////Starting something new/////
        let svg = group.append('svg');
        svg.attr('class', 'main-summary-view');
        svg.attr('id', `${d.label}-svg`);
        svg.attr('height', (shownAttributes.length * (dimensions.height + 5))+ 50);
    
        let branchBar = drawBranchPointDistribution(d, svg);
        branchBar.attr('transform', 'translate(55, 10)');
    
        let branchScale = d3.scaleLinear().domain([0, d.groupBins.branchCount]).range([0, dimensions.timeRange]);
        let pointGroups = branchBar.selectAll('g.branch-points');
      
        let wrap = svg.append('g').classed('summary-wrapper', true);
        wrap.attr('transform', 'translate(70, 50)');
    
        let binnedWrap = wrap.selectAll('.attr-wrap').data(filteredAttributes).join('g').attr('class', d=> d.key + ' attr-wrap');
    
        binnedWrap.attr('transform', (d, i, n)=>  {
                if(i === 0){
                    return 'translate(0,0)';
                }else{
                    let selected = d3.selectAll(n).filter((f, j)=>j < i).data();
                    let sum = d3.sum(selected.flatMap(s=> s.type === 'continuous'? dimensions.height+5 : (s.stateKeys.length*(dimensions.squareDim+4))));
                    d.sum = sum;
                    return `translate(0, ${sum})`;
                }
        });

        let label = binnedWrap.append('text')
        .text(d=> d.key);

        label.filter(f=> f.type === 'continuous')
        .attr('y', 40)
        .attr('x', 80)
        .style('text-anchor', 'end')
        .style('font-size', 11);

        label.filter(f=> f.type === 'discrete')
        .attr('y', (d, i)=> 3)
        .attr('x', d=> -((d.stateKeys.length)*(dimensions.squareDim)/2))
        .style('text-anchor', 'middle')
        .style('font-size', 11)
        .attr('transform', 'rotate(-90)');
    
        let groupLabelBars = drawGroupLabels(d.groupBins, svg, d.label);
        groupLabelBars.on('click', (d, i, n)=> {
            if(compareTooltipFlag){
                compareTooltipFlag = false;
                d3.select("#compare-tooltip").classed("hidden", true);
            }else{
                compareTooltipFlag = true;
                d3.select("#compare-tooltip")
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
                    .select("#value")
                    .text(d.node);

                d3.select("#compare-tooltip").classed("hidden", false);
                d3.select('#select-for-compare').on('click', ()=> {

                    compareTooltipFlag = false;
                    d3.select("#compare-tooltip").classed("hidden", true);
                    d3.select(n[i]).select('rect').attr('fill', '#F5B041');

                    selectedClades[selectedClades.length - 1].push(Object.assign({},d));
                    if(selectedClades[selectedClades.length - 1].length > 1){
                        mainDiv.selectAll('*').remove();
                        mainDiv.select('#compare-wrap').remove();
                      
                        renderDistributionComparison(mainDiv, selectedClades[selectedClades.length - 1], branchScale);
                    }
                });
            }
        });
           
        return renderDistibutions(binnedWrap, branchScale, pointGroups);
    });
}

function renderDistributionComparison(div, data, branchScale){


    let shownAttributes = d3.select('#attribute-show').selectAll('input').filter((f, i, n)=> n[i].checked === true).data();
  
    let divWrap = div.append('div').attr('id', 'compare-wrap');

    let groupHeader = divWrap.append('div').classed('compare-header', true).style('margin', 'auto');

    let textDiv = groupHeader.append('div').attr('height', 50).attr('width', 200).style('margin-left', '460px');
    let branchPointSvg  = groupHeader.append('svg');

    let pointData = {paths: data[0].paths.concat(data[1].paths), groupBins: data[0].groupBins};
    let branchBar = drawBranchPointDistribution(pointData, branchPointSvg);
    branchBar.attr('transform', 'translate(-30, 10)');

    //'#DCD4D4'

    branchBar.selectAll('rect.bin').attr('stroke', '#fff').attr('stroke-width', '3px');
    let pointGroups = branchBar.selectAll('g.branch-points');
  
    let xOut = groupHeader.append('div')
    .style('position', 'absolute')
    .style('left', '5px')
    .style('top', '65px')
    .append('i')
    .classed('close fas fa-times', true)
    .style('padding-left', '10px');
    
    xOut.on('click', (d, i, n)=> {
        divWrap.remove();
        selectedClades.push(new Array());
        console.log('chosenclades',chosenCladesGroup)

        let test = d3.select('#clade-show').selectAll('li').selectAll('input').filter((f, j, li)=> {
            return li[j].checked === true});

        let groups = test.data().map((m=> {
            let names = m.nodes.map(path => path[path.length - 1].node);
            let data = getLatestData().filter(path => names.indexOf(path[path.length - 1].node) > -1);
                
            let group = binGroups(data, m.field, calculatedScalesKeeper[0], 8);
            return {'label': m.field, 'paths': data, 'groupBins': group};
        }));
        console.log('test', groups)
        d3.select('#summary-view').remove();
        renderDistStructure(d3.select('#main'), groups);  
       // updateMainView('Summary View', chosenCladesGroup[chosenCladesGroup.length-1].groups);
        d3.select('#sidebar').selectAll('.node').remove();
        d3.select('#sidebar').selectAll('.link').remove();
        // renderTree(d3.select('#sidebar'), null, true);
    });

    if(data.length > 1){
//ADD THIS BACK IN//

        d3.select('#toolbar').selectAll('.brush-span').remove();
       
        let selectedNodes = Array.from(new Set(data.flatMap(f=> f.paths).flatMap(p=> p.map(m=> m.node))));
   
        let testNodes = d3.select('#sidebar').selectAll('.node').filter(f=> selectedNodes.indexOf(f.data.node) === -1);
        let testLinks = d3.select('#sidebar').selectAll('.link').filter(f=> selectedNodes.indexOf(f.data.node) === -1);

        testNodes.attr('opacity', 0.3)
        testLinks.attr('opacity', 0.3)

        let pathsListOne = Array.from(new Set(data[0].paths.flatMap(p=> p.map(m=> m.node))));
        let pathsListTwo = Array.from(new Set(data[1].paths.flatMap(p=> p.map(m=> m.node))));

        let testNodesOne = d3.select('#sidebar').selectAll('.node').filter(f=> pathsListOne.indexOf(f.data.node) > -1);
        let testLinksOne = d3.select('#sidebar').selectAll('.link').filter(f=> pathsListOne.indexOf(f.data.node) > -1);

        testNodesOne.attr('opacity', .8).selectAll('circle').attr('fill', compareColors[0].dark)
        testLinksOne.attr('opacity', .8).style('stroke', compareColors[0].dark)

        let testNodesTwo = d3.select('#sidebar').selectAll('.node').filter(f=> pathsListTwo.indexOf(f.data.node) > -1);
        let testLinksTwo = d3.select('#sidebar').selectAll('.link').filter(f=> pathsListTwo.indexOf(f.data.node) > -1);

        testNodesTwo.attr('opacity', .8).selectAll('circle').attr('fill', compareColors[1].dark)
        testLinksTwo.attr('opacity', .8).style('stroke', compareColors[1].dark)

        textDiv.append('i')
        .classed('fas fa-arrow-left', true)
        .style('margin-right', '10px');

        data.forEach((d, i)=> {
        textDiv.append('span')
            .text(d.label)
            .classed('badge badge-secondary', true)
            .style('padding', '5px')
            .style('margin-bottom', '7px')
            .style('background', compareColors[i].light)
        });

        textDiv.append('i')
        .classed('fas fa-arrow-right', true)
        .style('margin-left', '10px');
        
    }
    let svg = divWrap.append('svg').attr('class', 'compare-svg').style('padding-top', '50px');

    ////COMBINEDATA///
    if(data.length > 1){
       
        let startBins = data[0].groupBins.filter(f=> shownAttributes.indexOf(f.key) > -1);
        let mapBins = data[1].groupBins.filter(f=> shownAttributes.indexOf(f.key) > -1);
        let combined = startBins.map((d, i, n)=> {
         
            d.branches = [...d.branches].map((b, j)=> {
                
                b.bins = [{key:data[0].label, value: b.bins, index:0},
                          {key:data[1].label, value: mapBins[i].branches[j].bins, index:1}
                         ];
             
                b.data = [{key: data[0].label, 
                            value: b.data.map(m=>{
                                    m.groupKey = data[0].label;
                                    m.index = 0;
                                    return m;
                                    }), 
                            index: 0},
                        
                        { key: data[1].label, 
                            value : mapBins[i].branches[j].data.map(m=> {
                                    m.groupKey = data[1].label;
                                    m.index = 1;
                                    return m;
                            }), 
                         index: 1 }];
                return b;
            });
          
           if(d.type === 'continuous'){

            d.leafData.data = [{key: data[0].label, 
                value: d.leafData.data.map(m=>{
                        m.groupKey = data[0].label;
                        m.index = 0;
                        return m;
                        }), 
                index: 0},
            
            { key: data[1].label, 
                value : mapBins[i].leafData.data.map(m=> {
                        m.groupKey = data[1].label;
                        m.index = 1;
                        return m;
                }), 
             index: 1 }];

             d.leafData.bins = [{key:data[0].label, value: d.leafData.bins, index:0},
             {key:data[1].label, value: mapBins[i].leafData.bins, index:1}
                ];



           }else{

            d.leafData.data = [{key: data[0].label, 
                value: d.leafData.data.map(m=>{
                        m.groupKey = data[0].label;
                        m.index = 0;
                        return m;
                        }), 
                index: 0},
            
            { key: data[1].label, 
                value : mapBins[i].leafData.data.map(m=> {
                        m.groupKey = data[1].label;
                        m.index = 1;
                        return m;
                }), 
             index: 1 }];

             d.leafData.bins = [
                {key:data[0].label, keys: d.stateKeys, value: d.leafData.bins, index:0},
                {key:data[1].label, keys: d.stateKeys, value: mapBins[i].leafData.bins, index:1}
                ];
           }
            return d;
        });

        let wrap = svg.append('g').attr('class', 'group-wrap').attr('transform', 'translate(30, 10)');
        let binnedWrap = wrap.selectAll('.attr-wrap').data(combined).join('g').classed('attr-wrap', true);
        svg.attr('height', (combined.length * (dimensions.height + 5)));
        
        binnedWrap.attr('transform', (d, i, n)=>  {
            if(i === 0){
                    return 'translate(0,0)';
            }else{
                let selected = d3.selectAll(n).filter((f, j)=>j < i).data();
                let sum = d3.sum(selected.flatMap(s=> s.type === 'continuous'? dimensions.height+5 : (s.stateKeys.length*(dimensions.squareDim+4))));
                d.sum = sum;
                return `translate(0, ${sum})`;
            }
        });

        let label = binnedWrap.append('text')
            .text(d=> d.key);
    
            label.filter(f=> f.type === 'continuous')
            .attr('y', 40)
            .attr('x', 80)
            .style('text-anchor', 'end')
            .style('font-size', 11);
    
            label.filter(f=> f.type === 'discrete')
            .attr('y', (d, i)=> 3)
            .attr('x', d=> -((d.stateKeys.length)*(dimensions.squareDim)/2))
            .style('text-anchor', 'middle')
            .style('font-size', 11)
            .attr('transform', 'rotate(-90)');

        /////FROM DISCRETE DRAW

        let predictedWrap = binnedWrap.append('g').classed('predicted', true);
        predictedWrap.attr('transform', 'translate(25, 0)');
        predictedWrap.filter(f=> f.type === 'discrete').append('g').classed('win-line', true);

        //ROOT RENDERING
        let root = predictedWrap.selectAll('g.root').data(d=> {
            return [d.rootData]}).join('g').classed('root', true);
        root.attr('transform', `translate(60,0)`);

        let contRoot = root.filter(f=> f.type === "continuous");
        contRoot.append('rect')
            .attr('height', dimensions.height)
            .attr('width', 12)
            .attr('fill', '#fff')
            .style('stroke-width', '0.5px')
            .style('stroke', 'black')
    
        let rootRange = contRoot.append('rect')
            .attr('width', 12)
            .attr('height', d=> {
                let newy = d.scales.yScale;
                newy.range([(dimensions.height - 5), 0]);
                return newy(d.values.lowerCI95) - newy(+d.values.upperCI95)
            }).attr('transform', (d, i) => {
                let newy = d.scales.yScale;
                newy.range([(dimensions.height - 5), 0]);
                return 'translate(0,'+newy(+d.values.upperCI95)+')'
            }).style('opacity', 0.5)//.attr('fill', "rgba(133, 193, 233)")
            .attr('fill', defaultBarColor);
    
        let rootAv = contRoot.append('rect').attr('width', 12).attr('height', 3);
        
        rootAv.attr('transform', (d, i) => {
                let newy = d.scales.yScale;
                newy.range([dimensions.height, 0]);
                let mean = +d.values.realVal;
                return 'translate(0,'+newy(mean)+')';
        }).attr('fill', '#004573');
    
           // Discrete Root
        let disRoot = root.filter(f=> f.type === "discrete");
        let rootStateGroups = disRoot.selectAll('g.root-state-groups').data(d=> {
            return d.bins}).join('g').classed('root-state-groups', true);
    
        rootStateGroups.append('text')
            .text((d, i)=> d.color.state)
            .attr('y', 10)
            .attr('x', -3)
            .style('font-size', 10)
            .style('text-anchor', 'end');
    
        rootStateGroups.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(dimensions.squareDim+2))})`);
        rootStateGroups.append('rect')
            .attr('height', dimensions.squareDim)
            .attr('width', dimensions.squareDim)
            .attr('fill', '#fff').attr('opacity', 1);
    
        let rootRects = rootStateGroups.append('rect')
            .classed('color-rect', true)
            .attr('height', dimensions.squareDim)
            .attr('width', dimensions.squareDim);
    
        rootRects.attr('fill', (d, i)=> {
                return `rgba(89, 91, 101, ${d.state[0].value})`;
            }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);
    
        let winStateRoot = disRoot.selectAll('g.root-state-groups')
            .filter((f, j, n)=>{
                let maxVal = d3.max(d3.selectAll(n).data().map(m=> m.state[0].value));
                return f.color.state === d3.selectAll(n).data().filter(m=> m.state[0].value === maxVal)[0].color.state;
            }).classed('win', true);
    
        winStateRoot.select('rect.color-rect').attr('fill', (c, i)=> {
                return c.color.color;
            }).attr('opacity', (c)=>{
                let sum = d3.sum(c.state.flatMap(s=> s.value));
                return sum/c.state.length;
            });

        ////BRANCHES
        let branchGroup = predictedWrap.selectAll('g.branch-bin').data(d=> {
            return d.branches}).join('g').classed('branch-bin', true);
    
        branchGroup.attr('transform', (d, i, n)=> {
            let step = n.length < 11 ? (d.range[1] - d.range[0]) / 5 : 0
            let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange])
                return 'translate('+(100 + (branchScale(i)) + x(step)) +', 0)'});

        let discreteDist = branchGroup.filter(f=> f.type === 'discrete').append('g');

        discreteDist.attr('transform', 'translate(5, 0)');

        let discreteMiddleGroups = discreteDist.selectAll('g.middle-group')
            .data(d=> {
                let bins = d.bins.map(b=> {
                    b.key = d.key;
                    return b;
                })
                return bins})
            .join('g')
            .classed('middle-group', true)
            .attr('transform', (d, i)=> { 
                let move = d.index === 0 ? -(dimensions.squareDim/2) : 0 ;
                return `translate(${move}, 0)`});

        let stateRects = discreteMiddleGroups
        .selectAll('rect.state-rect')
        .data(d=> {
            let bins = d.value.map(v=> {
                v.key = d.key;
                return v;
            })
            return bins})
        .join('rect')
        .classed('state-rect', true)
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim/2);

        stateRects.attr('fill', (d, i, n)=> {
            let sum = d3.sum(d.state.map(m=> m.value))
            let av = sum / d.state.length;
            let scale = d3.scaleLinear().domain([0, 1]).range([0, 1]);
            return `rgba(89, 91, 101, ${scale(av)})`;
        }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);

        stateRects.attr('transform', (d, i)=> {
            return `translate(0, ${(3.5+(i*(dimensions.squareDim+2)))})`
        });

        let discreteBinGroups = discreteDist.selectAll('g.group')
                .data(d=> d.bins)
                .join('g')
                .classed('group', true)
                .attr('transform', (d, i)=> { 
                    let move = d.index === 0 ? (-40 - (dimensions.squareDim/2)) : (dimensions.squareDim/2)
                    return `translate(${move}, 0)`});

        let stateBarsPredicted = discreteBinGroups.selectAll('g.histo-bars')
            .data(d=> {
                let binvalue = d.value.map(v=> {
                    v.index = d.index;
                    return v;
                })
            return binvalue}).join('g')
        .classed('histo-bars', true);

        stateBarsPredicted.attr('transform', (d, i)=> {
            let dev = d3.deviation(d.state.map(m=> m.value));
            let mean = d3.mean(d.state.map(m=> m.value));
            let x = d3.scaleLinear().domain([0, 1]).range([0, 40]).clamp(true);
            let xMove = d.index === 0 ? (40 - x(mean)) : 0;
            return `translate(${xMove}, ${3.5+(i*(dimensions.squareDim+2))})`
        });

        let bars = stateBarsPredicted.append('rect')
            .attr('height', dimensions.squareDim)
            .attr('width', (d, i, n)=> {
        let dev = d3.deviation(d.state.map(m=> m.value));
        let mean = d3.mean(d.state.map(m=> m.value));
        let x = d3.scaleLinear().domain([0, 1]).range([0, 40]).clamp(true);
            return x(mean)
        })
        .attr('fill', d=> d.color.color)
        .attr('opacity', 0.3);

        stateRects.on('mouseover', (d, i, n)=> {
           
            let sum = d3.sum(d.state.map(m=> m.value))
            let av = sum / d.state.length;
            let tool = d3.select('#tooltip');
            tool.transition()
                .duration(200)
                .style("opacity", .9);
            
            let f = d3.format(".3f");
              
            tool.html(`${d.key} </br> ${d.state[0].state} : ${f(av)}`)
                .style("left", (d3.event.pageX - 40) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            tool.style('height', 'auto');
    
        }).on('mouseout', ()=>{
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
        });

        discreteMiddleGroups.each((d, i, node)=>{
            let maxBin = 0;
            let maxState = null;
            d.value.map(m=> {
                if(d3.sum(m.state.flatMap(s=> s.value)) > maxBin){
                    maxBin = d3.sum(m.state.flatMap(s=> s.value));
                    maxState = m.color.state;
                }
            });
      
            let winStates = d3.select(node[i]).selectAll('rect.state-rect')
                .filter((f, j, n)=>{
                    return f.color.state === maxState;
                }).classed('win', true)
                .attr('fill', (c)=> {
                    return c.color.color;
                }).attr('opacity', (c)=>{
                    let sum = d3.sum(c.state.flatMap(s=> s.value));
                    return sum/c.state.length;
                })
        });
    
        //////PREDICTED CONTINUOUS

          //CONTIN PREDICTED
        let continDist = branchGroup.filter(f=> f.type === 'continuous');

        continDist.on('mouseover', (d, i, node)=> {
            let newData = d.data;
            let list = newData[0].value.concat(newData[1].value).map(m=> m.node);
            let selected = pointGroups.filter(p=> {
                return list.indexOf(p.node) > -1}).classed('selected', true);
            let treeNode  = d3.select('#sidebar').selectAll('.node');
            let selectedBranch = treeNode.filter(f=> list.indexOf(f.data.node) > -1).classed('selected-branch', true);
            let y = d3.scaleLinear().domain(d.domain).range([0, dimensions.height])
            let axis = d3.select(node[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5));
        }).on('mouseout', (d, i, node)=> {
            d3.selectAll(".branch-points.selected").classed('selected', false);
            d3.selectAll('.selected-branch').classed('selected-branch', false);
            d3.select(node[i]).select('.y-axis').remove();
        });

        let continBinGroups = continDist.selectAll('g.group').data(d=> {
            return d.bins;
        }).join('g').attr('class', d=> `g-${d.index} group`)//.classed('group', true);

        continBinGroups.each((d, i, nodes)=> {
            d.maxCount = d3.sum(d.value.map(m=> m.length));
            d.value.maxCount = d3.sum(d.value.map(m=> m.length));
            let distrib = d3.select(nodes[i])
                .selectAll('g')
                .data([d.value.map(v=> {
                    v.maxCount = d3.sum(d.value.map(m=> m.length))
                    v.index = d.index;
                    return v;
                })])
                .join('g')
                .classed('distribution', true);
            distrib.attr('transform', (d,i,n)=> {
                if(d[0].index === 0){
                    return 'translate(0, 0) rotate(90)'
                }else{
                    return 'translate(11, '+dimensions.height+') rotate(-90)'
                }
               });
            let path = distrib.append('path').attr('d', d.index === 0 ? mirrorlineGen : lineGen);
            path.attr("fill", (v, i, n)=> {
                return defaultBarColor})
            .attr('opacity', 0.4)
            .style('stroke', compareColors[d.index].dark);
        });

        let contRect = continBinGroups.append('rect')
        .attr('height', dimensions.height)
        .attr('width', 10)
        .style('fill', '#fff')
        .style('stroke', 'gray');

    let rangeRectWrap = continDist.selectAll('g.range-wrap').data(d=> {
        return d.data;
    }).join('g').classed('range-wrap', true);
    
    let rangeRect = rangeRectWrap.selectAll('rect.range').data((d,i)=> {
        let newData = d.value.map(m=> {
            m.range = d.range;
            m.gindex = i;
            return m;
        })
        return newData;
    }).join('rect').classed('range', true);

    let avRect = continDist.selectAll('rect.av-rect').data(d=> d.data)
        .join('rect').classed('av-rect', true).attr('width', 10).attr('height', (d, i)=> {
        if(d.value != undefined){
            return 3;
        }else{
            return 0;
        }
    });
    
    avRect.attr('transform', (d, i) => {
        if(d.value != undefined){
            let newy = d.value[0].scales.yScale;
            newy.range([dimensions.height, 0]);
            let mean = d3.mean(d.value.map(m=> +m.values.realVal));
            return 'translate(0,'+newy(mean)+')';
        }else{
            return 'translate(0,0)';
        }
    }).attr('fill', (d)=>compareColors[d.index].dark);

     //////START BRANCH EXPERIMENT
     let brush = d3.brushY().extent([[0, 0], [20, dimensions.height]])
     brush.on('end', brushedComparison);

     continDist.append("g")
     .classed('continuous-branch-brush', true)
     .attr("class", "brush")
     .call(brush);

     //////BRUSH FOR COMPARISON/////

     function brushedComparison(){

        let data = d3.select(this.parentNode).data()[0]

        let maxCounts = data.bins.map(m => m.maxCount);
       
        var s = d3.event.selection;
        var zero = d3.format(".3n");
    
        let index = d3.select('#toolbar').selectAll('.brush-span').size();
        let classLabel = index === 0 ? 'one' : 'two';
    
        if(s != null){
            let treeTest = d3.select('#sidebar').selectAll('.node').filter(f=> {
                return f.data.leaf === true});
    
            
            let y = d3.scaleLinear().domain([data.domain[0], data.domain[1]]).range([0, dimensions.height])
            let attribute = data.key;
            let brushedVal = [y.invert(s[1]), y.invert(s[0])];
    
            let treeNode  = d3.select('#sidebar').selectAll('.node');

            let nodes = data.data.map(m=> m.value.filter(f=> {
                return (f.values.realVal >= brushedVal[0]) && (f.values.realVal <= brushedVal[1]);
            }));


            let otherBins = continDist.filter(f=> f.index === data.index && f.key != data.key);

            let descendBins = continDist.filter(f=> {
                return (f.index > data.index) && (f.key === data.key)});
                
    
            nodes.forEach((n, i)=> {
               
                if(n.length > 0){
                    let test = d3.select(this.parentNode).select(`.g-${i}`)
                    let groupDis = test.append('g').classed('distribution-too', true);
                    
                    let histo = continuousHistogram(n)
                    histo.maxCount = maxCounts[i];

                    let names = n.map(m=> m.node);
                   
                    groupDis
                    .data([histo]);

                    groupDis.append('path')
                    .attr('d', i === 0 ? mirrorlineGen : lineGen)
                    .style('stroke', compareColors[i].dark)
                    .style('fill', compareColors[i].light)
                    .style('fill-opacity', 0.8);

                    groupDis.attr('transform', i === 0 ? 'translate(0, 0) rotate(90)' : `translate(11, ${dimensions.height}) rotate(-90)`);
                    let otherDis = otherBins
                    .select(`.g-${i}`).each((o, j, oNode)=> {
                        let oHisto = continuousHistogram(o.data.filter(f=> f.index === i)[0].value.filter(f=> names.indexOf(f.node) > -1));
                        oHisto.maxCount = o.bins[i].maxCount;
                        let oDist = d3.select(oNode[j]).append('g').classed('distribution-too', true);
                        oDist.data([oHisto])
                        .append('path')
                        .attr('d', i === 0 ? mirrorlineGen : lineGen)
                        .style('stroke', compareColors[i].dark)
                        .style('fill', compareColors[i].light)
                        .style('fill-opacity', 0.8);
                        oDist.attr('transform', i === 0 ? 'translate(0, 0) rotate(90)' : `translate(11, ${dimensions.height}) rotate(-90)`);
                    });

                    let otherDesDis = descendBins
                    .select(`.g-${i}`).each((o, j, oNode)=> {

                        let oHisto = continuousHistogram(o.data.filter(f=> f.index === i)[0].value
                                    .filter(f=> (f.values.realVal > brushedVal[0]) && (f.values.realVal < brushedVal[1])));
                        oHisto.maxCount = o.bins[i].maxCount;

                        let oDist = d3.select(oNode[j]).append('g').classed('distribution-too', true);
                        oDist.data([oHisto])
                        .append('path')
                        .attr('d', i === 0 ? mirrorlineGen : lineGen)
                        .style('stroke', compareColors[i].dark)
                        .style('fill', compareColors[i].light)
                        .style('fill-opacity', 0.8);
                        oDist.attr('transform', i === 0 ? 'translate(0, 0) rotate(90)' : `translate(11, ${dimensions.height}) rotate(-90)`);

                    });
                  
                }
            });

             let nodesFlat = data.data.flatMap(m=> m.value.filter(f=> {
                return (f.values.realVal >= brushedVal[0]) && (f.values.realVal <= brushedVal[1]);
            }));

           
            let notNodes = data.data.flatMap(m=> m.value.filter(f=> {
                return (f.values.realVal < brushedVal[0]) || (f.values.realVal > brushedVal[1]);
            }));
    
            let selectedNodes = brushedNodes(nodesFlat, notNodes, data, brushedVal, classLabel);
            let selectedBranch = selectedNodes[0];
            let secondGrp = selectedNodes[1];
            let antiSelected = selectedNodes[2];
            let antiSecond = selectedNodes[3];
    
            if(index < 2){
                let doesItExist = d3.select('#toolbar').selectAll('.brush-span').filter((f, i, n)=> {
                    return d3.select(n[i]).attr('value') == `${data.bins.groupLabel}-${data.key}`;
                });
    
                if(doesItExist.size() === 0){
    
                    d3.select(this).select('.selection')
                    .style('fill', `${brushColors[index][0]}`)
                    .attr('stroke', `${brushColors[index][0]}`)
                    .attr('stroke-width', 2);
    
                    d3.select(this).select('.overlay')
                    .attr('stroke', brushColors[index][1])
                    .attr('stroke-width', 2);
    
                    let badge = d3.select('#toolbar')
                        .append('span')
                        .attr('class', classLabel)
                        .attr('id', classLabel)
                        .classed('brush-span', true)
                        .classed(`${data.bins.groupLabel}`, true)
                        .classed('badge badge-secondary', true)
                        .style('background', brushColors[index][0])
                        .attr('value', `${data.bins.groupLabel}-${data.key}`)
                        .datum({brush:this, nodes: nodes})
                        .text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
    
                    let xOut = badge.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
                    xOut.on('click', (d, i, n)=> {
                        let classy = index === 0 ? 'one' : 'two';
                        
                        d3.select(d.brush).call(brush.move, null);
                        d3.select(n[i].parentNode).remove();
                        d3.select(d.brush).select('.overlay').attr('stroke-width', 0);
                        descendBins.selectAll('.distribution-too').remove();
                        otherBins.selectAll('.distribution-too').remove();
                        d3.select(d.brush.parentNode).selectAll('.distribution-too').remove();
                        d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed-second', false);
                        d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed', false);
                    });
    
                }else{

                    doesItExist.text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
                    let xOut = doesItExist.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
                    xOut.on('click', (d, i, n)=> {
                        d3.select(d).call(brush.move, null);
                        d3.select(d).select('.overlay').attr('stroke-width', 0);
                        d3.select(n[i].parentNode).remove();
                    });
                   
                    d3.select(doesItExist.datum()).call(brush.move, null);
                    d3.select(doesItExist.datum()).select('.overlay').attr('stroke-width', 0)
    
                    treeNode.selectAll(`.${data.key}`)
                        .selectAll(`${data.bins.groupLabel}`)
                        .selectAll('.second-branch')
                        .classed('second-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                    treeNode.selectAll(`.${data.key}`)
                        .selectAll('.selected-branch')
                        .classed('selected-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                        treeNode.selectAll(`.${data.key}`)
                        .selectAll('.anti-brushed-second')
                        .classed('anti-brushed-second', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                        treeNode.selectAll(`.${data.key}`)
                        .selectAll('.anti-brushed-branch')
                        .classed('anti-brushed-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
    
                    let label = doesItExist.attr('id');
    
                    index = label === 'one' ? 0 : 1;
    
                    d3.select(this).select('.selection')
                        .style('fill', `${brushColors[index][0]}`)
                        .attr('stroke', `${brushColors[index][0]}`)
                        .attr('stroke-width', 2);
    
                    d3.select(this).select('.overlay')
                        .attr('stroke', brushColors[index][1])
                        .attr('stroke-width', 2);

                        let nodes = data.data.flatMap(m=> m.value.filter(f=> {
                            return (f.values.realVal >= brushedVal[0]) && (f.values.realVal <= brushedVal[1]);
                        }))
                       
                        let notNodes = data.data.flatMap(m=> m.value.filter(f=> {
                            return (f.values.realVal < brushedVal[0]) || (f.values.realVal > brushedVal[1]);
                        }));

                        doesItExist.datum({brush: this, nodes: nodes})
    
                        brushedNodes(nodes, notNodes, data, brushedVal, label);
                    
                }
    
            }else{
    
                d3.select('#toolbar').selectAll('.brush-span').filter((f, i)=> i === 0).remove();
    
                let classLabel = colorBool === 0 ? 'one': 'two';
    
                d3.select('#toolbar')
                    .append('span')
                    .attr('class', )
                    .classed('brush-span', true)
                    .classed('badge badge-secondary', true)
                    .style('background', brushColors[colorBool][0])
                    .attr('value', `${data.bins.groupLabel}-${data.key}`)
                    .text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);

                colorBool === 0 ? colorBool = 1 : colorBool = 0;
                secondGrp.classed(classLabel, true);
                selectedBranch.classed(classLabel, true);
            }
    
        }else{
            d3.selectAll(`.${data.key}.brushed-branch`).classed('brushed-branch', false);
            d3.selectAll(`.${data.key}.brushed-second`).classed('brushed-second', false);
        }
     }
    

    ///OBSERVED/////
    let observedWrap = binnedWrap.append('g').classed('observed', true);
    observedWrap.attr('transform', (d, i, n)=> {
        return 'translate('+ (dimensions.predictedWidth + 150) +', 0)'});

    ////OBSERVED CONTIUOUS/////
    let contOb = observedWrap.filter(f=> f.type === 'continuous');
    contOb.attr('transform', `translate(${dimensions.predictedWidth + 160}, -15)`);

    let compContGroups = contOb.selectAll('g.cont-groups').data(d=> d.leafData.bins).join('g').classed('cont-groups', true);

    let contBars = compContGroups.selectAll('g.ob-bars').data(d=> {
        let value = d.value.map(m=> {
            m.index = d.index;
            return m;
        });
        return value}).join('g').classed('ob-bars', true);

    let cRects = contBars.append('rect').attr('width', (d, i, n)=> {
        let width = dimensions.observedWidth / n.length;
        return width;
    }).attr('height', (d, i)=> {
        let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(dimensions.height - dimensions.margin), 0])
        return y(Object.keys(d).length - 2)
    })
    .attr('fill', d=> compareColors[d.index].light).attr('fill-opacity', .4);

    contBars.attr('transform', (d, i, n)=> {
        let movex = dimensions.observedWidth / n.length;
        let y = d3.scaleLinear()
            .domain([0, Object.keys(d).length])
            .range([(dimensions.height - dimensions.margin), 0]);

     let movey = dimensions.height - y(Object.keys(d).length - 2);
     return 'translate('+(movex * i)+', '+movey+')'});

 contOb.each((d, i, nodes)=> {

     let xvalues = d.leafData.data[0].value.map(m=> {
         return +m.values.realVal});
     let x = d3.scaleLinear()
         .domain([d3.min(xvalues), d3.max(xvalues)])
         .range([0, dimensions.observedWidth]);

     let y = d3.scaleLinear()
         .domain([0, d3.max(d.leafData.bins[0].value.map(b=> Object.keys(b).length)) - 2])
         .range([(dimensions.height - dimensions.margin), 0]);
     
     d3.select(nodes[i])
         .append('g')
         .classed('x-axis', true)
         .call(d3.axisBottom(x))
         .attr('transform', 'translate(0, '+dimensions.height+')')

     d3.select(nodes[i]).append('g')
         .classed('y-axis', true)
         .call(d3.axisLeft(y).ticks(4))
         .attr('transform', 'translate(0, '+dimensions.margin+')');

         d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
         d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');

         d3.select(nodes[i])
         .append('g')
         .classed('x-axis-label', true)
         .append('text').text('Frequency')
         .attr('transform', `translate(-20, ${dimensions.height- 10}) rotate(-90)`)
         .style('font-size', '10px');
 });
 
        ////Observed Discrete////
        let discOb =  observedWrap.filter(f=> f.type === 'discrete');

        discOb.attr('transform', `translate(${dimensions.predictedWidth + 160}, 5)`);

        let compDisGroups = discOb.selectAll('g.dis-groups').data(d=> d.leafData.bins).join('g').classed('dis-groups', true);

        let discBars = compDisGroups.selectAll('g.ob-bars').data(d=> {
            
            return d.keys.map((key, i)=>{
                return {state: key, data: d.value[i], max: d3.sum(d.value[i].map(b=> b.length)), index: d.index}
            });
        }).join('g').classed('ob-bars', true);
        let dRects = discBars.append('rect').attr('width', (d, i, n)=> {
            let width = dimensions.observedWidth / n.length;
            return width/2;
        }).attr('height', (d, i, n)=> {
           
            let height = d.data[0] ? (d.data[0].scales.stateColors.length * dimensions.squareDim - 10): 0;
            let y = d3.scaleLinear().domain([0, d.max]).range([0, (height)])
            return y(d.data.length);
        }).attr('fill', (d, i) => {
            return d.data[0] != undefined ? d.data[0].color : '#fff';
        }).attr('opacity', 0.3);

        discBars.attr('transform', (d, i, n)=> {
            let movex = dimensions.observedWidth / n.length;
            let offSet = movex / 2
            let height = d.data[0] ? (d.data[0].scales.stateColors.length * dimensions.squareDim - 10) : 0;
            let y = d3.scaleLinear().domain([0, d.max]).range([0, (height-5)])
            let movey = (height-2) - y(d.data.length);
            let finalMove = d.index === 0 ? 'translate('+(movex * i)+', '+movey+')' : 'translate('+(offSet+(movex * i))+', '+movey+')';
            return finalMove;
        })

        dRects.on('mouseover', (d, i, n)=> {
            let state = d3.select('g.'+d[0].label).selectAll('g.state');
            state.filter(f=> {
                return f[0].state === d[0].winState}).attr('opacity', 0.8);
            state.filter(f=> f[0].state != d[0].winState).attr('opacity', 0.1);
            d3.select(n[i]).attr('opacity', 0.9);
        }).on('mouseout', (d, i, n)=> {
            d3.select(n[i]).attr('opacity', 0.3);
            let state = d3.select('g.'+d[0].label).selectAll('g.state').attr('opacity', 0.6);
        });

        discOb.each((d, i, nodes)=> {
                
                let xPoint = d3.scalePoint().domain(d.stateKeys).range([0, dimensions.observedWidth]).padding(.6)
                let height = d.stateKeys ? (d.stateKeys.length * dimensions.squareDim - 10) : 0;
                let y = d3.scaleLinear().domain([0, d.leafData.data.length]).range([(height), 0]);
                d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(4))//.attr('transform', 'translate(0, '+height+')');
                d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(xPoint)).attr('transform', 'translate(0, '+height+')');

                d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
                d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');
        });



    }

}

/**
 * 
 * @param {*} binnedWrap 
 * @param {*} branchScale 
 * @param {*} pointGroups 
 */

export function renderDistibutions(binnedWrap, branchScale, pointGroups){

    let predictedWrap = binnedWrap.append('g').classed('predicted', true);
    predictedWrap.attr('transform', 'translate(35, 0)');
    predictedWrap.filter(f=> f.type === 'discrete').append('g').classed('win-line', true);

    //ROOT RENDERING
    let root = predictedWrap.selectAll('g.root').data(d=> {
        return [d.rootData]}).join('g').classed('root', true);
    root.attr('transform', `translate(50,0)`);

    let contRoot = root.filter(f=> f.type === "continuous");
    contRoot.append('rect')
        .attr('height', dimensions.height)
        .attr('width', 12)
        .attr('fill', '#fff')
        .style('stroke-width', '0.5px')
        .style('stroke', 'black');

    let rootRange = contRoot.append('rect')
        .attr('width', 12)
        .attr('height', d=> {
            let newy = d.scales.yScale;
            newy.range([(dimensions.height - 5), 0]);
            return newy(d.values.lowerCI95) - newy(+d.values.upperCI95);
        }).attr('transform', (d, i) => {
            let newy = d.scales.yScale;
            newy.range([(dimensions.height - 5), 0]);
            return 'translate(0,'+newy(+d.values.upperCI95)+')';
        }).style('opacity', 0.5).attr('fill', defaultBarColor);

    let rootAv = contRoot.append('rect').attr('width', 12).attr('height', 3);
    
    rootAv.attr('transform', (d, i) => {
        let newy = d.scales.yScale;
        newy.range([dimensions.height, 0]);
        let mean = +d.values.realVal;
        return 'translate(0,'+newy(mean)+')';
    }).attr('fill', '#004573');

    // Discrete Root
    let disRoot = root.filter(f=> f.type === "discrete");
    let rootStateGroups = disRoot.selectAll('g.root-state-groups').data(d=> {
        return d.bins}).join('g').classed('root-state-groups', true);

    rootStateGroups.append('text')
        .text((d, i)=> d.color.state)
        .attr('y', 10)
        .attr('x', -3)
        .style('font-size', 10)
        .style('text-anchor', 'end');

    rootStateGroups.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(dimensions.squareDim+2))})`);

    rootStateGroups.append('rect')
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim)
        .attr('fill', '#fff').attr('opacity', 1);

    let rootRects = rootStateGroups.append('rect')
        .classed('color-rect', true)
        .attr('height', dimensions.squareDim)
        .attr('width', dimensions.squareDim);

    rootRects.attr('fill', (d, i)=> {
            return `rgba(89, 91, 101, ${d.state[0].value})`;
        }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);

    let winStateRoot = disRoot.selectAll('g.root-state-groups')
        .filter((f, j, n)=>{
            let maxVal = d3.max(d3.selectAll(n).data().map(m=> m.state[0].value));
            return f.color.state === d3.selectAll(n).data().filter(m=> m.state[0].value === maxVal)[0].color.state;
        }).classed('win', true);

    winStateRoot.select('rect.color-rect').attr('fill', (c, i)=> {
            return c.color.color;
        }).attr('opacity', (c)=>{
            let sum = d3.sum(c.state.flatMap(s=> s.value));
            return sum/c.state.length;
        });

    /////BRANCHES
    let branchGroup = predictedWrap.selectAll('g.branch-bin').data(d=> {
        return d.branches}).join('g').classed('branch-bin', true);

    branchGroup.filter(f=> f.type === 'continuous').attr('transform', (d, i, n)=> {
        let step = n.length < 11 ? (d.range[1] - d.range[0]) / 5 : 0;
        let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange]);
            return 'translate('+(90 + (branchScale(i)) + x(step)) +', 0)'});

    let discreteDist = branchGroup.filter(f=> f.type === 'discrete');
    
    /**
     * Discrete Predicted Render and Events
     */
    renderDiscretePredicted(discreteDist);

    discreteDist.attr('transform', (d, i, n)=> {
        let step = n.length < 11 ? (d.range[1] - d.range[0]) / 5 : 0;
        let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange]);
            return 'translate('+(44 + (branchScale(i)) + x(step)) +', 0)'});

    discreteDist.on('mouseover', (d, i, node)=> {
       highlightNodesMouseover(d, i, node, pointGroups);
    }).on('mouseout', (d, i, node)=> {
        d3.selectAll(".branch-points.selected").classed('selected', false);
        d3.selectAll('.selected-branch').classed('selected-branch', false);
        d3.select(node[i]).select('.y-axis').remove();
    });

    //CONTIN PREDICTED
    let continDist = branchGroup.filter(f=> f.type === 'continuous');

    continDist.on('mouseover', (d, i, node)=> {
        highlightNodesMouseover(d, i, node, pointGroups);
    }).on('mouseout', (d, i, node)=> {
        d3.selectAll(".branch-points.selected").classed('selected', false);
        d3.selectAll('.selected-branch').classed('selected-branch', false);
        d3.select(node[i]).select('.y-axis').remove();
    });

    renderContinuousPredicted(continDist);

     //////START BRANCH EXPERIMENT
     let brush = d3.brushY().extent([[0, 0], [20, dimensions.height]])
     brush.on('end', brushed);

     continDist.append("g")
     .classed('continuous-branch-brush', true)
     .attr("class", "brush")
     .call(brush);
 
     function brushed(){

        let data = d3.select(this.parentNode).data()[0]
        var s = d3.event.selection;
        var zero = d3.format(".3n");

        let index = d3.select('#toolbar').selectAll('.brush-span').size();
        let classLabel = index === 0 ? 'one' : 'two';
    
        if(s != null){
            let treeTest = d3.select('#sidebar').selectAll('.node').filter(f=> {
                return f.data.leaf === true});
    
            if(treeTest.empty()){
                renderTree(d3.select('#sidebar'), null, true);
            }

            let y = d3.scaleLinear().domain([data.domain[0], data.domain[1]]).range([0, dimensions.height])
           
            let attribute = data.key;
            let brushedVal = [y.invert(s[1]), y.invert(s[0])];
    
            let treeNode  = d3.select('#sidebar').selectAll('.node');

            let nodes = data.data.filter(f=> {
                return (f.values.realVal > brushedVal[0]) && (f.values.realVal < brushedVal[1]);
            });
           
            let test = continuousHistogram(nodes);

           
            test.maxCount = d3.sum(data.bins.map(m=> m.length));

            //////EXPERIMENTING WITH BRUSH DRAW DISTRIBUTIONS////
            let brushedDist = d3.select(this.parentNode)
            .selectAll('g.distribution-too')
            .data([test])
            .join('g')
            .classed('distribution-too', true);

            brushedDist.attr('transform', 'translate(0, 0) rotate(90)');
            let path = brushedDist.append('path').attr('d', mirrorlineGen);
            path.attr("fill", brushColors[index][0]).attr('fill-opacity', 0.5)
            .style('stroke', brushColors[index][0]);

            let nodeNames = nodes.map(m=> m.node);

            let otherBins = continDist.filter(f=> f.index === data.index && f.key != data.key);
            otherBins.each((b, i, n)=> {
                
                let test = continuousHistogram(b.data.filter(f=> nodeNames.indexOf(f.node) > -1) );
               
                test.maxCount = d3.sum(b.bins.map(m=> m.length));
              
                let otherDist = d3.select(n[i]).selectAll('g.distribution-too')
                .data([test])
                .join('g')
                .classed('distribution-too', true);

                otherDist.attr('transform', 'translate(0, 0) rotate(90)');
                let path = otherDist.append('path').attr('d', mirrorlineGen);
                path.attr("fill", brushColors[index][0]).attr('fill-opacity', 0.5)
                .style('stroke', brushColors[index][0]);
    
            });

            let descendBins = continDist.filter(f=> {
                return (f.index > data.index) && (f.key === data.key)});

            descendBins.each((b, i, n)=> {

                let test = b.data.filter(f=> {
                    return (f.values.realVal > brushedVal[0]) && (f.values.realVal < brushedVal[1]);
                    });

                 let testH = continuousHistogram(test);
               
                 testH.maxCount = d3.sum(b.bins.map(m=> m.length));
              
                let otherDist = d3.select(n[i]).selectAll('g.distribution-too')
                .data([testH])
                .join('g')
                .classed('distribution-too', true);

                otherDist.attr('transform', 'translate(0, 0) rotate(90)');
                let path = otherDist.append('path').attr('d', mirrorlineGen);
                path.attr("fill", brushColors[index][0]).attr('fill-opacity', 0.5)
                .style('stroke', brushColors[index][0]);

            })
          
            ////END DISTRIBUTION///
           
            let notNodes = data.data.filter(f=> {
                return (f.values.realVal < brushedVal[0]) || (f.values.realVal > brushedVal[1]);
            });

            let selectedNodes = brushedNodes(nodes, notNodes, data, brushedVal, classLabel);
            let selectedBranch = selectedNodes[0];
            let secondGrp = selectedNodes[1];
            let antiSelected = selectedNodes[2];
            let antiSecond = selectedNodes[3];
    
            if(index < 2){
    
                let doesItExist = d3.select('#toolbar').selectAll('.brush-span').filter((f, i, n)=> {
                    return d3.select(n[i]).attr('value') == `${data.bins.groupLabel}-${data.key}`;
                });
    
                if(doesItExist.size() === 0){
    
                    d3.select(this).select('.selection')
                    .style('fill', `${brushColors[index][0]}`)
                    .attr('stroke', `${brushColors[index][0]}`)
                    .attr('stroke-width', 2);
    
                    d3.select(this).select('.overlay')
                    .attr('stroke', brushColors[index][1])
                    .attr('stroke-width', 2);
    
                    let badge = d3.select('#toolbar')
                        .append('span')
                        .attr('class', classLabel)
                        .attr('id', classLabel)
                        .classed('brush-span', true)
                        .classed(`${data.bins.groupLabel}`, true)
                        .classed('badge badge-secondary', true)
                        .style('background', brushColors[index][0])
                        .attr('value', `${data.bins.groupLabel}-${data.key}`)
                        .datum({brush:this, nodes: nodes})
                        .text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
    
                    let xOut = badge.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
                    xOut.on('click', (d, i, n)=> {
                       
                        let classy = index === 0 ? 'one' : 'two';
                        d3.select(d.brush).call(brush.move, null);
                        d3.select(n[i].parentNode).remove();
                        d3.select(d.brush).select('.overlay').attr('stroke-width', 0);
                        descendBins.selectAll('.distribution-too').remove();
                        otherBins.selectAll('.distribution-too').remove();
                        d3.select(d.brush.parentNode).select('.distribution-too').remove();
                        d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed-second', false);
                        d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed', false);
                    });
    
                }else{
    
                    doesItExist.text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
                    let xOut = doesItExist.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
                    xOut.on('click', (d, i, n)=> {
                        d3.select(d).call(brush.move, null);
                        d3.select(d).select('.overlay').attr('stroke-width', 0);
                        d3.select(n[i].parentNode).remove();
                    });
                   
                    d3.select(doesItExist.datum().brush).call(brush.move, null);
                    d3.select(doesItExist.datum().brush).select('.overlay').attr('stroke-width', 0)
    
                    treeNode.selectAll(`.${data.key}`)
                        .selectAll(`${data.bins.groupLabel}`)
                        .selectAll('.second-branch')
                        .classed('second-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                    treeNode.selectAll(`.${data.key}`)
                        .selectAll('.selected-branch')
                        .classed('selected-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                        treeNode.selectAll(`.${data.key}`)
                        .selectAll('.anti-brushed-second')
                        .classed('anti-brushed-second', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                        treeNode.selectAll(`.${data.key}`)
                        .selectAll('.anti-brushed-branch')
                        .classed('anti-brushed-branch', false)
                        .classed('one', false)
                        .classed('two', false)
                        .classed(`${data.key}`, false);
    
                    let label = doesItExist.attr('id');
    
                    index = label === 'one' ? 0 : 1;
    
                    d3.select(this).select('.selection')
                        .style('fill', `${brushColors[index][0]}`)
                        .attr('stroke', `${brushColors[index][0]}`)
                        .attr('stroke-width', 2);
    
                    d3.select(this).select('.overlay')
                        .attr('stroke', brushColors[index][1])
                        .attr('stroke-width', 2);

                    let nodes = data.data.filter(f=> {
                        return (f.values.realVal >= brushedVal[0]) && (f.values.realVal <= brushedVal[1]);
                    });
                    let notNodes = data.data.filter(f=> {
                        return (f.values.realVal < brushedVal[0]) || (f.values.realVal > brushedVal[1]);
                    });
                    doesItExist.datum({brush:this, nodes: nodes})
                    brushedNodes(nodes, notNodes, data, brushedVal, label);
                    
                }
    
            }else{
    
                d3.select('#toolbar').selectAll('.brush-span').filter((f, i)=> i === 0).remove();
    
                let classLabel = colorBool === 0 ? 'one': 'two';
    
                d3.select('#toolbar')
                    .append('span')
                    .attr('class', )
                    .classed('brush-span', true)
                    .classed('badge badge-secondary', true)
                    .style('background', brushColors[colorBool][0])
                    .attr('value', `${data.bins.groupLabel}-${data.key}`)
                    .text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
                colorBool === 0 ? colorBool = 1 : colorBool = 0;
                secondGrp.classed(classLabel, true);
                selectedBranch.classed(classLabel, true);
            }
    
        }else{
            d3.selectAll(`.${data.key}.brushed-branch`).classed('brushed-branch', false);
            d3.selectAll(`.${data.key}.brushed-second`).classed('brushed-second', false);
        }
     }

     ///OBSERVED/////
     let observedWrap = binnedWrap.append('g').classed('observed', true);
     observedWrap.attr('transform', (d, i, n)=> {
         return 'translate('+ (dimensions.predictedWidth + 150) +', 0)'});

    ////OBSERVED CONTIUOUS/////
    let contOb = observedWrap.filter(f=> f.type === 'continuous');
    contOb.attr('transform', `translate(${dimensions.predictedWidth + 160}, -15)`);

    let contBars = contOb.selectAll('g.ob-bars').data(d=> {
        return d.leafData.bins}).join('g').classed('ob-bars', true);

    let cRects = contBars.append('rect').attr('width', (d, i, n)=> {
        let width = dimensions.observedWidth / n.length;
        return width;
    }).attr('height', (d, i)=> {
        let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(dimensions.height - dimensions.margin), 0])
        return y(Object.keys(d).length - 2)
    })
    .attr('fill', defaultBarColor).attr('fill-opacity', .5);

    contBars.attr('transform', (d, i, n)=> {
        let movex = dimensions.observedWidth / n.length;
        let y = d3.scaleLinear()
            .domain([0, Object.keys(d).length])
            .range([(dimensions.height - dimensions.margin), 0]);

        let movey = dimensions.height - y(Object.keys(d).length - 2);
        return 'translate('+(movex * i)+', '+movey+')'});

    contOb.each((d, i, nodes)=> {

        let xvalues = d.leafData.data.map(m=> {
            return +m.values.realVal});
        let x = d3.scaleLinear()
            .domain([d3.min(xvalues), d3.max(xvalues)])
            .range([0, dimensions.observedWidth]);

        let y = d3.scaleLinear()
            .domain([0, d3.max(d.leafData.bins.map(b=> Object.keys(b).length)) - 2])
            .range([(dimensions.height - dimensions.margin), 0]);
        
        d3.select(nodes[i])
            .append('g')
            .classed('x-axis', true)
            .call(d3.axisBottom(x))
            .attr('transform', 'translate(0, '+dimensions.height+')')

        d3.select(nodes[i]).append('g')
            .classed('y-axis', true)
            .call(d3.axisLeft(y).ticks(4))
            .attr('transform', 'translate(0, '+dimensions.margin+')');

            d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
            d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');

            d3.select(nodes[i])
            .append('g')
            .classed('x-axis-label', true)
            .append('text').text('Frequency')
            .attr('transform', `translate(-20, ${dimensions.height- 10}) rotate(-90)`)
            .style('font-size', '10px');
    });
    
    ////Observed Discrete////
    let discOb =  observedWrap.filter(f=> f.type === 'discrete');

    discOb.attr('transform', `translate(${dimensions.predictedWidth + 160}, 5)`)
    let discBars = discOb.selectAll('g.ob-bars').data(d=> {
        return d.stateKeys.map((key, i)=>{
            return {state: key, data: d.leafData.bins[i], max: d3.sum(d.leafData.bins.map(b=> b.length))}
        });
    }).join('g').classed('ob-bars', true);
    let dRects = discBars.append('rect').attr('width', (d, i, n)=> {
        let width = dimensions.observedWidth / n.length;
        return width;
    }).attr('height', (d, i, n)=> {
        let height = d.data[0] ? (d.data[0].scales.stateColors.length * dimensions.squareDim - 10): 0;
        let y = d3.scaleLinear().domain([0, d.max]).range([0, (height)])
        return y(d.data.length);
    }).attr('fill', (d, i) => {
        return d.data[0] != undefined ? d.data[0].color : '#fff';
    }).attr('opacity', 0.3);

    discBars.attr('transform', (d, i, n)=> {
        let movex = dimensions.observedWidth / n.length;
        let height = d.data[0] ? (d.data[0].scales.stateColors.length * dimensions.squareDim - 10) : 0;
        let y = d3.scaleLinear().domain([0, d.max]).range([0, (height-5)])
        let movey = (height-5) - y(d.data.length);
        return 'translate('+(movex * i)+', '+movey+')'});

    dRects.on('mouseover', (d, i, n)=> {
        let state = d3.select('g.'+d[0].label).selectAll('g.state');
        state.filter(f=> {
            return f[0].state === d[0].winState}).attr('opacity', 0.8);
        state.filter(f=> f[0].state != d[0].winState).attr('opacity', 0.1);
        d3.select(n[i]).attr('opacity', 0.9);
    }).on('mouseout', (d, i, n)=> {
        d3.select(n[i]).attr('opacity', 0.3);
        let state = d3.select('g.'+d[0].label).selectAll('g.state').attr('opacity', 0.6);
    });

    discOb.each((d, i, nodes)=> {
           
        let xPoint = d3.scalePoint().domain(d.stateKeys).range([0, dimensions.observedWidth]).padding(.6)
        let height = d.stateKeys ? (d.stateKeys.length * dimensions.squareDim - 10) : 0;
        let y = d3.scaleLinear().domain([0, d.leafData.data.length]).range([(height), 0]);
        d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(4))//.attr('transform', 'translate(0, '+height+')');
        d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(xPoint)).attr('transform', 'translate(0, '+height+')');

        d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
        d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');
    });

}

function brushedNodes(nodes, notNodes, data, brushedVal, classLabel){
   
    let nodeNames = nodes.map(m=> m.node);
    let notNodeNames = notNodes.map(m=> m.node);

    let timeNodes = d3.extent(nodes.map(m=> m.combLength));
    let treeNode = d3.select('#sidebar').selectAll('.node');

    let selectedBranch = treeNode.filter(f=> {
        return nodeNames.indexOf(f.data.node) > -1;
    }).classed('brushed-branch', true);

    let notNodeSelectedBranch = treeNode.filter(f=> notNodeNames.indexOf(f.data.node) > -1).classed('anti-brushed', true);

    let test = pullPath([], selectedBranch.data(), [], [], 0);
    let notTest = pullPath([], notNodeSelectedBranch.data(), [], [], 0);

    let testtest = test.flatMap(t=> t).filter(f=>{
        return f.data.attributes[data.key].values.realVal >= brushedVal[0] && f.data.attributes[data.key].values.realVal <= brushedVal[1];
    }).map(m=> m.data.node);

    let notTestTest = notTest.flatMap(t=> t).filter(f=>{
        return f.data.attributes[data.key].values.realVal < brushedVal[0] || f.data.attributes[data.key].values.realVal > brushedVal[1];
    }).map(m=> m.data.node);
    
    let secondGrp = treeNode.filter(f=> (nodeNames.indexOf(f.data.node) === -1)&&(testtest.indexOf(f.data.node) > -1))
        .classed('brushed-second', true)
        .classed(`${data.key}`, true)
        .classed(classLabel, true);
    let secondLinks = d3.select('#sidebar').selectAll('.link')
        .filter(f=> (nodeNames.indexOf(f.data.node) === -1)&&(testtest.indexOf(f.data.node) > -1))
        .classed('brushed-second', true)
        .classed(`${data.key}`, true)
        .classed(classLabel, true);
    
    selectedBranch.classed(`${data.key}`, true).classed(classLabel, true).classed('brushed-branch', true);
   
    let notNodeSecondGrp = treeNode
        .filter(f=> (notNodeNames.indexOf(f.data.node) === -1 )&& (notTestTest.indexOf(f.data.node) > -1))
        .classed('anti-brushed-second', true)
        .classed(`${data.key}`, true)
        .classed(classLabel, true);

    let secondAntiLinks = d3.select('#sidebar').selectAll('.link')
            .filter((f, j)=> (notNodeNames.indexOf(f.data.node) === -1)&&(notTestTest.indexOf(f.data.node) > -1));
    secondAntiLinks.classed('anti-brushed-second', true).classed(`${data.key}`, true).classed(classLabel, true);
    notNodeSelectedBranch.classed('anti-brushed', true).classed(classLabel, true).classed(classLabel, true);

    return [selectedBranch, secondGrp, notNodeSelectedBranch, notNodeSecondGrp];
}

function continuousHistogram(data){
    
    let x = data[0].yScale;
    let histogram = d3.histogram()
            .value(function(d) { return d.values.realVal; })  
            .domain(x.domain())  
            .thresholds(x.ticks(20)); 

    return histogram(data);
}

let mirrorlineGen = d3.area()
    .curve(d3.curveCardinal)
    .x((d, i, n)=> {
        let y = d3.scaleLinear().domain([n.length - 1, 0]).range([0, dimensions.height]).clamp(true);
        return y(i); 
    })
    .y0(d=> {
        return 0;
    })
    .y1((d, i, n)=> {
        let max = n.maxCount ? n.maxCount : d.maxCount;
        let dat = d.length;
        let count = n.count? n.count : 8;
        let x = d3.scaleLinear().domain([0, max]).range([0, ((dimensions.predictedWidth/count)*.5)]).clamp(true);
        
        return x(dat); 
});

var lineGen = d3.area()
    .curve(d3.curveCardinal)
    .x((d, i, n)=> {
        let y = d3.scaleLinear().domain([0, n.length - 1]).range([0, dimensions.height]).clamp(true);
        return y(i); 
    })
    .y0(d=> {
        return 0;
    })
    .y1((d, i, n)=> {
        let max = d.maxCount? d.maxCount : d3.sum(n.map(m=> m.length))
        let dat = d.length;
        let count = n.count? n.count : 8;
        let x = d3.scaleLinear().domain([0, max]).range([0, ((dimensions.predictedWidth/count)*.5)]).clamp(true);
        return x(dat); 
    });

function renderDiscretePredicted(discreteDist){
            /////////EXPERIMENT////////
    let stateBarsPredicted = discreteDist.selectAll('g.histo-bars')
        .data(d=> {
            let bins = d.bins.map(m=> {
                m.index = d.index;
                return m
            });
            return bins}).join('g')
        .classed('histo-bars', true);

    //stateBarsPredicted.attr('transform', (d, i)=> `translate(${dimensions.squareDim}, ${3.5+(i*(dimensions.squareDim+2))})`);
    stateBarsPredicted.attr('transform', (d, i, n)=> {
        return `translate(${dimensions.squareDim}, ${3.5+(i*(dimensions.squareDim+2))})`});

    let discreteWidth = 85;

    let binRects = stateBarsPredicted.append('rect')
            .attr('height', dimensions.squareDim)
            .attr('width', discreteWidth)
            .attr('stroke', 'black')
            .attr('fill', '#fff')
            .attr('opacity', 0.3);

    stateBarsPredicted.append('text')
        .text('1')
        .attr('transform', `translate(${discreteWidth + 2},10)`)
        .style('font-size', '10px')
        .style('opacity', 0.6);

    stateBarsPredicted.append('text')
        .text('0')
        .attr('transform', `translate(-7,10)`)
        .style('font-size', '10px')
        .style('opacity', 0.6)

    let probabilityTicks = stateBarsPredicted
        .selectAll('.prob-tick')
        .data((d, i, n)=> {
        // console.log('d', d.histogram.map(b=> b[0]).filter(f=> f != undefined))
            let state = d.state.map(m=> {
                let newstate = m;
                newstate.average = d3.mean(d.histogram.flatMap(m=> m.map(v=> +v.value)));
                newstate.color = d.color.color;
                return newstate;
            });
            state.color = d.color.color;
            state.average = d3.mean(d.histogram.flatMap(m=> m.map(v=> +v.value)));
            return state;
        }).join('rect').classed('prob-tick', true)

    probabilityTicks
        .attr('width', 3)
        .attr('height', dimensions.squareDim)
        .attr('opacity', 0.6)
        .attr('fill', 'gray');

    let averageTick = stateBarsPredicted
        .selectAll('.av-tick').data(d=> {
            return [{value: d.state[0].average, color: d.color.color}];
        }).join('rect').classed('av-tick', true)
        .attr('width', 1).attr('height', dimensions.squareDim)
        .attr('fill', d=> d.color)
        .attr('transform', (d, i, n)=> {
            let scale = d3.scaleLinear().domain([0, 1]).range([0, (discreteWidth - 2)]);
            return `translate(${scale(d.value)}, 0)`});
    averageTick.on('mouseover', (d, i, n)=> {
    
        let tool = d3.select('#tooltip');

        tool.transition()
            .duration(200)
            .style("opacity", .9);
        
        let f = d3.format(".3f");
        
        tool.html(`Average: ${f(d.value)}`)
            .style("left", (d3.event.pageX - 40) + "px")
            .style("top", (d3.event.pageY - 28) + "px");

        tool.style('height', 'auto');

    }).on('mouseout', ()=>{
        let tool = d3.select('#tooltip');
        tool.transition()
        .duration(500)
        .style("opacity", 0);
    });


    probabilityTicks.attr('transform', (d, i, n)=> {
        let scale = d3.scaleLinear().domain([0, 1]).range([0, (discreteWidth - 2)]);
        return `translate(${scale(d.value)},0)`});

    probabilityTicks.on('mouseover', (d, i, n)=> {
    
        let tool = d3.select('#tooltip');

        tool.transition()
            .duration(200)
            .style("opacity", .9);
        
        let f = d3.format(".3f");
        
        tool.html(`${d.state} : ${f(d.value)}`)
            .style("left", (d3.event.pageX - 40) + "px")
            .style("top", (d3.event.pageY - 28) + "px");

        tool.style('height', 'auto');

    }).on('mouseout', ()=>{
        let tool = d3.select('#tooltip');
        tool.transition()
        .duration(500)
        .style("opacity", 0);
    });

    /////////END XPERIMENT////////

    let stateBinsPredicted = discreteDist.selectAll('g.state-bins')
        .data(d=> d.bins).join('g')
        .classed('state-bins', true);

    stateBinsPredicted.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(dimensions.squareDim+2))})`);

    discreteDist.each((d, i, node)=>{
        let maxBin = 0;
        let maxState = null;
        d.bins.map(m=> {
            if(d3.sum(m.state.flatMap(s=> s.value)) > maxBin){
                maxBin = d3.sum(m.state.flatMap(s=> s.value));
                maxState = m.color.state;
            }
        });

        let winStates = d3.select(node[i]).selectAll('g.state-bins')
            .filter((f, j, n)=>{
                return f.color.state === maxState;
            }).classed('win', true);

        let winStateTicks = d3.select(node[i]).selectAll('g.histo-bars')
            .filter((f, j, n)=>{
                return f.color.state === maxState;
            }).classed('win', true);
        
        winStates.select('rect.state-rect').attr('fill', (c)=> {
                return c.color.color;
            }).attr('opacity', (c)=>{
                let sum = d3.sum(c.state.flatMap(s=> s.value));
                return sum/c.state.length;
            });
    // winStateTicks.selectAll('rect.prob-tick').attr('fill', (c)=> c.color);
        
    });
}

function renderContinuousPredicted(continDist){

    continDist.each((d, i, nodes)=> {
        let distrib = d3.select(nodes[i])
            .selectAll('g')
            .data([d.bins])
            .join('g')
            .classed('distribution', true);

        distrib.attr('transform', 'translate(11, '+dimensions.height+') rotate(-90)');
        let path = distrib.append('path').attr('d', lineGen);
        path.attr("fill", defaultBarColor).attr('fill-opacity', .4)//.attr("fill", "rgba(133, 193, 233, .4)")
        .style('stroke', defaultBarColor);
    });

    let contRect = continDist.append('rect')
        .attr('height', dimensions.height)
        .attr('width', 10)
        .style('fill', 'none')
        .style('stroke', 'gray');

    let rangeRect = continDist.selectAll('rect.range').data(d=> {
        let newData = d.data.map(m=> {
            m.range = d.range;
            return m;
        })
        return newData}).join('rect').classed('range', true);

    rangeRect.attr('width', 10);
    rangeRect.attr('height', (d, i)=> {
        if(d.scales.yScale != undefined){
            let newy = d.scales.yScale;
            newy.range([80, 0]);
            return newy(d.values.lowerCI95) - newy(d.values.upperCI95)
        }else{
            return 0;
        }
    }).attr('transform', (d, i) => {
        let newy = d.scales.yScale;
        newy.range([80, 0]);
        return 'translate(0,'+newy(d.values.upperCI95)+')'
    });

    //rangeRect.attr('fill', "rgba(133, 193, 233, .05)");
    rangeRect.attr('fill', defaultBarColor).attr('opacity', 0.5)

    let avRect = continDist.append('rect').attr('width', 10).attr('height', (d, i)=> {
        if(d.data[0] != undefined){
            return 3;
        }else{
            return 0;
        }
    });

    avRect.attr('transform', (d, i) => {
        if(d.data[0] != undefined){
            let newy = d.data[0].scales.yScale;
            newy.range([dimensions.height, 0]);
            let mean = d3.mean(d.data.map(m=> +m.values.realVal));
            return 'translate(0,'+newy(mean)+')';
        }else{
            return 'translate(0,0)';
        }
    }).attr('fill', '#004573');
}

function highlightNodesMouseover(d, i, node, pointGroups){
    let list = d.data.map(m=> m.node);
    let selected = pointGroups.filter(p=> {
        return list.indexOf(p.node) > -1}).classed('selected', true);
    let treeNode  = d3.select('#sidebar').selectAll('.node');
    let selectedBranch = treeNode.filter(f=> list.indexOf(f.data.node) > -1).classed('selected-branch', true);
    if(d.type = 'continuous'){
        let y = d3.scaleLinear().domain(d.domain).range([0, dimensions.height])
        let axis = d3.select(node[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5));
    }else{

    }
    
}

