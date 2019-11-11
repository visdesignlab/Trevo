import '../styles/index.scss';
import * as d3 from "d3";

import {dataMaster, nestedData, collapsed} from './index';
import {filterMaster, removeFilter, addFilter} from './filterComponent';
import { updateMainView, groupedView } from './viewControl';
import {getNested} from './pathCalc';
import { dropDown } from './buttonComponents';
import { updateRanking } from './pairView';
import { pairPaths, maxTimeKeeper } from './dataFormat';

export function buildTreeStructure(paths, edges){
    let root = paths[0][0];
    let nestedData = getNested(root, edges);
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
    sidebar = sidebar.append('div').classed('button-wrap', true);
    // let treeButton = sidebar.append('button').text('Filter by Tree').classed('btn btn-outline-secondary', true);  
    // let treeBrush = d3.brush().extent([[0, 0], [400, 600]]).on('end', (d, i, n) => updateBrush(treeBrush, calculatedScales));
    // treeButton.on('click', ()=> {
    //     renderTree(sidebar, true, null, true);
    //     let treeBrushG = sidebar.select('svg').append('g').classed('tree-brush', true).call(treeBrush);
    // });

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

    treeViewButton.style('opacity', 0).style('width', 0).style('padding', 0).style('margin', 0);

    let optionArray = [{'field':'None'}];

    calculatedScales.map(m=> optionArray.push(m));

    let dropOptions = dropDown(sidebar, optionArray, `Color By Value`,'show-drop-div-sidebar');
    dropOptions.on('click', (d, i, n)=> {
        if(d.type === 'discrete'){
            renderTree(sidebar, d, true);
            d3.select('.dropdown.show-drop-div-sidebar').select('button').text(`Colored by ${d.field}`)
        }else if(d.type === 'continuous'){
            renderTree(sidebar, d, true);
            d3.select('.dropdown.show-drop-div-sidebar').select('button').text(`Colored by ${d.field}`);
        }else{
            renderTree(sidebar, null, false);
            d3.select('.dropdown.show-drop-div-sidebar').select('button').text(`Color By Value`);
        }
       sidebar.select('#show-drop-div-sidebar').classed('show', false);
    });

      ///BUTTON FOR PHENOGRAM VIEW. MAYBE MOVE THIS TO SIDEBAR
      let phenogramButton = d3.select('#sidebar').select('.button-wrap').append('button').text('View Phenogram');
      phenogramButton.classed('btn btn-outline-secondary', true); 
      phenogramButton.on('click', ()=> {
          if(phenogramButton.text() === 'View Phenogram'){
            if(d3.select('.attr-drop.dropdown').select('button').empty()){
                let drop = dropDown(d3.select('#toolbar'), optionArray, `Trait: ${optionArray[1].field}`, 'attr-drop');
                d3.select('.attr-drop.dropdown').select('button').attr('value', optionArray[1].field);
                d3.select('.dropdown.show-drop-div-sidebar').select('button').text(`Color By Value`);
                drop.on('click', (d, i, n)=> {
                    if(d3.select('.dropdown.change-view').select('button').node().value === "View Pairs"){
                        updateRanking(pairPaths(normedPaths), d.field);
                    }
                    renderTree(d3.select('#sidebar'), null, true, d.field);
                    d3.select('.attr-drop.dropdown').select('button').text(`Trait: ${d.field}`);
                    d3.select('.attr-drop.dropdown').select('button').attr('value', d.field);
                    d3.select('#attr-drop').classed('show', false);
                });
              
                renderTree(d3.select('#sidebar'), null, true, d3.select('.attr-drop.dropdown').select('button').attr('value'))
              }else{
    
                renderTree(d3.select('#sidebar'), null, true, d3.select('.attr-drop.dropdown').select('button').attr('value'))
              }
              phenogramButton.text('View Phylogeny');
          }else{

            renderTree(d3.select('#sidebar'), null, false);
            phenogramButton.text('View Phenogram');

          }
      })
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

    return stepDown(treeData);

    function stepDown(node){
        let leaves = getLeaves(node, []);
        let ids = new Set(leaves.map(m=> m.data.attributes.Clade.values.Clade));
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

function assignPosition(node, position) {
    if (node.children === undefined || node.children === null){
        
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

function addingEdgeLength(edge, data){
    data.combEdge = data.edgeLength + edge;
    if(data.children){
        data.children.forEach(chil=> {
            addingEdgeLength(data.combEdge, chil);
        });
    }
}

export function renderTree(sidebar, att, uncollapse, pheno){

    // set the dimensions and margins of the diagram
    let dimensions = {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 290,
        height : 520
    }

    // declares a tree layout and assigns the size
    var treemap = d3.tree()
    .size([dimensions.height, dimensions.width]);

    addingEdgeLength(0, nestedData[0]);

    //  assigns the data to a hierarchy using parent-child relationships
    var treenodes = d3.hierarchy(nestedData[0]);

    // maps the node data to the tree layout
    treenodes = treemap(treenodes);

    let groupedBool = d3.select('#show-drop-div-group').attr('value');
    let lengthBool = d3.select('button#length').text() === 'Hide Lengths';

    let sidebarTest = sidebar.select('svg');
    let treeSvg = sidebarTest.empty() ? sidebar.append("svg") : sidebarTest;
    treeSvg.attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
    .attr("height", dimensions.height + dimensions.margin.top + dimensions.margin.bottom);

    let gTest = treeSvg.select('g.tree-g');
    let g = gTest.empty() ? treeSvg.append("g").classed('tree-g', true) : gTest;
    g.attr("transform",
      "translate(" + dimensions.margin.left + "," + dimensions.margin.top + ")");

    if(groupedBool === "ungrouped" && uncollapse === false){
        let newNodes = collapseTree(treenodes);
        updateTree(newNodes, dimensions, treeSvg, g, att, lengthBool);
    }else{
        ////Break this out into other nodes////
        updateTree(treenodes, dimensions, treeSvg, g, att, lengthBool, pheno);
    }
    /////END TREE STUFF
    ///////////
}

function findDepth(node, array){

    function stepDown(n){
        if(n.children != null){
            n.children.forEach(child=> {
                stepDown(child);
            })
        }else{
            array.push(n);
        }
    }
    stepDown(node);

    return array;
    
}

function updateTree(treenodes, dimensions, treeSvg, g, attrDraw, length, pheno){

    d3.select('.pheno-y-axis').remove();
    d3.select('.pheno-x-axis').remove();
    
    assignPosition(treenodes, 0);

    let branchCount = findDepth(treenodes, []);
    let xScale = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.width]).clamp(true);
    let yScale = d3.scaleLinear().range([dimensions.height, 0]).domain([0, 1])

    if(length){   
        g.attr('transform', 'translate(20, 265)');
        treeSvg.attr('height', 800);
        yScale.range([500, 0]).domain([0, branchCount.length])
        xScale.range([0, dimensions.width + 10]);
    } 
    if(pheno){
        treeSvg.attr('height', 800);
        xScale.domain(treenodes.data.attributes[pheno].scales.yScale.domain())
        yScale.domain([0, maxTimeKeeper[0]]).range([0, 500])
    }

    // adds the links between the nodes
    let link = g.selectAll(".link")
    .data( treenodes.descendants().slice(1))
    .join("path")
    .attr("class", "link");

    link.transition()
    .duration(500)
    .attr("d", function(d) {
        if(length && pheno === undefined){
           return "M" + xScale(d.data.combEdge) + "," + yScale(d.position)
           + "C" + (xScale(d.data.combEdge) + xScale(d.parent.data.combEdge)) / 2 + "," + yScale(d.position)
           + " " + (xScale(d.parent.data.combEdge)) + "," + yScale(d.position)
           + " " + xScale(d.parent.data.combEdge) + "," + yScale(d.parent.position);
        }else{
            return "M" + xScale(d.data.attributes[pheno].values.realVal) + "," + yScale(d.data.combEdge)
            + " " + xScale(d.parent.data.attributes[pheno].values.realVal) + "," + yScale(d.parent.data.combEdge);
        }       
    });

    if(pheno){
        link.style('opacity', 0.3);
        g.attr('transform', 'translate(30, 50)');

        let x = xScale.domain(treenodes.data.attributes[pheno].scales.yScale.domain()).range([0, (dimensions.width+20)]);
        let xAxis = d3.axisBottom(x);
        g.append('g').classed('pheno-x-axis', true).call(xAxis).attr('transform', 'translate(0, 510)').select('path').attr('stroke-width', 0);

        let y = d3.scaleLinear().domain([0,maxTimeKeeper[0]]).range([0, dimensions.height -20]);
        let yAxis = d3.axisLeft(y);
        g.append('g').classed('pheno-y-axis', true).call(yAxis).attr('transform', 'translate(0, 2)').select('path').attr('stroke-width', 0);;
    }

    // adds each node as a group
    var node = g.selectAll(".node")
    .data(treenodes.descendants(), d => d.data.node)
    .join("g")
    .attr("class", function(d) { 
    return "node" + 
    (d.children ? " node--internal" : " node--leaf"); });

    // adds the circle to the node
    node.selectAll('circle').data(d=> [d]).join("circle")
      .attr("r", 3);

    node.transition()
    .duration(500)
    .attr("transform", function(d) { 
        if(length && pheno === undefined){
            return "translate(" + xScale(d.data.combEdge) + "," + yScale(d.position) + ")"; 
        }else{
           return "translate(" + (xScale(d.data.attributes[pheno].values.realVal) - 5) + "," + yScale(d.data.combEdge) + ")"; 
        }
    });

    if(attrDraw != null){
        let leaves = node.filter(n=> n.data.leaf === true);
        let notleaves = node.filter(n=> n.data.leaf != true);

        if(attrDraw.type === 'discrete'){
            attrDraw.stateColors.forEach(att=> {
                let circ = leaves.filter(f=> {
                    return att.state.includes(f.data.attributes[attrDraw.field].states.state)//f.data.attributes[attrDraw.field].winState === att.state;
                }).select('circle');
                circ.attr('fill', att.color);
                notleaves.selectAll('circle').attr('fill', 'gray');
            });
        }else{
            let scale = attrDraw.yScale;
            scale.range(['#fff', '#E74C3C']);
            leaves.select('circle').attr('fill', (d, i)=> {
                return scale(d.data.attributes[attrDraw.field].values.realVal);
            });
        }
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

    node.selectAll('text').remove();
    node.selectAll('.triangle').remove();

    let branchNodes = node.filter(n=> n.branchPoint === true);
    branchNodes.each((b, i, n)=> {
        if(b.children === null){
            let triangle = d3.select(n[i]).append('path').classed('triangle', true).attr('d', d3.symbol().type(d3.symbolTriangle).size('400'))
            triangle.attr('transform', `rotate(-90) translate(0, 65) scale(.9 4)`);
            triangle.attr('fill', 'gray').style('opacity', 0.3);
            let text = d3.select(n[i]).selectAll('text').data(d=> [d]).join('text').text(b.clade);
            text.attr('transform', 'translate(55, 5)');
        }
    })
    branchNodes.select('circle').attr('fill', 'red').attr('r', 4.5);
    branchNodes.on('click', (d, i, n)=> {
        if(d.children == null){
            uncollapseSub(d);
        }else{
            collapseSub(d);
        }
        let lengthBool = d3.select('button#length').text() === 'Hide Lengths';
        updateTree(treenodes, dimensions, treeSvg, g, attrDraw, lengthBool);
      
    });

    node.raise();
    node.selectAll('circle').raise();

    return node;
}