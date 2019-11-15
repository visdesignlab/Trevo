import '../styles/index.scss';
import * as d3 from "d3";
import {drawPathsAndAttributes, drawDiscreteAtt, drawGroups} from './renderPathView';
import {toggleFilters, getLatestData} from './filterComponent';
import { updateMainView } from './viewControl';
import { collapsed } from '.';
import { dropDown } from './buttonComponents';


export function findBrushedNodes(){
    let brushes = d3.select('#toolbar').selectAll('.brush-span');
    let brushData =  [];
    brushes.each(e => brushData.push(e))
  
    let nodes = brushData.flatMap(m=> m.nodes);
    return nodes;
}
export function toolbarControl(toolbar, normedPaths, main, calculatedScales, pathView){

    let viewArray = [{'field':'Summary View'},{'field':'Path View'},{'field':'Pair View'}, {'field':'Clade View'}];

    let viewDrop = dropDown(toolbar, viewArray, viewArray[0].field, 'change-view');

    viewDrop.on('click', (d, i, n)=> {
        updateMainView(calculatedScales, d.field);
        d3.select('.dropdown.change-view').select('button').node().value = d.field;
        d3.select('.dropdown.change-view').select('button').text(d.field)
        d3.select('#change-view').classed('show', false);
    });
    
    let filterButton = toolbar.append('button').attr('id', 'view-filter');
    filterButton.attr('class', 'btn btn-outline-secondary').text('Show Filters');
    filterButton.on('click', ()=> toggleFilters(filterButton, main, calculatedScales));
    ///LENGTH BUTTON CODE

    let scrunchButton = toolbar.append('button').attr('id', 'scrunch');
    scrunchButton.attr('class', 'btn btn-outline-secondary').text('Collapse Attributes');
    scrunchButton.attr('value', false);
    scrunchButton.on('click', ()=> toggleScrunch(scrunchButton, main, calculatedScales));

    let discreteViewButton = toolbar.append('button').attr('id', 'discrete-view');
    discreteViewButton.attr('class', 'btn btn-outline-secondary').text('Switch to Discrete Bars');
    discreteViewButton.attr('value', false);
    
    discreteViewButton.on('click', ()=> {
        let discretePredictedGroups = d3.selectAll('.predicated-attr-groups');
        if(discreteViewButton.text() === 'Switch to Discrete Bars'){
            discreteViewButton.text('Switch to Discrete Dots');
            drawDiscreteAtt(discretePredictedGroups, collapsed, true);
        }else{
            discreteViewButton.text('Switch to Discrete Bars');
            drawDiscreteAtt(discretePredictedGroups, collapsed, false);
        }
    });

    let optionArray = [{'field':'None'}];

    calculatedScales.map(m=> {
        if(m.type === 'discrete'){
            optionArray.push(m);
        }
    });

    let dropOptions = dropDown(toolbar, optionArray, 'Group By','show-drop-div-group');
    toolbar.select('#show-drop-div-group').attr('value', 'ungrouped');

    dropOptions.on('click', (d, i, n)=> {
        if(d.type === 'discrete'){
            let data = getLatestData();
            let stateBins = d.scales.map(m=> {
                return {'field': m.field, 'state': m.scaleName, 'data': []}});
           
            stateBins.map(state=> {
               state.data = data.filter(paths=> {
                    let node = paths.filter(no=> no.leaf === true);
                        return node[0].attributes[state.field].winState === state.state;
                });
            });
           d3.select('#main').selectAll('*').remove();
           drawGroups(stateBins, calculatedScales);
        }else{
            console.error('THIS HAS TO BE DISCRETE');
        }
        toolbar.select('#show-drop-div-group').classed('show', false);
    });

    console.log(calculatedScales)
    let attributeOptions = calculatedScales.map(m=> m.field);

    let checkedAttributes = ['Body_height', 'Body_width', 'Carpus', 'Clade', 'Femur', 'Forelimb'];

    let dropdiv = toolbar.append('div').classed(`dropdown attribute-show`, true);
    dropdiv.style('display', 'inline-block')
    let button = dropdiv.append('button').classed('btn dropbtn btn-secondary dropdown-toggle', true).text('Shown Attributes');
    let dropContent = dropdiv.append('div').attr('id', 'attribute-show').classed('dropdown-content', true);
    let dropUl = dropContent.append('ul');
    //dropContent.append('a').text('text').attr('font-size', 11);
    let options = dropUl.selectAll('li').data(attributeOptions).join('li')
    let checkBox = options.append('input').attr('type', 'checkbox');
    options.append('text').text(d=> ` ${d}`);

    let checkedDefault = options.filter(f=> checkedAttributes.indexOf(f) > -1).select('input');
    checkedDefault.each((d, i, n) => n[i].checked = true)
    console.log(checkedDefault)

    button.on('click', (d, i, n)=> {
        if(dropContent.classed('show')){
            dropContent.classed('show', false);
        }else{
            dropContent.classed('show', true);
        }
    });

    
    
 //   <div class="container">
 // <div class="row">
  //     <div class="col-lg-12">
  //   <div class="button-group">
      //  <button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-cog"></span> <span class="caret"></span></button>
{/* <ul class="dropdown-menu">
  <li><a href="#" class="small" data-value="option1" tabIndex="-1"><input type="checkbox"/>&nbsp;Option 1</a></li>
  <li><a href="#" class="small" data-value="option2" tabIndex="-1"><input type="checkbox"/>&nbsp;Option 2</a></li>
  <li><a href="#" class="small" data-value="option3" tabIndex="-1"><input type="checkbox"/>&nbsp;Option 3</a></li>
  <li><a href="#" class="small" data-value="option4" tabIndex="-1"><input type="checkbox"/>&nbsp;Option 4</a></li>
  <li><a href="#" class="small" data-value="option5" tabIndex="-1"><input type="checkbox"/>&nbsp;Option 5</a></li>
  <li><a href="#" class="small" data-value="option6" tabIndex="-1"><input type="checkbox"/>&nbsp;Option 6</a></li>
</ul> */}


    // let brushButton = toolbar.append('button').attr('id', 'brush-control');
    // brushButton.attr('class', 'btn btn-outline-secondary').text('Highlight Brush');
    // brushButton.on('click', ()=> toggleFilters(filterButton, main, calculatedScales));
}

////COLLAPSES THE NODES DOWN
function toggleScrunch(button, main, calculatedScales){

    let data = getLatestData();
   
    if(button.text() === 'Collapse Attributes'){
        button.text('Expand Attributes');
        main.selectAll('*').remove();
        button.attr('value', true);
        drawPathsAndAttributes(data, main, calculatedScales);
    }else{
        button.text('Collapse Attributes');
        main.selectAll('*').remove();
        button.attr('value', false);
        drawPathsAndAttributes(data, main, calculatedScales);
    }
}