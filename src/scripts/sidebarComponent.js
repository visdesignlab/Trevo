import '../styles/index.scss';
import * as d3 from "d3";

import {dataMaster, nestedData, collapsed} from './index';
import {filterMaster, removeFilter, addFilter} from './filterComponent';
import { updateMainView } from './viewControl';
import {getNested} from './pathCalc';
import { dropDown } from './buttonComponents';


export function buildTreeStructure(paths, edges){
    let root = paths[0][0];
    let nestedData = getNested(root, edges.rows);
   // console.log('nested data', nestedData);
    return nestedData;
}

function updateBrush(treeBrush, scales){
    
    let sidebar = d3.select('#sidebar');
    let toolbarDiv = d3.select('#toolbar');

    let data = filterMaster.length === 0 ? dataMaster[0] : dataMaster[0];
    let nodes = sidebar.select('svg').select('g').selectAll('.node');
    let selectedNodes = nodes.filter(n=> (n.y > d3.event.selection[0][0]) && (n.y < d3.event.selection[1][0]) && (n.x > d3.event.selection[0][1]) && (n.x < d3.event.selection[1][1])).classed('selected', true);
    let filterArray = selectedNodes.data().map(n=> n.data.node);
    let test = treeFilter(data, filterArray);
    let brushId = 'brush-'+ filterMaster.filter(f=> f.attributType === 'topology').length;
    let filterOb = addFilter('data-filter', 'topology', brushId, treeFilter, [...data], [...test], null);

    updateMainView(scales, 'edgeLength');
   
    ///DIMMING THE FILTERED OUT NODES//////

    ////Class Tree Links////
    let treeLinks  = d3.select('#sidebar').selectAll('.link');
    let treeNode  = d3.select('#sidebar').selectAll('.node');

    let nodeList = test.flatMap(path=> path.map(node => node.node));

    d3.selectAll('.link-not-there').classed('link-not-there', false);
    d3.selectAll('.node-not-there').classed('node-not-there', false);

    let missingLinks = treeLinks.filter(f=> nodeList.indexOf(f.data.node) === -1);
    missingLinks.classed('link-not-there', true);

    let missingNodes = treeNode.filter(f=> nodeList.indexOf(f.data.node) === -1);
    missingNodes.classed('node-not-there', true);

    ///END NODE DIMMING///////

    let button = toolbarDiv.append('button').classed('btn btn-info', true);
    let span = button.append('span').classed('badge badge-light', true);
    span.text(test.length);
    let label = button.append('h6').text('Tree Filter');

    let xSpan = label.append('i').classed('close fas fa-times', true);
    xSpan.on('click', async (d, i, n)=> {
        removeFilter(brushId);
        await updateMainView(scales, 'edgeLength');
        d3.selectAll('.selected').classed('selected', false);
        d3.selectAll('.link-not-there').classed('link-not-there', false);
        d3.selectAll('.node-not-there').classed('node-not-there', false);
        button.remove();
        d3.select(this).call(treeBrush.move, null);
        d3.select('.tree-brush').remove();
    });
}

export function renderTreeButtons(normedPaths, calculatedScales, sidebar){
    ///SIDBAR STUFF
    let treeButton = sidebar.append('button').text('Filter by Tree').classed('btn btn-outline-secondary', true);  
   // let treeBrush = d3.brush().extent([[0, 0], [400, 600]]);
   let treeBrush = d3.brush().extent([[0, 0], [400, 600]]).on('end', (d, i, n) => updateBrush(treeBrush, calculatedScales));
    treeButton.on('click', ()=> {
        let treeBrushG = sidebar.select('svg').append('g').classed('tree-brush', true).call(treeBrush);
    });

        ///SIDBAR STUFF
    let treeViewButton = sidebar.append('button').text('Show Lengths').classed('btn btn-outline-secondary', true);  

    treeViewButton.on('click', ()=> {
  
       sidebar.select('svg').remove();
       if(treeViewButton.text() === 'Show Lengths'){
            renderTree(sidebar, true, null);
            treeViewButton.text('Hide Lengths');
       }else{
            renderTree(sidebar, false, null);
            treeViewButton.text('Show Lengths');
       }
    });

    let optionArray = [{'field':'None'}];

    calculatedScales.map(m=> optionArray.push(m))

    let dropOptions = dropDown(sidebar, optionArray, 'See Values','show-drop-div-sidebar');
    dropOptions.on('click', (d, i, n)=> {
        if(d.type === 'discrete'){
            renderTree(sidebar, false, d);
        }else if(d.type === 'continuous'){
            renderTree(sidebar, false, null);
        }else{
            renderTree(sidebar, false, null);
        }
       sidebar.select('#show-drop-div-sidebar').classed('show', false);
    });
}

function treeFilter(data, selectedNodes){
    return data.filter(path=> {
        let nodeNames = path.map(no=> no.node);
        let booArray = nodeNames.map(id=> selectedNodes.indexOf(id) > -1);
        return booArray.indexOf(true) > -1
    });
}

function collapseTree(treeData){
    console.log('collapse',treeData);

    

}

export function renderTree(sidebar, length, attrDraw){

    if(attrDraw != null){
        console.log('attDraw',attrDraw);
    }
    // set the dimensions and margins of the diagram
    var margin = {top: 10, right: 90, bottom: 50, left: 20},
    width = 400 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
    var treemap = d3.tree()
    .size([height, width]);
  
    function addingEdgeLength(edge, data){
        data.combEdge = data.edgeLength + edge;
        if(data.children){
            data.children.forEach(chil=> {
                addingEdgeLength(data.combEdge, chil);
            });
        }
    }
    addingEdgeLength(0, nestedData[0])

    collapseTree(nestedData[0]);

//  assigns the data to a hierarchy using parent-child relationships
    var treenodes = d3.hierarchy(nestedData[0]);

    collapseTree(treenodes)

// maps the node data to the tree layout
    treenodes = treemap(treenodes);

    let xScale = d3.scaleLinear().domain([0, 1]).range([0, width]).clamp(true);
    sidebar.select('svg').remove();
    var treeSvg = sidebar.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom),
    g = treeSvg.append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

// adds the links between the nodes
    var link = g.selectAll(".link")
    .data( treenodes.descendants().slice(1))
    .join("path")
    .attr("class", "link")
    .attr("d", function(d) {
        if(length){
            return "M" + xScale(d.data.combEdge) + "," + d.x
            + "C" + (xScale(d.data.combEdge) + xScale(d.parent.data.combEdge)) / 2 + "," + d.x
            + " " + (xScale(d.data.combEdge) + xScale(d.parent.data.combEdge)) / 2 + "," + d.parent.x
            + " " + xScale(d.parent.data.combEdge) + "," + d.parent.x;
        }else{
            return "M" + d.y + "," + d.x
            + "C" + (d.y + d.parent.y) / 2 + "," + d.x
            + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
            + " " + d.parent.y + "," + d.parent.x;
        }       
    });

    // adds each node as a group
    var node = g.selectAll(".node")
    .data(treenodes.descendants())
    .join("g")
    .attr("class", function(d) { 
    return "node" + 
    (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { 
   
        if(length){
            return "translate(" + xScale(d.data.combEdge) + "," + d.x + ")"; 
        }else{
            return "translate(" + d.y + "," + d.x + ")"; 
        }
    
    //return "translate(" + d.y + "," + d.x + ")"; 
});

    // adds the circle to the node
    node.append("circle")
    .attr("r", 3);

    if(attrDraw != null){
        let leaves = node.filter(n=> n.data.leaf === true);
        let notleaves = node.filter(n=> n.data.leaf != true);
        
        attrDraw.stateColors.forEach(att=> {
            let circ = leaves.filter(f=> {
                return f.data.attributes[attrDraw.field].winState === att.state;
            }).select('circle');
            circ.attr('fill', att.color);
            circ.attr('r', 4)
            notleaves.selectAll('circle').attr('fill', 'gray');
        });
    }else{
        node.selectAll('circle').attr('fill', 'gray');
    }

    node.on('mouseover', (d, i, n)=> {
        let paths = d3.select('#main-path-view').selectAll('.paths');
        let points = d3.select('#main-summary-view').selectAll('.branch-points');
        points.filter(f=> f.node === d.data.node).classed('selected', true);

        let selectedPaths = paths.filter(path=> {
            let nodes = path.map(m=> m.node);
            return nodes.indexOf(d.data.node) > -1;
        }).classed('hover', true);
        selectedPaths.selectAll('g').filter(g=> g.node === d.data.node).classed('selected', true);
        d3.select(n[i]).classed('selected-branch', true);

    }).on('mouseout', (d, i, n)=> {
        d3.selectAll('.paths.hover').classed('hover', false);
        d3.selectAll('g.selected').classed('selected', false);
        d3.select(n[i]).classed('selected-branch', false);
    });
    let leaves = node.filter(f=> f.data.children.length == 0);

    leaves.on('click', (d, i, n)=> console.log(d));
    console.log('node in tree', new Set(leaves.data().map(m=> m.data.clade)))
    leaves.filter(f=> f.data.clade === '' || f.data.clade === 'Anolis').select('circle').attr('fill', 'red');

    return node;
/////END TREE STUFF
///////////
}