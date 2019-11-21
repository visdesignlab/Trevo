import '../styles/index.scss';
import * as d3 from "d3";
import {loadData} from './dataLoad';
import {calculateScales, calculateNewScales, matchLeaves, matchEdges, normPaths, filterKeeper, pairPaths, rootAttribute, combineLength} from './dataFormat';
import {allPaths, pullPath, getPathRevised, getPath} from './pathCalc';
import {renderTree, buildTreeStructure, renderTreeButtons} from './sidebarComponent';
import {toolbarControl} from './toolbarComponent';
import { initialViewLoad } from './viewControl';
import { groupDataByClade, groupDataByAttribute, addCladeGroup, cladesGroupKeeper, chosenCladesGroup} from './cladeMaker';
import { binGroups } from './distributionView';

export const dataMaster = [];
export const savedSelected = [];
export const collapsed = false;
export const nestedData = [];
export const speciesTest = [];
export const calculatedScalesKeeper = [];

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
    ['#97A628'],
    ['#9B28A6'],
    ['#3928A6'],
    ['#0dc1d1', '#c8f7fd'],
    ['#3AD701', '#2a9b01'],
    ['#fec303', '#d3a001'],
    ['#fe4ecb', '#d30197'],
    ['#f36b2c'],
    ['#1abc9c'],
    ['#493267'],
    ['#a40b0b'],
    ['#0095b6'],
    ['#97A628'],
    ['#9B28A6'],
    ['#3928A6'],
]

export const attributeList = [];

let discreteTraitList = ['Clade', 'Group', 'island/mainland']

let wrap = d3.select('#wrapper');
let main = wrap.select('#main');
let selectedPaths = wrap.select('#selected');
let sidebar = wrap.select('#sidebar');
let toolbarDiv = wrap.select('#toolbar');

let tooltip = wrap.append("div")
.attr("id", "tooltip")
.style("opacity", 0);

////DATA LOADING////

loadData(d3.json, './public/data/centrarchid-edges.json', 'edge').then(async edges => {

    
    //helper function to create array of unique elements
    Array.prototype.unique = function() {
        return this.filter(function (value, index, self) { 
            return self.indexOf(value) === index;
        });
    }

    let leafChar = await loadData(d3.csv, './public/data/centrarchid-leaf-data.csv', '');

    ///Creating attribute list to add estimated values in //

    leafChar.columns.filter(f=> f != 'species').forEach((d, i)=> {

        if(discreteTraitList.indexOf(d) > -1){
            attributeList.push({field: d, type: 'discrete'});
        }else{
            attributeList.push({field: d, type:'continuous'});
        }

    });

    let edgeLen = await loadData(d3.json, './public/data/centrarchid-edge-lengths.json', 'edge');
    let char = await loadData(d3.json, './public/data/centrarchid-res.json', '');

    edges.rows = edges.rows.filter(f=> f.From != "").map((edge, i)=> {
        edge.edgeLength = edgeLen.rows[i].x;
        return edge;
    });  

    //Mapping data together/////
    let edgeSource = edges.rows.map(d=> d.From);
   
    let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.To) == -1 );
   

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

  
    let calculatedScales = calculateNewScales(calculatedAtt, attributeList.map(m=> m.field), colorKeeper);
    calculatedScalesKeeper.push(calculatedScales);

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
            group: null,
            leaf: true
        }
        return newEdge;
    });

    let all = matchedEdges.filter(f=> f.attributes != null);

    let paths = allPaths(all, matchedLeaves, "V1", "V2");
    
    let addedRoot = rootAttribute(paths, calculatedAtt, calculatedScales);

    let normedPaths = combineLength(addedRoot);

    if(cladesGroupKeeper.length === 0){
        let attArray = calculatedScales.map(m=> m.field)
        if(attArray.indexOf('Clade') > -1){
            let groupData = groupDataByAttribute(calculatedScales, normedPaths, 'Clade');

            console.log('groupdata',groupData)
            let chosenClade = addCladeGroup('Clade Attribute', groupData.map(m=> m.label), groupData);
            chosenCladesGroup.push(chosenClade)

        }else{
            console.error('no clade information');
          
            let group = binGroups(normedPaths, 'ungrouped', calculatedScales, 8);
            let chosenClade = addCladeGroup('Not Grouped', ['Whole Set'], [group]);
            chosenCladesGroup.push(chosenClade)

        }
    }
    console.log('normedpaths',normedPaths)
    dataMaster.push(normedPaths);
    speciesTest.push(normedPaths.flatMap(m=> m.filter(f=> f.leaf === true)).map(l=> l.node));

    toolbarControl(toolbarDiv, normedPaths, main, calculatedScales, 'paths');
    
    let filterDiv = wrap.select('#filter-tab').classed('hidden', true);

    // ////////TREE RENDER IN SIDEBAR////////
    let treeDimensions = {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 290,
        height : 520
    }
    nestedData.push(buildTreeStructure(normedPaths, all.concat(matchedLeaves)));
    renderTreeButtons(normedPaths, calculatedScales, sidebar, false);
    //sidebar, att, uncollapse, pheno
    let tree = renderTree(sidebar, null, true, false);
    
    /// LOWER ATTRIBUTE VISUALIZATION ///
    initialViewLoad(calculatedScales, 'edgeLength');
});



// loadData(d3.json, './public/data/new-anolis-edges.json', 'edge').then(async edges => {

    
//     //helper function to create array of unique elements
//     Array.prototype.unique = function() {
//         return this.filter(function (value, index, self) { 
//             return self.indexOf(value) === index;
//         });
//     }

//     let leafChar = await loadData(d3.csv, './public/data/new-anolis-leaf-char.csv', '');

//     ///Creating attribute list to add estimated values in //

//     leafChar.columns.filter(f=> f != 'species').forEach((d, i)=> {

//         if(discreteTraitList.indexOf(d) > -1){
//             attributeList.push({field: d, type: 'discrete'});
//         }else{
//             attributeList.push({field: d, type:'continuous'});
//         }

//     });

//     let edgeLen = await loadData(d3.json, './public/data/new-anolis-edge-length.json', 'edge');
//     let char = await loadData(d3.json, './public/data/new-anolis-res.json', '');

//     edges.rows = edges.rows.filter(f=> f.From != "").map((edge, i)=> {
//         edge.edgeLength = edgeLen.rows[i].x;
//         return edge;
//     });  

//     //Mapping data together/////
//     let edgeSource = edges.rows.map(d=> d.From);
   
//     let leaves = edges.rows.filter(f=> edgeSource.indexOf(f.To) == -1 );
   

//     let calculatedAtt = char.rows.map((row, i)=> {
//         let newRow = {};
//         attributeList.forEach((att)=>{
//             newRow[att.field] = {};
//             newRow[att.field].field = att.field;
//             newRow[att.field].type = att.type;
//             let values = {}
//             d3.entries(row).filter(f=> f.key.includes(att.field)).map(m=> {
//                 if(att.type === 'continuous'){
                   
//                     if(m.key.includes('upperCI')){
//                         values.upperCI95 = m.value;
//                     }else if(m.key.includes('lowerCI')){
//                         values.lowerCI95 = m.value;
//                     }else{
//                         values.realVal = m.value;
//                     }
//                 }else{
//                      values[m.key] = m.value;   
//                 }
//             });
//             newRow[att.field].values = values;
//         });
//         newRow.node = row.nodeLabels;
//         return newRow;
//     });

  
//     let calculatedScales = calculateNewScales(calculatedAtt, attributeList.map(m=> m.field), colorKeeper);
//     calculatedScalesKeeper.push(calculatedScales);

//     let matchedEdges = edges.rows.map((edge, i)=> {
//         let attrib = calculatedAtt.filter(f=> f.node === edge.To)[0]
//         if(attrib){
//             Object.keys(attrib).filter(f=> f != 'node').map((att, i)=>{
                
//                 let scales = calculatedScales.filter(f=> f.field=== att)[0]
//                 attrib[att].scales = scales;
//                 return att;
                
//             })
//         }
//         let newEdge = {
//             V1: edge.From,
//             V2: edge.To,
//             node: edge.To,
//             edgeLength: edge.edgeLength,
//             attributes: attrib ? attrib : null
//         }
//         return newEdge;
//     });


//     let calcLeafAtt = leafChar.map((row, i)=> {
//         let newRow = {};
//         attributeList.forEach((att)=>{
//             newRow[att.field] = {};
//             newRow[att.field].field = att.field;
//             newRow[att.field].type = att.type;
//             let values = {}
//             d3.entries(row).filter(f=> f.key.includes(att.field)).map(m=> {
//                 if(att.type === 'continuous'){
//                     values.realVal = m.value;
//                 }else{
//                     values[m.key] = m.value;   
//                 }
//             });
//             newRow[att.field].values = values;
//         });
//         newRow.node = row.species;
//         newRow.label = row.species;
        
//         return newRow;
//     })


//     let matchedLeaves = leaves.map((leaf, i)=>{
//         let attrib = calcLeafAtt.filter(f=> f.node === leaf.To)[0]
//         if(attrib){
//             Object.keys(attrib).map((att, i)=>{
//                 if(att!='node' && att != 'label'){
//                     let scales = calculatedScales.filter(f=> f.field=== att)[0]
//                     attrib[att].scales = scales;
//                     return att;
//                 }
//             });
//         }
//         let newEdge = {
//             V1: leaf.From,
//             V2: leaf.To,
//             node: leaf.To,
//             edgeLength: leaf.edgeLength,
//             attributes: attrib ? attrib : null,
//             group: null,
//             leaf: true
//         }
//         return newEdge;
//     });

//     let all = matchedEdges.filter(f=> f.attributes != null);

//     let paths = allPaths(all, matchedLeaves, "V1", "V2");
    
//     let addedRoot = rootAttribute(paths, calculatedAtt, calculatedScales);

//     let normedPaths = combineLength(addedRoot);

//     if(cladesGroupKeeper.length === 0){
//         let attArray = calculatedScales.map(m=> m.field)
//         if(attArray.indexOf('Clade') > -1){
//             let groupData = groupDataByAttribute(calculatedScales, normedPaths, 'Clade');
//             let chosenClade = addCladeGroup('Clade Attribute', groupData.map(m=> m.label), groupData);
//             chosenCladesGroup.push(chosenClade)

//         }else{
//             console.error('no clade information');
//         }
//     }

//     dataMaster.push(normedPaths);
//     speciesTest.push(normedPaths.flatMap(m=> m.filter(f=> f.leaf === true)).map(l=> l.node));



    

//     toolbarControl(toolbarDiv, normedPaths, main, calculatedScales, 'paths');
    
//     let filterDiv = wrap.select('#filter-tab').classed('hidden', true);

//     // ////////TREE RENDER IN SIDEBAR////////
//     let treeDimensions = {
//         margin : {top: 10, right: 90, bottom: 50, left: 20},
//         width : 290,
//         height : 520
//     }
//     nestedData.push(buildTreeStructure(normedPaths, all.concat(matchedLeaves)));
//     renderTreeButtons(normedPaths, calculatedScales, sidebar, false);
//     let tree = renderTree(sidebar, null, false, false, treeDimensions);
    
//     /// LOWER ATTRIBUTE VISUALIZATION ///
//     initialViewLoad(calculatedScales, 'edgeLength');
// });





