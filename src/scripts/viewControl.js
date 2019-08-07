import * as d3 from "d3";
import { renderDistibutions } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';
import { getLatestData } from "./filterComponent";


export function updateMainView(scales, moveMetric){

    let main = d3.select('#main');
    let data = getLatestData();
    main.selectAll('*').remove();

    if(d3.select('#view-toggle').text() === 'View Paths'){
   
        renderDistibutions(data, main, scales, moveMetric)
    }else{
        drawPathsAndAttributes(data, main, scales, moveMetric);
    }

}