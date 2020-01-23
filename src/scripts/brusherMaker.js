import * as d3 from "d3";

export function addBrushables(bins){
    console.log('bins',bins)
    bins.on('mousedown', (d, i, n)=> {
        
        let brush = d3.select(n[i]).append('rect').attr('width', 10).attr('height', 10).attr('fill', 'red')
    
    });
}