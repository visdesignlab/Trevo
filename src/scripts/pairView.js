import { pairPaths, maxTimeKeeper } from "./dataFormat";
import { dropDown } from "./buttonComponents";
import * as d3 from "d3";
import * as slide from 'd3-simple-slider';
import { renderTree } from "./sidebarComponent";
import { speciesTest, dataMaster } from ".";
import { findBrushedNodes } from "./toolbarComponent";

export function rankingControl(data){
    let rankDiv = d3.select('#pair-rank').classed('hidden', false);
    rankDiv.selectAll('*').remove();

    

    let defaultW = [1, 1, 1];
  
    let weightPicker = rankDiv
      .append('svg')
      .attr('width', 800)
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(10,10)');

     weightPicker
    .append("svg:image")
    .attr('width', 200)
    .attr('height', 140)
    .attr('y', -50)
    .attr("xlink:href", "./public/mini-diagram.gif");

    weightPicker.append('text').text('Distance').attr('font-size', 10).attr('x', 85).attr('y', 60);
    weightPicker.append('text').text('Delta').attr('font-size', 10).attr('x', 66).attr('y', 20);
    weightPicker.append('text').text('Closeness').attr('font-size', 10).attr('x', 195).attr('y', 22);

    let labels = ['Distance', 'Delta', 'Closeness'];

    weightPicker.selectAll('text.labels').data(labels).join('text').classed('labels', true)
    .text(d=> d)
    .attr('y', 10)
    .attr('x', (d, i)=> (300+(200 * i)));



    console.log('VALUE', d3.select('.attr-drop.dropdown').select('button'))
  
    defaultW.forEach((color, i) => {
      var slider = slide
        .sliderBottom()
        .min(0)
        .max(1)
        .step(.1)
        .width(150)
        .default(defaultW[i])
        .displayValue(false)
        .fill('#7FB3D5')
        .on('end', num => {
         defaultW[i] = num;
         console.log(d3.select('.attr-drop.dropdown').select('button').attr('value'))
         updateRanking(pairPaths(data), d3.select('.attr-drop.dropdown').select('button').attr('value'), defaultW);
        });
  
      weightPicker
        .append('g')
        .attr('transform', `translate(${300+(200 * i)}, 20)`)
        .call(slider);
    });
}
export function generatePairs(data){

        let pairs = pairPaths(data);
     
        let weights = [1, 1, 1];

        let attKeys = d3.entries(pairs[0].p1[0].attributes)
                    .filter(f=> f.value.type === 'continuous')
                    .map(m=> {
                        return {'field': m.key, 'value': m.key }
                    });
        
        let drop = d3.select('.attr-drop.dropdown')
          .selectAll('a').empty() ? dropDown(d3.select('#toolbar'), attKeys, `Trait: ${attKeys[0].field}`, 'attr-drop') : d3.select('.attr-drop.dropdown').selectAll('a');
        
        d3.select('.attr-drop.dropdown').select('button').attr('value', attKeys[0].field);

        drop.on('click', (d, i, n)=> {
            updateRanking(pairPaths(data), d.field, weights);
            renderTree(d3.select('#sidebar'), null, true, d.field);
            d3.select('.attr-drop.dropdown').select('button').attr('value', d.field);
            d3.select('.attr-drop.dropdown').select('button').text(`Trait: ${d.field}`);
            d3.select('#attr-drop').classed('show', false);
        });

        updateRanking([...pairs], attKeys[0].field, weights);
}
export function updateRanking(pairs, field, weights){

  console.log('pairs',pairs, field)
  
    let deltaMax = d3.max([...pairs].map(m=> m.deltas.filter(f=> f.key === field)[0]).map(m=> m.value));
    let closeMax = d3.max([...pairs].map(m=> m.closeness.filter(f=> f.key === field)[0]).map(m=> m.value));
    let distMax = d3.max([...pairs].map(d=> d.distance))
    let deltaScale = d3.scaleLinear().domain([0, deltaMax]).range([0, 1]);
    let closeScale = d3.scaleLinear().domain([closeMax, 0]).range([0, 1]);
    let distScale = d3.scaleLinear().domain([0, distMax]).range([0, 1]);
    let pickedPairs = [...pairs].map(p=> {
        p.delta = p.deltas.filter(d=> d.key === field)[0];
        p.closeness = p.closeness.filter(d=> d.key === field)[0];
        p.deltaRank = deltaScale(p.delta.value);
        p.closenessRank = closeScale(p.closeness.value);
        p.distanceRank = distScale(p.distance);
        p.totalRank = (weights[0] * p.distanceRank) + (weights[1] * p.deltaRank) + (weights[2] * p.closenessRank);
        return p;
    })

    let sortedPairs = pickedPairs.sort((a, b)=> b.totalRank - a.totalRank).slice(0, 40);
    sortedPairs = sortedPairs.filter((f, i)=> i%2 === 0)
    drawSorted(sortedPairs, field);
}

function drawSorted(pairs, field){

  let pairColor = ['#FF5733', '#129BF5'];

  let nodes = findBrushedNodes();
  //console.log('nodes from brush',nodes.map(m=> m.species))
   
    let width = 600;
    let height = 100;
    let xScale = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, width]);

    d3.select('#main').selectAll('*').remove()
    let svg = d3.select('#main').append('svg');
    svg.attr('height', pairs.length * 150)
    let wrap = svg.append('g');
    wrap.attr('transform', 'translate(20, 100)')
    let pairWraps = wrap.selectAll('g.pair-wrap').data(pairs).join('g').classed('pair-wrap', true);
    pairWraps.attr('transform', (d, i)=> `translate(50,${i*150})`);
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
        return [{label: 'Distance', value: d.distance, score: d.distanceRank}, 
         {label: 'Delta', value: d.delta.value, score: d.deltaRank},
         {label: 'Closeness', value: d.closeness.value, score: d.closenessRank}
        ];
    }).join('g').classed('score', true);

    let scoreLabel = scoreWrap.append('g').attr('transform', `translate(650, 10)`);
    scoreLabel.append('rect').attr('width', 200).attr('height', 40).attr('fill', 'gray').attr('y', 45).attr('opacity', .1)
    scoreLabel.append('text').text('Score').attr('y', 20).style('text-anchor', 'end').style('font-size', 11);
    scoreLabel.append('text').text('Value').attr('y', 40).style('text-anchor', 'end').style('font-size', 11);

    scoreLabel.append('text').text('Total Score').attr('y', 60).attr('x', 95).style('text-anchor', 'end').style('font-size', 11);
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
        let x = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, width]);
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
          let start = speciesTest[0].indexOf(m);
          let ne = speciesTest[0].filter((f, j)=> (j < (+start + 2)) && (j > (+start - 2)));
          return ne;
      });
      
      let speciesNames = [species1[species1.length-1], species2[species2.length-1]]
      ////EXPERIMENTING WITH NODES////
      let neighPaths = dataMaster[0].filter(f=> (neighbors.indexOf(f[f.length - 1].node)) > -1 && (speciesNames.indexOf(f[f.length - 1].node) === -1));
  
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

   //console.log('brushed',brushedPaths, nodes.map(m=> m.node))
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
        xAxisG.call(d3.axisBottom(xScale).ticks(10));
        xAxisG.attr('transform', `translate(0, ${height})`)

    pairWraps.on('mouseover', (d, i, n)=> {
       
        let species1 = d.p1.map(n=> n.node);
        let species2 = d.p2.map(n=> n.node);
        let labels = [...d.p1.filter(n=> n.leaf === true).map(m=> m.node)].concat(d.p2.filter(n=> n.leaf === true).map(m=> m.node));
        let neighbors = labels.flatMap(m=> {
            let start = speciesTest[0].indexOf(m);
            let ne = speciesTest[0].filter((f, j)=> (j < (+start + 2)) && (j > (+start - 2)));
            return ne;
        });
        
        let neighNodes = dataMaster[0].filter(f=> neighbors.indexOf(f[f.length -1].node) > -1).flatMap(m=> m.map(f=> f.node))
       
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let treeLinks  = d3.select('#sidebar').selectAll('.link');
        let pairNode1 = treeNode.filter(f=> {
            return species1.indexOf(f.data.node) > -1;
        }).classed('hover one', true);

        let pairNode2 = treeNode.filter(f=> {
          return species2.indexOf(f.data.node) > -1;
      }).classed('hover two', true);

        treeLinks.filter(f=> species1.indexOf(f.data.node) > -1).classed('hover one', true);
        treeLinks.filter(f=> species2.indexOf(f.data.node) > -1).classed('hover two', true);
        treeNode.filter(f=> neighNodes.indexOf(f.data.node) > -1).classed('hover-neighbor', true);
        //Hiding Others
        treeNode.filter(f=> (neighNodes.indexOf(f.data.node) === -1) && (species1.concat(species2).indexOf(f.data.node) === -1)).classed('hover-not', true);
        //Coloring Niehgbors
        treeLinks.filter(f=> neighNodes.indexOf(f.data.node) > -1).classed('hover-neighbor', true);
        //Hiding Others
        treeLinks.filter(f=> (neighNodes.indexOf(f.data.node) === -1) && (species1.concat(species2).indexOf(f.data.node) === -1)).classed('hover-not', true);
        
        let speciesNames = [species1[species1.length-1], species2[species2.length-1]]
        d3.select(n[i]).selectAll('.pair-neighbor').attr('opacity', 1);
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


   
}