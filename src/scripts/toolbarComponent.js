import '../styles/index.scss';
import * as d3 from "d3";
import {drawPathsAndAttributes} from './renderPathView';
import {toggleFilters} from './filterComponent';
import {renderDistibutions} from './distributionView';
import { updateMainView } from './viewControl';

export function toolbarControl(toolbar, normedPaths, main, calculatedScales, moveMetric, pathView){

    let viewButton = toolbar.append('button').attr('id', 'view-toggle').attr('attr' , 'button').attr('class', 'btn btn-outline-secondary');

    if(pathView === 'paths'){
        viewButton.text('View Summary');
    }else if(pathView === 'summary'){
        viewButton.text('View Paths');
    }else{
        console.error('pathView parameter not found');
    }
    
    let filterButton = toolbar.append('button').attr('id', 'view-filter');
    filterButton.attr('class', 'btn btn-outline-secondary').text('Show Filters');
    filterButton.on('click', ()=> toggleFilters(filterButton, normedPaths, main, moveMetric, calculatedScales));

    let lengthButton = toolbar.append('button').attr('id', 'change-length').attr('class', 'btn btn-outline-secondary');
    if(moveMetric === 'move'){
        lengthButton.text('Show Edge Length');
    }else if(moveMetric === 'edgeLength'){
        lengthButton.text('Normalize Edge Length');
    }

    lengthButton.on('click', ()=> {
        if(lengthButton.text() === 'Show Edge Length'){
            lengthButton.text('Normalize Edge Length');
            main.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
            }else{
                renderDistibutions(main, calculatedScales, 'edgeLength');
            }
        }else{
            lengthButton.text('Show Edge Length');
            main.selectAll('*').remove();
            /*
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, moveMetric);
            }else{
                renderDistibutions(main, calculatedScales, moveMetric);
            }*/
            updateMainView(calculatedScales, moveMetric);
        }
    });

    let scrunchButton = toolbar.append('button').attr('id', 'scrunch');
    scrunchButton.attr('class', 'btn btn-outline-secondary').text('Collapse Attributes');
    scrunchButton.attr('value', false);
    scrunchButton.on('click', ()=> toggleScrunch(scrunchButton, normedPaths, main, calculatedScales));
    viewButton.on('click', ()=> togglePathView(viewButton, calculatedScales, moveMetric));
}

////COLLAPSES THE NODES DOWN
function toggleScrunch(button, normedPaths, main, calculatedScales){
    console.log(document.getElementById("scrunch").disabled == true)
    if(button.text() === 'Collapse Attributes'){
        button.text('Expand Attributes');
        main.selectAll('*').remove();
        button.attr('value', true);
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
    }else{
        button.text('Collapse Attributes');
        main.selectAll('*').remove();
        button.attr('value', false);
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
    }
}

/**
 * 
 * @param {*} viewButton button that changes the actual view the text of the button determines what the view should change to 
 * @param {*} normedPaths 
 * @param {*} main 
 * @param {*} calculatedScales 
 */
function togglePathView(viewButton, calculatedScales, moveMetric){

    if(viewButton.text() === 'View Paths'){
        viewButton.text('View Summary');
        document.getElementById("scrunch").disabled = true;
        d3.select('#scrunch').classed('hidden', true);
        console.log('changing', document.getElementById("scrunch"))
     
    }else{
        viewButton.text('View Paths');
        d3.select('#scrunch').classed('hidden', false);
        document.getElementById("scrunch").disabled = false;
    }
    updateMainView(calculatedScales, moveMetric);
}





