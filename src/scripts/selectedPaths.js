import * as d3 from "d3";
import {branchPaths, renderAttributes, drawContAtt, drawDiscreteAtt} from './rendering';
import {formatAttributeData} from './dataFormat';
import {renderToggles} from './toolbarComponent';

export function pathSelected(selectedPath, scales){

    //let selectedPaths = d3.select('#main-path-view').select('.path-wrapper').selectAll('.selected-path').data();
    //console.log(selectedPaths);
    let selectedDiv = d3.select('div#selected');
    console.log('scales pathSelec', scales);
    if(selectedPath === null){
        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
    }else{
        renderSelectedView([selectedPath], selectedDiv, scales);
        d3.select('div#main').style('padding-top', '230px');

    }
}

export function renderSelectedView(normedPaths, selectedDiv, scales){
    console.log('scales', scales);
    let svgTest = selectedDiv.select('svg.select-svg');

    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

   // let paths = svg.selectAll('g').data(selectedArray).join('g');
   let pathGroups = branchPaths(svg, normedPaths);
   pathGroups.attr('transform', (d, i)=> 'translate(0,'+(i*60)+')');

       /// LOWER ATTRIBUTE VISUALIZATION ///
       let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
       let attData = formatAttributeData(normedPaths, scales)
       let attributeGroups = renderAttributes(attributeWrapper, attData, scales, null);
      
       let attributeHeight = 45;
       pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
       //renderToggles(normedPaths, toggleSVG, attributeGroups, scales);
       drawContAtt(attributeGroups);
       drawDiscreteAtt(attributeGroups, scales);
   
       //tranforming elements
       svg.style('height', ((normedPaths.length + attributeGroups.data().map(m=> m[0]).length)* 50) + 'px');
       selectedDiv.style('height', ((normedPaths.length + attributeGroups.data().map(m=> m[0]).length)* 45) + 'px');
       attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');

    ////NEED TO GENERALIZE BRANCH FUNCTION IN RENDER TO WORK HERE

    return svg;
}