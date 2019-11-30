import * as d3 from "d3";
import { renderDistibutions, groupDistributions, renderDistStructure, binGroups } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';
import { getLatestData } from "./filterComponent";
import { generatePairs, rankingControl } from "./pairView";
import { drawTreeForGroups, createCladeView } from "./cladeMaker";
import { calculatedScalesKeeper } from ".";

export let groupedView = false;

export function updateMainView(d, groups){

    let main = d3.select('#main');
    let data = getLatestData();
    let moveMetric = 'edgeLength';

    let scales = calculatedScalesKeeper[0];

    main.selectAll('*').remove();

    let view = d3.select('#view-pheno').text()
   
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

        if(groups){
            renderDistStructure(main, groups)
        }else{
           // groupDistributions(data, main, null);
           renderDistStructure(main, data);
        }
    }else if(d === 'Pair View'){
        rankingControl(data);
        generatePairs(data);

        document.getElementById("scrunch").disabled = true;
        document.getElementById("discrete-view").disabled = true;

        d3.select('#scrunch').classed('hidden', true);
        d3.select('#discrete-view').classed('hidden', true);

    }else if(d === 'Clade View'){
        d3.select('#pair-rank').classed('hidden', true);
        createCladeView(main, scales);

        document.getElementById("scrunch").disabled = true;
        document.getElementById("discrete-view").disabled = true;

        d3.select('#scrunch').classed('hidden', true);
        d3.select('#discrete-view').classed('hidden', true);

    }else{
        console.error('field not found');
    }
}
export function initialViewLoad(scales){

    let main = d3.select('#main');
    let data = getLatestData();

    main.selectAll('*').remove();

    if(data.length > 50){

        let group = binGroups(data, 'All Paths', scales, 8);
    
        let groups = [{'label': 'All Paths', 'paths': data, 'groupBins': group}];
        renderDistStructure(main, groups);
        //groupDistributions(data, main, 'Clade');
        d3.select('#view-toggle').text('View Paths');

        document.getElementById("scrunch").disabled = true;
        document.getElementById("discrete-view").disabled = true;

        d3.select('#scrunch').classed('hidden', true);
        d3.select('#discrete-view').classed('hidden', true);

    }else{
        drawPathsAndAttributes(data, main);
        d3.select('#view-toggle').text('View Summary');

        document.getElementById("scrunch").disabled = false;
        document.getElementById("discrete-view").disabled = false;

        d3.select('#scrunch').classed('hidden', false);
        d3.select('#discrete-view').classed('hidden', false);
      
    }

}

