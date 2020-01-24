import * as d3 from "d3";
import { renderDistStructure, binGroups, continuousHistogram, mirrorlineGen } from './distributionView';


export let brushArray = [];

export const brushColors = [
    '#FE6D5E', '#85C1E9', '#A3E4D7' 
]

export function addBrushables(bins, continDist){

    let startPos = 0;
    let endPos = 0;
    let brushOb = null;
    let mouseBool = false;

    bins.on('mousedown', (d, i, n)=> {

        mouseBool = true;

        console.log(d)

        let scale = d3.scaleLinear().domain(d.domain).range([0, 80]);
        
        let ind = brushArray.length + 1;
        let rectGroup = d3.select(n[i]).append('g').classed(`group-${ind}`, true);
        let dragPos = d3.mouse(n[i]);
        startPos = dragPos[1];
        brushOb = {key: `${d.key}-${d.index}-${ind}`, trait:d.key, brush: rectGroup, 'scale': scale, color: brushColors[ind-1]};
        brushArray.push(brushOb);
        
        let rect = rectGroup.append('rect')
            .classed(`rect-${ind}`, true)
            .attr('height', 10)
            .attr('width', 10)
            .attr('opacity', 0.5)
            .attr('fill', brushOb.color)
            .attr('transform', `translate(0, ${dragPos[1]})`);
    });

    bins.on('mousemove', (d, i, n)=> {

        let dragPos = d3.mouse(n[i]);
        if(mouseBool === true){

            brushOb.brush.select('rect').attr('height', (dragPos[1] - startPos));

        }
    })

    bins.on('mouseup', (d, i, n)=> {
       
        mouseBool = false;
        let dragPos = d3.mouse(n[i]);
        endPos = dragPos[1];

        var zero = d3.format(".3n");
       
        console.log('dddd',d)

        let filterData = d.data.filter(f=> f.values.realVal >= brushOb.scale.invert(endPos) && f.values.realVal <= brushOb.scale.invert(startPos));
        let test = continuousHistogram(filterData);

        console.log('filter',filterData, test)

        test.maxCount = d3.sum(d.bins.map(m=> m.length));

        //////EXPERIMENTING WITH BRUSH DRAW DISTRIBUTIONS////
        let brushedDist = d3.select(n[i].parentNode)
            .selectAll('g.distribution-too')
            .data([test])
            .join('g')
            .classed('distribution-too', true);

        brushedDist
        .attr('transform', 'translate(0, 0) rotate(90)');

        let path = brushedDist.append('path')
        .attr('d', mirrorlineGen);

        path.attr("fill", brushOb.color)
        .attr('fill-opacity', 0.5)
            .style('stroke', brushOb.color);

        let nodeNames = filterData.map(m=> m.node);
        let otherBins = continDist.filter(f=> f.index === d.index && f.key != d.key);

        otherBins.each((b, i, n)=> {
                
            let test = continuousHistogram(b.data.filter(f=> nodeNames.indexOf(f.node) > -1) );
               
            test.maxCount = d3.sum(b.bins.map(m=> m.length));
              
            let otherDist = d3.select(n[i]).selectAll('g.distribution-too')
                .data([test])
                .join('g')
                .classed('distribution-too', true);

            otherDist.attr('transform', 'translate(0, 0) rotate(90)');
            let path = otherDist.append('path').attr('d', mirrorlineGen);
            path.attr("fill", brushOb.color).attr('fill-opacity', 0.5)
                .style('stroke', brushOb.color);
    
        });

        let descendBins = continDist.filter(f=> {
            return (f.index > d.index) && (f.key === d.key)});

        descendBins.each((b, i, n)=> {

            let test = b.data.filter(f=> {
                return (f.values.realVal > brushOb.scale.invert(endPos)) && (f.values.realVal < brushOb.scale.invert(startPos));
                });

             let testH = continuousHistogram(test);
           
             testH.maxCount = d3.sum(b.bins.map(m=> m.length));
          
            let otherDist = d3.select(n[i]).selectAll('g.distribution-too')
            .data([testH])
            .join('g')
            .classed('distribution-too', true);

            otherDist.attr('transform', 'translate(0, 0) rotate(90)');
            let path = otherDist.append('path').attr('d', mirrorlineGen);
            path.attr("fill", brushOb.color).attr('fill-opacity', 0.5)
            .style('stroke', brushOb.color);
        });


        addBadge(brushOb, [zero(brushOb.scale.invert(endPos)), zero(brushOb.scale.invert(startPos))], path, otherBins, descendBins);

      
    });
}

function addBadge(brushOb, brushedDomain, dist, otherBins, descendBins){
    d3.select('#toolbar').append()

    let badge = d3.select('#toolbar')
    .append('span')
    .attr('id', brushOb.key)
    .classed('brush-span', true)
    .classed('badge badge-secondary', true)
    .style('background', brushOb.color)
    .datum({brush:brushOb})
    .text(`${brushOb.trait}:${brushedDomain[0]} - ${brushedDomain[1]}`);
  
    let xOut = badge.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
    xOut.on('click', (d, i, n)=> {
        
        removeBrush(d.brush);
        d3.select(n[i].parentNode).remove();
        // d3.select(d.brush).call(brush.move, null);
        // d3.select(n[i].parentNode).remove();
        // d3.select(d.brush).select('.overlay').attr('stroke-width', 0);
        
        dist.remove();
        otherBins.selectAll('.distribution-too').remove();
        descendBins.selectAll('.distribution-too').remove();
        // d3.select(d.brush.parentNode).select('.distribution-too').remove();
        // d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed-second', false);
        // d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed', false);
    });
}

function removeBrush(brushOb){

    brushOb.brush.remove();
    brushArray = brushArray.filter(f=> f.key != brushOb.key);
    //console.log(brushArray)

}