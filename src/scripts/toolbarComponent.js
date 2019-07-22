import '../styles/index.scss';
import {formatAttributeData} from './dataFormat';
import {drawPathsAndAttributes} from './rendering';
import {toggleFilters} from './filterComponent';
import {renderDistibutions} from './distributionView';
import * as d3 from "d3";

export function toolbarControl(toolbar, normedPaths, main, calculatedScales, moveMetric, pathView){

    let viewButton = toolbar.append('button').attr('id', 'view-toggle').attr('attr' , 'button').attr('class', 'btn btn-outline-secondary') ;

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
                drawPathsAndAttributes(normedPaths, main, calculatedScales, moveMetric);
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, moveMetric);
            }
        }
    });

    let scrunchButton = toolbar.append('button').attr('id', 'scrunch');
    scrunchButton.attr('class', 'btn btn-outline-secondary').text('Collapse Attributes');
    scrunchButton.on('click', ()=> toggleScrunch(scrunchButton, normedPaths, main, calculatedScales));

   
    viewButton.on('click', ()=> togglePathView(viewButton, normedPaths, main, calculatedScales));
}


function toggleScrunch(button, normedPaths, main, calculatedScales){
    if(button.text() === 'Collapse Attributes'){
        button.text('Expand Attributes');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move', true);
    }else{
        button.text('Collapse Attributes');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move', false);
    }
}



/**
 * 
 * @param {*} viewButton button that changes the actual view the text of the button determines what the view should change to 
 * @param {*} normedPaths 
 * @param {*} main 
 * @param {*} calculatedScales 
 */
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





