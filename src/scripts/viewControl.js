import * as d3 from "d3";
import { renderDistibutions, groupDistributions } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';
import { getLatestData } from "./filterComponent";
import { generatePairs } from "./pairView";

export let groupedView = false;

export function updateMainView(scales, d){

    let main = d3.select('#main');
    let data = getLatestData();
    let moveMetric = 'edgeLength';

    main.selectAll('*').remove();
  
    if(d.field === 'View Paths'){
        drawPathsAndAttributes(data, main, scales, moveMetric);
        document.getElementById("scrunch").disabled = false;
    }else if(d.field === 'View Summary'){
        renderDistibutions(data, main, scales, moveMetric);
        document.getElementById("scrunch").disabled = true;
    }else if(d.field === 'View Pairs'){
        generatePairs(data, main);
    }else{
        console.error('field not found');
    }


}

export function initialViewLoad(scales){

    let main = d3.select('#main');
    let data = getLatestData();

    main.selectAll('*').remove();

    if(data.length > 50){
        groupDistributions(data, main, scales);
        d3.select('#view-toggle').text('View Paths');
        document.getElementById("scrunch").disabled = true;
    }else{
        drawPathsAndAttributes(data, main, scales);
        d3.select('#view-toggle').text('View Summary');
        document.getElementById("scrunch").disabled = false;
    }

}