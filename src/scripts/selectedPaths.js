import * as d3 from "d3";
import {branchPaths, renderPaths, renderAttributes, drawContAtt, drawDiscreteAtt} from './rendering';
import {formatAttributeData} from './dataFormat';
import {renderAttToggles} from './toolbarComponent';

export function pathSelected(selectedPath, scales, moveMetric){

    let selectedDiv = d3.select('div#selected');
    if(selectedPath === null){
        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
    }else{
        renderSelectedView([selectedPath], selectedDiv, scales, moveMetric);
        d3.select('div#main').style('padding-top', '250px');

    }
}

export function renderSelectedView(pathData, selectedDiv, scales, moveMetric){

    let selectedToolTest = selectedDiv.select('.selected-toolbar');
    let selectedTool = selectedToolTest.empty() ? selectedDiv.append('div').classed('selected-toolbar', true) : selectedToolTest;
    let xIconWrap = selectedTool.append('div').classed('x-icon', true)
    let xIcon = xIconWrap.append('i').classed("far fa-times-circle", true);

    xIcon.on('click', ()=> pathSelected(null, scales));

    let svgTest = selectedDiv.select('svg.select-svg');
    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

    let selectWrap = svg.append('g').classed('select-wrap', true);

    let pathGroups = renderPaths(pathData, selectWrap, scales, moveMetric);
    
    //let pathGroups = branchPaths(selectWrap, pathData, scales, moveMetric);
    pathGroups.attr('transform', (d, i)=> 'translate(0,'+(i*60)+')');

       /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
    let attData = formatAttributeData(pathData, scales)
    let attributeGroups = renderAttributes(attributeWrapper, attData, scales, null);
      
    let attributeHeight = 45;
    pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
    
    drawContAtt(attributeGroups);
    drawDiscreteAtt(attributeGroups, scales);

    //tranforming elements
    svg.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 50) + 50 + 'px');
    selectedDiv.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 45) + 50 + 'px');
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');

    ////NEED TO GENERALIZE BRANCH FUNCTION IN RENDER TO WORK HERE

    return svg;
}

