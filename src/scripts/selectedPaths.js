import * as d3 from "d3";

export function pathSelected(selectedPath){

    let selectedPaths = d3.select('#main-path-view').select('.path-wrapper').selectAll('.selected-path').data();
    console.log(selectedPaths);
    let selectedDiv = d3.select('div#selected');

    renderSelectedView(selectedPaths, selectedDiv);

}

export function renderSelectedView(selectedArray, selectedDiv){
    console.log(selectedArray);
    let svgTest = selectedDiv.select('svg.select-svg');
    console.log(svgTest.empty())
    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;
    return svg;
}