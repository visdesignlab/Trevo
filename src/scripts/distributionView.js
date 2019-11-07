import '../styles/index.scss';
import {formatAttributeData, maxTimeKeeper} from './dataFormat';
import * as d3 from "d3";
import {filterMaster} from './filterComponent';

const dimensions = {
    height: 80,
    observedWidth : 200,
    predictedWidth : 800,
    margin : 20,
    squareDim : 15,
}

export function drawBranchPointDistribution(data, svg){

    let branchBar = svg.append('g').classed('branch-bar', true)//.attr('transform', 'translate(10, 10)');
    branchBar.append('rect').classed('point-dis-rect', true).attr('height', 25).attr('x', -10).attr('y', -10).attr('fill', '#fff');

    branchBar.append('line').attr('y1', 2).attr('y2', 2).attr('x1', '100').attr('x2', 890).attr('stroke', 'gray').attr('stroke-width', .25)
    branchBar.append('text').text('Root').attr('transform', 'translate(70, 7)');
    let leafLabel = branchBar.append('g').classed('leaf-label', true).attr('transform', 'translate(950, 7)');
    leafLabel.append('text').text('Leaves');

    let nodeLengthArray = [];
    let nodeDuplicateCheck = []

    data.map(path=> {
        path.filter(n=> n.leaf != true).map(node=> {
            if(nodeDuplicateCheck.indexOf(node.node) == -1){
                nodeDuplicateCheck.push(node.node);
                nodeLengthArray.push({'node': node.node, 'eMove': node.combLength });
            }
        })
    });

    let bPointScale = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, 795]);
    let pointGroups = branchBar.selectAll('g.branch-points').data(nodeLengthArray).join('g').attr('class', (d, i)=> d.node).classed('branch-points', true);
    pointGroups.attr('transform', (d, i) => {
        return `translate(${(105 + bPointScale(d.eMove))}, 0)`});
    pointGroups.append('circle').attr('r', 5).attr('fill', "rgba(123, 141, 153, 0.5)");
let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, 800]);
    let axis = d3.axisBottom(x);
    let axGroup = branchBar.append('g').call(axis)
    axGroup.attr('transform', 'translate(103, 10)');
    axGroup.select('path').attr('stroke-width', 0);

    return branchBar;
}

export function drawGroupLabels(pathData, svg, groupLabel){

    console.log('grouplabel', groupLabel)

    let cladeLabel = svg.append('g').classed('clade-label', true).attr('transform', 'translate(10, 0)');
    cladeLabel.append('rect').attr('width', 50).attr('height', (pathData.keys.length * (dimensions.height+ 15)))
    .attr('fill', 'gray')
    .style('opacity', 0.2)
    .on('mouseover', (d, i)=>{
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let treeLinks  = d3.select('#sidebar').selectAll('.link');
        treeNode.filter(f=> {
            if(f.data.leaf){
                let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0].value;
                return groupLabel.includes(test.states.state);
            }else{
                let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0]
                let testest = d3.entries(test.value.values).filter((f, i, n)=> {
                    let max = d3.max(n.map(m=> m.value));
                    return f.value === max;
                })[0];
                return groupLabel == testest.key;
            }
        }).classed('hover clade', true);
     
        treeLinks.filter(f=> {
            if(f.data.leaf){
                let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0].value;
                return groupLabel.includes(test.states.state);
            }else{
                let test = d3.entries(f.data.attributes).filter(f=> groupLabel.includes(f.key))[0]
                let testest = d3.entries(test.value.values).filter((f, i, n)=> {
                    let max = d3.max(n.map(m=> m.value));
                    return f.value === max;
                })[0];
                return groupLabel == testest.key;
            }
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
    .attr('transform', `translate(23, ${(pathData.keys.length * (dimensions.height+ 15)/2)}), rotate(-90)`);

}

export function groupDistributions(pathData, mainDiv, scales, groupAttr){
    let groupKeys = scales.filter(f=> f.field === groupAttr)[0].scales.map(s=> s.scaleName);
 
    let pathGroups = groupKeys.map(group => {
        let paths = pathData.filter(path => {
            return group.includes(path[path.length - 1].attributes[groupAttr].values[groupAttr]);
        });
        let groupBins = binGroups(paths, group, scales);
        return {'label': group, 'paths': paths, 'groupBins': groupBins}
    });

    let groupDivs = mainDiv.selectAll('.group-div').data(pathGroups).join('div').classed('group-div', true);

    groupDivs.each((d, i, n)=> {
        let group = d3.select(n[i]);
        group.style('text-align', 'center');
        group.append('text').text(d.label);
        group.append('text').text(" Shown:" + d.paths.length);

        let svg = group.append('svg');
        svg.attr('class', 'main-summary-view');
        svg.attr('id', `${d.label}-svg`);
        svg.attr('height', (d.groupBins.keys.length * (dimensions.height + 5)));
    
        let branchBar = drawBranchPointDistribution(d.paths, svg);
        branchBar.attr('transform', 'translate(0, 10)')

        renderDistibutions(d.groupBins, d.label, group, branchBar, scales);
    });
}

export function binGroups(pathData, groupLabel, scales){
    let attrHide = filterMaster.filter(f=> f.type === 'hide-attribute').map(m=> m.attribute);
    
    let keys = scales.map(s=> s.field).filter(f=> attrHide.indexOf(f) === -1);

    let newNormed = [...pathData];
    let keysToHide = attrHide.length > 0 ? scales.filter(f=> attrHide.indexOf(f.field) === -1).map(m=> m.field) : null;

    formatAttributeData(newNormed, scales, keysToHide);

    let maxBranch = d3.max(newNormed.map(p=> p.length)) - 1;
    let medBranchLength = d3.median(newNormed.map(p=> p.length));
    let max = maxTimeKeeper[0]

    let normBins = new Array(medBranchLength).fill().map((m, i)=> {
            let step = max / medBranchLength;
            let base = (i * step);
            let top = ((i + 1)* step);
            return {'base': base, 'top': top, 'binI': i }
    });

    let internalNodes = newNormed.map(path => path.filter(node=> (node.leaf != true) && (node.root != true)));
    let leafNodes = newNormed.flatMap(path => path.filter(node=> node.leaf === true));
    let rootNodes = newNormed.flatMap(path => path.filter(node=> node.root === true));

    normBins.map((n, i)=> {
        let edges = internalNodes.flatMap(path => path.filter(node=> {
                return node.combLength > n.base && node.combLength <= n.top;
        } ));
        n.data = edges;
        return n;
    });

    let sortedBins = keys.map(key=> {
        let scale = scales.filter(f=> f.field === key)[0];
    
        let mapNorm = normBins.map(bin => {
            if(bin.data.length > 0){
                bin.fData = bin.data.map(d=> {
                    return d.attributes[key];
                })
            }else{
                bin.fData = [];
            }
            return {'data': bin.fData, 'range': [bin.base, bin.top], 'index': bin.binI, 'key': key };
        });
       
        let leafAttr = leafNodes.map(m=> m.attributes[key]);
     
        let leafData = {'data': leafAttr}
   
        if(scale.type === 'continuous'){
           
            let x = d3.scaleLinear().domain([scale.min, scale.max]).range([0, dimensions.height]);
    
            let histogram = d3.histogram()
            .value(function(d) { return d.values.realVal; })  
            .domain(x.domain())  
            .thresholds(x.ticks(20)); 
  
            mapNorm.forEach(n=> {
                n.type = scale.type;
                n.bins = histogram(n.data);
                n.domain = [scale.max, scale.min];
                return n;
            });

            //Histogram for observed////
            let maxO = d3.max(leafAttr.flatMap(v=> +v.values.realVal));
            let minO = d3.min(leafAttr.flatMap(v=> +v.values.realVal));
            let xO = d3.scaleLinear().domain([minO, maxO]).range([0, dimensions.height])

            let histogramO = d3.histogram()
            .value(function(d) { 
                return +d.values.realVal; })  
            .domain(xO.domain())  
            .thresholds(xO.ticks(20)); 

            leafData.bins = histogramO(leafAttr);
      
            let newK = {'key': key, 'branches': [...mapNorm], 'type': scale.type, 'leafData': leafData, 'rootData': rootNodes.map(m=> m.attributes[key])[0]}

            return newK;

        }else{
            //HANDLING DISCRETE//
            // let states = leafAttr[0].states;
            let states = leafAttr[0].scales.scales;
           
            let stateKeys = states[0].state? states.map(s=> s.state) : states.map(s=> s.scaleName)
          
            let rootNode = rootNodes[0].attributes[key];
            mapNorm.bins = null
            leafData.bins = states.map(s=> {
                return leafAttr.filter(f=> s.scaleName.includes(f.states.state))});
   
            let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.height]);
           
            mapNorm.map(n=> {
                n.type = scale.type;
                
                let colors = scale.stateColors;
                n.bins = stateKeys.map(state=> {
                    let test = n.data.flatMap(m=> Object.entries(m.values).filter(f=> f[0] === state))
                    .map(m=> {
                        return {'state': m[0], 'value':m[1]}
                    });
                    return {state: test, color : colors.filter(f=> f.state === state)[0], max:80};
                });
 
                return n;
            });

            let newK = {'key': key, 
                        'branches': [...mapNorm], 
                        'type': scale.type, 
                        'leafData': leafData, 
                        'rootData': rootNodes.map(m=> m.attributes[key])[0],
                        'stateKeys': stateKeys,
                        'maxCount': d3.max(mapNorm.map(n=> n.data.length))
                    }
            return newK;
        }

    });
    sortedBins.group = groupLabel;
    sortedBins.medBranchLength = medBranchLength;
    sortedBins.keys = keys;
    return sortedBins;
}
/**
 * 
 * @param {*} pathData 
 * @param {*} groupLabel 
 * @param {*} mainDiv 
 * @param {*} scales 
 */

export function renderDistibutions(pathData, groupLabel, mainDiv, branchBar, scales){

    mainDiv.classed(groupLabel, true);
    let svg = mainDiv.select(`#${groupLabel}-svg`);

    //     ///////RENDERING//////////
    
    let branchScale = d3.scaleLinear().domain([0, pathData.medBranchLength]).range([0, 760]);
    let pointGroups = branchBar.selectAll('g.branch-points');
  
    let wrap = svg.append('g').classed('summary-wrapper', true);
    wrap.attr('transform', 'translate(10, 50)');

    console.log(pathData)

    let binnedWrap = wrap.selectAll('.attr-wrap').data(pathData).join('g').attr('class', d=> d.key + ' attr-wrap');

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
    
    let label = binnedWrap.append('text').text(d=> d.key)
    .attr('y', 40).attr('x', 80)
    .style('text-anchor', 'end')
    .style('font-size', 11);

    drawGroupLabels(pathData, svg, groupLabel);

//     let predictedWrap = binnedWrap.append('g').classed('predicted', true);
//     predictedWrap.attr('transform', 'translate(25, 0)');
//     predictedWrap.filter(f=> f.type === 'discrete').append('g').classed('win-line', true);

//     //ROOT RENDERING
//     let root = predictedWrap.selectAll('g.root').data(d=> {
//         return [d.rootData]}).join('g').classed('root', true);
//     root.attr('transform', `translate(60,0)`);

//     let contRoot = root.filter(f=> f.type === "continuous");
//     contRoot.append('rect').attr('height', 90).attr('width', 12).attr('fill', '#fff').style('stroke-width', '0.5px').style('stroke', 'black')//.attr('x', 70);

//     let rootRange = contRoot.append('rect')
//         .attr('width', 12)
//         .attr('height', d=> {
//             let newy = d.scales.yScale;
//             newy.range([80, 0]);
//             return newy(d.values.lowerCI95) - newy(+d.values.upperCI95)
//         }).attr('transform', (d, i) => {
//             let newy = d.scales.yScale;
//             newy.range([80, 0]);
//             return 'translate(0,'+newy(+d.values.upperCI95)+')'
//         }).style('opacity', 0.5).attr('fill', "rgba(133, 193, 233)");

//         let rootAv = contRoot.append('rect').attr('width', 12).attr('height', 3);
    
//         rootAv.attr('transform', (d, i) => {
//                 let newy = d.scales.yScale;
//                 newy.range([height, 0]);
//                 let mean = +d.values.realVal;
//                 return 'translate(0,'+newy(mean)+')';
//         }).attr('fill', '#004573');

//        // Discrete Root
//     let disRoot = root.filter(f=> f.type === "discrete");
//     let rootStateGroups = disRoot.selectAll('g.root-state-groups').data(d=> {
//         return Object.entries(d.values)}).join('g').classed('root-state-groups', true);

//     rootStateGroups.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(squareDim+2))})`);
//     let rootRects = rootStateGroups.append('rect').attr('height', squareDim).attr('width', squareDim);
//     rootRects.attr('fill', (d, i)=> {
//             return `rgba(89, 91, 101, ${d[1]})`;
//         }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);

//     let branchGroup = predictedWrap.selectAll('g.branch-bin').data(d=> {
//             return d.branches}).join('g').classed('branch-bin', true);

//     branchGroup.attr('transform', (d, i, n)=> {
//             return 'translate('+(100 + branchScale(i))+', 0)'});

//     let discreteDist = branchGroup.filter(f=> f.type === 'discrete');
//     let stateBinsPredicted = discreteDist.selectAll('g.state-bins')
//         .data(d=> d.bins).join('g')
//         .classed('state-bins', true);

//     stateBinsPredicted.attr('transform', (d, i)=> `translate(0, ${3.5+(i*(squareDim+2))})`);

//     stateBinsPredicted.append('rect').attr('height', squareDim).attr('width', squareDim).attr('fill', '#fff').attr('opacity', 1)
//     let stateRects = stateBinsPredicted.append('rect').classed('state-rect', true).attr('height', squareDim).attr('width', squareDim);
//     stateRects.attr('fill', (d, i, n)=> {
//         let sum = d3.sum(d.state.map(m=> m.value))
//         let av = sum / d.state.length;
//         let scale = d3.scaleLinear().domain([0, 1]).range([0, 1]);
//         return `rgba(89, 91, 101, ${scale(av)})`;
//     }).attr('stroke-width', 0.5).attr('stroke', `rgba(200, 203, 219, .9)`);

//     stateRects.on('mouseover', (d, i, n)=> {
//         let sum = d3.sum(d.state.map(m=> m.value))
//         let av = sum / d.state.length;
//         let tool = d3.select('#tooltip');
//         tool.transition()
//             .duration(200)
//             .style("opacity", .9);
        
//         let f = d3.format(".3f");
          
//         tool.html(`${d.state[0].state} : ${f(av)}`)
//             .style("left", (d3.event.pageX - 40) + "px")
//             .style("top", (d3.event.pageY - 28) + "px");
//         tool.style('height', 'auto');
//     }).on('mouseout', ()=>{
//         let tool = d3.select('#tooltip');
//         tool.transition()
//           .duration(500)
//           .style("opacity", 0);
//     });

//     let lastBranch = discreteDist.filter((d, i, n)=>{
//         return i === n.length - 1
//     }).selectAll('g.state-bins').append('text').text((d, i)=> {
//         return d.color.state;
//     });

//     discreteDist.each((d, i, node)=>{
//         let maxBin = 0;
//         let maxState = null;
//         console.log('discrete bins', d)
//         d.bins.map(m=> {
//             if(d3.sum(m.state.flatMap(s=> s.value)) > maxBin){
//                 maxBin = d3.sum(m.state.flatMap(s=> s.value));
//                 maxState = m.color.state;
//             }
//         });
  
//         let winStates = d3.select(node[i]).selectAll('g.state-bins')
//             .filter((f, j, n)=>{
//                 return f.color.state === maxState;
//             }).classed('win', true);

//         winStates.select('rect.state-rect').attr('fill', (c)=> {
//                 return c.color.color;
//             }).attr('opacity', (c)=>{
//                 let sum = d3.sum(c.state.flatMap(s=> s.value));
//                 return sum/c.state.length;
//             })

//     });

//     let disWrap = predictedWrap.filter(f=> f.type === 'discrete')
//     let pathKeeper = []
//     disWrap.each((d, i, node)=> {
//         let winPosArray = [];
//         d3.select(node[i]).selectAll('.win').each((r, j, n)=>{
//             winPosArray.push([n[j].getBoundingClientRect().x,(n[j].getBoundingClientRect().y-5)])
//             winPosArray.push([n[j].getBoundingClientRect().x + 15,(n[j].getBoundingClientRect().y-5)])
//         });
//         pathKeeper.push([...winPosArray]);
//         let lineThing = d3.line();
//         winPosArray[winPosArray.length -1][1] = winPosArray[winPosArray.length -1][1] + 15;
//         winPosArray[winPosArray.length -2][1] = winPosArray[winPosArray.length -2][1] + 15;
//         d.win = winPosArray;
//     });

//     disWrap.each((e, i, n)=> {
//         let lineThing = d3.line();
//         d3.select(n[i]).select('.win-line').append('path').attr('d', (d)=> lineThing(d.win))
//         .attr('transform', 'translate(-35, -'+n[i].getBoundingClientRect().y+')')
//         .attr('fill', 'none')
//         .attr('stroke', `rgba(200, 203, 219, .9)`)
//         .attr('stoke-width', 1)
//     })

//     lastBranch.attr('y', 10).attr('x', squareDim+4).style('font-size', 10);
    
//     //CONTIN PREDICTED
//     let continDist = branchGroup.filter(f=> f.type === 'continuous');

//     continDist.on('mouseover', (d, i, node)=> {
//         let list = d.data.map(m=> m.nodeLabels);
//         let selected = pointGroups.filter(p=> list.indexOf(p.node) > -1).classed('selected', true);
//         let treeNode  = d3.select('#sidebar').selectAll('.node');
//         let selectedBranch = treeNode.filter(f=> list.indexOf(f.data.node) > 0).classed('selected-branch', true);
//         let y = d3.scaleLinear().domain(d.domain).range([0, height])
//         let axis = d3.select(node[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5));
//     }).on('mouseout', (d, i, node)=> {
//         d3.selectAll(".branch-points.selected").classed('selected', false);
//         d3.selectAll('.selected-branch').classed('selected-branch', false);
//         d3.select(node[i]).select('.y-axis').remove();
//     });

//     var lineGen = d3.area()
//     .curve(d3.curveCardinal)
//     .x((d, i, n)=> {
//         let y = d3.scaleLinear().domain([0, n.length - 1]).range([0, height]).clamp(true);
//         return y(i); 
//     })
//     .y0(d=> {
//         return 0;
//     })
//     .y1(d=> {
//         let dat = Object.keys(d).length - 1
//         let x = d3.scaleLinear().domain([0, 50]).range([0, 80]).clamp(true);
//         return x(dat); 
//     });

//     continDist.each((d, i, nodes)=> {
//         let distrib = d3.select(nodes[i]).selectAll('g').data([d.bins]).join('g').classed('distribution', true);
//         distrib.attr('transform', 'translate(11, '+height+') rotate(-90)');
//         let path = distrib.append('path').attr('d', lineGen);
//         path.attr("fill", "rgba(133, 193, 233, .4)")
//         .style('stroke', "rgba(133, 193, 233, .9)");
//     });

//     let contRect = continDist.append('rect').attr('height', height).attr('width', 10).style('fill', 'none').style('stroke', 'gray');

//     let rangeRect = continDist.selectAll('rect.range').data(d=> {
//         let newData = d.data.map(m=> {
//             m.range = d.range;
//             return m;
//         })
//         return newData}).join('rect').classed('range', true);

//     rangeRect.attr('width', 10);
//     rangeRect.attr('height', (d, i)=> {
//         if(d.scales.yScale != undefined){
//             let newy = d.scales.yScale;
//             newy.range([80, 0]);
//             return newy(d.values.lowerCI95) - newy(d.values.upperCI95)
//         }else{
//             return 0;
//         }
//     }).attr('transform', (d, i) => {
        
//         let newy = d.scales.yScale;
//         newy.range([80, 0]);
//         return 'translate(0,'+newy(d.values.upperCI95)+')'
//     });

//     rangeRect.attr('fill', "rgba(133, 193, 233, .05)");

//     let avRect = continDist.append('rect').attr('width', 10).attr('height', (d, i)=> {
//         if(d.data[0] != undefined){
//             return 3;
//         }else{
//             return 0;
//         }
//     });

//     avRect.attr('transform', (d, i) => {
//         if(d.data[0] != undefined){
//             let newy = d.data[0].scales.yScale;
//             newy.range([height, 0]);
//             let mean = d3.mean(d.data.map(m=> +m.values.realVal));
//             return 'translate(0,'+newy(mean)+')';
//         }else{
//             return 'translate(0,0)';
//         }
//     }).attr('fill', '#004573');

//     ////OBSERVED CONTIUOUS/////
//     let observedWrap = binnedWrap.append('g').classed('observed', true);
//     observedWrap.attr('transform', (d, i, n)=> {
//         return 'translate('+ (predictedWidth + 150) +', 0)'})

//     let contOb = observedWrap.filter(f=> f.type === 'continuous');

//     let contBars = contOb.selectAll('g.ob-bars').data(d=> {
//         return d.leafData.bins}).join('g').classed('ob-bars', true);

//     let cRects = contBars.append('rect').attr('width', (d, i, n)=> {
//         let width = observedWidth / n.length;
//         return width;
//     }).attr('height', (d, i)=> {
//         let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(height - margin), 0])
//         return y(Object.keys(d).length - 2)
//     }).attr('fill', 'rgba(133, 193, 233, .5)');

//     contBars.attr('transform', (d, i, n)=> {
//         let movex = observedWidth / n.length;
//         let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(height - margin), 0])
//         let movey = height - y(Object.keys(d).length - 2);
//         return 'translate('+(movex * i)+', '+movey+')'});

//     contOb.each((d, i, nodes)=> {
//         let xvalues = d.leafData.data.map(m=> {
//             return +m.values.realVal});
//         let x = d3.scaleLinear().domain([d3.min(xvalues), d3.max(xvalues)]).range([0, observedWidth])
//         let y = d3.scaleLinear().domain([0, d3.max(d.leafData.bins.map(b=> Object.keys(b).length)) - 2]).range([(height - margin), 0]);
//         d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(x)).attr('transform', 'translate(0, '+height+')');
//         d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(4)).attr('transform', 'translate(0, '+margin+')');
//     });
    
// ////Observed Discrete////
//     let discOb =  observedWrap.filter(f=> f.type === 'discrete');
//     let discBars = discOb.selectAll('g.ob-bars').data(d=> {
//         return d.stateKeys.map((key, i)=>{
//             return {state: key, data: d.leafData.bins[i], max: d3.sum(d.leafData.bins.map(b=> b.length))}
//         });
//     }).join('g').classed('ob-bars', true);
//     let dRects = discBars.append('rect').attr('width', (d, i, n)=> {
//         let width = observedWidth / n.length;
//         return width;
//     }).attr('height', (d, i, n)=> {
//         let y = d3.scaleLinear().domain([0, d.max]).range([0, (height - margin)])
//         return y(d.data.length);
//     }).attr('fill', (d, i) => {
//         return d.data[0] != undefined ? d.data[0].color : '#fff';
//     }).attr('opacity', 0.3);

//     discBars.attr('transform', (d, i, n)=> {
//         let movex = observedWidth / n.length;
//         let y = d3.scaleLinear().domain([0, d.max]).range([0, (height - margin)])
//         let movey = (height) - y(d.data.length);
//         return 'translate('+(movex * i)+', '+movey+')'});

//     dRects.on('mouseover', (d, i, n)=> {
//         let state = d3.select('g.'+d[0].label).selectAll('g.state');
//         state.filter(f=> {
//             return f[0].state === d[0].winState}).attr('opacity', 0.8);
//         state.filter(f=> f[0].state != d[0].winState).attr('opacity', 0.1);
//         d3.select(n[i]).attr('opacity', 0.9);
//     }).on('mouseout', (d, i, n)=> {
//         d3.select(n[i]).attr('opacity', 0.3);
//         let state = d3.select('g.'+d[0].label).selectAll('g.state').attr('opacity', 0.6);
//     })

//     discOb.each((d, i, nodes)=> {
//             let labels = d.leafData.bins.map(b=> {
//                 return b[0] != undefined ? b[0].winState : '';
//                 })
//             let xPoint = d3.scalePoint().domain(d.stateKeys).range([0, observedWidth]).padding(.6)
//             let y = d3.scaleLinear().domain([0, d.leafData.data.length]).range([(height - margin), 0]);
//             d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(4)).attr('transform', 'translate(0, '+margin+')');
//             d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(xPoint)).attr('transform', 'translate(0, '+height+')');
//     });

 //   branchBar.attr('transform', 'translate(80, 10)');
    d3.selectAll('.summary-wrapper').attr('transform', 'translate(90, 50)');


}
