import * as d3 from "d3";

export let brushArray = [];

export function addBrushables(bins){
    console.log('bins',bins)
    let startPos = 0;
    let brushOb = null;
    bins.on('mousedown', (d, i, n)=> {
        
        let ind = brushArray.length + 1;
        let rectGroup = d3.select(n[i]).append('g').classed(`group-${ind}`, true);

        

        let dragPos = d3.mouse(n[i]);
        startPos = dragPos[1];
        brushOb = {key: `group-${ind}`, brush: rectGroup};
        brushArray.push(brushOb);
        
        let rect = rectGroup.append('rect')
            .classed(`rect-${ind}`, true)
            .attr('height', 10)
            .attr('width', 10)
            .attr('opacity', 0.3)
            .attr('transform', `translate(0, ${dragPos[1]})`);
    
    });

    bins.on('mouseup', (d, i, n)=> {
        addBadge(brushOb);
    })
}

function addBadge(brushOb){
    d3.select('#toolbar').append()

    let badge = d3.select('#toolbar')
    .append('span')
   // .attr('class', classLabel)
    .attr('id', brushOb.key)
    .classed('brush-span', true)
  //  .classed(`${data.bins.groupLabel}`, true)
    .classed('badge badge-secondary', true)
   // .style('background', brushColors[index][0])
   .style('background', 'red')
   // .attr('value', `${data.bins.groupLabel}-${data.key}`)
    //.datum({brush:brushOb, nodes: nodes})
    .datum({brush:brushOb})
    //.text(`${data.bins.groupLabel}, ${data.key}: ${zero(brushedVal[0])} - ${zero(brushedVal[1])}`);
    .text(`this is a test`);

    let xOut = badge.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
    xOut.on('click', (d, i, n)=> {
        console.log('d',n[i].parentNode)
        removeBrush(d.brush);
        d3.select(n[i].parentNode).remove();
        // d3.select(d.brush).call(brush.move, null);
        // d3.select(n[i].parentNode).remove();
        // d3.select(d.brush).select('.overlay').attr('stroke-width', 0);
        // descendBins.selectAll('.distribution-too').remove();
        // otherBins.selectAll('.distribution-too').remove();
        // d3.select(d.brush.parentNode).select('.distribution-too').remove();
        // d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed-second', false);
        // d3.select('#sidebar').selectAll(`.${classy}`).classed('anti-brushed', false);
    });
}

function removeBrush(brushOb){

    brushOb.brush.remove();
    brushArray = brushArray.filter(f=> f.key != brushOb.key);
    console.log(brushArray)

}