import * as d3 from "d3";
import { renderDistibutions, groupDistributions } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';
import { getLatestData } from "./filterComponent";
import { generatePairs, rankingControl } from "./pairView";

export let groupedView = false;

export function updateMainView(scales, d){

    let main = d3.select('#main');
    let data = getLatestData();
    let moveMetric = 'edgeLength';

    main.selectAll('*').remove();
  
    if(d === 'Path View' || d === null){
        d3.select('#pair-rank').classed('hidden', true);
        drawPathsAndAttributes(data, main, scales, moveMetric);
        document.getElementById("scrunch").disabled = false;
    }else if(d === 'Summary View'){
        d3.select('#pair-rank').classed('hidden', true);
        groupDistributions(data, main, scales, 'Clade');
        document.getElementById("scrunch").disabled = true;
    }else if(d === 'Pair View'){
        rankingControl(data);
        generatePairs(data);
    }else{
        console.error('field not found');
    }
}

export function initialViewLoad(scales){

    let main = d3.select('#main');
    let data = getLatestData();

    main.selectAll('*').remove();

    if(data.length > 50){
        groupDistributions(data, main, scales, 'Clade');
        d3.select('#view-toggle').text('View Paths');
        document.getElementById("scrunch").disabled = true;
    }else{
        drawPathsAndAttributes(data, main, scales);
        d3.select('#view-toggle').text('View Summary');
        document.getElementById("scrunch").disabled = false;
    }

}