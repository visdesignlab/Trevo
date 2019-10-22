import { pairPaths } from "./dataFormat";
import { dropDown } from "./buttonComponents";
import * as d3 from "d3";


export function generatePairs(data, main){

        let pairs = pairPaths(data);//.sort((a, b)=> +b.distance - +a.distance);

        //let pairs = test.slice(0, 20);

        let attKeys = d3.entries(pairs[0].p1[0].attributes)
                    .filter(f=> f.value.type === 'continuous')
                    .map(m=> {
                        return {'field': m.key, 'value': m.key }
                    });
        
        dropDown(d3.select('#toolbar'), attKeys, attKeys[0].field, 'attr-drop');

        updateRanking(pairs, attKeys[0].field);



         ////YOU SHOULD MOVE THESE APPENDING THINGS OUT OF HERE///////
        /////Rendering ///////
        let svgTest = main.select('#main-path-view');
        let svg = svgTest.empty() ? main.append('svg').attr('id', 'main-path-view') : svgTest;

        svg.selectAll('*').remove();

}

function updateRanking(pairs, field){
    
    let deltaMax = d3.max(pairs.map(m=> m.deltas.filter(f=> f.key === field)[0]).map(m=> m.value));
    let closeMax = d3.max(pairs.map(m=> m.closeness.filter(f=> f.key === field)[0]).map(m=> m.value));
    let distMax = d3.max(pairs.map(d=> d.distance))
    let deltaScale = d3.scaleLinear().domain([0, deltaMax]).range([0, 1]);
    let closeScale = d3.scaleLinear().domain([closeMax, 0]).range([0, 1]);
    let distScale = d3.scaleLinear().domain([0, distMax]).range([0, 1]);
    pairs = pairs.map(p=> {
        p.delta = p.deltas.filter(d=> d.key === field)[0];
        p.closeness = p.closeness.filter(d=> d.key === field)[0];
        p.deltaRank = deltaScale(p.delta.value);
        p.closenessRank = closeScale(p.closeness.value);
        p.distanceRank = distScale(p.distance);
        p.totalRank = p.deltaRank + p.closenessRank + p.distanceRank;
        return p;
    })
    let sortedPairs = pairs.sort((a, b)=> b.totalRank - a.totalRank).slice(0, 20);

    

    console.log(sortedPairs)


}