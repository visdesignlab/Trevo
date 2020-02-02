import * as d3 from "d3";
import { renderDistibutions, groupDistributions, renderDistStructure, binGroups } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';
import { getLatestData } from "./filterComponent";
import { generatePairs, rankingControl } from "./pairView";
import { drawTreeForGroups, createCladeView, chosenCladesGroup } from "./cladeMaker";
import { calculatedScalesKeeper } from ".";
import { changeDropValue } from './toolbarComponent';

export let groupedView = false;


/**
 * Get the latest data and filter only what is selected
 */
export function getSelectedData(){

    let test = d3.select('#clade-show').selectAll('li').selectAll('input').filter((f, j, li)=> {
        return li[j].checked === true});

    let names = Array.from(new Set(test.data().flatMap(f=> f.nodes.map(path => path[path.length - 1].node))));
    let data = getLatestData().filter(path => names.indexOf(path[path.length - 1].node) > -1);

    return data;
}

export function updateMainView(d, groups){

    let main = d3.select('#main');
    
    let data = getSelectedData();
    let view = d3.select('#view-pheno').empty()? null : d3.select('#view-pheno').text();

    console.log('data', data);
    console.log('d',d)
   
    if(d != 'Pair View' && view === 'View Phenogram'){
        d3.select('.dropdown.attr-drop').remove();
    }
  
    if(d === 'Path View' || d === null){
        d3.select('#pair-rank').classed('hidden', true);
        drawPathsAndAttributes(data, main);

        document.getElementById("scrunch").disabled = false;
        document.getElementById("discrete-view").disabled = false;

        d3.select('#scrunch').classed('hidden', false);
        d3.select('#discrete-view').classed('hidden', false);

    }else if(d === 'Summary View'){

        d3.select('#pair-rank').classed('hidden', true);

        document.getElementById("scrunch").disabled = true;
        document.getElementById("discrete-view").disabled = true;

        d3.select('#scrunch').classed('hidden', true);
        d3.select('#discrete-view').classed('hidden', true);

        groups ? renderDistStructure(main, groups) : renderDistStructure(main, data);
       
    }else if(d === 'Pair View'){
        rankingControl(data);
        generatePairs(data);

        document.getElementById("scrunch").disabled = true;
        document.getElementById("discrete-view").disabled = true;

        d3.select('#scrunch').classed('hidden', true);
        d3.select('#discrete-view').classed('hidden', true);

    }else{
        console.error('field not found');
    }

    return main;
}
export function initialViewLoad(scales, dataName){

    let main = d3.select('#main');
    let data = getLatestData();

    main.selectAll('*').remove();

    if(data.length > 50){

        // rankingControl(data);
        // generatePairs(data);

        // document.getElementById("scrunch").disabled = true;
        // document.getElementById("discrete-view").disabled = true;

        // d3.select('#scrunch').classed('hidden', true);
        // d3.select('#discrete-view').classed('hidden', true);

        renderDistStructure(main, chosenCladesGroup[chosenCladesGroup.length - 1].groups)
            .then(()=>  document.getElementById("loader").style.display = "none");

        
        d3.select('#view-toggle').text('View Paths');

        document.getElementById("scrunch").disabled = true;
        document.getElementById("discrete-view").disabled = true;

        d3.select('#scrunch').classed('hidden', true);
        d3.select('#discrete-view').classed('hidden', true);

        changeDropValue({'field':'Summary View'});

    }else{
        drawPathsAndAttributes(data, main);
        d3.select('#view-toggle').text('View Summary');

        document.getElementById("scrunch").disabled = false;
        document.getElementById("discrete-view").disabled = false;

        d3.select('#scrunch').classed('hidden', false);
        d3.select('#discrete-view').classed('hidden', false);
        change

        changeDropValue({'field':'Path View'});
      
    }

}

