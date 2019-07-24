import '../styles/index.scss';
import * as d3 from "d3";
import {renderSelectedView, pathSelected} from './selectedPaths';
import {formatAttributeData} from './dataFormat';
import {drawPathsAndAttributes} from './rendering';

function getNested(node, edgeArray){
    node.children = edgeArray.filter(f=> String(f.V1) === String(node.node));
    node.name = String(node.node);
    if(node.children.length > 0){
        node.children.forEach(c=> getNested(c, edgeArray));
    }else{
        return node;
    }
    return node;
}

export function buildTreeStructure(paths, edges){
    let root = paths[0][0];
    let nestedData = getNested(root, edges.rows);
    return nestedData;
}

export function renderTree(nestedData, normedPaths, calculatedScales, sidebar){

    let treeBrush = d3.brush().extent([[0, 0], [400, 600]]);

    function updateBrush(){
        let sidebar = d3.select('#sidebar');
        let main = d3.select('#main');
        let toolbarDiv = d3.select('#toolbar');

        let nodes = sidebar.select('svg').select('g').selectAll('.node');
        let selectedNodes = nodes.filter(n=> (n.y > d3.event.selection[0][0]) && (n.y < d3.event.selection[1][0]) && (n.x > d3.event.selection[0][1]) && (n.x < d3.event.selection[1][1])).classed('selected', true);
    
        let filterArray = selectedNodes.data().map(n=> n.data.node);
        let test = normedPaths.filter(path=> {
            let nodeNames = path.map(no=> no.node);
            let booArray = nodeNames.map(id=> selectedNodes.data().map(n=> n.data.node).indexOf(id) > -1);
            return booArray.indexOf(true) > -1
        });

        drawPathsAndAttributes(test, main, calculatedScales, 'edgeLength');
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
        xSpan.on('click', async ()=> {
            await drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
            d3.selectAll('.selected').classed('selected', false);
            d3.selectAll('.link-not-there').classed('link-not-there', false);
            d3.selectAll('.node-not-there').classed('node-not-there', false);
            button.remove();
            d3.select(this).call(treeBrush.move, null);
        });
    }

    ///SIDBAR STUFF
    let treeButton = sidebar.append('button').text('Filter by Tree').classed('btn btn-outline-secondary', true);  

    treeButton.on('click', ()=> {
        treeBrush.on('end', updateBrush);
        let treeBrushG = sidebar.select('svg').append('g').classed('tree-brush', true).call(treeBrush);
        
    });
    // set the dimensions and margins of the diagram
    var margin = {top: 10, right: 90, bottom: 50, left: 20},
    width = 400 - margin.left - margin.right,
    height = 680 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
    var treemap = d3.tree()
    .size([height, width]);

//  assigns the data to a hierarchy using parent-child relationships
    var treenodes = d3.hierarchy(nestedData);

// maps the node data to the tree layout
    treenodes = treemap(treenodes);

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
        return "M" + d.y + "," + d.x
        + "C" + (d.y + d.parent.y) / 2 + "," + d.x
        + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
        + " " + d.parent.y + "," + d.parent.x;
    });

    // adds each node as a group
    var node = g.selectAll(".node")
    .data(treenodes.descendants())
    .join("g")
    .attr("class", function(d) { 
    return "node" + 
    (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { 
    return "translate(" + d.y + "," + d.x + ")"; });

    // adds the circle to the node
    node.append("circle")
    .attr("r", 3);

    node.on('mouseover', (d, i, n)=> {
        let paths = d3.select('#main-path-view').selectAll('.paths');
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

    return node;
/////END TREE STUFF
///////////
}