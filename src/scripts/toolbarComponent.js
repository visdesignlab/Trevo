import '../styles/index.scss';
import * as d3 from "d3";
import {drawPathsAndAttributes, drawDiscreteAtt, drawGroups} from './renderPathView';
import {toggleFilters, getLatestData} from './filterComponent';
import { updateMainView } from './viewControl';
import { collapsed } from '.';
import { dropDown } from './buttonComponents';
import { cladesGroupKeeper, groupDataByAttribute, addCladeGroup, chosenCladesGroup, growSidebarRenderTree, cladeKeeper } from './cladeMaker';


export function findBrushedNodes(){
    let brushes = d3.select('#toolbar').selectAll('.brush-span');
    let brushData =  [];
    brushes.each(e => brushData.push(e))
  
    let nodes = brushData.flatMap(m=> m.nodes);
    return nodes;
}
export function toolbarControl(toolbar, main, calculatedScales){


    let viewArray = [{'field':'Summary View'},{'field':'Path View'},{'field':'Pair View'}, {'field':'Clade View'}];

    let viewDrop = dropDown(toolbar, viewArray, viewArray[0].field, 'change-view');

    viewDrop.on('click', (d, i, n)=> {
        let group = chosenCladesGroup[chosenCladesGroup.length - 1];
       
        updateMainView(d.field, group.groups);
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

    let dropOptions = dropDown(toolbar, optionArray, 'Group By', 'show-drop-div-group');
    toolbar.select('#show-drop-div-group').attr('value', 'ungrouped');

    d3.select('.dropdown.show-drop-div-group').select('button').style('display', 'none')

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

    /////ATTRIBUTE DROP DOWN
    let attributeOptions = calculatedScales.map(m=> m.field);
    let checkedAttributes = attributeOptions.length > 11 ? attributeOptions.slice(0, 8) : attributeOptions;

    let dropdiv = toolbar.append('div').classed(`dropdown attribute-show`, true);
    dropdiv.style('display', 'inline-block')
    let button = dropdiv.append('button').classed('btn dropbtn btn-secondary dropdown-toggle', true).text('Shown Attributes');
    let dropContent = dropdiv.append('div').attr('id', 'attribute-show').classed('dropdown-content', true);
    let dropUl = dropContent.append('ul');
    
    let options = dropUl.selectAll('li').data(attributeOptions).join('li')
    let checkBox = options.append('input').attr('type', 'checkbox');
    options.append('text').text(d=> ` ${d}`);

    let checkedDefault = options.filter(f=> checkedAttributes.indexOf(f) > -1).select('input');
    checkedDefault.each((d, i, n) => n[i].checked = true);

    button.on('click', (d, i, n)=> {
        if(dropContent.classed('show')){
            dropContent.classed('show', false);
            updateMainView('Summary View', chosenCladesGroup[chosenCladesGroup.length - 1].groups)
        }else{
            dropContent.classed('show', true);
        }
    });

    /////CLADE VIEW////
    let cladePickerDrop = dropDown(toolbar, cladesGroupKeeper, `Clades Shown: ${cladesGroupKeeper[0].field}`, 'change-clade');
    d3.select('#change-clade').selectAll('a').on('click', (d, i, n)=> {
        d3.select('.dropdown.change-clade').select('button').text(`Clades Shown: ${d.field}`)
        chosenCladesGroup.push(d)
        updateMainView('Summary View', d.groups);
    });
    if(cladesGroupKeeper.length === 0){
        d3.select('.dropdown.change-clade').select('button').text(d.field);
    }

    let cladeButton = toolbar.append('button').attr('id', 'clade-maker');
    cladeButton.attr('class', 'btn btn-outline-secondary').text('Add Clades');
    cladeButton.on('click', ()=> growSidebarRenderTree());

    /////ATTRIBUTE DROP DOWN
    let cladeOptions = cladeKeeper;
   // let checkedClades = attributeOptions.length > 11 ? attributeOptions.slice(0, 2) : attributeOptions;

    let dropdivClade = toolbar.append('div').classed(`dropdown clade-show`, true);
    dropdivClade.style('display', 'inline-block')
    let buttonClade = dropdivClade.append('button').classed('btn dropbtn btn-secondary dropdown-toggle', true).text('Shown Clades');

    let dropContentClade = dropdivClade.append('div').attr('id', 'clade-show').classed('dropdown-content', true);
    let dropUlClade = dropContentClade.append('ul');

    updateCladeDrop(dropUlClade, cladeOptions);
    
    // checkedDefault.each((d, i, n) => n[i].checked = true);

    buttonClade.on('click', (d, i, n)=> {
        if(dropContentClade.classed('show')){
            dropContentClade.classed('show', false);
           // updateMainView('Summary View', chosenCladesGroup[chosenCladesGroup.length - 1].groups)
        }else{
            dropContentClade.classed('show', true);
        }
    });
}

export function updateCladeDrop(dropUl, cladeOptions){

    console.log(cladeOptions, dropUl)
    
     let options = dropUl.selectAll('li').data(cladeOptions).join('li')
     let checkBox = options.selectAll('input').data(d=> [d]).join('input').attr('type', 'checkbox');
     options.selectAll('text').data(d=> [d]).join('text').text(d=> ` ${d.field}`);

    // let checkedDefault = options.filter(f=> checkedAttributes.indexOf(f) > -1).select('input');


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