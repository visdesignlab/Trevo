import '../styles/index.scss';
import {formatAttributeData} from './dataFormat';
import {renderAttributes,  drawContAtt, drawDiscreteAtt, renderPaths} from './rendering';
import {renderDistibutions} from './distributionView';
import * as d3 from "d3";

export function toolbarControl(toolbar, normedPaths, main, calculatedScales){
    let viewButton = toolbar.append('button').attr('id', 'view-toggle').attr('attr' , 'button').attr('class', 'btn btn-outline-secondary') 
    viewButton.text('View Paths');

    let filterButton = toolbar.append('button').attr('id', 'view-filter');
    filterButton.attr('class', 'btn btn-outline-secondary').text('Show Filters');
    filterButton.on('click', ()=> toggleFilters(filterButton, main));

    let lengthButton = toolbar.append('button').attr('id', 'change-length');
    lengthButton.attr('class', 'btn btn-outline-secondary').text('Show Edge Length');
    lengthButton.on('click', ()=> {
        if(lengthButton.text() === 'Show Edge Length'){
            lengthButton.text('Normalize Edge Lengths');
            main.selectAll('*').remove();//.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, 'edgeLength');
            }
           
        }else{
            lengthButton.text('Show Edge Length');
            main.selectAll('*').remove();//.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){

                drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move');
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, 'move');
            }
          
        }
    });

    let form = toolbar.append('form').classed('form-inline', true);
    let input = form.append('input').classed('form-control mr-sm-2', true)
    input.attr('type', 'search').attr('placeholder', 'Search').attr('aria-label', 'Search');
    let searchButton = form.append('button').classed('btn btn-outline-success my-2 my-sm-0', true).attr('type', 'submit').append('i').classed("fas fa-search", true)

    viewButton.on('click', ()=> togglePathView(viewButton, normedPaths, main, calculatedScales));


}

function toggleFilters(filterButton, main){
    let filterDiv = d3.select('#filter-tab');
   
    if(filterDiv.classed('hidden')){
        filterButton.text('Hide Filters');
        filterDiv.classed('hidden', false);
        main.style('padding-top', '200px');
    }else{
        filterButton.text('Show Filters');
        filterDiv.classed('hidden', true);
        main.style('padding-top', '0px');
    }
}

function drawPathsAndAttributes(normedPaths, main, calculatedScales, moveMetric){

    let pathGroups = renderPaths(normedPaths, main, calculatedScales, moveMetric);

    /// LOWER ATTRIBUTE VISUALIZATION ///
  let attributeWrapper = pathGroups.append('g').classed('attribute-wrapper', true);
  let attData = formatAttributeData(normedPaths, calculatedScales)
  let predictedAttrGrps = renderAttributes(attributeWrapper, attData, calculatedScales, null);
  let attributeHeight = 45;
  pathGroups.attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (Object.keys(d[1].attributes).length + 1))) +')');

  drawContAtt(predictedAttrGrps, moveMetric);
  drawDiscreteAtt(predictedAttrGrps, calculatedScales, moveMetric);

  //tranforming elements
  main.select('#main-path-view').style('height', ((normedPaths.length + predictedAttrGrps.data().map(m=> m[0]).length)* 30) + 'px');
  attributeWrapper.attr('transform', (d)=> 'translate(140, 25)');
  ///////////////////////////////////
}

function togglePathView(viewButton, normedPaths, main, calculatedScales){
   
    if(viewButton.text() === 'View Paths'){
        viewButton.text('View Summary');
        main.selectAll('*').remove();//.selectAll('*').remove();
        
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move');


    }else{
        viewButton.text('View Paths');
        main.selectAll('*').remove();
        renderDistibutions(normedPaths, main, calculatedScales, 'move');
    }
}

export function renderAttToggles(normedPaths, scales){
    ////NEED TO GET RID OF TOGGLE SVG
    let keys = Object.keys(normedPaths[0][0].attributes);
    let filterBox = d3.select('#filter-tab');
    let svg = filterBox.append('svg').classed('attr-toggle-svg', true)
/*
    let checkDivWrap = filterBox.append('div').classed('custom-sq', true);
    let checkboxDiv = checkDivWrap.selectAll('.attr-check').data(keys).join('div').classed('attr-check', true);
    let check = checkboxDiv.append('input').attr('id', (d, i)=> 'box-'+d).attr('type', 'checkbox');
    let checkedCheck = check.attr('checked', true);
    checkedCheck.style('background', (d)=> {
        return scales.filter(f=> f.field === d)[0].catColor;
    });

    let checkLabel = checkboxDiv.append('label').attr('for', (d, i)=> 'box-'+d).text(d=> d)
    checkLabel.style('background', (d)=> {
        return scales.filter(f=> f.field === d)[0].catColor;
    });
    */
   let title = svg.append('text').text('Attributes: ')
    title.attr('x', 20).attr('y', 10)
    let labelWrap = svg.append('g').attr('transform', 'translate(20, 25)');
    let labelGroups = labelWrap.selectAll('g').data(keys).join('g'); 
    
    labelGroups.attr('transform', (d, i)=> {
       // return 'translate('+ ( (i* 100) + (d.length * 2))+', 20)'});
        return 'translate(0,'+(i* 25)+')'});

    let toggle = labelGroups.append('circle').attr('cx', 0).attr('cy', 0);
    toggle.classed('toggle shown', true);
    toggle.style('fill', (d, i)=>{
        return scales.filter(f=> f.field === d)[0].catColor;
    });
    toggle.on('click', function(d, i){
        let togg = d3.select(this);
        toggleCircle(togg, scales);
        let newKeys = d3.selectAll('.shown');
        let attributeWrapper = d3.selectAll('.attribute-wrapper');
        attributeWrapper.selectAll('g').remove();
        let attributeHeight = 45;
      
          /// LOWER ATTRIBUTE VISUALIZATION ///
      
        let attData =  formatAttributeData(normedPaths, scales, newKeys.data());
        let predictedAttrGrps = renderAttributes(attributeWrapper, attData, scales, null);

        d3.select('#main-path-view').style('height', ((normedPaths.length + predictedAttrGrps.data().map(m=> m[0]).length)* 30) + 'px');
        //d3.selectAll('.paths').attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (newKeys.data().length + 1))) +')');
        d3.selectAll('.paths').attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (newKeys.data().length + 1))) +')');
        
        drawContAtt(predictedAttrGrps, 'move');
        drawDiscreteAtt(predictedAttrGrps, scales);

    });
    let labelText = labelGroups.append('text').text(d=> d).style('font-size', 10);
    labelText.attr('transform', 'translate(10, 4)')
   
    
}

function toggleCircle(circle, scales){
    if(circle.classed('shown')){
        circle.classed('shown', false);
        circle.style('fill', '#fff');
    }else{
        circle.classed('shown', true);
        circle.style('fill', (d, i)=>{
            return scales.filter(f=> f.field === d)[0].catColor;
    });
    }
}