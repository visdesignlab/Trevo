import '../styles/index.scss';
import * as d3 from "d3";
import {drawPathsAndAttributes, drawDiscreteAtt, drawGroups} from './renderPathView';
import {toggleFilters, getLatestData} from './filterComponent';
import { updateMainView } from './viewControl';
import { collapsed } from '.';
import { dropDown } from './buttonComponents';

export function toolbarControl(toolbar, normedPaths, main, calculatedScales, pathView){

    let viewDrop = dropDown(toolbar, [{'field':'View Summary'},{'field':'View Paths'},{'field':'View Pairs'}], 'Change View', 'change-view');

    viewDrop.on('click', (d, i, n)=> {
        updateMainView(calculatedScales, d);
        d3.select('.dropdown.change-view').select('button').node().value = d.field;
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