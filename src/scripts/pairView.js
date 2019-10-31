import { pairPaths } from "./dataFormat";
import { dropDown } from "./buttonComponents";
import * as d3 from "d3";
import { renderTree } from "./sidebarComponent";
import { speciesTest, dataMaster } from ".";


export function generatePairs(data, main){

        let pairs = pairPaths(data);

        let attKeys = d3.entries(pairs[0].p1[0].attributes)
                    .filter(f=> f.value.type === 'continuous')
                    .map(m=> {
                        return {'field': m.key, 'value': m.key }
                    });
        
        let drop = dropDown(d3.select('#toolbar'), attKeys, attKeys[0].field, 'attr-drop');
        drop.on('click', (d, i, n)=> {
            updateRanking(pairPaths(data), d.field);
            renderTree(d3.select('#sidebar'), null, true, d.field);
            d3.select('.attr-drop.dropdown').select('button').text(d.field);
        });

        updateRanking([...pairs], attKeys[0].field);

        ///BUTTON FOR PHENOGRAM VIEW. MAYBE MOVE THIS TO SIDEBAR
        let phenogramButton = d3.select('#sidebar').select('.button-wrap').append('button').text('Phenogram');
        phenogramButton.classed('btn btn-outline-secondary', true); 
        phenogramButton.on('click', ()=> {
            renderTree(d3.select('#sidebar'), null, true, d3.select('.attr-drop.dropdown').select('button').text())
        })
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
   // console.log('pairs', pairs, field);
    let width = 600;
    let height = 100;
    let xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    d3.select('#main').selectAll('*').remove()
    let svg = d3.select('#main').append('svg');
    svg.attr('height', pairs.length * 150)
    let wrap = svg.append('g');
    wrap.attr('transform', 'translate(20, 70)')
    let pairWraps = wrap.selectAll('g.pair-wrap').data(pairs).join('g').classed('pair-wrap', true);
    pairWraps.attr('transform', (d, i)=> `translate(50,${i*150})`);
    pairWraps.append('rect')
        .attr('width', (d, i)=> {
            return width - xScale(d.common.edgeMove);
        })
        .attr('height', height)
        .attr('x', d=> xScale(d.common.edgeMove))
        .attr('stroke-width', 1).attr('stroke', 'black')
        .attr('fill', '#fff');

    pairWraps.append('text').text((d, i)=> {
        return `${d.p1[d.p1.length - 1].label} + ${d.p2[d.p2.length - 1].label}`
    }).attr('y', -10);

    let pairGroup = pairWraps.selectAll('g.pair').data(d=> [d.p1, d.p2]).join('g').classed('pair', true);

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

    let branches = pairGroup.selectAll('g.branch').data(d=> d).join('g').classed('branch', true);
    branches.attr('transform', (d, i)=> `translate(${xScale(d.edgeMove)}, 0)`);
    branches.filter(f=> f.leaf != true).append('rect').attr('width', 10).attr('height', (d)=> {
        let y = d.attributes[field].yScale;
        return y(d.attributes[field].lowerCI95) - y(d.attributes[field].upperCI95)
    }).attr('fill', 'rgb(165, 185, 198, .5)').attr('y', (d, i)=> {
        let y = d.attributes[field].yScale;
        return y(d.attributes[field].upperCI95);
    });

    branches.append('rect').attr('width', 10).attr('height', 4).attr('y', (d, i)=> {
        return d.attributes[field].yScale(d.attributes[field].realVal) - 2;
    });

    pairWraps.append('rect').attr('width', (d, i)=> {
        return xScale(d.common.edgeMove)})
        .attr('height', height)
        .attr('fill', '#fff').style('opacity', 0.7);

        let yAxisG = pairWraps.append('g').classed('y-axis', true);
        let xAxisG = pairWraps.append('g').classed('x-axis', true);
        xAxisG.call(d3.axisBottom(xScale).ticks(10));
        xAxisG.attr('transform', `translate(0, ${height})`)

    pairWraps.on('mouseover', (d, i)=> {
        
        let species = [...d.p1.map(n=> n.node)].concat(d.p2.map(n=> n.node));
        let labels = [...d.p1.filter(n=> n.leaf === true).map(m=> m.label)].concat(d.p1.filter(n=> n.leaf === true).map(m=> m.label));
        let neighbors = labels.flatMap(m=> {
            let start = speciesTest[0].indexOf(m);
            let ne = speciesTest[0].filter((f, j)=> (j < (+start + 4)) && (j > (+start - 4)));
            return ne;
        });
        
        let neighNodes = dataMaster[0].filter(f=> neighbors.indexOf(f[f.length -1].label) > -1).flatMap(m=> m.map(f=> f.node))
       
        let treeNode  = d3.select('#sidebar').selectAll('.node');
        let treeLinks  = d3.select('#sidebar').selectAll('.link');
        treeNode.filter(f=> {
            return species.indexOf(f.data.node) > -1;
        }).classed('hover', true);
        treeLinks.filter(f=> species.indexOf(f.data.node) > -1).classed('hover', true);

        treeNode.filter(f=> neighNodes.indexOf(f.data.node) > -1).classed('hover-neighbor', true);
        //Hiding Others
        treeNode.filter(f=> (neighNodes.indexOf(f.data.node) === -1) && (species.indexOf(f.data.node) === -1)).classed('hover-not', true);
        //Coloring Niehgbors
        treeLinks.filter(f=> neighNodes.indexOf(f.data.node) > -1).classed('hover-neighbor', true);
        //Hiding Others
        treeLinks.filter(f=> (neighNodes.indexOf(f.data.node) === -1) && (species.indexOf(f.data.node) === -1)).classed('hover-not', true);

        return d3.select(this).classed('hover', true);
    })

    pairWraps.on('mousemove', function(d, i) {
        let scale = d.p1[0].attributes[field].yScale;
        let axisGroupTest = d3.select(this).select('.y-axis');
        let axisGroup = axisGroupTest.empty() ? d3.select(this).append('g').classed('y-axis', true) : axisGroupTest;
        if(d3.select('#compare-button').empty() || d3.select('#compare-button').text()==='Normal Mode'){
            axisGroup.attr('transform', (d, i)=> 'translate('+(d3.mouse(this)[0] - 10)+',0)')
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
        let treeNode  = d3.select('#sidebar').selectAll('.node').classed('hover', false).classed('hover-neighbor', false).classed('hover-not', false);
        let treeLinks  = d3.select('#sidebar').selectAll('.link').classed('hover', false).classed('hover-neighbor', false).classed('hover-not', false);
        return d3.select(this).classed('hover', false);
    });
    




}