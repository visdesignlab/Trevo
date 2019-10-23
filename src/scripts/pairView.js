import { pairPaths } from "./dataFormat";
import { dropDown } from "./buttonComponents";
import * as d3 from "d3";


export function generatePairs(data, main){

        let pairs = pairPaths(data);//.sort((a, b)=> +b.distance - +a.distance);

        //let pairs = test.slice(0, 20);

        let attKeys = d3.entries(pairs[0].p1[0].attributes)
                    .filter(f=> f.value.type === 'continuous')
                    .map(m=> {
                        return {'field': m.key, 'value': m.key }
                    });
        
        let drop = dropDown(d3.select('#toolbar'), attKeys, attKeys[0].field, 'attr-drop');
        drop.on('click', (d, i, n)=> {
            updateRanking(pairPaths(data), d.field);
            d3.select('.attr-drop.dropdown').select('button').text(d.field)
        });

        updateRanking([...pairs], attKeys[0].field);

}

function updateRanking(pairs, field){
    
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
        p.totalRank = p.deltaRank + p.closenessRank + p.distanceRank;
        return p;
    })
    let sortedPairs = pickedPairs.sort((a, b)=> b.totalRank - a.totalRank).slice(0, 40);
    sortedPairs = sortedPairs.filter((f, i)=> i%2 === 0)
    drawSorted(sortedPairs, field);

}

function drawSorted(pairs, field){
    console.log('pairs', pairs, field);
    let width = 600;
    let height = 100;
    let xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    d3.select('#main').selectAll('*').remove();
    let svg = d3.select('#main').append('svg');
    svg.attr('height', pairs.length * 130)
    let wrap = svg.append('g');
    wrap.attr('transform', 'translate(20, 70)')
    let pairWraps = wrap.selectAll('g.pair-wrap').data(pairs).join('g').classed('pair-wrap', true);
    pairWraps.attr('transform', (d, i)=> `translate(50,${i*120})`)
    pairWraps.append('rect')
        .attr('width', (d, i)=> {
            console.log('d', d);
            return width - xScale(d.common.edgeMove);
        })
        .attr('height', height)
        .attr('x', d=> xScale(d.common.edgeMove))
        .attr('stroke-width', 1).attr('stroke', 'black')
        .attr('fill', 'none');

    pairWraps.append('text').text((d, i)=> {
        return `${d.p1[d.p1.length - 1].label} + ${d.p2[d.p2.length - 1].label}`
    });

    

    let pairGroup = pairWraps.selectAll('g.pair').data(d=> [d.p1, d.p2]).join('g').classed('pair', true);
    let branches = pairGroup.selectAll('g.branch').data(d=> d).join('g').classed('branch', true);
    branches.attr('transform', (d, i)=> `translate(${xScale(d.edgeMove)}, 0)`);
    branches.append('rect').attr('width', 10).attr('height', 5).attr('y', (d, i)=> {
        return d.attributes[field].yScale(d.attributes[field].realVal);
    });

    var lineGen = d3.line()
    .x(d=> {
        let x = d3.scaleLinear().domain([0, 1]).range([0, width]);
       // let distance = (moveMetric === 'move') ? d.move : x(d.edgeMove);
       let distance = x(d.edgeMove);
        return distance; })
    .y(d=> {
        let y = d.attributes[field].yScale;
        y.range([height, 0]);
      
        return y(d.attributes[field].realVal);
       
    });

    let innerPaths = pairGroup.append('path')
    .attr("d", lineGen)
    .attr("class", "inner-line")
    .style('stroke', 'rgb(165, 185, 198)');



}