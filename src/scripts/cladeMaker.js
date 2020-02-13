import {dataMaster, nestedData, calculatedScalesKeeper} from './index';
import { updateDropdown, dropDown } from './buttonComponents';
import * as d3 from "d3";
import { addingEdgeLength, assignPosition, renderTree, renderTreeButtons, traitColorDropDown } from './sidebarComponent';
import { maxTimeKeeper } from './dataFormat';
import { getLatestData, getScales } from './filterComponent';
import { renderDistStructure, binGroups, continuousHistogram, mirrorlineGen } from './distributionView';
import { updateMainView } from './viewControl';
import { pullPath } from './pathCalc';
import { updateCladeDrop } from './toolbarComponent';

export const cladesGroupKeeper = [];
export const chosenCladesGroup = [];
export const cladeKeeper = [[]];

const colorKeep = ['#58D68D', '#F39C12', '#EC7063'];

function defineTraitClade(trait){
    
    d3.select('#clade-by-trait').remove();
    if(trait.type === 'discrete'){ 
        
        let options = [...trait.scales].map(m => {
            m.trait = m.field;
            m.field = m.scaleName;
            return m;
        });

        let dropOp = dropDown(d3.select('#sidebar').select('.button-wrap'), options, 'Define by Trait', 'clade-by-trait');
        dropOp.on('click', (d)=> {
            
            let data = getLatestData();
         
            let chosen = data.filter(f=> {
                let leaf = f[f.length - 1];
                return d.field.includes(leaf.attributes[d.trait].winState);
            });

            let leaf = d3.select('#sidebar').select('.tree-svg').selectAll('.node--leaf');
            let chosenLeaf = leaf.filter(f=> {
                return chosen.map(m=> m[m.length - 1].node).indexOf(f.data.node) > -1
            }).select('circle').classed('clade-define', true);

            let wrap = d3.select('#sidebar').select('.button-wrap').append('form').classed("form-inline", true)
            .append('div').classed("form-group", true).style('width', '300px');
            
            let textInput = wrap.append('input').attr('type', 'text')
            .classed('form-control', true)
            .attr('placeholder', 'Clade Name');

            let button = wrap.append('div').classed('input-group-append', true).append('button').attr('type', 'button').classed('btn btn-outline-secondary', true);
            button.text('Add Clade');
            
            button.on('click', ()=> {
                let name = textInput.node().value != "" ? textInput.node().value : `Clade-${cladeKeeper.length}`;
               
                addClade(name, chosen, null);
                growSidebarRenderTree(null);
                let ul = d3.select('div#clade-show').selectAll('ul');
                updateCladeDrop(ul, cladeKeeper[cladeKeeper.length - 1]);
            });
        });

    }else{
        
    }
}


export function growSidebarRenderTree(attrDraw){

    let sidebar = d3.select('#sidebar');
    let cladeBool = null;

    sidebar.classed('clade-view', true);
    d3.select('#main').classed('clade-view', true);

    sidebar.select('.tree-svg').remove();
    sidebar.select('.button-wrap').selectAll('*').remove();

    traitColorDropDown(getScales(), sidebar.select('.button-wrap'), growSidebarRenderTree, defineTraitClade);
    
    let x = sidebar.select('.button-wrap').append('div')
        .style('position', 'absolute')
        .style('right', '5px')
        .style('top', '18px')
        .append('i')
        .classed('close fas fa-times', true)
        .style('padding-right', '10px');

    x.on('click', ()=> {
        sidebar.classed('clade-view', false);
        d3.select('#main').classed('clade-view', false);
        sidebar.selectAll('*').remove();
        ////REDRAW SIDEBAR
        renderTreeButtons(getLatestData(), sidebar, false);
        renderTree(null, true, false);//att, uncollapse, pheno
    });

    const dimensions =  {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 400,
        height : (getLatestData().length * 8),
        lengthHeight: 500,
    }
   
    let treenodes = renderCladeTree(sidebar, null, dimensions);

    let leaf = sidebar.select('.tree-svg').selectAll('.node--leaf');
    let nodes = sidebar.select('.tree-svg').selectAll('.node');
    let link = sidebar.select('.tree-svg').selectAll('.link');

    let nodeData = getLatestData();
  
    function  findCommonNode(path1, path2, className){

        let common = path1.filter(f=> path2.map(m=> m.node).indexOf(f.node) > -1);
        let subtreeFinder = [nestedData[nestedData.length - 1]];
        let commonNodeMark = nodes.filter(f=> f.data.node === common[common.length - 1].node);
      
        common.map(m=> m.node).map((m, i)=> {
            if(i > 0){
                let child = subtreeFinder[subtreeFinder.length - 1].children.filter(f=> {
                    return f.node === m})[0];
                subtreeFinder.push(child);
            }
        });

        let paths = pullPath([subtreeFinder[subtreeFinder.length - 1]], subtreeFinder[subtreeFinder.length - 1].children, [], [], 0);
        let nodeNames = paths.flatMap(path => path.map(p=> p.node))
        nodes.filter(f=> nodeNames.indexOf(f.data.node) > -1).select('circle').classed(className, true);
        link.filter(f=> nodeNames.filter((n)=> n != common[common.length - 1].node).indexOf(f.data.node) > -1).classed(className, true);

        return paths;

    }
   
    labelTree(leaf);

    if(attrDraw != null){
    
        let notleaves = nodes.filter(n=> n.data.leaf != true);

        if(attrDraw.type === 'discrete'){
            attrDraw.stateColors.forEach(att=> {
                let circ = leaf.filter(f=> {
                    return att.state.includes(f.data.attributes[attrDraw.field].states.state)
                }).select('circle');
                circ.attr('fill', att.color);
                notleaves.selectAll('circle').attr('fill', 'gray');
            });
        }else{
            let scale = attrDraw.yScale;
            scale.range(['#fff', '#E74C3C']);
            leaf.select('circle').attr('fill', (d, i)=> {
                return scale(d.data.attributes[attrDraw.field].values.realVal);
            });
        }
    }else{
        nodes.selectAll('circle').attr('fill', 'gray');
    }

    drawCladeBox(cladeKeeper[cladeKeeper.length - 1].filter(f=> f.position != undefined));

    leaf.on('click', (d, i, n)=> {
   
        d3.select(n[i]).select('circle').attr('fill', 'orange').attr('r', '5');

        if(cladeBool === null){
            cladeBool = d;
           
        }else{
            let dat1 = nodeData.filter(f=> f[f.length-1].node === cladeBool.data.node)[0];
            let dat2 = nodeData.filter(f=> f[f.length-1].node === d.data.node)[0];
            let paths = findCommonNode(dat1, dat2, 'selected');

            let leafNames = paths.map(p=> p[p.length - 1].node);

            let leafNameNodes = leaf.filter(f=> {
                return leafNames.indexOf(f.data.node) > -1;
            });
            
            let leafNameNodeData = leafNameNodes.data().sort((a, b)=> b.position - a.position);
            let allLeafNodeData = leaf.data().sort((a, b)=> b.position - a.position);
            
            let positionHolder = [leafNameNodeData[0], leafNameNodeData[leafNameNodeData.length - 1]].map((m)=> {
                let index = allLeafNodeData.indexOf(m);
                m.index = index;
                return m;
            });

            let yScale = d3.scaleLinear()
            yScale.range([dimensions.height, 0]).domain(d3.extent(leaf.data().map(m=> m.position)));

            let wrap = sidebar.select('.button-wrap').append('form').classed("form-inline", true)
            .append('div').classed("form-group", true).style('width', '300px');
            
            let textInput = wrap.append('input').attr('type', 'text')
            .classed('form-control', true)
            .attr('placeholder', 'Clade Name');

            let button = wrap.append('div').classed('input-group-append', true).append('button').attr('type', 'button').classed('btn btn-outline-secondary', true);
            button.text('Add Clade');
            
            button.on('click', ()=> {
                let name = textInput.node().value != "" ? textInput.node().value : `Clade-${cladeKeeper.length}`;
                addClade(name, paths, positionHolder);
                growSidebarRenderTree(null);
                let ul = d3.select('div#clade-show').selectAll('ul');
                updateCladeDrop(ul, cladeKeeper[cladeKeeper.length - 1]);
            });
            cladeBool = null;
        }
    });
    leaf.on('mouseover', (d, i, n)=> {
        if(cladeBool!=null){
            let dat1 = nodeData.filter(f=> f[f.length-1].node === cladeBool.data.node)[0];
            let dat2 = nodeData.filter(f=> f[f.length-1].node === d.data.node)[0];
            findCommonNode(dat1, dat2, 'selected-hover');
        }

    }).on('mouseout', ()=> {
        sidebar.selectAll('.selected-hover').classed('selected-hover', false);
    });

   sidebar.select('.tree-svg').classed('clade-view', true).append('g').classed('overlay-brush', true);

}

function drawCladeBox(cladeData){
    let base = 0;
    let treeSVG = d3.select('.tree-svg');
    let cladeGroups = treeSVG.append('g').selectAll('g.clade-label').data(cladeData).join('g').classed('clade-label', true);
    cladeGroups.append('rect')
    .attr('width', (d, i, n)=> {
        if(i>0){
            let others = d3.select(n[i-1]).data()[0].nodes.map(m=> m[m.length-1].node);
            let test = d.nodes.filter(m=> {
                let node = m[m.length-1].node;
                return others.indexOf(node) > -1;
            });
            
            let width = test.length > 0 ? 8 : 60;
            return width;
            
        }else{
            
            return 60;
        }
    })
    .attr('height', (d, i)=>{
        return (d.nodes.length * 12);
    }).attr('transform', (d, i, n)=> {
        if(i>0){
            let others = d3.select(n[i-1]).data()[0].nodes.map(m=> m[m.length-1].node);
            let test = d.nodes.filter(m=> {
                let node = m[m.length-1].node;
                return others.indexOf(node) > -1;
            });
          
            if(test.length > 0){base = base + 1};
            let xStep = test.length === 0 ? 0 : base;
            let step = d.position[0].index > 10 ? 12 : 11.6;
            return `translate(${(xStep*65)+435}, ${((d.position[0].index * step)+28)})`;
            
        }else{
            let step = d.position[0].index > 10 ? 12 : 11.6;
            return `translate(${435}, ${((d.position[0].index * step)+28)})`;
        }
        
        
    })
    .attr('fill',(d, i)=> colorKeep[i])
    .attr('opacity', .3);

    cladeGroups.on('mouseover', (d, i, n)=> {

            let tool = d3.select('#tooltip');
            tool.transition()
            .duration(200)
            .style("opacity", .9);
          
            tool.html(`${d.field}`)
            .style("left", (d3.event.pageX - 40) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
            tool.style('height', 'auto');

    }).on('mouseout', (d, i, n)=> {
       
        let tool = d3.select('#tooltip');
        tool.transition()
          .duration(500)
          .style("opacity", 0);
    });

}

export function addClade(name, nodes, positions){
    cladeKeeper[cladeKeeper.length - 1].push({field: name, nodes: nodes, position: positions});
}

export function addCladeGroup(name, clades, nodes){
    cladesGroupKeeper.push({field: name, names: clades, groups:nodes});
    return {field: name, names: clades, groups:nodes};
}

export function removeCladeGroup(clades){
    cladeKeeper[cladeKeeper.length - 1] = cladeKeeper[cladeKeeper.length - 1].filter(f=> f.groupKey != clades.groupKey);
}

function createNewCladeGroup(div, scales){
    let cladeNames = [];
    let clades = [];
    d3.selectAll('.clade-name').each((e, i, n)=> {
       cladeNames.push(n[i].value);
       let rectTest = d3.select(`.rect-${i + 1}`).node().getBoundingClientRect();
       let nodes = div.select('.tree-svg.clade-view').selectAll('.node--leaf').filter((f, j, node)=> {
           let circPos = node[j].getBoundingClientRect();
           return circPos.y >= rectTest.y-4 && circPos.y <= ((rectTest.y + rectTest.height) - 4);
       })
       nodes.select('circle').attr('fill', 'red');
       clades.push({'clade': n[i].value , 'nodes': nodes.data().map(m=> m.data)});
    });
 
    let groupName = d3.select('.group-name').node().value;
    let chosenGroup = addCladeGroup(groupName, cladeNames, clades);
    updateDropdown(cladesGroupKeeper, 'change-clade');
    let groups = groupDataByClade(scales, getLatestData(), chosenGroup);

    d3.select('.dropdown.change-clade').select('button').text(`Clades Shown: ${chosenGroup.field}`);

    updateMainView('Summary View', groups);
    renderTree(d3.select('#sidebar'), null, true, false);
}

function labelTree(nodes){
    nodes.append('text')
    .text(d=> d.data.node)
    .attr('font-size', 9)
    .attr('x', 4)
    .attr('y', 2);
}

export async function createCladeView(div, scales){
    drawTreeForGroups(div);
    cladeToolbar(div, scales);
}

export function renderCladeTree(sidebar, att, dimensions){



     addingEdgeLength(0, nestedData[nestedData.length - 1]);
    
    let treeFun = data => {
        const root = d3.hierarchy(data);
        return d3.tree().size([dimensions.width, dimensions.height])(root);
      }

    let treenodes = treeFun(nestedData[nestedData.length - 1]);

    let treeSvg = sidebar.append("svg").classed('tree-svg', true);
    let g = treeSvg.append("g").classed('tree-g', true);
   
    ////Break this out into other nodes////
    updateCladeTree(treenodes, dimensions, treeSvg, g, att, true);
    return treenodes;
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

export function updateCladeTree(treenodes, dimensions, treeSvg, g, attrDraw, length){

    let dataSet = getLatestData();
    let move = dataSet.length > 200 ? dimensions.height / 1.964 : dimensions.height / 1.9;
    
    assignPosition(treenodes, 0);

    treeSvg.attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
    .attr("height", dimensions.height + (dimensions.height / 1.5));

    findDepth(treenodes, []);
    let xScale = d3.scaleLinear().domain([0, maxTimeKeeper[maxTimeKeeper.length - 1]]).range([0, dimensions.width]).clamp(true);
    let yScale = d3.scaleLinear().range([dimensions.height, 0]).domain([0, getLatestData().length])
    //g.attr('transform', `translate(30, ${dimensions.height / 1.9})`);
    g.attr('transform', `translate(30, ${move})`);

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
    });

    branchNodes.select('circle').attr('fill', 'red').attr('r', 4.5);
    branchNodes.on('click', (d, i, n)=> {
        if(d.children == null){
            uncollapseSub(d);
        }else{
            collapseSub(d);
        }
        let lengthBool = d3.select('button#length').text() === 'Hide Lengths';
        updateCladeTree(treenodes, dimensions, treeSvg, treeSvg.select('g'), attrDraw, lengthBool);
      
    });

    node.raise();
    node.selectAll('circle').raise();

    return node;
}