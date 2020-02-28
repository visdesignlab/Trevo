import * as d3 from "d3";
import { renderDistStructure, binGroups, continuousHistogram, mirrorlineGen } from './distributionView';
import { getLatestData } from "./filterComponent";
import { addClade, cladeKeeper } from "./cladeMaker";
import { updateCladeDrop } from "./toolbarComponent";


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
       
      

        let filterData = d.data.filter(f=> f.values.realVal >= brushOb.scale.invert(endPos) && f.values.realVal <= brushOb.scale.invert(startPos));
        let test = continuousHistogram(filterData);

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

        
        let otherBins = findNodesOtherTraits(d, brushOb, filterData, continDist);
        let descendBins = findDescendValues(d, brushOb, [endPos, startPos], continDist);
       
        let treenodeOb = highlightTree(filterData, descendBins, brushOb);
       
        addBadge(brushOb, [zero(brushOb.scale.invert(endPos)), zero(brushOb.scale.invert(startPos))], path, otherBins, descendBins, treenodeOb, filterData);
      
    });
}

function highlightTree(nodes, descendBins, brushOb){
    let treenodes = d3.select('#sidebar').select('.tree-svg').selectAll('.node').filter(f=> {
        let names = nodes.map(m=> m.node);
        return names.indexOf(f.data.node) > -1});
    let descendNodes = d3.select('#sidebar').select('.tree-svg').selectAll('.node').filter(f=> {
        let names = descendBins.data().flatMap(m=> m.data.map(d=> d.node));
        return names.indexOf(f.data.node) > -1});
    let descendLinks = d3.select('#sidebar').select('.tree-svg').selectAll('.link').filter(f=> {
        let names = descendBins.data().flatMap(m=> m.data.map(d=> d.node));
        return names.indexOf(f.data.node) > -1});
    treenodes.select('circle').attr('fill', brushOb.color).attr('r', 5).style('stroke-width', '1px').style('stroke', 'gray');
    descendNodes.select('circle').attr('fill', brushOb.color).attr('r', 5);
    //descendLinks.style('stroke', brushOb.color);
    return {'treenodes': treenodes, 'descendNodes':descendNodes, 'descendLinks': descendLinks};
}

function findNodesOtherTraits(data, brushOb, filterData, continDist){

    let nodeNames = filterData.map(m=> m.node);

    let otherBins = continDist.filter(f=> f.index === data.index && f.key != data.key);

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

    return otherBins;
}
function findDescendValues(data, brushOb, valueRange, continDist){

    let descendBins = continDist.filter(f=> {
        return (f.index > data.index) && (f.key === data.key)});

    descendBins.each((b, i, n)=> {

        let test = b.data.filter(f=> {
            return (f.values.realVal > brushOb.scale.invert(valueRange[0])) && (f.values.realVal < brushOb.scale.invert(valueRange[1]));
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

    return descendBins;

}

function addBadge(brushOb, brushedDomain, dist, otherBins, descendBins, treenodeOb, filterData){
    d3.select('#toolbar').append()

    let badge = d3.select('#toolbar')
    .append('span')
    .attr('id', brushOb.key)
    .classed('brush-span', true)
    .classed('badge badge-secondary', true)
    .style('background', brushOb.color)
    .datum({brush:brushOb})
    .text(`${brushOb.trait}:${brushedDomain[0]} - ${brushedDomain[1]}`);

    let nodeNames = filterData.map(m=> m.node);

    let species = getLatestData().filter(f=> {
        let nodes = f.map(n=> n.node).filter(no => nodeNames.includes(no));
        return nodes.length > 0;
    }).flatMap(s=> s[s.length - 1].node);




    badge.on('click', ()=> {

        let tool = d3.select('#copy-tooltip');
       
        tool.classed('hidden') ? tool.classed('hidden', false) : tool.classed('hidden', true);

        tool.style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px")

        tool.select('button').on('click', ()=> {

            tool.classed('hidden', true);
        
            let textIn = d3.select('#copy-input');
            textIn.select('#copy-input-text').attr('value', species)

            textIn.classed('hidden', false);

            textIn.style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px")

            textIn.select('button').on('click', ()=> {
                textIn.classed('hidden', true);
                let copyText = document.getElementById("copy-input-text");
                copyText.select();
                copyText.setSelectionRange(0, 99999); /*For mobile devices*/
                document.execCommand("copy");

               
                alert("Copied the text: " + copyText.value);

            });

            textIn.select('#make-clade-copy').on('click', ()=> {
               
                textIn.classed('hidden', true);
                
                let name = `Clade-Brush-${species.length}`;
               
                addClade(name, getLatestData().filter(f=> species.indexOf(f[f.length - 1].node) > -1), []);

                //growSidebarRenderTree(null);
                let ul = d3.select('div#clade-show').selectAll
           
                updateCladeDrop(ul, cladeKeeper[cladeKeeper.length - 1]);
            });


           

        })

        // var copyText = document.getElementById("myInput");

        // /* Select the text field */
        // copyText.select();
        // copyText.setSelectionRange(0, 99999); /*For mobile devices*/
      
        // /* Copy the text inside the text field */
        // document.execCommand("copy");
      
        // /* Alert the copied text */
        // alert("Copied the text: " + copyText.value);

    })

    

  

    let xOut = badge.append('i').classed('close fas fa-times', true).style('padding-left', '10px');
    
    xOut.on('click', (d, i, n)=> {
        
        removeBrush(d.brush);
        d3.select(n[i].parentNode).remove();
        dist.remove();
        otherBins.selectAll('.distribution-too').remove();
        descendBins.selectAll('.distribution-too').remove();
        treenodeOb.treenodes.selectAll('circle').attr('fill', 'gray').attr('r', 3).style('stroke-width', '0px');
        treenodeOb.descendNodes.selectAll('circle').attr('fill', 'gray').attr('r', 3);
        treenodeOb.descendLinks.style('stroke', 'gray');
    
    });
}

function removeBrush(brushOb){

    brushOb.brush.remove();
    brushArray = brushArray.filter(f=> f.key != brushOb.key);

}