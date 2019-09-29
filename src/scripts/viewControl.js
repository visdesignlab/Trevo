import * as d3 from "d3";
import { renderDistibutions, groupDistributions } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';
import { getLatestData } from "./filterComponent";


export function updateMainView(scales, moveMetric){

    let main = d3.select('#main');
    let data = getLatestData();

    main.selectAll('*').remove();

    if(d3.select('#view-toggle').text() === 'View Paths'){
        renderDistibutions(data, main, scales, moveMetric);
        document.getElementById("scrunch").disabled = true;
    }else{
        drawPathsAndAttributes(data, main, scales, moveMetric);
        document.getElementById("scrunch").disabled = false;
    }

}

export function initialViewLoad(scales, moveMetric){

    let main = d3.select('#main');
    let data = getLatestData();

    main.selectAll('*').remove();

    if(data.length > 50){
        //renderDistibutions(data, main, scales, moveMetric);
        groupDistributions(data, main, scales, moveMetric);
        d3.select('#view-toggle').text('View Paths');
        document.getElementById("scrunch").disabled = true;
    }else{
        drawPathsAndAttributes(data, main, scales, moveMetric);
        d3.select('#view-toggle').text('View Summary');
        document.getElementById("scrunch").disabled = false;
    }

}