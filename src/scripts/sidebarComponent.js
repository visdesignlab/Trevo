import '../styles/index.scss';
import * as d3 from "d3";

import {dataMaster, nestedData, collapsed} from './index';
import {filterMaster, removeFilter, addFilter} from './filterComponent';
import { updateMainView, groupedView } from './viewControl';
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
    let treeBrush = d3.brush().extent([[0, 0], [400, 600]]).on('end', (d, i, n) => updateBrush(treeBrush, calculatedScales));
    treeButton.on('click', ()=> {
        renderTree(sidebar, true, null, true);
        let treeBrushG = sidebar.select('svg').append('g').classed('tree-brush', true).call(treeBrush);
    });

        ///SIDBAR STUFF
    let treeViewButton = sidebar.append('button').text('Hide Lengths').attr('id', 'length').classed('btn btn-outline-secondary', true);  

    treeViewButton.on('click', ()=> {
  
       sidebar.select('svg').remove();
       if(treeViewButton.text() === 'Show Lengths'){
            renderTree(sidebar, null, true);
            treeViewButton.text('Hide Lengths');
       }else{
            renderTree(sidebar, null, false);
            treeViewButton.text('Show Lengths');
       }
    });

    let optionArray = [{'field':'None'}];

    calculatedScales.map(m=> optionArray.push(m))

    let dropOptions = dropDown(sidebar, optionArray, 'See Values','show-drop-div-sidebar');

    dropOptions.on('click', (d, i, n)=> {
        if(d.type === 'discrete'){
            renderTree(sidebar, d, true);
        }else if(d.type === 'continuous'){
            renderTree(sidebar, null, false);
        }else{
            renderTree(sidebar, null, false);
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

function uncollapseSub(d){
    d.children = d._children;
    d._children = null;
    if(d.children){
        d.children.map(c=> uncollapseSub(c));
    }    
}

function collapseSub(d){
    if(d.children) {
        d._children = d.children
        d._children.forEach(collapseSub)
        d.children = null
    }  
}


function collapseTree(treeData){

    let leaves = getLeaves(treeData, []);
    //GOING TO CHANGE ALL BLANK TO ANOLIS FOR THIS SITUATION///
    leaves.forEach(l=> l.data.clade === "Norops" ? l.data.clade = "Norops" : l.data.clade = "Anolis");

    return stepDown(treeData);

    function stepDown(node){
        let leaves = getLeaves(node, []);
        let ids = new Set(leaves.map(m=> m.data.clade));
        if(ids.size > 1){
            node.children.map(n=> stepDown(n))
        }else{
            node.branchPoint = true;
            node.clade = Array.from(ids)[0]
            collapseSub(node);
            return node;
        }
        return node;
    }
    
    function getLeaves(node, array){
        if(node.children != undefined ){
            node.children.map(n=> getLeaves(n, array))
        }else{
            array.push(node);
        };
        return array;
    }
}

export function renderTree(sidebar, attrDraw, uncollapse){

    if(attrDraw != null){
        console.log('attDraw',attrDraw);
    }
    // set the dimensions and margins of the diagram
    let dimensions = {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 290,
        height : 650
    }

    // declares a tree layout and assigns the size
    var treemap = d3.tree()
    .size([dimensions.height, dimensions.width]);
  
    function addingEdgeLength(edge, data){
        data.combEdge = data.edgeLength + edge;
        if(data.children){
            data.children.forEach(chil=> {
                addingEdgeLength(data.combEdge, chil);
            });
        }
    }

    addingEdgeLength(0, nestedData[0])

    //  assigns the data to a hierarchy using parent-child relationships
    var treenodes = d3.hierarchy(nestedData[0]);

    // maps the node data to the tree layout
    treenodes = treemap(treenodes);

    function assignPosition(node, position) {
        if (node.children == undefined || node.children.length === 0){
            position = position + 1.5;
            node.position = position;
            return position;
        }else{
            let positionArray = []
            node.children.forEach((child) => {
                position = assignPosition(child, position);
                positionArray.push(position);
            });
            node.options = positionArray;
            node.position = d3.max(positionArray);
            return position;
        }
    }

    assignPosition(treenodes, 0);

    let groupedBool = d3.select('#show-drop-div-group').attr('value');
    let lengthBool = d3.select('button#length').text() === 'Hide Lengths';

    console.log(lengthBool)

    if(groupedBool === "ungrouped" && uncollapse === false){
        let newNodes = collapseTree(treenodes);
        updateTree(newNodes, dimensions, sidebar, attrDraw, lengthBool);
    }else{
        ////Break this out into other nodes////
        updateTree(treenodes, dimensions, sidebar, attrDraw, lengthBool);
    }
    /////END TREE STUFF
    ///////////
}

function updateTree(treenodes, dimensions, sidebar, attrDraw, length){

    let xScale = d3.scaleLinear().domain([0, 1]).range([0, dimensions.width]).clamp(true);
    let yScale = d3.scaleLinear().range([0, dimensions.height]).domain([100, 0])

    sidebar.select('svg').remove();
    var treeSvg = sidebar.append("svg")
    .attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
    .attr("height", dimensions.height + dimensions.margin.top + dimensions.margin.bottom),
    g = treeSvg.append("g")
    .attr("transform",
      "translate(" + dimensions.margin.left + "," + dimensions.margin.top + ")");

    if(length){   
        g.attr('transform', 'translate(20, 320)');
        treeSvg.attr('height', 1000);
        yScale.range([0, 590])
        xScale.range([0, dimensions.width + 10])
    } 

// adds the links between the nodes
    var link = g.selectAll(".link")
    .data( treenodes.descendants().slice(1))
    .join("path")
    .attr("class", "link")
    .attr("d", function(d) {
        if(length){
           return "M" + xScale(d.data.combEdge) + "," + yScale(d.position)
           + "C" + (xScale(d.data.combEdge) + xScale(d.parent.data.combEdge)) / 2 + "," + yScale(d.position)
           + " " + (xScale(d.parent.data.combEdge)) + "," + yScale(d.position)
           + " " + xScale(d.parent.data.combEdge) + "," + yScale(d.parent.position);
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
            return "translate(" + xScale(d.data.combEdge) + "," + yScale(d.position) + ")"; 
        }else{
            return "translate(" + d.y + "," + d.x + ")"; 
        }
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

        if(d.data.label){
            let tool = d3.select('#tooltip');
            tool.transition()
            .duration(200)
            .style("opacity", .9);
          
            tool.html(`${d.data.label.charAt(0).toUpperCase() + d.data.label.slice(1)}`)
            .style("left", (d3.event.pageX - 40) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
            tool.style('height', 'auto');
        }

    }).on('mouseout', (d, i, n)=> {
        d3.selectAll('.paths.hover').classed('hover', false);
        d3.selectAll('g.selected').classed('selected', false);
        d3.select(n[i]).classed('selected-branch', false);

        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(500)
          .style("opacity", 0);
    });
    let leaves = node.filter(f=> f.data.children.length == 0);

    leaves.on('click', (d, i, n)=> console.log(d));

    let branchNodes = node.filter(n=> n.branchPoint === true);
    branchNodes.each((b, i, n)=> {
        if(b.children === null){
            d3.select(n[i]).append('text').text(b.clade)
        }
    })
    branchNodes.select('circle').attr('fill', 'red');
    branchNodes.on('click', (d, i, n)=> {
        if(d.children == null){
            uncollapseSub(d);
        }else{
            collapseSub(d);
        }
        let lengthBool = d3.select('button#length').text() === 'Hide Lengths';
        updateTree(treenodes, dimensions, sidebar, attrDraw, lengthBool);
      
    })
    return node;
}