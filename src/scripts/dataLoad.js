import * as d3 from 'd3';

export async function loadData(readFunction, fileString, type){
    let data = await readFunction(fileString);
    data.type = String(type);
    return data;
}


