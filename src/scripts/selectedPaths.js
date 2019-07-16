import * as d3 from "d3";
import {branchPaths, renderAttributes, drawContAtt, drawDiscreteAtt} from './rendering';
import {formatAttributeData} from './dataFormat';
import {renderAttToggles} from './toolbarComponent';

export function pathSelected(selectedPath, scales){

    let selectedDiv = d3.select('div#selected');
    if(selectedPath === null){
        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
    }else{
        renderSelectedView([selectedPath], selectedDiv, scales);
        d3.select('div#main').style('padding-top', '230px');

    }
}

export function renderSelectedView(pathData, selectedDiv, scales){
  
    let svgTest = selectedDiv.select('svg.select-svg');
    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

    let pathGroups = branchPaths(svg, pathData, scales, 'move');
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
    svg.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 50) + 'px');
    selectedDiv.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 45) + 'px');
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');

    ////NEED TO GENERALIZE BRANCH FUNCTION IN RENDER TO WORK HERE

    return svg;
}