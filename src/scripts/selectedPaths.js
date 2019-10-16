import * as d3 from "d3";
import { branchPaths, renderPaths, renderAttributes, drawContAtt, drawDiscreteAtt, drawPathsAndAttributes } from './renderPathView';
import { formatAttributeData } from './dataFormat';
import { filterMaster } from './filterComponent';
import { dataMaster, collapsed, colorKeeper } from './index';
import { renderDistibutions } from "./distributionView";

export let selectedPaths = [];
export let comparisonKeeper = [];

export function pathSelected(selectedPath, otherPaths, scales, moveMetric) {

    let selectedDiv = d3.select('div#selected');
    let main = d3.select('div#main');
    if (selectedPath === null) {

        selectedPaths = [];

        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
        let main = d3.select('div#main');
        drawPathsAndAttributes([...otherPaths], main, scales, moveMetric, false);

    } else {
      
        selectedPaths = selectedPaths.concat(selectedPath);
        let commonNodes = renderSelectedView([...selectedPaths], [...otherPaths], selectedDiv, scales, moveMetric);
        let sortedPaths = sortOtherPaths([...selectedPaths], [...otherPaths], [...commonNodes]);
        
        /// LOWER ATTRIBUTE VISUALIZATION ///
        let pathGroups = drawPathsAndAttributes(sortedPaths.map(s => s.data), main, scales, moveMetric, false);

        main.style('padding-top', '250px');
    }
}
function getCommonNodes(paths){
    let maxBranch = d3.max(paths.map(p => p.length));
    let longestBranch = paths.filter(path => path.length === maxBranch)[0];
    let startBranch = longestBranch.filter(f=> f.leaf != true);
    let commonNodeStart = startBranch;
    //FIND THE COMMON BRANCHES BETWEEN ALL OF THE SELECTED///
    paths.map(path => {
        commonNodeStart = [...path].filter(f => {
            return (commonNodeStart.map(m => m.node).indexOf(f.node) > -1) & f.leaf != true });
    });

    let children = paths.map(path => {
        path = (path[0].leaf === true) ? path.reverse() : path;
        let nodeIndex = path.map(p => p.node);
        let thresh = nodeIndex.indexOf(commonNodeStart[commonNodeStart.length - 1].node);
        let subset = path.filter((f, i) => i > thresh);
        return subset;
    });

    commonNodeStart[commonNodeStart.length - 1].children = children.map((path, i) => {
        let max = d3.max(path.map(p => p.edgeMove)) - commonNodeStart[commonNodeStart.length - 1].edgeMove;
        return path.map((chil, j, n) => {
            chil.parentBase = commonNodeStart[commonNodeStart.length - 1].edgeMove;
            chil.move = chil.edgeMove - commonNodeStart[commonNodeStart.length - 1].edgeMove;
            chil.base = (j === 0) ? 0 : n[j - 1].edgeMove - commonNodeStart[commonNodeStart.length - 1].edgeMove;
            let parentScale = d3.scaleLinear().domain([0, 1]).range([0, 1000])
            let scaledParentMove = parentScale(commonNodeStart[commonNodeStart.length - 1].edgeMove);
            chil.xScale = d3.scaleLinear().domain([0, max]).range([0, (1000 - scaledParentMove)]);
            chil.level = i;
            return chil;
        });
    });

    return commonNodeStart;
}
export function sortOtherPaths(pathData, otherPaths, commonNode) {

    if(pathData.length > 1){

        if(commonNode != null){

            let chosenPath = commonNode.reverse().map(m => m.node);
            let rankedPaths = otherPaths.map(path => {
                let step = 0;
                let test = path.reverse().map((node, i) => {
                    if (chosenPath.indexOf(node.node));
                    return { 'indexOf': chosenPath.indexOf(node.node), 'pathIndex': i, 'node': node, 'chosen': chosenPath[chosenPath.indexOf(node.node)] };
                }).filter(f => f.indexOf > -1);
                let distance = (test[0].indexOf + test[0].pathIndex);
                return { 'data': path.reverse(), 'distance': distance };
            });
            let sortedData = rankedPaths.sort(function(a, b) { return a.distance - b.distance; });
        
            return sortedData;
        }
        console.error('multiple paths without common node');
    }else{

        let chosenPath = pathData[0].reverse().map(m => m.node);
    
        let rankedPaths = otherPaths.map(path => {
            let step = 0;
            let test = path.reverse().map((node, i) => {
                if (chosenPath.indexOf(node.node));
                return { 'indexOf': chosenPath.indexOf(node.node), 'pathIndex': i, 'node': node, 'chosen': chosenPath[chosenPath.indexOf(node.node)] };
            }).filter(f => f.indexOf > -1);
            let distance = (test[0].indexOf + test[0].pathIndex);
            return { 'data': path.reverse(), 'distance': distance };
        });
        let sortedData = rankedPaths.sort(function(a, b) { return a.distance - b.distance; });
        return sortedData;
    }

}
function renderSelectedTopology(commonNodeStart, svg, scales, branchFrequency, moveMetric){

        let selectWrap = svg.append('g').classed('select-wrap', true);
        selectWrap.attr('transform', 'translate(0, 20)')

        ///Scales for circles ///
        let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))]);

        let selectedGroups = selectWrap.selectAll('.paths').data([commonNodeStart]).join('g').classed('paths', true);

        let pathBars = selectedGroups.append('rect').classed('path-rect', true);
        pathBars.attr('y', -8);
        pathBars.attr('height', (35 + (25 * commonNodeStart[commonNodeStart.length - 1].children.length)));

        //////////
        ///Selecting species
        /////////
        addRemoveBubble(selectedGroups, scales, moveMetric)

        /////////
        let timelines = selectedGroups.append('g').classed('time-line', true);
        timelines.attr('transform', (d, i) => 'translate(145, 0)');

        let lines = timelines.append('line')
            .attr('x1', 0)
            .attr('x2', (d, i) => {
                let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
                return x(d[d.length - 1].edgeMove)
            })
            .attr('y1', 15)
            .attr('y2', 15);

        let nodeGroups = timelines.selectAll('.node').data((d) => d).join('g').classed('node', true);

        nodeGroups.attr('transform', (d) => {
            let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
            let distance = x(d.edgeMove);
            return 'translate(' + distance + ', 10)';
        });

        nodeGroups.classed('common-node', true);

        let childNodeWrap = nodeGroups.filter(c => c.children != undefined).selectAll('g.child').data(d => d.children).join('g').classed('child', true);

        let childNodes = childNodeWrap.selectAll('g.node').data(d => d).join('g').classed('node', true)
        childNodes.attr('transform', (d, i, n) => {
            return 'translate(' + d.xScale(d.move) + ', ' + (d.level * 20) + ')';
        });

        childNodeWrap.append('path').attr('d', (d, i, n) => {
            let pathArray = [{ 'x': 0, 'y': 0 }, { 'x': 0, 'y': i }];
            d.map(m => {
                pathArray.push({ 'x': m.xScale(m.move), 'y': m.level })
            });
            let line = d3.line()
                .curve(d3.curveMonotoneY)
                .x(function(d) {
                    return d.x;
                })
                .y(d => (d.y * 20))
            return line(pathArray);
        }).attr('stoke-width', '2px').attr('fill', 'none').attr('stroke', 'gray');

        childNodeWrap.on('mouseover', (d, i)=> {
            let specArray = d.map(m=> m.species);
            let hovers = nodeGroups.filter(n => n.node === d.node);
            let commonHover = [...commonNodeStart].map(c=> c.node).concat(d.map(n=> n.node));
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let treeLinks  = d3.select('#sidebar').selectAll('.link');
            treeNode.filter(f => commonHover.indexOf(f.data.node) > -1).classed('hover', true);
            treeLinks.filter(f => commonHover.indexOf(f.data.node) > -1).classed('hover', true);
            return hovers.classed('hover-branch', true);
        }).on('mouseout', (d, i)=> {
            d3.selectAll('.hover').classed('hover', false);
        });

        let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', d => {
            return circleScale(branchFrequency[d.node]);
        }).attr('class', (d, i) => 'node-' + d.node);

        let childCirc = childNodes.append('circle').attr('r', 7).attr('fill', 'red').attr('y', 5);

        childCirc.on('mouseover', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let selectedBranch = treeNode.filter(f => f.data.node === d.node).classed('selected-branch', true);
            return hovers.classed('hover-branch', true);
        }).on('mouseout', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            d3.selectAll('.selected-branch').classed('selected-branch', false);
            return hovers.classed('hover-branch', false);
        });

        childNodes.filter(f => f.leaf === true).append('text').text(d => d.label).attr('x', 9).attr('y', 4);
        //selectWrap.attr('transform', 'translate('+(50+(20 *commonNodeStart[commonNodeStart.length - 1].children.length))+')')
       

}
export function addRemoveBubble(group, scales, moveMetric){

    let pathRemove = group.append('g').classed('x-icon', true);
    pathRemove.attr('transform', 'translate(15, 10)');
    pathRemove.append('circle').attr('r', 7).attr('fill', '#fff');
    pathRemove.append('text').text('x').attr('transform', 'translate(-5, 5)');
    pathRemove.style('cursor', 'pointer');
    pathRemove.on('click', (d, i, n) => {
        d3.selectAll('.high').classed('high', false);
        d3.selectAll('.low').classed('low', false);
        treeNodes.select('.selected').classed('selected', false);
        pathSelected(null, dataMaster[0], scales, moveMetric);
    });

}
export function renderComparison(group, otherPaths, selectedDiv, scales){
 
    let buttonGroupTest = selectedDiv.select('.button-wrap');
    let buttonGroup = buttonGroupTest.empty() ? selectedDiv.append('div').classed('button-wrap', true) : buttonGroupTest;


    
    buttonGroup.style('display','inline-block').style('width', '900px').style('height', '50px');
    let main = d3.select('div#main');
    main.style('padding-top', '300px');

    if(group != null){
        let usedColors = comparisonKeeper.map(m=> m.groupColor);
        let newColor = colorKeeper.find(c => usedColors.indexOf(c[0]) === -1);
        group.groupColor = newColor[0];
        comparisonKeeper.push(group);
    }

    if(comparisonKeeper.length > 1){
        let compareButtonTest = d3.select('#toolbar').select('#compare-button');
        let compareButton = compareButtonTest.empty() ? d3.select('#toolbar').append('button').text('Normal Mode').attr('id', 'compare-button').classed('btn btn-info', true) : compareButtonTest;
        compareButton.on('click', ()=> {
            compareButton.text() === "Normal Mode" ? compareButton.text('Compare Mode') : compareButton.text('Normal Mode');
            renderComparison(null, otherPaths, selectedDiv, scales);
        });
    }

    let comparisonCombined = scales.map((sc, i)=> {
        let newAtt = {'field': sc.field, 'type': sc.type, 'data': []}
        comparisonKeeper.map((com, i)=> {
            let atts = formatAttributeData(com.data, scales, [sc.field]);
           
            let added = atts.flatMap(att=> {
                return att.map(a => {
                    return a.map(m=> {
                        let standard = m.leaf === true ? 0 : (m.upperCI95 - m.realVal) / 2;
                        m.variance = standard * standard;
                        return m;
                    });
                })
            })

            newAtt.data.push({'group': {'first': com.first, 'second': com.second, 'color': com.groupColor}, 'data': sc.type === 'continuous' ? added : atts.flatMap(a=> a)});
        })
        return newAtt;
    });

    console.log('combined', comparisonCombined);

    let button = buttonGroup.selectAll('button').data(comparisonKeeper).join('button').classed('btn btn-info', true).style('background', d=> d.groupColor);
    button.selectAll('span').data(t=> [t]).join('span').text(t=> {
        return t.first[1]+ "/" + t.second[1] + " "}).append('span').text(t=> t.data.length).classed("badge badge-light", true)
    
    let xOut = button.selectAll('i').data(d=> [d]).join('i').classed('close fas fa-times', true).style('padding-left', '10px');
    xOut.on('click', (d, i)=> {
        let filteredComp = comparisonKeeper.filter(f=> f.groupColor != d.groupColor);
        comparisonKeeper = filteredComp;
        if(comparisonKeeper.length > 0){
            renderComparison(null, otherPaths, selectedDiv, scales);
        }else{
            selectedDiv.selectAll('*').remove();
            selectedDiv.style('height', '0px');
            main.style('padding-top', '0px');
        }
    });

    let selectedTest = selectedDiv.select('.comparison-svg');
    let selectedTool = selectedTest.empty() ? selectedDiv.append('svg').classed('comparison-svg', true) : selectedTest;
    selectedDiv.style('height', '300px').style('width', '100%');
    selectedTool.style('height', '300px');

    let attWraps = selectedTool.selectAll('.att-wrapper').data(comparisonCombined.filter(f=> f.type === 'continuous').map((com)=>{
       
        let max = d3.max(com.data.flatMap(d=> d.data.flatMap(m=> m.map(f=> f.upperCI95)))) + .2;
        let min = d3.min(com.data.flatMap(d=> d.data.flatMap(m=> m.map(f=> f.lowerCI95)))) - .2;
        
        com.data.map(c=> {
            let binLength = 6;
            //let max = scales.filter(f=> f.field === com.field)[0].max;
           // let min = scales.filter(f=> f.field === com.field)[0].min;
            let normBins = new Array(binLength).fill().map((m, i)=> {
                let step = 1 / binLength;
                let base = (i * step);
                let top = ((i+ 1)* step);
                return {'base': base, 'top': top, 'binI': i, 'max': max, 'min':min }
            });

            let internalNodes = c.data.map(path => path.filter(node=> node.leaf != true));
            let leafNodes = c.data.flatMap(path => path.filter(node=> node.leaf === true));

            c.bins = normBins.map((n, i, nodes)=> {
                let edges = internalNodes.flatMap(path => path.filter(node=> {
                    return node.edgeMove >= n.base && node.edgeMove <= n.top;
                } ));
                n.data = edges;
          
                let mean = d3.mean(edges.map(e=> e.realVal));
                n.mean = mean === undefined ? normBins[i-1].mean : mean;
                let standard = Math.sqrt(d3.mean(edges.map(e=> e.variance)));
                n.meanStandard = edges.length === 0 ? 0 : standard;
                let sigma2 = standard * 2;
                n.upCon95 = mean === undefined ? normBins[i-1].upCon95 : mean + sigma2;
                n.lowCon95 = mean === undefined ? normBins[i-1].lowCon95 : mean - sigma2;
                return n;
            });
            c.leaves = leafNodes;
           
            return c;
        })
        
        return com;
    }));
    attWraps.exit().remove();
    let attWrapsEnter = attWraps.enter().append('g').classed('att-wrapper', true);

    let attLabels = attWrapsEnter.append('text').text(d=> d.field).style('text-anchor', 'end')
                    .style('font-size', '11px').attr('transform', 'translate(120, 35)');

    attWraps = attWrapsEnter.merge(attWraps);
    attWraps.attr('transform', (d, i)=> 'translate(0,'+(10+(i * 70))+')');

    let innerWrap = attWraps.selectAll('g.inner-group').data(d=> [d]).join('g').classed('inner-group', true);
    innerWrap.attr('transform', 'translate(150, 0)');
    let wrapRect = innerWrap.selectAll('rect.outline-rect').data(d=> [d]).join('rect').classed('outline-rect', true)
                    .attr('width', 800).attr('height', 60).attr('fill', '#fff').attr('stroke', 'gray');
    
if(d3.select('#compare-button').empty() || d3.select('#compare-button').text() === "Normal Mode"){
        let lineGen = d3.line()
        .x((d, i)=> {
            let x = d3.scaleLinear().domain([0, 5]).range([0, 800]);
            return x(i);
        })
        .y(d=> {
           let y = d3.scaleLinear().domain([d.min, d.max])
            y.range([60, 1]);
            return y(d.mean);
        });

    let pathGroups = innerWrap.selectAll('g.path-groups').data(d=> d.data).join('g').classed('path-groups', true);
    pathGroups.selectAll('*').remove();
    let paths = pathGroups.append('path').attr('d', d=> { 
        let scale = d.bins[0].data[0].yScale
        d.bins = d.bins.map((b, i, n)=> {
            if(b.mean === undefined){
                b.mean = d.bins[i-1].mean;
                d.missing = true;
            }
           
            b.yScale = d3.scaleLinear().domain([b.min, b.max]).range([60, 1])
            return b;
        });
        return lineGen(d.bins);
    }).classed('path', true);

    var areaG = d3.area()
    .curve(d3.curveCardinal)
    .x((d, i)=> {
        let x = d3.scaleLinear().domain([0, 5]).range([0, 800]);
        return x(i);
    })
    .y0(d=> {
        let y = d.yScale;
        y.range([60, 1]);
     
        return y(d.lowCon95);
    })
    .y1(d=> {
        let y = d.yScale;
        y.range([60, 1]);
     
        return y(d.upCon95); 
    });

    let confGroups = innerWrap.selectAll('g.conf-groups').data(d=> d.data).join('g').classed('conf-groups', true);
    confGroups.selectAll('*').remove();
    let conf = confGroups.append('path').attr('d', d=> { 
        d.bins = d.bins.map((b, i, n)=> {
            if(b.upCon95 === NaN){
                b.upCon95 = d.bins[i-1].upCon95;
                d.missing = true;
            }
            if(b.lowCon95 === NaN){
                b.lowCon95 = d.bins[i-1].lowCon95;
                d.missing = true;
            }

            return b;
        });
        return areaG(d.bins);
    }).classed('path', true);

    paths.style('fill', 'none');
    paths.style('stroke', d=> d.group.color);
    paths.style('stroke-width', '2px');

    conf.style('fill', d=> d.group.color);
    conf.style('opacity', 0.15);

    let yAxisG = innerWrap.append('g').classed('y-axis', true);

    innerWrap.on('mousemove', function(d, i) {
     
        let scale = d3.scaleLinear().domain([d.data[0].bins[0].min, d.data[0].bins[0].max]).range([1, 60]);
        let axisGroupTest = d3.select(this).select('.y-axis');
        let axisGroup = axisGroupTest.empty() ? d3.select(this).append('g').classed('y-axis', true) : axisGroupTest;
        
        if(d3.select('#compare-button').empty() || d3.select('#compare-button').text()==='Normal Mode'){
            axisGroup.attr('transform', (d, i)=> 'translate('+(d3.mouse(this)[0] - 10)+',0)')
           // let scale = d3.scaleLinear().domain([])
            axisGroup.call(d3.axisLeft(scale).ticks(5));
        }else{
            let pathD = d3.select(this).select('.path-groups').selectAll('path');
            let maxDiff = pathD.data().map(d=> d[0].maxDiff)[0];
            
            axisGroup.attr('transform', (d, i)=> 'translate('+(d3.mouse(this)[0] - 10)+',0)');
            let newScale = d3.scaleLinear().domain([maxDiff, 0]).range([0, 60]);
            axisGroup.call(d3.axisLeft(newScale).ticks(5));
        }

    
    }).on('mouseleave', function(){
        let axisGroup = d3.select(this).select('.y-axis');
        axisGroup.remove();
    });
    
}else{

    innerWrap.selectAll('.path-groups').remove();
    innerWrap.selectAll('g.conf-groups').remove();
    let pathGroups = innerWrap.selectAll('g.path-groups').data(d=> {
        let startBins = d.data[0].bins;
        let difArray = [];
        for(let i = 1; i < d.data.length; i ++){
            let diffs = []
            d.data[i].bins.map((b, j)=>{
                if(b.mean === undefined){
                    b.mean = d.data[i].bins[j-1].mean;
                }
                if(startBins[j].mean === undefined){
                    startBins[j].mean = startBins[j-1].mean;
                }
                let maxDiff = d.data[0].bins[0].max - d.data[0].bins[0].min;
                diffs.push({'diff':Math.abs(startBins[j].mean - b.mean), 'maxDiff': maxDiff});
            });
            difArray.push(diffs);
        }
        return difArray;
    }).join('g').classed('path-groups', true);

    let lineGen = d3.line()
        .x((d, i)=> {
            let x = d3.scaleLinear().domain([0, 5]).range([0, 800]);
            return x(i);
        })
        .y(d=> {
            let y = d3.scaleLinear().domain([0, d.maxDiff]).clamp(true);
            y.range([60, 0]);
            return y(d.diff);
        });

    let paths = pathGroups.append('path').attr('d', d=> { 
        return lineGen(d);
    });

    paths.style('fill', 'none');
    paths.style('stroke', 'black');
    paths.style('stroke-width', '2px');
}

/////////////////////////
let obsDistWrap = attWraps.selectAll('.observed-dist-wrap').data(d=> {
  
        let max = d3.max(d.data.flatMap(f=> f.leaves.map(m=> m.realVal)));
        let min = d3.min(d.data.flatMap(f=> f.leaves.map(m=> m.realVal)));

        let x = d3.scaleLinear().domain([min, max]).range([0, 200]);
    
        let histogram = d3.histogram()
        .value(function(d) { return d.realVal; })  
        .domain(x.domain())  
        .thresholds(x.ticks(10)); 
        
        let leafData = d.data.map(m=> {
            let newLeaves = [...m.leaves].map(leaf => {
                leaf.x = x;
                leaf.group = m.group;
                return leaf;
            });
            return {'binData':histogram(m.leaves), 'data': newLeaves, 'group': m.group, 'xScale': x};
        });
        return [{'data':leafData, 'xScale': x}];
    }).join('g').classed('observed-dist-wrap', true);

    obsDistWrap.attr('transform', 'translate(970, 0)');
  
    let xAxis = obsDistWrap.selectAll('g.axis-x').data(d=> [d]).join('g').classed('axis-x', true);
    xAxis.attr('transform', 'translate(0, 50)')
    xAxis.each((d, i, nodes)=> {
        d3.select(nodes[i]).call(d3.axisBottom(d.xScale).ticks(5))
    });

    let distGroups = obsDistWrap.selectAll('.observed-group').data(d=> {
        return d.data.map((m, i, n)=> {
            m.index = i;
            m.groupLength = n.length;
            return m;
        });
    }).join('g').classed('observed-group', true);

    let lines = distGroups.selectAll('.line').data(d => {
            let mean = d3.mean(d.data.map(r=> r.realVal))
            let vals = {'mean': mean, 'group':d.group, 'x':d.xScale}
            return [vals];
    }).join('rect').classed('line', true).attr('transform', (d, i)=> 'translate('+(d.x(d.mean)-1.5)+',0)')
    .attr('height', 50).attr('width', 3).attr('fill', d=> d.group.color).style('opacity', '0.4')

    let circWrap = distGroups.selectAll('.circ-wrap').data((d, i)=> [d]).join('g').classed('circ-wrap', true).attr('transform', (d, i, n)=> {
        let move = d3.scaleLinear().domain([0, d.groupLength]).range([0, 60]);
        return 'translate(0,'+(move(d.index+0.5))+')'});

    let distCirc = circWrap.selectAll('circle.disDots').data(d=> d.data).join('circle').attr('r', 3)
    .attr('cx', (d, i) => {
        return d.x(d.realVal);
    }).attr('cy', (d, i, n)=> {
        return 0;
    }).attr('fill', d=> d.group.color);
}
export function renderSelectedView(pathData, otherPaths, selectedDiv, scales, moveMetric) {

    let attributeHeight = 50;

    let selectedSpecies = pathData.flatMap(p => p.filter(f => f.leaf === true).map(n => n.node));
    let treeNodes = d3.select('#sidebar').select('svg').selectAll('.node');
    treeNodes.filter(node => selectedSpecies.indexOf(node.data.node) > -1).classed('selected', true);

    ////FILTER MASTER TO HIDE ATTRIBUTES THAT ARE DESELECTED FROM FILTERBAR
    let attrHide = filterMaster.filter(f => f.type === 'hide-attribute').length > 0 ? filterMaster.filter(f => f.type === 'hide-attribute').map(m => m.attribute) : [];
    let attrFilter = attrHide.length > 0 ? scales.filter(sc => {
        return attrHide.indexOf(sc.field) === -1;
    }).map(m => m.field) : null;

    ////IF THE SELECTED DIV IS THERE ALREADY USE THAT/////
    let selectedToolTest = selectedDiv.select('.selected-toolbar');
    let selectedTool = selectedToolTest.empty() ? selectedDiv.append('div').classed('selected-toolbar', true) : selectedToolTest;
    selectedTool.selectAll('*').remove();

    ///////////////////////
    let sortByDistanceDiv = selectedTool.append('div').style('display', 'inline-block');
    sortByDistanceDiv.append('text').text('Topology: ');
    let sortByDistanceButton = sortByDistanceDiv.append('button').classed('btn btn-secondary btn-sm', true);
    sortByDistanceButton.text('Sort Most to Least');
    sortByDistanceButton.on('click', () => sortPaths(sortByDistanceButton));

    /////////////Sorting by attribute///////////////
    let attrKeys = scales.map(m => m.field);
    let attrSortWrap = selectedTool.append('div').style('display', 'inline-block');
    attrSortWrap.append('h6').text('Sort by: ').style('display', 'inline');

    let radioDiv = attrSortWrap.selectAll('div.attr-radio').data(attrKeys).join('div').classed('attr-radio form-check form-check-inline', true);
    let radio = radioDiv.append('input').attr('type', 'radio').property('name', 'attribute-radio-sort').property('value', d => d).attr('id', (d, i) => 'radio-' + i).classed("form-check-input", true);
    radioDiv.append('label').text(d => d).property('for', (d, i) => 'radio-' + i).classed("form-check-label", true);

    let svgTest = selectedDiv.select('svg.select-svg');
    let svg = svgTest.empty() ? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

    svg.selectAll('*').remove();

    let branchFrequency = pathData.flatMap(row => row.flatMap(f => f.node)).reduce(function(acc, curr) {
        if (typeof acc[curr] == 'undefined') {
            acc[curr] = 1;
        } else {
            acc[curr] += 1;
        }
        return acc;
    }, {});

    ///RENDERING SELECTED PATHS////
    if (pathData.length === 1) {

        /////////////////////////////////////////////////
        let selectWrap = svg.append('g').classed('select-wrap', true);
        selectWrap.attr('transform', (d, i) => 'translate(0,20)');

        ///Scales for circles ///
        let circleScale = d3.scaleLog().range([6, 14]).domain([1, d3.max(Object.values(branchFrequency))]);

        let selectedGroups = selectWrap.selectAll('.paths').data(pathData).join('g').classed('paths', true);

        let pathBars = selectedGroups.append('rect').classed('path-rect', true);
        pathBars.attr('y', -8);

        //////////
        ///Selecting species
        /////////
        addRemoveBubble(selectedGroups, scales, moveMetric)

        /////////
        selectedGroups.on('mouseover', function(d, i) {
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let treeLinks = d3.select('#sidebar').selectAll('.link');
            treeNode.filter(f => {
                return d.map(m => m.node).indexOf(f.data.node) > -1;
            }).classed('hover', true);
            treeLinks.filter(f => d.map(m => m.node).indexOf(f.data.node) > -1).classed('hover', true);
            return d3.select(this).classed('hover', true);
        }).on('mouseout', function(d, i) {
            let treeNode = d3.select('#sidebar').selectAll('.node').classed('hover', false);
            let treeLinks = d3.select('#sidebar').selectAll('.link').classed('hover', false);
            return d3.select(this).classed('hover', false);
        });

        let speciesTitle = selectedGroups.append('text').text(d => {
            let string = d.filter(f => f.leaf === true)[0].label;
            return string.charAt(0).toUpperCase() + string.slice(1);
        });

        speciesTitle.attr('x', 25).attr('y', 15);

        let timelines = selectedGroups.append('g').classed('time-line', true);
        timelines.attr('transform', (d, i) => 'translate(150, 0)');

        let lines = timelines.append('line')
            .attr('x1', 0)
            .attr('x2', 1000)
            .attr('y1', 15)
            .attr('y2', 15);

        let nodeGroups = timelines.selectAll('.node').data((d) => d).join('g').classed('node', true);

        nodeGroups.attr('transform', (d) => {
            let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
            let distance = x(d.edgeMove);
            return 'translate(' + distance + ', 10)';
        });

        let circle = nodeGroups.append('circle').attr('cx', 0).attr('cy', 0).attr('r', d => {
            return circleScale(branchFrequency[d.node]);
        }).attr('class', (d, i) => 'node-' + d.node);

        circle.on('mouseover', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            let treeNode = d3.select('#sidebar').selectAll('.node');
            let selectedBranch = treeNode.filter(f => f.data.node === d.node).classed('selected-branch', true);
            return hovers.classed('hover-branch', true);
        }).on('mouseout', function(d, i) {
            let hovers = nodeGroups.filter(n => n.node === d.node);
            d3.selectAll('.selected-branch').classed('selected-branch', false);
            return hovers.classed('hover-branch', false);
        });

        let speciesNodeLabel = nodeGroups.filter(f => f.label != undefined).append('text').text(d => {
            let string = d.label.charAt(0).toUpperCase() + d.label.slice(1);
            return string;
        }).attr('x', 10).attr('y', 5);

        selectedGroups.attr('transform', (d, i) => 'translate(0,' + (i * 60) + ')');

        let nodes = selectedGroups.select('.time-line').selectAll('.node');
        nodes.on('mouseover', (d, i) => {

            let nearest = otherPaths.filter(path => {
                let nodearray = path.flatMap(f => f.node);
                return nodearray.indexOf(d.node) > -1;
            });

            let nearestA = nearest[0];
            let nearestB = nearest[1];
           
        });

        //////PLAYING WITH FUNCTION TO CALULATE DISTANCES

        /// LOWER ATTRIBUTE VISUALIZATION ///
        let attributeWrapper = selectedGroups.append('g').classed('attribute-wrapper', true);
        let attData = formatAttributeData(pathData, scales, attrFilter);
        let attributeGroups = renderAttributes(attributeWrapper, attData, scales, null);

        selectedGroups.attr('transform', (d, i) => 'translate(10,' + (i * ((attributeHeight + 5) * (Object.keys(d[1].attributes).length + 1))) + ')');

        drawContAtt(attributeGroups);
        drawDiscreteAtt(attributeGroups, scales, false, false);

        //sizeAndMove(svg, attributeWrapper, pathData, (attrMove * attributeHeight));
        //tranforming elements
        svg.style('height', ((pathData.length + attributeGroups.data().map(m => m[0]).length) * 50) + 50 + 'px');
        selectedDiv.style('height', ((pathData.length + attributeGroups.data().map(m => m[0]).length) * 50) + 50 + 'px');
        attributeWrapper.attr('transform', (d) => 'translate(140, 25)');
        d3.selectAll('.selected-path').classed('selected-path', false);

        ////RADIO BUTTON THAT COLORS BASE DON ATTRIBUTE VALUE////
        radio.on('click', (d, i) => {
            let leaf = pathData.map(node => node.filter(d => d.leaf === true)[0])[0];
            let sorted = [...otherPaths].sort(function(a, b) {
                return a.filter(n => n.leaf === true)[0].attributes[d].realVal - b.filter(n => n.leaf === true)[0].attributes[d].realVal;
            });
    
            let main = d3.select('div#main');
            /// LOWER ATTRIBUTE VISUALIZATION ///
            drawPathsAndAttributes(sorted.reverse(), main, scales, moveMetric);
            main.style('padding-top', '250px');
    
            let paths = main.select('svg#main-path-view').selectAll('.paths');
    
            let high = paths.filter(path => {
                let leafOther = path.filter(node => node.leaf === true)[0];
                return leafOther.attributes[d].realVal > leaf.attributes[d].realVal;
            });
            high.classed('high', true);
    
            let highLeaves = high.data().map(path => path.filter(f => f.leaf === true)[0].node);
    
            treeNodes.filter(f => highLeaves.indexOf(f.data.node) > -1).classed('high', true);
    
            let low = paths.filter(path => {
                let leafOther = path.filter(node => node.leaf === true)[0];
                return leafOther.attributes[d].realVal < leaf.attributes[d].realVal;
            });
            low.classed('low', true);
    
            let lowLeaves = low.data().map(path => path.filter(f => f.leaf === true)[0].node);
    
            treeNodes.filter(f => lowLeaves.indexOf(f.data.node) > -1).classed('low', true);
    
            let same = paths.filter(path => {
                let leafOther = path.filter(node => node.leaf === true)[0];
                return leafOther.attributes[d].realVal === leaf.attributes[d].realVal;
            });
            same.classed('same', true);
        });
      
        return pathData;

    } else if(pathData.length > 1 && pathData.length < 5) {
       
        let commonNodeStart = getCommonNodes(pathData);
        renderSelectedTopology(commonNodeStart, svg, scales, branchFrequency, moveMetric);

        /////END PATH RENDER///////
        let attWrap = svg.append('g').classed('attribute-wrapper', true);
        let attributeData = commonNodeStart[commonNodeStart.length - 1].children.map(ch => {
            return [...commonNodeStart].concat(ch);
        });

        let attData = formatAttributeData(pathData, scales, attrFilter);
        let attDataComb = attData[0].map((att, i)=> {
            let species = pathData[0].filter(f=> f.leaf === true)[0].label;
            att[att.length - 1].offset = 0;
            let attribute = {'label': att[att.length-1].label, 'type':att[att.length-1].type, 'data': [{'species': species, 'paths': att}]}
            for(let index = 1; index < attData.length; index++ ){
                let species = pathData[index].filter(f=> f.leaf === true)[0].label;
                let last = attData[index][i].length - 1
                attData[index][i][last].offset = (index * 8);
                attribute.data.push({'species': species, 'paths': attData[index][i]})
            }
            return attribute;
        });

        function findMaxState(states, offset){
            let maxP = d3.max(states.map(v=> v.realVal));
            let notMax = states.filter(f=> f.realVal != maxP);
            let winState = states[states.map(m=> m.realVal).indexOf(maxP)]
            winState.other = notMax;
            winState.offset = offset;
    
            return winState;
        }

       let mappedDis = attDataComb.map(dis=> {
           dis.data = dis.data.map((spec, i)=> {
               spec.paths = spec.paths.map(m=> {
                if(dis.type === 'discrete'){
                    let offset = 5 * i;
                    let maxProb = m.states? {'realVal': 1.0, 'state': m.winState, 'color':m.color, 'edgeMove': m.edgeMove, 'offset':m.offset, 'leaf': true} : findMaxState(m, offset); 
                    return maxProb;
                }else{
                    return m;
                }
            });
            return spec;
           });
           return dis;
       });

       let attGroups = attWrap.selectAll('g').data(mappedDis).join('g').classed('attr', true);
       attGroups.attr('transform', (d, i) => 'translate(145,' + (i * (attributeHeight + 10)) + ')');

       attGroups.append('text')
        .text(d=> d.label)
        .style('text-anchor', 'end')
        .style('font-size', 11)
        .attr('transform', 'translate(0,'+(attributeHeight/2)+')');

       let wrapRect = attGroups.append('rect').attr('width', 1010);
       wrapRect.attr('height', attributeHeight);
       wrapRect.style('fill', '#fff');
       wrapRect.style('stroke', 'gray');
       wrapRect.style('opacity', 0.5);

       attGroups.append('line').classed('half', true).attr('x1', 0).attr('y1', 22).attr('x2', 1010).attr('y2', 22);
     
       let speciesGrp = attGroups.selectAll('g').data(d=> {
            d.data = d.data.map(m=> {
                m.type = d.type;
                return m;
            });
            return d.data;
        }).join('g').classed('species', true);

       let lineGenD = d3.line()
       .x(d=> {
           let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
           let distance = d.edgeMove;
           return x(distance);
        })
       .y(d=> {
           let y = d3.scaleLinear().domain([0, 1]).range([attributeHeight-2, 1]);
           return y(d.realVal) + d.offset;
       });

       let lineGenC = d3.line()
       .x(d=> {
           let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
           let distance = d.edgeMove;
           return x(distance);
        })
       .y(d=> {
           let y = d.yScale;
           y.range([attributeHeight-2, 1]);
           return y(d.realVal) + 2;
       });

       let innerStatePaths = speciesGrp.append('path')
       .attr("d", d=> {
            return (d.type === 'discrete') ? lineGenD(d.paths) : lineGenC(d.paths);
        })
       .attr("class", (d, i)=> {
            return d.species + " inner-line"})
       .style('stroke-width', 0.7)
       .style('fill', 'none')
       .style('stroke', 'gray');

       innerStatePaths.on('mouseover', (d, i, n)=> {
           d3.select(n[i]).classed('selected', true);
       }).on('mouseout', (d, i, n)=> {
            d3.select(n[i]).classed('selected', false);
       });

       let disGroup = speciesGrp.filter(sp=> {
        return sp.type === 'discrete';
        });

       let branchGrpDis = disGroup.selectAll('.branch').data(d=>d.paths).join('g').classed('branch', true);

       branchGrpDis.attr('transform', (d)=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
            let distance = x(d.edgeMove);
            return 'translate('+distance+', 0)';
        });

        let bCirc = branchGrpDis.append('circle').attr('r', 5).attr('cy', (d, i)=> {
            let y = d3.scaleLinear().domain([0, 1]).range([attributeHeight - 5, 2]);
            return y(d.realVal) + d.offset;
        }).attr('cx', 5);

        bCirc.attr('fill', (d, i)=> d.color);

        let otherCirc = branchGrpDis.filter(f=> f.leaf != true).selectAll('.other').data(d=> d.other).join('circle').classed('other', true);
        otherCirc.attr('r', 4).attr('cx', 5).attr('cy', (c, i)=> {
            let y = d3.scaleLinear().domain([1, 0]);
            y.range([0, (attributeHeight-5)]);
                return y(c.realVal);
            }).attr('fill', (c)=> c.color).style('opacity', 0.1);

        otherCirc.on("mouseover", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(200)
              .style("opacity", .9);
            let f = d3.format(".3f");
            tool.html(d.state + ": " + f(d.realVal))
              .style("left", (d3.event.pageX + 10) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
            })
          .on("mouseout", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
            });

        bCirc.on("mouseover", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(200)
              .style("opacity", .9);
            let f = d3.format(".3f");
            tool.html(d.state + ": " + f(d.realVal))
              .style("left", (d3.event.pageX + 10) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
            })
          .on("mouseout", function(d) {
            let tool = d3.select('#tooltip');
            tool.transition()
              .duration(500)
              .style("opacity", 0);
            });
        
        /////AXIS ON HOVER////
        branchGrpDis.on('mouseover', (d, i, n)=> {
            let y = d3.scaleLinear().domain([1, 0]);
            y.range([0, (attributeHeight-5)]);
            svg.selectAll('path.inner-line.'+ d.species).attr('stroke', 'red');
            svg.selectAll('path.inner-line.'+ d.species).classed('selected', true);
            d3.select(n[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(3));
            d3.select(n[i]).selectAll('.other').style('opacity', 0.7);
        }).on('mouseout', (d, i, n)=> {
            d3.select(n[i]).select('g.y-axis')
            d3.select(n[i]).select('g.y-axis').remove();
            d3.selectAll('path.inner-line.'+ d.species).attr('stroke', 'gray');
            d3.selectAll('path.inner-line.'+ d.species).classed('selected', false);
            d3.selectAll('.other').style('opacity', 0.1);
        });

        let conGroup = speciesGrp.filter(sp=> {
            return sp.type === 'continuous';
        });

        let branchGrpCon = conGroup.selectAll('.branch').data(d=>d.paths).join('g').classed('branch', true);

        branchGrpCon.attr('transform', (d)=> {
         let x = d3.scaleLinear().domain([0, 1]).range([0, 1000]);
             let distance = x(d.edgeMove);
             return 'translate('+distance+', 0)';
         });

         /////AXIS ON HOVER////
        branchGrpCon.on('mouseover', (d, i, n)=> {
            let y = d.yScale;
            y.range([0, (attributeHeight-5)]);
            svg.selectAll('path.inner-line.'+ d.species).attr('stroke', 'red');
            svg.selectAll('path.inner-line.'+ d.species).classed('selected', true);
            d3.select(n[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(3));
            d3.select(n[i]).selectAll('.other').style('opacity', 0.7);
        }).on('mouseout', (d, i, n)=> {
            d3.select(n[i]).select('g.y-axis')
            d3.select(n[i]).select('g.y-axis').remove();
            d3.selectAll('path.inner-line.'+ d.species).attr('stroke', 'gray');
            d3.selectAll('path.inner-line.'+ d.species).classed('selected', false);
            d3.selectAll('.other').style('opacity', 0.1);
        });

        let MeanRect = branchGrpCon.append('rect');
   
        MeanRect.attr('width', 10).attr('height', 3);
        MeanRect.attr('y', (d, i) => {
            let scale = scales.filter(s=> s.field === d.label)[0];
            let y = d3.scaleLinear().domain([scale.min, scale.max]).range([attributeHeight, 0])
            return y(d.realVal);
        });

        let confiBars = branchGrpCon.filter(f=> f.leaf != true).append('rect');
        confiBars.attr('width', 10).attr('height', (d, i)=> {
            let scale = scales.filter(s=> s.field === d.label)[0];
            let y = d3.scaleLinear().domain([scale.min, scale.max]).range([attributeHeight, 0]);
            return y(d.lowerCI95) - y(d.upperCI95);
        });

        confiBars.attr('y', (d, i)=> {
            let scale = scales.filter(s=> s.field === d.label)[0];
            let y = d3.scaleLinear().domain([scale.min, scale.max]).range([attributeHeight, 0]);
            return y(d.upperCI95);
        })
        confiBars.style('opacity', 0.1);

        //tranforming elements
        svg.style('height', ((pathData.length + attGroups.data().map(m => m[0]).length) * 50) + 50 + 'px');
        selectedDiv.style('height', ((pathData.length + attGroups.data().map(m => m[0]).length) * 50) + 50 + 'px');
        attWrap.attr('transform', (d) => 'translate(0, 60)');
        d3.selectAll('.selected-path').classed('selected-path', false);

        return commonNodeStart;


    }else{
       
        /////////
        //getting common node
        ///

        let maxBranch = d3.max(pathData.map(p => p.length));
        let longestBranch = pathData.filter(path => path.length === maxBranch)[0];
        let startBranch = longestBranch.filter(f=> f.leaf != true);
        let commonNodeStart = startBranch;
        //FIND THE COMMON BRANCHES BETWEEN ALL OF THE SELECTED///
        pathData.map(path => {
            commonNodeStart = [...path].filter(f => {
                return (commonNodeStart.map(m => m.node).indexOf(f.node) > -1) & f.leaf != true });
        });

        svg.remove();
        let remove = selectedTool.append('g').classed('x-icon', true);
        remove.attr('transform', 'translate(15, 10)');
        remove.append('circle').attr('r', 7).attr('fill', '#fff');
        remove.append('text').text('x').attr('transform', 'translate(-5, 5)');
        remove.style('cursor', 'pointer');
        remove.on('click', (d, i, n) => {
            d3.selectAll('.high').classed('high', false);
            d3.selectAll('.low').classed('low', false);
            treeNodes.select('.selected').classed('selected', false);
            pathSelected(null, dataMaster[0], scales, moveMetric);
        });        

        /////////
        renderDistibutions(pathData, selectedDiv, scales, moveMetric);
        selectedDiv.style('height', '550px');

        d3.selectAll('.selected-path').classed('selected-path', false);

        ////RADIO BUTTON THAT COLORS BASE DON ATTRIBUTE VALUE////
        radio.on('click', (d, i) => {
            let leaf = pathData.map(node => node.filter(d => d.leaf === true)[0])[0];
            let sorted = [...otherPaths].sort(function(a, b) {
                return a.filter(n => n.leaf === true)[0].attributes[d].realVal - b.filter(n => n.leaf === true)[0].attributes[d].realVal;
            });
    
            let main = d3.select('div#main');
            /// LOWER ATTRIBUTE VISUALIZATION ///
            drawPathsAndAttributes(sorted.reverse(), main, scales, moveMetric);
            main.style('padding-top', '250px');
    
            let paths = main.select('svg#main-path-view').selectAll('.paths');
    
            let high = paths.filter(path => {
                let leafOther = path.filter(node => node.leaf === true)[0];
                return leafOther.attributes[d].realVal > leaf.attributes[d].realVal;
            });
            high.classed('high', true);
    
            let highLeaves = high.data().map(path => path.filter(f => f.leaf === true)[0].node);
    
            treeNodes.filter(f => highLeaves.indexOf(f.data.node) > -1).classed('high', true);
    
            let low = paths.filter(path => {
                let leafOther = path.filter(node => node.leaf === true)[0];
                return leafOther.attributes[d].realVal < leaf.attributes[d].realVal;
            });
            low.classed('low', true);
    
            let lowLeaves = low.data().map(path => path.filter(f => f.leaf === true)[0].node);
    
            treeNodes.filter(f => lowLeaves.indexOf(f.data.node) > -1).classed('low', true);
    
            let same = paths.filter(path => {
                let leafOther = path.filter(node => node.leaf === true)[0];
                return leafOther.attributes[d].realVal === leaf.attributes[d].realVal;
            });
            same.classed('same', true);
        });
        //tranforming elements
        svg.style('height', ((pathData.length + attributeGroups.data().map(m => m[0]).length) * 50) + 50 + 'px');
        selectedDiv.style('height', ((pathData.length + attGroups.data().map(m => m[0]).length) * 50) + 50 + 'px');
        attWrap.attr('transform', (d) => 'translate(140, 25)');
        d3.selectAll('.selected-path').classed('selected-path', false);

        return commonNodeStart;
    }
    
}

function sortPaths(sortButton) {
    if (sortButton.text() === 'Sort Most to Least') {
        sortButton.text('Sort Least to Most');
    } else {
        sortButton.text('Sort Most to Least');
    }
}