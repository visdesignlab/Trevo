import * as d3 from "d3";
import { renderDistibutions } from './distributionView';
import {drawPathsAndAttributes} from './renderPathView';

export function updateMainView(newData, scales, moveMetric){
    let main = d3.select('#main');

    console.log('newData', newData)
    if(d3.select('#view-toggle').text() === 'View Paths'){
        renderDistibutions(main, scales, moveMetric)
    }else{
        drawPathsAndAttributes(newData, main, scales, moveMetric);
    }

}