import * as d3 from "d3";
import {branchPaths, renderPaths, renderAttributes, drawContAtt, drawDiscreteAtt, drawPathsAndAttributes} from './rendering';
import {formatAttributeData} from './dataFormat';
import {renderAttToggles} from './toolbarComponent';

export function pathSelected(selectedPath, otherPaths, scales, moveMetric){

    let selectedDiv = d3.select('div#selected');
    if(selectedPath === null){
        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
    }else{
        renderSelectedView([selectedPath], otherPaths, selectedDiv, scales, moveMetric);
        let sortedPaths = sortOtherPaths(selectedPath, otherPaths);

        let main = d3.select('div#main');
         
          /// LOWER ATTRIBUTE VISUALIZATION ///
        drawPathsAndAttributes(sortedPaths.map(s=> s.data), main, scales, moveMetric);
        main.style('padding-top', '250px');
    }
}

export function sortOtherPaths(pathData, otherPaths){

    let thisSpecies = pathData.filter(f=> f.leaf)[0];
    let chosenPath = pathData.reverse().map(m=> m.node)
    
    let rankedPaths = otherPaths.map(path=> {
        let step = 0;
        let test = path.reverse().map((node, i)=> {
            if(chosenPath.indexOf(node.node))
            return {'indexOf': chosenPath.indexOf(node.node), 'pathIndex': i, 'node': node, 'chosen': chosenPath[chosenPath.indexOf(node.node)] }
        }).filter(f=> f.indexOf > -1);

        let distance = (test[0].indexOf + test[0].pathIndex);

        return {'data':path.reverse(), 'distance': distance }

    });
    let sortedData = rankedPaths.sort(function(a, b){return a.distance - b.distance});
    return sortedData;
}

export function renderSelectedView(pathData, otherPaths, selectedDiv, scales, moveMetric){

    let selectedToolTest = selectedDiv.select('.selected-toolbar');
    let selectedTool = selectedToolTest.empty() ? selectedDiv.append('div').classed('selected-toolbar', true) : selectedToolTest;
    let xIconWrap = selectedTool.append('div').classed('x-icon', true)
    let xIcon = xIconWrap.append('i').classed("far fa-times-circle", true);
    xIcon.on('click', ()=> pathSelected(null, scales));

    let sortByDistanceButton = selectedTool.append('button').classed('btn btn-secondary btn-sm', true);
    sortByDistanceButton.text('Sort Most to Least');
    sortByDistanceButton.on('click', ()=> sortPaths(sortByDistanceButton));

    let svgTest = selectedDiv.select('svg.select-svg');
    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

    let selectWrap = svg.append('g').classed('select-wrap', true);

    let selectedGroups = renderPaths(pathData, selectWrap, scales, moveMetric);
    selectedGroups.attr('transform', (d, i)=> 'translate(0,'+(i*60)+')');

    //////PLAYING WITH FUNCTION TO CALULATE DISTANCES

       /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = selectedGroups.append('g').classed('attribute-wrapper', true);
    let attData = formatAttributeData(pathData, scales)
    let attributeGroups = renderAttributes(attributeWrapper, attData, scales, null);
      
    let attributeHeight = 45;
    selectedGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
    
    drawContAtt(attributeGroups);
    drawDiscreteAtt(attributeGroups, scales);

    //tranforming elements
    svg.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 50) + 50 + 'px');
    selectedDiv.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 45) + 50 + 'px');
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');

    ////NEED TO GENERALIZE BRANCH FUNCTION IN RENDER TO WORK HERE

    return svg;
}

function sortPaths(sortButton){
    if(sortButton.text() === 'Sort Most to Least'){
        sortButton.text('Sort Least to Most');
    }else{
        sortButton.text('Sort Most to Least');
    }
}

