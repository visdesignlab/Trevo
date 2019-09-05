import '../styles/index.scss';
import {formatAttributeData} from './dataFormat';
import * as d3 from "d3";
import {filterMaster} from './filterComponent';
import {dataMaster} from './index';

export function drawBranchPointDistribution(data, svg){

    let branchBar = svg.append('g').classed('branch-bar', true).attr('transform', 'translate(10, 10)');
    branchBar.append('rect').classed('point-dis-rect', true).attr('height', 25).attr('x', -10).attr('y', -10).attr('fill', '#fff');

    branchBar.append('line').attr('y1', 2).attr('y2', 2).attr('x1', '100').attr('x2', 890).attr('stroke', 'gray').attr('stroke-width', .25)
    branchBar.append('text').text('Root').attr('transform', 'translate(50, 7)');
    let leafLabel = branchBar.append('g').classed('leaf-label', true).attr('transform', 'translate(950, 7)');
    leafLabel.append('text').text('Leaves');

    let nodeLengthArray = [];
    let nodeDuplicateCheck = []

    data.map(path=> {
        path.filter(n=> n.leaf != true).map(node=> {
            if(nodeDuplicateCheck.indexOf(node.node) == -1){
                nodeDuplicateCheck.push(node.node);
                nodeLengthArray.push({'node': node.node, 'eMove': node.edgeMove });
            }
        })
    });

    let bPointScale = d3.scaleLinear().domain([0, 1]).range([0, 795]);
    let pointGroups = branchBar.selectAll('g.branch-points').data(nodeLengthArray).join('g').attr('class', (d, i)=> d.node).classed('branch-points', true);
    pointGroups.attr('transform', (d, i) => 'translate('+(105 + bPointScale(d.eMove))+', 0)');
    pointGroups.append('circle').attr('r', 5).attr('fill', "rgba(123, 141, 153, 0.5)");

    return branchBar;
}

export function renderDistibutions(pathData, mainDiv, scales, moveMetric){
    
   // mainDiv.selectAll('*').remove();

    let observedWidth = 200;
    let predictedWidth = 800;
    let height = 90;
    let margin = 20;

    let attrHide = filterMaster.filter(f=> f.type === 'hide-attribute').map(m=> m.attribute);
    let keys = Object.keys(pathData[0][0].attributes).filter(f=> attrHide.indexOf(f) === -1);
    let newNormed = [...pathData];
    let keysToHide = attrHide.length > 0 ? scales.filter(f=> attrHide.indexOf(f.field) === -1).map(m=> m.field) : null;

    formatAttributeData(newNormed, scales, keysToHide);

    let maxBranch = d3.max(newNormed.map(p=> p.length)) - 1;
    let medBranchLength = d3.median(newNormed.map(p=> p.length)) - 1;

    let normBins = new Array(medBranchLength + 1).fill().map((m, i)=> {
        let step = 1 / medBranchLength;
        let base = (i > 0) ? ((i - 1) * step) : 0;
        let top = (i * step);
        return {'base': base, 'top': top, 'binI': i }
    });
   
    let internalNodes = newNormed.map(path => path.filter(node=> node.leaf != true));
    let leafNodes = newNormed.flatMap(path => path.filter(node=> node.leaf === true));

    normBins.map((n, i)=> {
        let edges = internalNodes.flatMap(path => path.filter(node=> {
            if(i === 0){
                return node.edgeLength === 0;
            }else{
                return node.edgeMove > n.base && node.edgeMove <= n.top;
            }
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
         
           // let max = d3.max(mapNorm.flatMap(m=> m.data).map(v=> v.realVal));
           // let min = d3.min(mapNorm.flatMap(m=> m.data).map(v=> v.realVal));
           
            let x = d3.scaleLinear().domain([scale.min, scale.max]).range([0, height]);
    
            let histogram = d3.histogram()
            .value(function(d) { return d.realVal; })  
            .domain(x.domain())  
            .thresholds(x.ticks(20)); 
  
            mapNorm.forEach(n=> {
                n.type = scale.type;
                n.bins = histogram(n.data);
               
                n.domain = [scale.max, scale.min];
                return n;
            });

            //Histogram for observed////
            let maxO = d3.max(leafAttr.flatMap(v=> v.realVal));
            let minO = d3.min(leafAttr.flatMap(v=> v.realVal));
            let xO = d3.scaleLinear().domain([minO, maxO]).range([0, height])

            let histogramO = d3.histogram()
            .value(function(d) { return d.realVal; })  
            .domain(xO.domain())  
            .thresholds(xO.ticks(20)); 

            leafData.bins = histogramO(leafAttr);

            let newK = {'key': key, 'branches': [...mapNorm], 'type': scale.type, 'leafData': leafData}
            return newK;

        }else{

            let states = leafAttr[0].states;
            mapNorm.bins = null
            leafData.bins = states.map(s=> leafAttr.filter(f=> f.winState === s.state));
            let x = d3.scaleLinear().domain([0, 1]).range([0, height]);
            
            mapNorm.map(n=> {
                n.type = scale.type;
                let colors = scale.stateColors;
                n.bins = states.map(state=> {
                    let color = colors.filter(f=> f.state === state.state);
                  
                    let chosen = n.data.flatMap(m=> m.states.filter(f=> f.state === state.state)).map(v=> v.realVal);
                    let average = d3.mean(chosen);
                    let stDev = d3.deviation(chosen);
                    return {'state': state.state, 'average': average, 'stDev': stDev, 'stUp': average + stDev, 'stDown': average - stDev, 'color': color[0].color, 'range': n.range }
                });
                
                return n;
            });

            let test = states.map(stat=> {
                let key = stat.state;
                return mapNorm.flatMap(m=> {
                    return m.bins.filter(f=> f.state === key);
                });
            });

            let newK = {'key': key, 'branches': [...mapNorm], 'type': scale.type, 'leafData': leafData, 'states': test}
            return newK;
        }
    });

    ///////RENDERING//////////
    
    let branchScale = d3.scaleLinear().domain([0, medBranchLength]).range([0, 780]);

    let dataCount = mainDiv.append('div').classed('species-count', true);
    dataCount.append('text').text("Shown: "+ pathData.length + " /"+ dataMaster[0].length);

    let svg = mainDiv.append('svg');
    svg.attr('id', 'main-summary-view');
    svg.attr('height', (keys.length * (height + 25)));

    let branchBar = drawBranchPointDistribution(newNormed, svg);
    let pointGroups = branchBar.selectAll('g.branch-points');
  
    let wrap = svg.append('g').classed('summary-wrapper', true);
    wrap.attr('transform', 'translate(10, 50)');

    let binnedWrap = wrap.selectAll('.attr-wrap').data(sortedBins).join('g').attr('class', d=> d.key + ' attr-wrap');
    binnedWrap.attr('transform', (d, i)=>  'translate(0,'+(i * (height + 5))+')');
    
    let label = binnedWrap.append('text').text(d=> d.key).attr('y', 40).attr('x', 80).style('text-anchor', 'end');

    let predictedWrap = binnedWrap.append('g').classed('predicted', true);

    let pathGroup = predictedWrap.append('g').classed('path-wrapper', true);

    let branchGroup = predictedWrap.selectAll('g.branch-bin').data(d=> d.branches).join('g').classed('branch-bin', true);
    branchGroup.attr('transform', (d, i)=> 'translate('+(100 + branchScale(i))+', 0)');

    let continDist = branchGroup.filter(f=> f.type === 'continuous');

    continDist.on('mouseover', (d, i, node)=> {
        let list = d.data.map(m=> m.nodeLabels);
        let selected = pointGroups.filter(p=> list.indexOf(p.node) > -1).classed('selected', true);
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let selectedBranch = treeNode.filter(f=> list.indexOf(f.data.node) > 0).classed('selected-branch', true);
        let y = d3.scaleLinear().domain(d.domain).range([0, height])
        let axis = d3.select(node[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5));
    }).on('mouseout', (d, i, node)=> {
        d3.selectAll(".branch-points.selected").classed('selected', false);
        d3.selectAll('.selected-branch').classed('selected-branch', false);
        d3.select(node[i]).select('.y-axis').remove();
    });

    var lineGen = d3.area()
    .curve(d3.curveCardinal)
    .x((d, i, n)=> {
        let y = d3.scaleLinear().domain([0, n.length - 1]).range([0, height]).clamp(true);
        return y(i); 
    })
    .y0(d=> {
        return 0;
    })
    .y1(d=> {
        let dat = Object.keys(d).length - 1
        let x = d3.scaleLinear().domain([0, 50]).range([0, 80]).clamp(true);
        return x(dat); 
    });

    continDist.each((d, i, nodes)=> {
        let distrib = d3.select(nodes[i]).selectAll('g').data([d.bins]).join('g').classed('distribution', true);
        distrib.attr('transform', 'translate(11, '+height+') rotate(-90)');
        let path = distrib.append('path').attr('d', lineGen);
        path.attr("fill", "rgba(133, 193, 233, .4)")
        .style('stroke', "rgba(133, 193, 233, .9)");
    });

    let contRect = continDist.append('rect').attr('height', height).attr('width', 10).style('fill', 'none').style('stroke', 'gray');

    let rangeRect = continDist.selectAll('rect.range').data(d=> {
        let newData = d.data.map(m=> {
            m.range = d.range;
            return m;
        })
        return newData}).join('rect').classed('range', true);

    rangeRect.attr('width', 10);
    rangeRect.attr('height', (d, i)=> {
        if(d.yScale != undefined){
            let newy = d.yScale;
            newy.range([80, 0]);
            return newy(d.lowerCI95) - newy(d.upperCI95)
        }else{
            return 0;
        }
    }).attr('transform', (d, i) => {
        let newy = d.yScale;
        newy.range([80, 0]);
        return 'translate(0,'+newy(d.upperCI95)+')'
    });

    rangeRect.attr('fill', "rgba(133, 193, 233, .05)");

    let avRect = continDist.append('rect').attr('width', 10).attr('height', (d, i)=> {
        if(d.data[0] != undefined){
            return 3;
        }else{
            return 0;
        }
    });

    avRect.attr('transform', (d, i) => {
        if(d.data[0] != undefined){
            let newy = d.data[0].yScale;
            newy.range([height, 0]);
            let mean = d3.mean(d.data.map(m=> m.realVal));
            return 'translate(0,'+newy(mean)+')';
        }else{
            return 'translate(0,0)';
        }
    }).attr('fill', '#004573');

    let discreteDist = branchGroup.filter(f=> f.type === 'discrete');
    let discreteLine = discreteDist.append('line').attr('x0', 2).attr('x1', 2).attr('y0', 0).attr('y1', height).attr('stroke', 'gray').attr('stroke-width', 0.5);
    let hoverRect = discreteDist.append('rect').attr('height', height).attr('width', 10).attr('opacity', 0);
    discreteDist.on('mouseover', (d, i, n)=> {
        let y = d3.scaleLinear().domain([1, 0]).range([0, height]);
        d3.select(n[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(3));
        let selected = pointGroups.filter(f=> f.eMove >= d.range[0] && f.eMove < d.range[1]).classed('selected', true);
        let treeNode  = d3.select('#sidebar').selectAll('.node');
      
        treeNode.filter(node=> node.data.combEdge >= d.range[0] && node.data.combEdge < d.range[1]).classed('selected-branch', true);

    }).on('mouseout', (d, i, n)=> {
        d3.select(n[i]).select('.y-axis').remove();
        d3.selectAll(".branch-points.selected").classed('selected', false);
        d3.selectAll('.selected-branch').classed('selected-branch', false);
    })

    let discreteBinWrap = predictedWrap.filter(f=> f.type === 'discrete');
   
    let stateGroups = discreteBinWrap.selectAll('.path-wrapper').selectAll('g.state').data(d=> d.states).join('g').classed('state', true);

    stateGroups.append('path').attr('d', (p, i)=> {
        var lineGenD = d3.area()
        .curve(d3.curveCardinal)
        .x((d, i)=> {
            let y = d3.scaleLinear().domain([0, 9]).range([0, predictedWidth + 100]);
            return y(i); 
        })
        .y0(d=> {
            
            let x = d3.scaleLinear().domain([0, 1]).range([80, 0]).clamp(true);
        
            return x(d.stDown);
        })
        .y1(d=> {
            let x = d3.scaleLinear().domain([0, 1]).range([80, 0]).clamp(true);
            return x(d.stUp); 
        });
        return lineGenD(p);

    }).attr('transform', 'translate(100, 10)').attr('fill', (d, i)=> {
        return d[0] ? d[0].color : '#fff';
    }).attr('opacity', 0.3);

    stateGroups.append('path').attr('d', (p, i)=> {
        var lineGen = d3.line()
        .curve(d3.curveCardinal)
        .x((d, i)=> {
            let y = d3.scaleLinear().domain([0, 9]).range([0, predictedWidth + 100]);
            return y(i); 
        })
        .y(d=> {
            let x = d3.scaleLinear().domain([0, 1]).range([80, 0]).clamp(true);
            return x(d.average); 
        });
        return lineGen(p);

    }).attr('transform', 'translate(100, 10)').attr('fill', 'none').attr('stroke', (d, i)=> {
        return d[0] ? d[0].color : '#fff';
    });



    ////OBSERVED CONTIUOUS/////

    let observedWrap = binnedWrap.append('g').classed('observed', true);
    observedWrap.attr('transform', 'translate('+ (predictedWidth + 150) +', 0)')

    let contOb = observedWrap.filter(f=> f.type === 'continuous');

    let contBars = contOb.selectAll('g.ob-bars').data(d=> {
        return d.leafData.bins}).join('g').classed('ob-bars', true);

    let cRects = contBars.append('rect').attr('width', (d, i, n)=> {
        let width = observedWidth / n.length;
        return width;
    }).attr('height', (d, i)=> {
        let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(height - margin), 0])
        return y(Object.keys(d).length - 2)
    }).attr('fill', 'rgba(133, 193, 233, .5)');

    contBars.attr('transform', (d, i, n)=> {
        let movex = observedWidth / n.length;
        let y = d3.scaleLinear().domain([0, Object.keys(d).length]).range([(height - margin), 0])
        let movey = height - y(Object.keys(d).length - 2);
        return 'translate('+(movex * i)+', '+movey+')'});

    contOb.each((d, i, nodes)=> {
        let xvalues = d.leafData.data.map(m=> m.realVal);
        let x = d3.scaleLinear().domain([d3.min(xvalues), d3.max(xvalues)]).range([0, observedWidth])
        let y = d3.scaleLinear().domain([0, d3.max(d.leafData.bins.map(b=> Object.keys(b).length)) - 2]).range([(height - margin), 0]);
        d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(x)).attr('transform', 'translate(0, '+height+')');
        d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y)).attr('transform', 'translate(0, '+margin+')');
    });
    
////Observed Discrete////
    let discOb =  observedWrap.filter(f=> f.type === 'discrete');
    let discBars = discOb.selectAll('g.ob-bars').data(d=> {
        return d.leafData.bins}).join('g').classed('ob-bars', true);
    let dRects = discBars.append('rect').attr('width', (d, i, n)=> {
        let width = observedWidth / n.length;
        return width;
    }).attr('height', (d, i, n)=> {
        let y = d3.scaleLinear().domain([0, 100]).range([(height -margin), 0])
        return y(d.length)
    }).attr('fill', (d, i) => {
        return d[0] != undefined ? d[0].color : '#fff';
    }).attr('opacity', 0.3);

    discBars.attr('transform', (d, i, n)=> {
        let movex = observedWidth / n.length;
        let y = d3.scaleLinear().domain([0, 100]).range([(height - margin), 0])
        let movey = (height) - y(d.length);
        return 'translate('+(movex * i)+', '+movey+')'});

    dRects.on('mouseover', (d, i, n)=> {
        let state = d3.select('g.'+d[0].label).selectAll('g.state');
        state.filter(f=> f[0].state === d[0].winState).attr('opacity', 0.8);
        state.filter(f=> f[0].state != d[0].winState).attr('opacity', 0.1);
        d3.select(n[i]).attr('opacity', 0.9);
    }).on('mouseout', (d, i, n)=> {
        d3.select(n[i]).attr('opacity', 0.3);
        let state = d3.select('g.'+d[0].label).selectAll('g.state').attr('opacity', 0.6);
     
    })

    discOb.each((d, i, nodes)=> {
            let labels = d.leafData.bins.map(b=> {
                return b[0] != undefined ? b[0].winState : '';
                })
            let xPoint = d3.scalePoint().domain(labels).range([0, observedWidth]).padding(.6)
            let y = d3.scaleLinear().domain([0, 100]).range([(height - margin), 0]);
            d3.select(nodes[i]).append('g').classed('y-axis', true).call(d3.axisLeft(y).ticks(5)).attr('transform', 'translate(0, '+margin+')');
            d3.select(nodes[i]).append('g').classed('x-axis', true).call(d3.axisBottom(xPoint)).attr('transform', 'translate(0, '+height+')');
    });
}
