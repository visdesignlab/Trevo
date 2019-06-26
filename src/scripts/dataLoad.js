import * as d3 from 'd3';

export async function loadData(readFunction, fileString, callBack){
    let data = await readFunction(fileString);
    return data;
}


