import '../styles/index.scss';
import * as d3 from "d3";
import {loadData} from './dataLoad';
import {calculateScales, matchLeaves, matchEdges, normPaths, filterKeeper} from './dataFormat';
import {allPaths, pullPath, getPath} from './pathCalc';
import {drawPathsAndAttributes} from './rendering';
import {renderTree, buildTreeStructure, renderTreeButtons} from './sidebarComponent';
import {renderDistibutions} from './distributionView';
import {toolbarControl, renderAttToggles} from './toolbarComponent';

export const dataMaster = [];


let wrap = d3.select('#wrapper');
let main = wrap.select('#main');
let selectedPaths = wrap.select('#selected');
let sidebar = wrap.select('#sidebar');
let toolbarDiv = wrap.select('#toolbar');


let tooltip = wrap.append("div")
.attr("id", "tooltip")
.style("opacity", 0);


loadData(d3.json, './public/data/anolis-edges.json', 'edge').then(async edges => {

    //helper function to create array of unique elements
    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }

    let edgeLen = await loadData(d3.json, './public/data/anolis-edge-length.json', 'edge');

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.V1);
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.V2) == -1 );

    let leafChar = await loadData(d3.json, './public/data/anolisLeafChar.json', '');

    let labels = await loadData(d3.json, './public/data/anolis-labels.json', '');


    ///MAKE A ESTIMATED SCALES THING
    let calculatedAtt = {
        'awesomeness' : await loadData(d3.json, './public/data/anolis-awesomeness-res.json', 'continuous'),
        'island' : await loadData(d3.json, './public/data/anolis-island-res.json', 'discrete'),
        'SVL' : await loadData(d3.json, './public/data/anolis-svl-res.json', 'continuous'),
        'ecomorph': await loadData(d3.json, './public/data/anolis-ecomorph-res.json', 'discrete'),
    }

    let colorKeeper = [
        '#32C1FE','#3AD701','#E2AD01','#E2019E','#f36b2c','#1abc9c','#493267','#a40b0b','#0095b6',
    ]

    ////CALCULATE THE SCALES FOR EACH ATTRIBUTE////////
    let calculatedScales = calculateScales(calculatedAtt, colorKeeper);

    ///MATCH LEAF CHARACTERS AND LABELS TO LEAVES///
    let matchedLeaves = matchLeaves(labels, leaves, leafChar, calculatedScales);

    //MATCH CALC ATTRIBUTES TO EDGES///
    let matchedEdges = matchEdges(edges, edgeLen, calculatedAtt, calculatedScales);

    ///CALCULATES PATHS FROM THE DATA////
    let paths = allPaths(matchedEdges, matchedLeaves, "V1", "V2");
 
   let normedPaths = normPaths(paths, calculatedAtt, calculatedScales);

   dataMaster.push(normedPaths);
   
   // renderDistibutions(normedPaths, main, calculatedScales);
    toolbarControl(toolbarDiv, normedPaths, main, calculatedScales, 'edgeLength', 'paths');
    
    let filterDiv = wrap.select('#filter-tab').classed('hidden', true);

    ////////TREE RENDER IN SIDEBAR////////
    let nestedData = buildTreeStructure(paths, edges);

    renderTreeButtons(nestedData, normedPaths, calculatedScales, sidebar, false);

    let tree = renderTree(nestedData, normedPaths, calculatedScales, sidebar, false);
    ////Render the summary distributions////
    //renderDistibutions(normedPaths, main, calculatedScales, 'move');
    
      /// LOWER ATTRIBUTE VISUALIZATION ///
    drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
});
/*
loadData(d3.json, './public/data/geospiza_with_attributes.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);

    //console.log('pa',pathArray);
});*/
/*
loadData(d3.json, './public/data/geospiza_loop_all_asr_features.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);

    console.log('pa RICH',pathArray);
});*/
/*
loadData(d3.json, './public/data/anolis_rich_ASR_pad_vs_tail.json').then(data=> {
    let pathArray = pullPath([], [data], [], [], 0);

    console.log('anolis RICH',pathArray);
});*/




