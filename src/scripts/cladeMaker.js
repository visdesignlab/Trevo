import {dataMaster, nestedData} from './index';
import { updateDropdown } from './buttonComponents';
import * as d3 from "d3";
import { addingEdgeLength, assignPosition } from './sidebarComponent';
import { maxTimeKeeper } from './dataFormat';
import { getLatestData } from './filterComponent';
import { renderDistStructure } from './distributionView';
import { updateMainView } from './viewControl';

export const cladesGroupKeeper = []
export const chosenCladesGroup = []



export function useCladeGroup(){

}

export function addCladeGroup(name, clades, nodes){
    cladesGroupKeeper.push({field: name, names: clades, groups:nodes});
    return cladesGroupKeeper
}

export function removeCladeGroup(clades){
    cladeKeeper = cladeKeeper.filter(f=> f.groupKey != clades.groupKey);
}

export function groupDataByAttribute(scales, data, groupAttr){

    let groupKeys = scales.filter(f=> f.field === groupAttr)[0].scales.map(s=> s.scaleName);
  
    let branchBinCount = d3.median(data.map(m=> m.length)) - d3.min(data.map(m=> m.length))
   
    return groupKeys.map(group => {
        let paths = data.filter(path => {
            return group.includes(path[path.length - 1].attributes[groupAttr].values[groupAttr]);
        });

        return {'field': group, 'paths': paths}
    });
    
}

export function groupDataByClade(scales, data, cladeInfo){

    console.log('clade info', cladeInfo);
   
    return cladeInfo.groups.map(group => {
       
        let paths = data.filter(path=> {
            return group.nodes.indexOf(path[path.length - 1]) > -1;
        });

         return {'field': group.clade, 'paths': paths}
    });
    
}

export async function drawTreeForGroups(div){

    const dimensions =  {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 620,
        height : 700,
        lengthHeight: 800,
    }

    renderTree(div, null, dimensions);

    let leaf = div.select('.tree-svg').selectAll('.node--leaf');
    labelSpecies(leaf);

    div.select('.tree-svg').classed('clade-view', true).append('g').classed('overlay-brush', true);
}

function cladeToolbar(div, scales){

    let toolBar = div.append('div').classed('clade-toolbar', true);
    let textInput = toolBar.append('input')
    .classed('group-name', true)
    .attr('type', 'text')
    .attr('value', 'Name Your Group');
  
    let addCladeGroupButton = toolBar.append('button').text('Add Clade Group');
    addCladeGroupButton.on('click', ()=> {
        let cladeNames = []
        let clades = []
        d3.selectAll('.clade-name').each((e, i, n)=> {
           cladeNames.push(n[i].value);
           let rectTest = d3.select(`.rect-${i + 1}`).node().getBoundingClientRect();
           let nodes = div.select('.tree-svg.clade-view').selectAll('.node--leaf').filter((f, j, node)=> {
               let circPos = node[j].getBoundingClientRect();
               return circPos.y >= rectTest.y-4 && circPos.y <= ((rectTest.y + rectTest.height) - 4);
           })
           nodes.select('circle').attr('fill', 'red');
           clades.push({'clade': n[i].value , 'nodes': nodes.data().map(m=> m.data)})
        });
        d3.select('.group-name').attr('value')
        let groupName = d3.select('.group-name').node().value;
        addCladeGroup(groupName, cladeNames, clades);
        updateDropdown(cladesGroupKeeper, 'change-clade');
        let groups = groupDataByClade(cladesGroupKeeper[cladesGroupKeeper.length - 1]);
        console.log(groups);
        updateMainView( scales, 'Summary View', groups);
    });

    let inputGroup = toolBar.append('div').classed('input-group input-number-group', true);
    let minusButton = inputGroup.append('button').text('-');
   
    let numberText = inputGroup.append('input')
        .attr('value', 3)
        .attr('min', 0)
        .attr('max', 10)
        .attr('type', 'number')
        .classed('input-number', true);

    let plusButton = inputGroup.append('button').text('+');

    let nameWrap = inputGroup.append('div').classed('name-input-wrap', true);
    minusButton.on('click', ()=> {
        let num = numberText.attr('value');
        numberText.attr('value', +num - 1);
        addTextInputForGroups(+numberText.attr('value'), nameWrap);
    });

    plusButton.on('click', ()=> {
        let num = numberText.attr('value');
        numberText.attr('value', +num + 1);
        addTextInputForGroups(+numberText.attr('value'), nameWrap);
    });

    addTextInputForGroups(+numberText.attr('value'), nameWrap);

    function addTextInputForGroups(index, nameWrap){
       
        nameWrap.selectAll('*').remove();
        d3.selectAll('.overlay-brush').selectAll('rect').remove();
        for(let ind = 0; ind < index; ind = ind + 1){
            nameWrap.append('input')
            .classed('clade-name', true)
            .attr('value', `Group ${ind+1}`)
            .attr('type', 'text');

            let rectGroup = d3.select('.overlay-brush').append('g').classed(`group-${ind}`, true)

            let rect = rectGroup.append('rect')
            .classed(`rect-${ind + 1}`, true)
            .attr('height', 100)
            .attr('width', 910)
            .attr('opacity', 0.3)
            .attr('transform',  (d, i, n)=> `translate(${0},${((800 / index) * ind)})`);

            let rectSizer = rectGroup.append('rect').attr('class', `handle-${ind}`)
            .attr('width', 700)
            .attr('height', 20)
            .attr('y', rect.node().getBoundingClientRect().y + 20)
            .attr('opacity', 0)
            .call(d3.drag()
            .on('drag', function(){
                let dragPos = d3.mouse(this);
                let dragY = d3.event.y
                d3.select(this).attr('y', dragPos[1]);
                let height = +d3.select(`.rect-${ind + 1}`).attr('height')
                let rectY = d3.select(`.rect-${ind + 1}`).node().getBoundingClientRect().bottom;
                d3.select(`.rect-${ind + 1}`).attr('height', height + (dragY-rectY) + 70);
            }));
            
            rect.call(d3.drag().on('drag', function(){
                let dragPos = d3.mouse(this);
                let dragY = d3.event.y
                d3.select(this).attr('y', dragPos[1]);
                let rectH = d3.select(`.rect-${ind + 1}`).node().getBoundingClientRect().height;
                d3.select(`.handle-${ind}`).attr('y', dragY + (rectH - 20));
            }))
        }
    }
}

function labelSpecies(nodes){
    nodes.append('text')
    .text(d=> d.data.node)
    .attr('font-size', 9)
    .attr('x', 4)
    .attr('y', 2)
}

export async function createCladeView(div, scales){
    drawTreeForGroups(div);
    cladeToolbar(div, scales);
}

export function renderTree(sidebar, att, dimensions){

    // declares a tree layout and assigns the size
    var treemap = d3.tree()
    .size([dimensions.height, dimensions.width]);

    addingEdgeLength(0, nestedData[0]);
    
    //  assigns the data to a hierarchy using parent-child relationships
    var treenodes = d3.hierarchy(nestedData[0]);

    // maps the node data to the tree layout
    treenodes = treemap(treenodes);

    let sidebarTest = sidebar.select('svg');
    let treeSvg = sidebarTest.empty() ? sidebar.append("svg") : sidebarTest;
    treeSvg.classed('tree-svg', true);
    treeSvg.attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
    .attr("height", dimensions.height + dimensions.margin.top + dimensions.margin.bottom);

    let gTest = treeSvg.select('g.tree-g');
    let g = gTest.empty() ? treeSvg.append("g").classed('tree-g', true) : gTest;
    g.attr("transform",
      "translate(" + dimensions.margin.left + "," + dimensions.margin.top + ")");

   
        ////Break this out into other nodes////
    updateTree(treenodes, dimensions, treeSvg, g, att, true);
    
    /////END TREE STUFF
    ///////////
}

export function findDepth(node, array){

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

export function updateTree(treenodes, dimensions, treeSvg, g, attrDraw, length){
    
    assignPosition(treenodes, 0);

   let test = getLatestData();

    let branchCount = findDepth(treenodes, []);
    let xScale = d3.scaleLinear().domain([0, maxTimeKeeper[0]]).range([0, dimensions.width]).clamp(true);
    let yScale = d3.scaleLinear().range([dimensions.height, 0]).domain([0, 1])

    if(length){   
        g.attr('transform', 'translate(30, 370)');
        treeSvg.attr('height', 1000);
        yScale.range([580, 0]).domain([0, test.length-10])
        xScale.range([0, 800]);
    } 

    // adds the links between the nodes
    let link = g.selectAll(".link")
    .data( treenodes.descendants().slice(1))
    .join("path")
    .attr("class", "link");

    link.transition()
    .duration(500)
    .attr("d", function(d) {
       
           return "M" + xScale(d.data.combEdge) + "," + yScale(d.position)
           + "C" + (xScale(d.data.combEdge) + xScale(d.parent.data.combEdge)) / 2 + "," + yScale(d.position)
           + " " + (xScale(d.parent.data.combEdge)) + "," + yScale(d.position)
           + " " + xScale(d.parent.data.combEdge) + "," + yScale(d.parent.position);
     
    });

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
       
            return "translate(" + xScale(d.data.combEdge) + "," + yScale(d.position) + ")"; 
       
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