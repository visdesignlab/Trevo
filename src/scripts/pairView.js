import { pairPaths, maxTimeKeeper } from "./dataFormat";
import { dropDown } from "./buttonComponents";
import * as d3 from "d3";
import * as slide from 'd3-simple-slider';
import { speciesTest, dataMaster } from ".";
import { findBrushedNodes } from "./toolbarComponent";
import { getScales } from "./filterComponent";
import { renderTree } from "./sidebarComponent";

const macroModes = [
  {field:'Convergence (Shallow)', value: [-1, 1, 1], pict: 'shallow-converg.gif'}, 
  {field:'Convergence (Ancient)', value: [1, 1, 1], pict: 'ancient-converg.gif'}, 
  {field:'Divergence (Shallow)', value: [-1, 1, -1], pict: 'shallow-div.gif'}, 
  {field:'Divergence (Ancient)', value: [1, 1, -1], pict: 'ancient-div.gif'},
  {field:'Conservativism', value: [1, -1, 1], pict: 'conservativism.gif'},  
  {field:'Anti-Convergence', value: [1, -1, -1], pict: 'char-disp.gif'}
];

let traitVal = null;
let topPairsKeeper = [];

function sortandRedraw(field){

  let top = topPairsKeeper[topPairsKeeper.length - 1];

  if(field === 'Sort by Top Frequency'){

    let otherList = top.others.sort((a, b)=> b.value.length - a.value.length).map(m=> m.key);

    let indexed = top.topPairs.map((m, i)=>{
      m.index = otherList.indexOf(m.key) > -1 ? otherList.indexOf(m.key) : (100 + i);
      return m;
    });

    let sorted = indexed.sort((a, b)=> a.index - b.index);
    let pairGroups = drawSorted(sorted,  d3.select('.attr-drop.dropdown').select('button').attr('value'));
    if(traitVal != null) discreteTraitDraw(pairGroups, traitVal);
    rankGrid(top.others.sort((a, b)=> b.value.length - a.value.length));

  }else{
    let sorted = top.topPairs.sort((a, b) => b.totalRank - a.totalRank);
    let pairGroups = drawSorted(sorted,  d3.select('.attr-drop.dropdown').select('button').attr('value'));
    if(traitVal != null) discreteTraitDraw(pairGroups, traitVal);
    rankGrid(top.others.sort((a, b)=> b.value.length - a.value.length));
  }

}

export function pairUpdateRender(pairs, attr, weights){

  let mappedPairs = updateRanking(pairs, attr, weights);

  topPairsKeeper.push(mappedPairs);
 
  let pairPaths = drawSorted(mappedPairs.topPairs, d3.select('.attr-drop.dropdown').select('button').attr('value'));
  if(traitVal != null) discreteTraitDraw(pairPaths, traitVal);
  topPairSearch(mappedPairs.topPairs, mappedPairs.pairs, d3.select('.attr-drop.dropdown').select('button').attr('value'), weights);
  
}

function discreteTraitDraw(pairGroups, trait){

  discreteTraitCalc(pairGroups.data(), trait)
  let stateWraps = pairGroups.selectAll('g.stateWrap').data(d=> [d]).join('g').classed('stateWrap', true);
  stateWraps.attr('transform', `translate(560, -24)`)

  let pairState = stateWraps.selectAll('g.state').data(d=> {
    return [{'key': 'p1', 'value': d.p1}, {'key': 'p2', 'value': d.p2}]
  }).join('g').classed('state', true);

  pairState.append('rect')
    .attr('height', 15)
    .attr('width', 15)
    .attr('fill', d=> {
      return d.value[d.value.length - 1].attributes[trait].color;
    });

  pairState.attr('transform', (d, i)=>`translate(${i*20}, 0)`);

  pairState.on('mouseover', (d, i)=> {

    let tool = d3.select('#tooltip');
    tool.transition()
    .duration(200)
    .style("opacity", .9);
    tool.html(`${d.value[d.value.length - 1].attributes[trait].winState}`);

    tool.style("left", (d3.event.pageX + 6) + "px")
    .style("top", (d3.event.pageY - 18) + "px");
    tool.style('height', 'auto');

  }).on('mouseout', ()=> {
    let tool = d3.select('#tooltip').style('opacity', 0)
  })



}

function discreteTraitCalc(pairs, trait){
  console.log('pppppairs',pairs, trait);
 
}

export function rankingControl(data){

    let rankDiv = d3.select('#pair-rank').classed('hidden', false);
    rankDiv.selectAll('*').remove();

    let dropDiv = rankDiv.append('div')
      .style('width', '180px')
      .style('display', 'inline-block')
      .style('padding-left', '30px')
      .style('padding-bottom', '20px')

    let weightPickerDiv = rankDiv
      .append('div')
      .style('display', 'inline-block')
      .style('padding-left', '80px');

    let weightPicker = weightPickerDiv
      .append('svg')
      .style('width', '830px')
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(10,10)');
    
    let wImage = weightPicker
      .append("svg:image")
      .attr('width', 142)
      .attr('height', 102)
      .attr('y', -12)
      .attr("xlink:href", `./public/${macroModes[1].pict}`);

    let dropOptions = dropDown(dropDiv, macroModes, macroModes[1].field, 'preset');
    dropOptions.attr('value', macroModes[1].field);
   
    let defaultW = macroModes[1].value;
    let sliderWidth = 110;
    let sliderMargin = 40;

    let labels = ['Distance', 'Delta', 'Closeness'];

    weightPicker.selectAll('text.labels').data(labels).join('text').classed('labels', true)
    .text(d=> d)
    .attr('y', 10)
    .attr('x', (d, i)=> (200+((sliderWidth + sliderMargin) * i)));
 
    defaultW.forEach((color, i) => {
      var slider = slide
        .sliderBottom()
        .min(-1)
        .max(1)
        .ticks(2)
        .width(sliderWidth)
        .default(defaultW[i])
        .displayValue(false)
        .fill('#516880')
        .on('end', num => {
          defaultW[i] = num;
          pairUpdateRender(pairPaths(data), d3.select('.attr-drop.dropdown').select('button').attr('value'), defaultW);
        });
  
      weightPicker
        .append('g')
        .attr('id', `weight-slider-${i}`)
        .attr('transform', `translate(${200+((sliderWidth + sliderMargin) * i)}, 20)`)
        .call(slider);

      weightPicker.selectAll('.tick')
        .filter(f=> f < 0).select('text')
        .attr('fill', 'red')
        .attr('opacity', 0.6);
      });

      dropOptions.on('click', (d, i, n)=> {

        let sliderGroups = d3.selectAll('.weight-slider');

        d3.select('#preset').classed('show', false);
        defaultW = d.value;

        defaultW.forEach((w, j)=> {

          var slider = slide
          .sliderBottom()
          .min(-1)
          .max(1)
          .ticks(3)
          .width(sliderWidth)
          .default(w)
          .displayValue(false)
          .fill('#516880')
          .on('end', num => {
            defaultW[i] = num;
            pairUpdateRender(pairPaths(data), d3.select('.attr-drop.dropdown').select('button').attr('value'), defaultW);
          });

          d3.select(`#weight-slider-${j}`).call(slider);
        })
   
        d3.select('.dropdown.preset').select('button').text(d.field);
        dropOptions.attr('value', d.field);
       
    
        pairUpdateRender(pairPaths(data), d3.select('.attr-drop.dropdown').select('button').attr('value'), defaultW);
   
        wImage.attr("xlink:href", `./public/${d.pict}`);
   
       });

     
       let disMarkers = getScales().filter(f=> f.type === 'discrete');
       traitVal = disMarkers.length > 0 ? disMarkers[0].field : null;
       if(traitVal != null){
         
        let disMarkOp = dropDown(rankDiv, disMarkers, disMarkers[0].field, 'discrete-trait-mark');
        disMarkOp.on('click', (d)=> {
          
           d3.select('.discrete-trait-mark').select('button').attr('value', d.field);
           d3.select('.discrete-trait-mark.dropdown').select('button').text(`Trait: ${d.field}`);
           d3.select('#discrete-trait-mark').classed('show', false);
 
           discreteTraitDraw(d3.selectAll('.pair-wrap'), d.field)
        });

       }
  
      
      let sortDropOp = [{field:'Sort by Rank'}, {field:'Sort by Top Frequency'}];
      let sortOps = dropDown(rankDiv, sortDropOp, sortDropOp[0].field, 'sort-pair-drop');
      sortOps.on('click', (d)=> {
         
        d3.select('.sort-pair-drop').select('button').attr('value', d.field);
        d3.select('.sort-pair-drop.dropdown').select('button').text(`${d.field}`);
        d3.select('#sort-pair-drop').classed('show', false);

        sortandRedraw(d.field);

        //discreteTraitDraw(d3.selectAll('.pair-wrap'), d.field)
     });

       
}
export function changeTrait(attKeys, data, weights){

  let toolbarButtonDiv = d3.select('#toolbar').select('#tool-buttons');

  let view = toolbarButtonDiv.select('.dropdown.change-view').select('.dropdown-toggle').node().value;

  let drop = d3.select('.attr-drop.dropdown')
  .selectAll('a').empty() ? dropDown(toolbarButtonDiv, attKeys, `Trait: ${attKeys[0].field}`, 'attr-drop') : d3.select('.attr-drop.dropdown').selectAll('a');

  d3.select('.attr-drop.dropdown').select('button').attr('value', attKeys[0].field);

  drop.on('click', (d, i, n)=> {

    if(toolbarButtonDiv.select('.dropdown.change-view').select('.dropdown-toggle').node().value === "Pair View"){
     
      pairUpdateRender(pairPaths(data), d.field, weights);
    }

    if(d3.select('#sidebar').select('#view-pheno').text() === 'View Phylogeny'){
      renderTree(null, true, d.field);
    }

    d3.select('.attr-drop.dropdown').select('button').attr('value', d.field);
    d3.select('.attr-drop.dropdown').select('button').text(`Trait: ${d.field}`);
    d3.select('#attr-drop').classed('show', false);
});

return drop;

}
export async function generatePairs(data){

        let pairs = await pairPaths(data);
     
        let weights = [1, 1, 1];

        let attKeys = d3.entries(pairs[0].p1[0].attributes)
                    .filter(f=> f.value.type === 'continuous')
                    .map(m=> {
                        return {'field': m.key, 'value': m.key }
                    });
        
        
        let drop = changeTrait(attKeys, data, weights);

        pairUpdateRender([...pairs], attKeys[0].field, weights);


        
}
function getWeightScales(pairs, field){
 
  let deltaMax = d3.max([...pairs].map(m=> m.deltas.filter(f=> f.key === field)[0]).map(m=> m.value));
  let closeMax = d3.max([...pairs].map(m=> m.closeAll.filter(f=> f.key === field)[0]).map(m=> m.value));
  let distMax = d3.max([...pairs].map(d=> d.distance));
  let deltaScale = d3.scaleLinear().domain([0, deltaMax]).range([0, 1]);
  let closeScale = d3.scaleLinear().domain([closeMax, 0]).range([0, 1]);
  let distScale = d3.scaleLinear().domain([0, distMax]).range([0, 1]);
  return {delta: deltaScale, close:closeScale, distance: distScale};

}
export function updateRanking(pairs, field, weights){

 
  let preset = d3.select('.dropdown.preset').select('button').text()
  let penalty = preset.includes(`(Shallow)`) ? -1 : 1;


    let weightScales = getWeightScales(pairs, field);

    let pickedPairs = [...pairs].map(p=> {
        let newP = Object.assign({}, p);

        newP.delta = p.deltas.filter(d=> d.key === field)[0];
        newP.closeness = p.closeAll.filter(d=> d.key === field)[0];
        let deltaFix = newP.delta.value > 11 ? 0 : weightScales.delta(newP.delta.value);
        newP.deltaRank = deltaFix;//weightScales.delta(newP.delta.value);
        newP.closenessRank = weightScales.close(newP.closeness.value);
        newP.distanceRank = (penalty === -1 && p.lateDivergence) ? -100 : weightScales.distance(p.distance);
        let totalRank = (weights[0] * newP.distanceRank) + (weights[1] * newP.deltaRank) + (weights[2] * newP.closenessRank);
        newP.totalRank = newP.delta.value < newP.closeness.value ? (totalRank * penalty) : totalRank;
      
        return newP;
    });

    let percentage = Math.round(pickedPairs.length * 0.01);
    let sortedPairs = pickedPairs.sort((a, b)=> b.totalRank - a.totalRank).slice(0, percentage);

    return {topPairs: sortedPairs, 'pairs': pickedPairs};
}
function renderText(pairs, field){
  d3.select('#pair-rank').select('svg').select('.rank-meta').remove();
  let rankMeta = d3.select('#pair-rank').select('svg').append('g').classed('rank-meta', true);
  rankMeta.append('text').text(`Trait: ${field}`).attr('transform', 'translate(690, 20)').style('font-size', '12px');
  rankMeta.append('text').text(`Pairs Shown: Top 1%`).attr('transform', 'translate(690, 40)').style('font-size', '12px');
  rankMeta.append('text').text(`Num of Pairs: ${pairs.length}`).attr('transform', 'translate(690, 60)').style('font-size', '12px');

}
function drawSorted(pairs, field){

  console.log('test', pairs, field);

  let pairColor = ['#FF5733', '#129BF5'];
  let nodes = findBrushedNodes();

  d3.select('#main').selectAll('*').remove();

  renderText(pairs, field);

  let width = 600;
  let height = 100;
  let xScale = d3.scaleLinear().domain([0, maxTimeKeeper[maxTimeKeeper.length - 1]]).range([0, width]);
  let xScaleAxis = d3.scaleLinear().domain([maxTimeKeeper[maxTimeKeeper.length - 1], 0]).range([0, width]);
    
  let svg = d3.select('#main').append('svg');
  svg.attr('height', pairs.length * (height * 1.9))
  let wrap = svg.append('g');
  wrap.attr('transform', 'translate(20, 120)')
  let pairWraps = wrap.selectAll('g.pair-wrap').data(pairs).join('g').classed('pair-wrap', true);
  pairWraps.attr('transform', (d, i)=> `translate(50,${i*(height * 1.8)})`);
  pairWraps.append('rect')
    .attr('width', (d, i)=> {
    return width - xScale(d.common.combLength);
    })
    .attr('height', height)
    .attr('x', d=> xScale(d.common.combLength))
    .attr('stroke-width', 1).attr('stroke', 'black')
    .attr('fill', '#fff');

    pairWraps.append('text').text((d, i)=> {
        return `${d.p1[d.p1.length - 1].node} + ${d.p2[d.p2.length - 1].node}`
    }).attr('y', -10);

    let scoreWrap = pairWraps.append('g').classed('score-wrap', true);
    let scoreGroups = scoreWrap.selectAll('g.score').data((d, i)=> {
        return [
         {label: 'Distance', value: d.distance, score: d.distanceRank}, 
         {label: 'Delta', value: d.delta.value, score: d.deltaRank},
         {label: 'Closeness', value: d.closeness.value, score: d.closenessRank}
        ];
    }).join('g').classed('score', true);

    let scoreLabel = scoreWrap.append('g').attr('transform', `translate(650, 10)`);
    scoreLabel.append('rect').attr('width', 200).attr('height', 40).attr('fill', 'gray').attr('y', 45).attr('opacity', .1)
    scoreLabel.append('text').text('Score').attr('y', 20).style('text-anchor', 'end').style('font-size', 11);
    scoreLabel.append('text').text('Value').attr('y', 40).style('text-anchor', 'end').style('font-size', 11);

    scoreLabel.append('text').text('Distinctiveness Score').attr('y', 60).attr('x', 95).style('text-anchor', 'end').style('font-size', 11);
    scoreLabel.append('text').text('Rank').attr('y', 80).attr('x', 95).style('text-anchor', 'end').style('font-size', 11);

    scoreGroups.attr('transform', (d, i, n)=> {
       return  i === 0 ? `translate(${(670)},0)` : 
       `translate(${(660+(d3.sum(d3.selectAll(n).filter((f, j)=> i > j).data().map(m=> m.label.length * 6)))+ (i*30))},0)`;
    });

    var zero = d3.format(".3n");
    scoreGroups.append('text').text((d, i)=>  d.label).style('font-size', 10).attr('y', 10);;
    scoreGroups.append('text').text((d, i)=> zero(d.score)).style('font-size', 10).attr('y', 30);
    scoreGroups.append('text').text((d, i)=> zero(d.value)).style('font-size', 10).attr('y', 50);

    scoreLabel.append('text').text((d, i, n)=> zero(d.closenessRank + d.distanceRank + d.deltaRank)).style('font-size', 10).attr('y', 60).attr('x', 115);
    scoreLabel.append('text').text((d, i)=> i+1).style('font-size', 10).attr('y', 80).attr('x', 115);

    var lineGen = d3.line()
    .x(d=> {
        let x = d3.scaleLinear().domain([0, maxTimeKeeper[maxTimeKeeper.length - 1]]).range([0, width]);
       let distance = x(d.combLength);
        return distance; })
    .y(d=> {
        let y = d.attributes[field].scales.yScale;
        y.range([height, 0]);
        return y(d.attributes[field].values.realVal);
    });

    //BEGIN EXPERIOMENTING////]
    let pairGroupN = pairWraps.selectAll('g.pair-neighbor').data((d, i, n)=> {
      let species1 = d.p1.map(n=> n.node);
      let species2 = d.p2.map(n=> n.node);
      let labels = [...d.p1.filter(n=> n.leaf === true).map(m=> m.node)].concat(d.p2.filter(n=> n.leaf === true).map(m=> m.node));

      let neighbors = labels.flatMap(m=> {
          let start = speciesTest[speciesTest.length - 1].indexOf(m);
          let ne = speciesTest[speciesTest.length - 1].filter((f, j)=> (j < (+start + 2)) && (j > (+start - 2)));
          return ne;
      });
      
      let speciesNames = [species1[species1.length-1], species2[species2.length-1]];

      ////EXPERIMENTING WITH NODES////
      let neighPaths = dataMaster[dataMaster.length - 1].filter(f=> 
        (neighbors.indexOf(f[f.length - 1].node)) > -1 && (speciesNames.indexOf(f[f.length - 1].node) === -1));

      let labeledN = [...neighPaths].map(path=> {
        let name = path[path.length - 1].node;
        return path.map(p=> {
          p.name = name;
          return p
        })
      });
      
      let spec1N = labeledN.map(m => m.filter(f=> species1.indexOf(f.node) > -1));
      let spec2N = labeledN.map(m => m.filter(f=> species2.indexOf(f.node) > -1));

      let closest1 = spec1N.filter((f, i, n)=> {
        let max = d3.max(n.map(d=> d.length));
        return f.length === max;
      })[0];
  
      let closest2 = spec2N.filter((f, i, n)=> {
        let max = d3.max(n.map(d=> d.length));
        return f.length === max;
      })[0];
      
      let wholeClosest1 = labeledN.filter(f=> f[f.length-1].node === closest1[closest1.length - 1].name)[0];
      let wholeClosest2 = labeledN.filter(f=> f[f.length-1].node === closest2[closest2.length - 1].name)[0];
     
      return [wholeClosest1, wholeClosest2];

    }).join('g').classed('pair-neighbor', true).attr('opacity', 0);

      let innerPathsN = pairGroupN.append('path')
      .attr("d", lineGen)
      .attr("class", "inner-line-n")
      .attr('fill', 'none')
      .attr('stroke-width', 1)
      .style('stroke', 'rgba(160, 141, 184, .9)');
     
      let branchesN = pairGroupN.selectAll('g.branch-n').data(d=> d).join('g').classed('branch-n', true);
      branchesN.attr('transform', (d, i)=> `translate(${xScale(d.combLength)}, 0)`);
      branchesN.filter(f=> f.leaf != true).append('rect').attr('width', 10).attr('height', (d)=> {
          let y = d.attributes[field].scales.yScale;
          return y(d.attributes[field].values.lowerCI95) - y(d.attributes[field].values.upperCI95)
      }).attr('fill', 'rgba(160, 141, 184, .2)').attr('y', (d, i)=> {
          let y = d.attributes[field].scales.yScale;
          return y(d.attributes[field].values.upperCI95);
      });
  
      branchesN.append('rect').attr('width', 10).attr('height', 4).attr('y', (d, i)=> {
          return d.attributes[field].scales.yScale(d.attributes[field].values.realVal) - 2;
      }).attr('opacity', 0.5);

      branchesN.filter((b, i, n)=> {
        return i === (n.length - 1);
      }).append('text').text(d=> d.node)
        .attr('fill', 'rgba(160, 141, 184, 1)')
        .attr('y', (d, i)=> {
        let y = d.attributes[field].scales.yScale;
        return (y(d.attributes[field].values.realVal) - 4);
        }).attr('x', 3).style('font-size', 10);

////////////////////////////END EXPERIMENT///////

    let pairGroup = pairWraps.selectAll('g.pair').data(d=> [d.p1, d.p2]).join('g').classed('pair', true);

    let innerPaths = pairGroup.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', (d, i)=> pairColor[i])
   // .style('stroke', 'rgb(165, 185, 198)');

   let brushedPaths = innerPaths.filter(f=> {
    let nodeTest = f.filter(n=> nodes.map(m=> m.node).indexOf(n.node) > -1)
    return nodeTest.length > 0}).style('stroke', '#64B5F6').style('stroke-width', '5px');

    let branches = pairGroup.selectAll('g.branch').data(d=> d).join('g').classed('branch', true);
    branches.attr('transform', (d, i)=> `translate(${xScale(d.combLength)}, 0)`);
    branches.filter(f=> f.leaf != true).append('rect')
    .classed('range', true)
    .attr('width', 10)
    .attr('height', (d)=> {
        let y = d.attributes[field].scales.yScale;
        return y(d.attributes[field].values.lowerCI95) - y(d.attributes[field].values.upperCI95)
    }).attr('fill', 'rgba(165, 185, 198, .5)')
    .attr('y', (d, i)=> {
        let y = d.attributes[field].scales.yScale;
        return y(d.attributes[field].values.upperCI95);
    });

    let chosenNodes = branches.filter(f=> {
      return nodes.map(m=> m.node).indexOf(f.node) > -1
    }).selectAll('rect.range').attr('fill', '#64B5F6')

    branches.append('rect').attr('width', 10).attr('height', 4).attr('y', (d, i)=> {
        return d.attributes[field].scales.yScale(d.attributes[field].values.realVal) - 2;
    });

    pairWraps.append('rect').attr('width', (d, i)=> {
        return xScale(d.common.combLength)})
        .attr('height', height)
        .attr('fill', '#fff').style('opacity', 0.7);
        let yAxisG = pairWraps.append('g').classed('y-axis', true);
        let xAxisG = pairWraps.append('g').classed('x-axis', true);
        xAxisG.call(d3.axisBottom(xScaleAxis).ticks(10));
        xAxisG.attr('transform', `translate(0, ${height})`)

    pairWraps.on('mouseover', (d, i, n)=> {
       
        let species1 = d.p1.map(n=> n.node);
        let species2 = d.p2.map(n=> n.node);
        let labels = [...d.p1.filter(n=> n.leaf === true).map(m=> m.node)].concat(d.p2.filter(n=> n.leaf === true).map(m=> m.node));
        let neighbors = labels.flatMap(m=> {
            let start = speciesTest[speciesTest.length - 1].indexOf(m);
            let ne = speciesTest[speciesTest.length - 1].filter((f, j)=> (j < (+start + 2)) && (j > (+start - 2)));
            return ne;
        });
        let checkArray = species1.filter(s=> species2.indexOf(s) > -1);
       
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let treeLinks  = d3.select('#sidebar').selectAll('.link');
        let pairNode1 = treeNode.filter(f=> {
            return species1.filter(s=> species2.indexOf(s) === -1).indexOf(f.data.node) > -1;
        }).classed('hover one', true);

        let pairNode2 = treeNode.filter(f=> {
          return species2.filter(s=> species1.indexOf(s) === -1).indexOf(f.data.node) > -1;
      }).classed('hover two', true);

        treeLinks.filter(f=> species1.filter(s=> species2.indexOf(s) === -1).indexOf(f.data.node) > -1).classed('hover one', true);
        treeLinks.filter(f=> species2.filter(s=> species1.indexOf(s) === -1).indexOf(f.data.node) > -1).classed('hover two', true);
     
        //Hiding Others
        treeNode.filter(f=> (checkArray[checkArray.length - 1] != f.data.node) && (species1.filter(s=> species2.indexOf(s) === -1).concat(species2.filter(s=> species1.indexOf(s) === -1)).indexOf(f.data.node) === -1)).classed('hover-not', true);
     
        //Hiding Others
        treeLinks.filter(f=> (species1.filter(s=> species2.indexOf(s) === -1).concat(species2.filter(s=> species1.indexOf(s) === -1)).indexOf(f.data.node) === -1)).classed('hover-not', true);
        
        let speciesNames = [species1[species1.length-1], species2[species2.length-1]]
      
        return d3.select(this).classed('hover', true);
    })
    .on('mouseleave', (d, i, n)=>{

      d3.select(n[i]).selectAll('.pair-neighbor').attr('opacity', 0);

        let treeNode  = d3.select('#sidebar').selectAll('.node')
        .classed('hover', false)
        .classed('hover-neighbor', false)
        .classed('hover-not', false)
        .classed('two', false)
        .classed('one', false);

        let treeLinks  = d3.select('#sidebar').selectAll('.link')
        .classed('hover', false)
        .classed('hover-neighbor', false)
        .classed('hover-not', false)
        .classed('two', false)
        .classed('one', false);
        return d3.select(n[i]).classed('hover', false);
    });

    let axisGroup = pairWraps.append('g').classed('y-axis', true);
  
    axisGroup.each((d, i, n)=> {
        let scale = d.p1[0].attributes[field].scales.yScale;
        d3.select(n[i]).call(d3.axisLeft(scale).ticks(5));
    });

  let mouseG = pairWraps.append("g")
    .attr("class", "mouse-over-effects");

  mouseG.append("path") // this is the black vertical line to follow mouse
    .attr("class", "mouse-line")
    .style("stroke", "black")
    .style("stroke-width", "1px")
    .style("opacity", "0");

   var mousePerLine = mouseG.selectAll('.mouse-per-line')
   .data((d, i)=> {

    return [d.p1, d.p2]})
   .join("g")
   .attr("class", "mouse-per-line");

mousePerLine.append("circle")
   .attr("r", 7)
   .style("stroke", function(d) {
     return 'red';
   })
   .style("fill", "none")
   .style("stroke-width", "1px")
   .style("opacity", "0");

mousePerLine.append("text").attr('class', 'value')
   .attr("transform", "translate(10,3)");

mousePerLine.append("text").attr('class', 'species')
   .attr("transform", "translate(10,3)");

mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
      .attr('width', width) // can't catch mouse events on a g element
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseout', function() { // on mouse out hide line, circles and text
        d3.selectAll(".mouse-line")
          .style("opacity", "0");
        d3.selectAll(".mouse-per-line circle")
          .style("opacity", "0");
        d3.selectAll(".mouse-per-line text")
          .style("opacity", "0");
      })
      .on('mouseover', (d, i, n)=> { // on mouse in show line, circles and text
        d3.select(n[i].parentNode).selectAll('.mouse-line')
          .style("opacity", "1");
          d3.select(n[i].parentNode).selectAll(".mouse-per-line circle")
          .style("opacity", "1");
          d3.select(n[i].parentNode).selectAll(".mouse-per-line text")
          .style("opacity", "1");

          
      })
      .on('mousemove', (dat, i, n)=> { // mouse moving over canvas
        var mouse = d3.mouse(n[i]);
       
        d3.select(n[i].parentNode).select('.mouse-line')
          .attr("d", function() {
            var d = "M" + mouse[0] + "," + height;
            d += " " + mouse[0] + "," + 0;
            return d;
          });
       
          d3.select(n[i].parentNode).selectAll('.mouse-per-line')
          .attr("transform", function(d, j, node) {
         
            var xDate = xScale.invert(mouse[0]),
                bisect = d3.bisector(function(d) { return d.edgeLength; }).right,
                idx = bisect(d.values, xDate);
            
            let line = n[i].parentNode.parentNode.getElementsByClassName('inner-line');
          
            var beginning = 0,
                end = line[j].getTotalLength(),
                target = null

            while (true){
               target = Math.floor((beginning + end) / 2);
               var pos = line[j].getPointAtLength(target);
              if ((target === end || target === beginning) && pos.x !== mouse[0]) {
                  break;
              }
              if (pos.x > mouse[0])      end = target;
              else if (pos.x < mouse[0]) beginning = target;
              else break; //position found
            }
            let y = dat.p1[0].attributes[field].scales.yScale;
          
            d3.select(node[j]).select('text.value')
              .text(y.invert(pos.y).toFixed(2))
              .style('font-size', 11)
              .attr('y', ()=> {
                  return j === 0 ? 10 : -10;
                });

            d3.select(node[j]).select('text.species')
                .text(d[d.length-1].node)
                .style('font-size', 11)
                .attr('y', ()=> {
                    return j === 0 ? 19 : -19;
                  });
              
            return "translate(" + mouse[0] + "," + pos.y +")";
          });
      });

      return pairWraps;
   
}
function topPairSearch(topPairs, allPairs, field, weights){

  let matchKeeper = [];
  let nameArray = topPairs.map(m=> m.key);
  let otherFields = getScales()
    .filter(f=> f.field != field && f.type === 'continuous')
    .map(m=> m.field);

  otherFields.map(m => {
  
    let mappedPairs = updateRanking([...allPairs], m, weights);

    let test = mappedPairs.topPairs.map((m, i)=> {
      let newPair = m.key
      if(nameArray.indexOf(m.key) > -1){
      
        let check = matchKeeper.map(m=> m.key);
        if(check.indexOf(newPair) > -1){
          let index = check.indexOf(newPair);
          matchKeeper[index].value.push([newPair, i+1, m]);
        }else{
          matchKeeper.push({key: newPair, value: [[newPair, i+1, m]]})
        }
      }
    });
  });

  //rankHistogram(matchKeeper);
  
  topPairsKeeper[topPairsKeeper.length - 1].others = matchKeeper;
  rankGrid(matchKeeper);

  // matchKeeper.map((m, i)=> {
   
  //   let group = d3.selectAll('.pair-wrap').filter(f=> {
  //     return (m.key === f.key);
  //   }).append('g').classed('other-rank', true);

  //   let rankSet = [...new Set(m.value.map(v=> v[1]).sort())]
  //   let groupedRanks = rankSet.map(f=> {
  //     let ranked = m.value.filter(va=> va[1]===f);
  //     return {rank:f, value:ranked}
  //   }).sort((a, b)=> a.rank - b.rank);

  //   group.attr('transform', 'translate(860, 0)');
  //   group.append('rect').attr('width', 300).attr('height', groupedRanks.length * 20).attr('opacity', 0.1);
  //   let textGrp = group.selectAll('g.text-group').data(groupedRanks).join('g').classed('text-group', true);

  //   let text = textGrp.append('text').text(d=> {
  //     let traits = d.value.map(v=>v[2].delta.key).join(', ');
  //     return `Ranking: ${d.rank} Traits: ${traits},  `});
  //   text.style('font-size', '10px');
  //   text.attr('transform', (d, i)=> `translate(20, ${(i*20)+11})`);
  // });
}
function rankGrid(matchKeeper){

  let scales = getScales();

  let size = 20;

  let result = chunkArray(scales.map(m=> m.field), 4);

  let newMatch = matchKeeper.map(m=> {
    let bins = result.map(col=> {
      return col.map(c=> {
        return {key: c, value: m.value.filter(f=> f[2].delta.key === c) }
      })
    });
    
    return {key:m.key, 'bins':bins}
  });

  let satScale = d3.scaleLinear().domain([20, 1]).range([0.02, 1])

  newMatch.map(m=> {

    let group = d3.selectAll('.pair-wrap').filter(f=> {
          return (m.key === f.key);
        }).append('g').classed('other-rank', true);

    group.attr('transform', 'translate(900, 0)');

    group.append('text')
    .text('Ranked Top 20 in Other Traits')
    .style('font-size', 11)
    .attr('transform', `translate(5,0)`);
    
   
    let groups = group.selectAll('.square-group').data(m.bins).join('g').classed('square-group', true);
    groups.attr('transform', (d, i)=> `translate(${i*22}, 5)`);
    let squarebins = groups.selectAll('.trait-bin').data(d=> {
      return d;
    }).join('g').classed('trait-bin', true);

    squarebins.on('mouseover', (r,i)=>{
      let tool = d3.select('#tooltip');
      tool.transition()
          .duration(200)
          .style("opacity", .9);
      
      let f = d3.format(".3f");
      if(r.value[0]){
        tool.html(`${r.value[0][2].delta.key} : ${f(r.value[0][2].totalRank)} </br> Ranking: ${r.value[0][1]}`)
        .style("left", (d3.event.pageX - 40) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
        
        tool.style('height', 'auto');
        tool.style('width', '150px');

      }
    

    }).on('mouseout', ()=> {
      let tool = d3.select('#tooltip').style('opacity', 0);
    });

    squarebins.append('rect')
    .attr('width', size)
    .attr('height', size)
    .style('stroke', '#EBECED')
    .style('stoke-width', '0.5px')
    .style('fill', (d, i)=> {
      if(d.value.length === 0){
        return 'gray';
      }else{
        return d.value[0][1] < 2 ? '#FFC74F' : 'gray';
      }
    })
    .style('fill-opacity', (d, i)=> {
      return d.value.length === 0 ? satScale(33) : satScale(d.value[0][1]);ß
    });
    squarebins.attr('transform', (d, i)=> `translate(0, ${i*22})`);
  });



}
function chunkArray(myArray, chunk_size){
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];
    
    for (index = 0; index < arrayLength; index += chunk_size) {
        let myChunk = myArray.slice(index, index+chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}


function rankHistogram(matchKeeper){

  let size = 25;
  let height = 12;

  let rankBins = [[1,3], [4,6], [7,9], [10, 12], [13, 15], [16, 18], [19, 21]];
  let axisLabels = ['1-3', '4-6', '7-9', '10-12', '13-15', '16-18', '19-21'];

  let newArray = matchKeeper.map(m=> {
    let bins = rankBins.map(r=> {
      return {bin:r, values: m.value.filter(f=> f[1] >= r[0] && f[1] <= r[1])}
    });
    return {key:m.key, 'bins':bins}
  });

  newArray.map(m=> {

    let group = d3.selectAll('.pair-wrap').filter(f=> {
          return (m.key === f.key);
        }).append('g').classed('other-rank', true);

    group.attr('transform', 'translate(880, 0)');

    group.append('text')
    .text('Ranked Top 20 in Other Traits')
    .style('font-size', 11)
    .style('text-anchor', 'middle')
    .attr('transform', `translate(${(rankBins.length * (size+2))/2},0)`);

    group.append('g')
    .call(d3.axisBottom(d3.scaleBand().domain(axisLabels).range([0, rankBins.length * (size+2)])))
    .attr('transform', 'translate(0, 92)');

    let binGroups = group.selectAll('g.bin').data(m.bins).join('g').classed('bin', true);
    binGroups.attr('transform', (d, i)=> `translate(${i*(size+2)}, ${80})`);

    let binRects = binGroups.selectAll('rect').data(d=>d.values.sort((a, b)=> a[1]-b[1])).join('rect');
    binRects.attr('width', size)
    .attr('height', size/2)
    .attr('transform', (d, i)=> `translate(0, ${-1*(i*((size/2)+1))})`);

    binRects.attr('opacity', (d, i, n)=> {
      let minMax = rankBins.filter(r=> d[1]<= r[1] && d[1] >= r[0])[0];
      let scale = d3.scaleLinear().domain([minMax[0], minMax[1]]).range([.8, .2])
      return scale(d[1])})

    binRects.on('mouseover', (r,i)=>{
      let tool = d3.select('#tooltip');
      tool.transition()
          .duration(200)
          .style("opacity", .9);
      
      let f = d3.format(".3f");
        
      tool.html(`${r[2].delta.key} : ${f(r[2].totalRank)} </br> Ranking: ${r[1]}`)
          .style("left", (d3.event.pageX - 40) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
          
      tool.style('height', 'auto');
      tool.style('width', '150px');

    }).on('mouseout', ()=> {
      let tool = d3.select('#tooltip').style('opacity', 0);
    });
  });

}