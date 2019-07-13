import * as d3 from "d3";
import {branchPaths} from './rendering';

export function pathSelected(selectedPath){

    //let selectedPaths = d3.select('#main-path-view').select('.path-wrapper').selectAll('.selected-path').data();
    //console.log(selectedPaths);
    let selectedDiv = d3.select('div#selected');

    if(selectedPath === null){
        d3.select('div#selected').selectAll('*').remove()
    }else{
        renderSelectedView([selectedPath], selectedDiv);

    }
    

}

export function renderSelectedView(selectedPath, selectedDiv){
    
    let svgTest = selectedDiv.select('svg.select-svg');

    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

   // let paths = svg.selectAll('g').data(selectedArray).join('g');
   let paths = branchPaths(svg, selectedPath);
   paths.attr('transform', (d, i)=> 'translate(0,'+(i*60)+')');

    ////NEED TO GENERALIZE BRANCH FUNCTION IN RENDER TO WORK HERE

    return svg;
}