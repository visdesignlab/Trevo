
import '../styles/index.scss';
import {formatAttributeData, maxTimeKeeper} from './dataFormat';
import * as d3 from "d3";
import {filterMaster, getLatestData, getScales} from './filterComponent';
import { calculatedScalesKeeper } from '.';
import { drawBranchPointDistribution, dimensions, defaultBarColor, mirrorlineGen, lineGen, selectedClades, binGroups, renderDistStructure } from './distributionView';
import { renderTree } from './sidebarComponent';

const compareColors = [{light: '#F8C471', dark: '#F39C12'}, {light: '#A3E4D7', dark: '#17A589'}]


export function renderDistributionComparison(div, data, branchScale){
  

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
       
        let test = d3.select('#clade-show').selectAll('li').selectAll('input').filter((f, j, li)=> {
            return li[j].checked === true});

        let groups = test.data().map((m=> {
            let names = m.nodes.map(path => path[path.length - 1].node);
            let data = getLatestData().filter(path => names.indexOf(path[path.length - 1].node) > -1);
                
            let group = binGroups(data, m.field, calculatedScalesKeeper[0], 8);
            return {'label': m.field, 'paths': data, 'groupBins': group};
        }));
      
        d3.select('#summary-view').remove();
        renderDistStructure(d3.select('#main'), groups);  
       
        d3.select('#sidebar').selectAll('.node').remove();
        d3.select('#sidebar').selectAll('.link').remove();

        renderTree(null, true, false);
       
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
            let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.timeRange]);
           
            let move = d.type === 'continuous'? 100 : 70;
                return 'translate('+(move + (branchScale(i)) + x(step)) +', 0)'});

        let discreteDist = branchGroup.filter(f=> f.type === 'discrete').append('g');

        discreteDist.attr('transform', 'translate(5, 0)');

        let discreteWidth = 85;

        let discreteStateGroups = discreteDist.selectAll('g.group')
            .data(d=> {
                let keys = d.bins[0].value.map(m=> m.color.state);
            
                let bins = keys.map(k=> {
                    let newOb = {};
                    newOb.stateKey = k;
                    
                    newOb.bins = d.bins.map((m, i)=> {
                        let clade = {}
                        clade.index = i;
                        clade.value = m.value.filter(f=> f.color.state === k)[0];
                        clade.key = m.key;
                        return clade;
                    });
                    return newOb;
                });
              
                return bins;
            })
            .join('g')
            .classed('group', true)
            .attr('transform', (d, i)=> { 
                let move = d.index === 0 ? (-40 - (dimensions.squareDim/2)) : (dimensions.squareDim/2);
                return `translate(${move}, 0)`});

        let binRects = discreteStateGroups.append('rect')
            .attr('height', dimensions.squareDim)
            .attr('width', discreteWidth)
            .attr('stroke', 'black')
            .attr('fill', '#fff')
            .attr('opacity', 0.3);
            
            discreteStateGroups.attr('transform', (d, i)=> `translate(0, ${4+(i*(dimensions.squareDim+2))})`);

            discreteStateGroups.append('text')
            .text('1')
            .attr('transform', `translate(${discreteWidth + 2},10)`)
            .style('font-size', '10px')
            .style('opacity', 0.6);
        
            discreteStateGroups.append('text')
            .text('0')
            .attr('transform', `translate(-7,10)`)
            .style('font-size', '10px')
            .style('opacity', 0.6);

            let cladeStateGroups = discreteStateGroups.selectAll('.clade-dis').data(d=> {
                return d.bins}).join('g').classed('clade-dis', true);


            //////
            function randomizer(){
                var min= -.03; 
                var max= .03;  
                var random = Math.random() * (+max - +min) + +min; 
                return random;
            }
        

            let probabilityTicks = cladeStateGroups
            .selectAll('.prob-tick')
            .data((d, i, n)=> {
                
                let form = d3.format(".3f");
              
                let jitterMove = [...new Set(d.value.state.map(m=> +form(m.value)))].map(m=> {
                  
                    let arrayTest = d.value.state
                    .filter(f=> +form(f.value) === m)
                    .map(arr=> {
                    
                        arr.index = d.index;
                      //  arr.y = Math.random();
                      //  arr.x = randomizer();
                        return arr;
                    });
                    return arrayTest;
                })

            
                return jitterMove.flatMap(j=> j);
               

            }).join('circle').classed('prob-tick', true)
        
            probabilityTicks
                .attr('r', 2)
                .attr('opacity', 0.4)
                .attr('fill', (d)=> {
                    return compareColors[d.index].light;
                });
        
            probabilityTicks.attr('transform', (d, i, n)=> {
                console.log('d in prob', d)
                let scale = d3.scaleLinear().domain([0, 1]).range([2, (discreteWidth - 2)]).clamp(true);
                
                let yScale = d3.scaleLinear().domain([0, 1]).range([2, dimensions.squareDim - 2])
                return `translate(${scale(d.value + d.x)},${yScale(d.y)})`;
             });


            let averageTick = cladeStateGroups
                    .selectAll('.av-tick').data(d=> {
                        return [{value: d.value.state[0].average, color: d.value.color.color, index: d.index}];
                    }).join('rect').classed('av-tick', true)
                    .attr('width', 2).attr('height', dimensions.squareDim)
                    .attr('fill', d=> {
                        return compareColors[d.index].dark})
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
 

    //         //END

    //     //////PREDICTED CONTINUOUS

    //       //CONTIN PREDICTED
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
    }).attr('height', (d, i, n)=> {

   let y = d3.scaleLinear().domain([0, d3.max(d3.selectAll(n).data().map(m=> m.length))]).range([0, (dimensions.height - dimensions.margin)]);
        return y(Object.keys(d).length - 2);
    })
    .attr('fill', d=> compareColors[d.index].light).attr('fill-opacity', .4);

    contBars.attr('transform', (d, i, n)=> {

        let movex = dimensions.observedWidth / n.length;
        let y = d3.scaleLinear().domain([0, d3.max(d3.selectAll(n).data().map(m=> m.length))]).range([0, (dimensions.height - dimensions.margin)]);
       
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
        
           
            let y = d3.scaleLinear().domain([0, d3.max(d3.selectAll(n).data().map(m=> m.data.length))]).range([0, dimensions.height]);
            return y(d.data.length);

        }).attr('fill', (d, i) => {
            return d.data[0] != undefined ? d.data[0].color : '#fff';
        }).attr('opacity', 0.3);

        discBars.attr('transform', (d, i, n)=> {
            let movex = dimensions.observedWidth / n.length;
            let offSet = movex / 2
          

            let y = d3.scaleLinear().domain([0, d3.max(d3.selectAll(n).data().map(m=> m.data.length))]).range([0, dimensions.height]);
            let movey = (dimensions.height) - y(d.data.length);

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
              
                let y = d3.scaleLinear().domain([0, d.leafData.data.length]).range([(dimensions.height), 0]);
                d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(4));
                d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(xPoint)).attr('transform', 'translate(0, '+dimensions.height+')');

                d3.select(nodes[i]).select('.x-axis').selectAll('text').style('font-size', '8px');
                d3.select(nodes[i]).select('.y-axis').selectAll('text').style('font-size', '8px');
        });



    }

}