import * as d3 from "d3";
import {branchPaths, renderPaths, renderAttributes, drawContAtt, drawDiscreteAtt, drawPathsAndAttributes} from './rendering';
import {formatAttributeData} from './dataFormat';
import {renderAttToggles} from './toolbarComponent';
import {filterMaster} from './filterComponent';
import {dataMaster} from './index'

export function pathSelected(selectedPath, otherPaths, scales, moveMetric){

    let selectedDiv = d3.select('div#selected');
    if(selectedPath === null){
        d3.select('div#selected').selectAll('*').remove();
        selectedDiv.style('height', 0);
        d3.select('div#main').style('padding-top', '0px');
        let main = d3.select('div#main');
        drawPathsAndAttributes([...otherPaths], main, scales, moveMetric, false);
    }else{
        renderSelectedView([selectedPath], otherPaths, selectedDiv, scales, moveMetric);
        let sortedPaths = sortOtherPaths([...selectedPath], otherPaths);
        let main = d3.select('div#main');
          /// LOWER ATTRIBUTE VISUALIZATION ///
        drawPathsAndAttributes(sortedPaths.map(s=> s.data), main, scales, moveMetric, false);
  
        main.style('padding-top', '250px');
    }
}
export function sortOtherPaths(pathData, otherPaths){

    let thisSpecies = pathData.filter(f=> f.leaf)[0];
    let chosenPath = pathData.reverse().map(m=> m.node);
    
    let rankedPaths = otherPaths.map(path=> {
        let step = 0;
        let test = path.reverse().map((node, i)=> {
            if(chosenPath.indexOf(node.node));
            return {'indexOf': chosenPath.indexOf(node.node), 'pathIndex': i, 'node': node, 'chosen': chosenPath[chosenPath.indexOf(node.node)] }
        }).filter(f=> f.indexOf > -1);
        let distance = (test[0].indexOf + test[0].pathIndex);
        return {'data':path.reverse(), 'distance': distance };

    });
    let sortedData = rankedPaths.sort(function(a, b){return a.distance - b.distance});
    return sortedData;
}
export function renderSelectedView(pathData, otherPaths, selectedDiv, scales, moveMetric){

    let selectedSpecies = pathData.flatMap(p=> p.filter(f=> f.leaf === true).map(n=> n.node));
    let treeNodes = d3.select('#sidebar').select('svg').selectAll('.node');
    treeNodes.filter(node=> selectedSpecies.indexOf(node.data.node) > -1).classed('selected', true);

   ////FILTER MASTER TO HIDE ATTRIBUTES THAT ARE DESELECTED FROM FILTERBAR
    let attrHide = filterMaster.filter(f=> f.type === 'hide-attribute').length > 0 ? filterMaster.filter(f=> f.type === 'hide-attribute').map(m=> m.attribute) : [];
    let attrFilter = attrHide.length > 0 ? scales.filter(sc=> {
        return attrHide.indexOf(sc.field) === -1;
    }).map(m=> m.field) : null;

    let selectedToolTest = selectedDiv.select('.selected-toolbar');
    let selectedTool = selectedToolTest.empty() ? selectedDiv.append('div').classed('selected-toolbar', true) : selectedToolTest;
    selectedTool.selectAll('*').remove();

    let xIconWrap = selectedTool.append('div').classed('x-icon', true)
    let xIcon = xIconWrap.append('i').classed("far fa-times-circle", true);
    xIcon.on('click', ()=> {
        d3.selectAll('.high').classed('high', false);
        d3.selectAll('.low').classed('low', false);
        treeNodes.select('.selected').classed('selected', false);
        
        pathSelected(null, dataMaster[0], scales, moveMetric)
    });

    ///////////////////////

    let sortByDistanceDiv = selectedTool.append('div').style('display', 'inline-block');
    sortByDistanceDiv.append('text').text('Topology: ');
    let sortByDistanceButton = sortByDistanceDiv.append('button').classed('btn btn-secondary btn-sm', true);
    sortByDistanceButton.text('Sort Most to Least');
    sortByDistanceButton.on('click', ()=> sortPaths(sortByDistanceButton));
    
    /////////////Sorting by attribute///////////////
    let attrKeys = scales.map(m=> m.field);
    let attrSortWrap = selectedTool.append('div').style('display', 'inline-block');
    attrSortWrap.append('h6').text('Sort by: ').style('display', 'inline');

   let radioDiv = attrSortWrap.selectAll('div.attr-radio').data(attrKeys).join('div').classed('attr-radio form-check form-check-inline', true);
   let radio = radioDiv.append('input').attr('type', 'radio').property('name', 'attribute-radio-sort').property('value', d=> d).attr('id', (d, i)=> 'radio-'+i).classed("form-check-input", true);
   radioDiv.append('label').text(d=> d).property('for', (d, i)=> 'radio-'+i).classed("form-check-label", true);

   radio.on('click', (d, i)=> {
   
    let leaf = pathData.map(node=> node.filter(d=> d.leaf === true)[0])[0]
 
    let sorted = [...otherPaths].sort(function(a, b){
        return a.filter(n=> n.leaf === true)[0].attributes[d].realVal - b.filter(n=> n.leaf === true)[0].attributes[d].realVal;
    });

    let main = d3.select('div#main');
    /// LOWER ATTRIBUTE VISUALIZATION ///
    drawPathsAndAttributes(sorted.reverse(), main, scales, moveMetric);
    main.style('padding-top', '250px');

    let paths = main.select('svg#main-path-view').selectAll('.paths');

    let high = paths.filter(path=> {
        let leafOther = path.filter(node=> node.leaf === true)[0];
        return leafOther.attributes[d].realVal > leaf.attributes[d].realVal;
    });
    high.classed('high', true);

    let highLeaves = high.data().map(path=> path.filter(f=> f.leaf === true)[0].node);
    
    treeNodes.filter(f=> highLeaves.indexOf(f.data.node) > -1).classed('high', true);

    let low = paths.filter(path=> {
        let leafOther = path.filter(node=> node.leaf === true)[0];
        return leafOther.attributes[d].realVal < leaf.attributes[d].realVal;
    });
    low.classed('low', true);

    let lowLeaves = low.data().map(path=> path.filter(f=> f.leaf === true)[0].node);

    treeNodes.filter(f=> lowLeaves.indexOf(f.data.node) > -1).classed('low', true);

    let same = paths.filter(path=> {
        let leafOther = path.filter(node=> node.leaf === true)[0];
        return leafOther.attributes[d].realVal === leaf.attributes[d].realVal;
    });
    same.classed('same', true);

});
   /////////////////////////////////////////////////

    let svgTest = selectedDiv.select('svg.select-svg');
    let svg = svgTest.empty()? selectedDiv.append('svg').classed('select-svg', true) : svgTest;

    let selectWrap = svg.append('g').classed('select-wrap', true);

    let selectedGroups = renderPaths(pathData, selectWrap, scales, moveMetric);
    selectedGroups.attr('transform', (d, i)=> 'translate(0,'+(i*60)+')');

  //  console.log('sellllected',selectedGroups.select('.time-line').selectAll('.node'))

    let nodes = selectedGroups.select('.time-line').selectAll('.node');
    nodes.on('mouseover', (d, i)=> {
       // console.log('d from node', d);
       // console.log('otherpaths',otherPaths);
        let nearest = otherPaths.filter(path=> {
            let nodearray = path.flatMap(f=> f.node);
            return nodearray.indexOf(d.node) > -1;
        });
        console.log(nearest[0], nearest[1]);
        let nearestA = nearest[0];
        let nearestB = nearest[1];
    });

    //////PLAYING WITH FUNCTION TO CALULATE DISTANCES

       /// LOWER ATTRIBUTE VISUALIZATION ///
    let attributeWrapper = selectedGroups.append('g').classed('attribute-wrapper', true);
    let attData = formatAttributeData(pathData, scales, attrFilter);
    let attributeGroups = renderAttributes(attributeWrapper, attData, scales, null);
      
    let attributeHeight = 45;
    selectedGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');
    
    drawContAtt(attributeGroups);
    drawDiscreteAtt(attributeGroups, scales);

    //tranforming elements
    svg.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 50) + 50 + 'px');
    selectedDiv.style('height', ((pathData.length + attributeGroups.data().map(m=> m[0]).length)* 45) + 50 + 'px');
    attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');

    d3.selectAll('.selected-path').classed('selected-path', false);

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

