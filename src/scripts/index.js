import '../styles/index.scss';
import * as d3 from "d3";
import {loadData} from './dataLoad';
import {calculateScales, calculateNewScales, matchLeaves, matchEdges, normPaths, filterKeeper, pairPaths, rootAttribute, combineLength} from './dataFormat';
import {allPaths, pullPath, getPathRevised, getPath} from './pathCalc';
import {renderTree, buildTreeStructure, renderTreeButtons} from './sidebarComponent';
import {toolbarControl} from './toolbarComponent';
import { initialViewLoad } from './viewControl';

export const dataMaster = [];
export const savedSelected = [];
export const collapsed = false;
export const nestedData = [];
export const speciesTest = [];

export const colorKeeper = [
    ['#0dc1d1', '#c8f7fd'],
    ['#3AD701', '#2a9b01'],
    ['#fec303', '#d3a001'],
    ['#fe4ecb', '#d30197'],
    ['#f36b2c'],
    ['#1abc9c'],
    ['#493267'],
    ['#a40b0b'],
    ['#0095b6'],
]

export const attributeList = [
    // 'PCIII_padwidth_vs_tail',
    // 'PCII_head',
    // 'PCIV_lamella_num',
    // 'PCI_limbs',
    {field: 'Body_height', type: 'continuous'},
    {field:'Body_width', type:'continuous'},
    {field:'Carpus', type:'continuous'},
    {field:'Clade', type:'discrete'},
    {field:'Close', type: 'continuous'},
    {field:'Femur', type: 'continuous'},
    {field:'Forelimb', type: 'continuous'},
    {field:'Group', type: 'discrete'},
    {field:'Head_length', type: 'continuous'},
    {field:'Head_width', type: 'continuous'},
    {field:'Head_depth', type: 'continuous'},
    {field:'Hind_limb', type: 'continuous'},
    {field:'Humerus', type: 'continuous'},
    {field:'island/mainland', type:'discrete'},
    {field:'Interlimb', type: 'continuous'},
    {field:'Longest_toe', type: 'continuous'},
    {field:'Ltoe', type: 'continuous'},
    {field:'Lower_jaw', type: 'continuous'},
    {field:'Nmorpho', type: 'continuous'},
    {field:'Open', type: 'continuous'},
    {field:'Outlever', type: 'continuous'},
    {field:'Radius', type: 'continuous'},
    {field:'Snout', type: 'continuous'},
    {field:'SVL', type: 'continuous'},
    {field:'Tail', type: 'continuous'},
    {field:'Tarsus', type: 'continuous'},
    {field:'Tibia', type: 'continuous'},
];

let wrap = d3.select('#wrapper');
let main = wrap.select('#main');
let selectedPaths = wrap.select('#selected');
let sidebar = wrap.select('#sidebar');
let toolbarDiv = wrap.select('#toolbar');

loadData(d3.json, './public/data/new-anolis-edges.json', 'edge').then(async edges => {

    //helper function to create array of unique elements
    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }
    
    let edgeLen = await loadData(d3.json, './public/data/new-anolis-edge-length.json', 'edge');

    let char = await loadData(d3.json, './public/data/new-anolis-res.json', '');

    edges.rows = edges.rows.filter(f=> f.From != "").map((edge, i)=> {
        edge.edgeLength = edgeLen.rows[i].x;
        return edge;
    });  

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.From);
   
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.To) == -1 );
    let leafChar = await loadData(d3.csv, './public/data/new-anolis-leaf-char.csv', '');

    let calculatedAtt = char.rows.map((row, i)=> {
        let newRow = {};
        attributeList.forEach((att)=>{
            newRow[att.field] = {};
            newRow[att.field].field = att.field;
            newRow[att.field].type = att.type;
            let values = {}
            d3.entries(row).filter(f=> f.key.includes(att.field)).map(m=> {
                if(att.type === 'continuous'){
                   
                    if(m.key.includes('upperCI')){
                        values.upperCI95 = m.value;
                    }else if(m.key.includes('lowerCI')){
                        values.lowerCI95 = m.value;
                    }else{
                        values.realVal = m.value;
                    }
                }else{
                     values[m.key] = m.value;   
                    
                }
            });
            newRow[att.field].values = values;
        });
        newRow.node = row.nodeLabels;
        return newRow;
    });

  


let calculatedScales = calculateNewScales(calculatedAtt, attributeList.map(m=> m.field), colorKeeper)

let matchedEdges = edges.rows.map((edge, i)=> {
    let attrib = calculatedAtt.filter(f=> f.node === edge.To)[0]
    if(attrib){
        Object.keys(attrib).filter(f=> f != 'node').map((att, i)=>{
            
            let scales = calculatedScales.filter(f=> f.field=== att)[0]
            attrib[att].scales = scales;
            return att;
            
        })
    }
    let newEdge = {
        V1: edge.From,
        V2: edge.To,
        node: edge.To,
        edgeLength: edge.edgeLength,
        attributes: attrib ? attrib : null
    }
    return newEdge;
});


let calcLeafAtt = leafChar.map((row, i)=> {
    let newRow = {};
    attributeList.forEach((att)=>{
        newRow[att.field] = {};
        newRow[att.field].field = att.field;
        newRow[att.field].type = att.type;
        let values = {}
        d3.entries(row).filter(f=> f.key.includes(att.field)).map(m=> {
            if(att.type === 'continuous'){
                values.realVal = m.value;
            }else{
                values[m.key] = m.value;   
            }
        });
        newRow[att.field].values = values;
    });
    newRow.node = row.species;
    newRow.label = row.species;
    
    return newRow;
})


let matchedLeaves = leaves.map((leaf, i)=>{
    let attrib = calcLeafAtt.filter(f=> f.node === leaf.To)[0]
    if(attrib){
        Object.keys(attrib).map((att, i)=>{
            if(att!='node' && att != 'label'){
                let scales = calculatedScales.filter(f=> f.field=== att)[0]
                attrib[att].scales = scales;
                return att;
            }
        });
    }
    let newEdge = {
        V1: leaf.From,
        V2: leaf.To,
        node: leaf.To,
        edgeLength: leaf.edgeLength,
        attributes: attrib ? attrib : null,
        leaf: true
    }
    return newEdge;
})


    let all = matchedEdges.filter(f=> f.attributes != null);

    let paths = allPaths(all, matchedLeaves, "V1", "V2");
   
    let addedRoot = rootAttribute(paths, calculatedAtt, calculatedScales);

    let normedPaths = combineLength(addedRoot);

    dataMaster.push(normedPaths);

    speciesTest.push(normedPaths.flatMap(m=> m.filter(f=> f.leaf === true)).map(l=> l.label));
   
     toolbarControl(toolbarDiv, normedPaths, main, calculatedScales, 'paths');
    
     let filterDiv = wrap.select('#filter-tab').classed('hidden', true);

    // ////////TREE RENDER IN SIDEBAR////////
    nestedData.push(buildTreeStructure(normedPaths, all.concat(matchedLeaves)));
    renderTreeButtons(normedPaths, calculatedScales, sidebar, false);
    let tree = renderTree(sidebar, null, false);
    
    /// LOWER ATTRIBUTE VISUALIZATION ///
    initialViewLoad(calculatedScales, 'edgeLength');
});

let tooltip = wrap.append("div")
.attr("id", "tooltip")
.style("opacity", 0);





