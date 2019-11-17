import {dataMaster, nestedData} from './index';
import { renderTree } from './sidebarComponent';
import { updateDropdown } from './buttonComponents';
import * as d3 from "d3";

export const cladesGroupKeeper = []
export const chosenCladesGroup = []



export function useCladeGroup(){

}

export function addCladeGroup(name, clades){
    cladesGroupKeeper.push({field: name, groups: clades});
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

export async function drawTreeForGroups(div){

    const dimensions =  {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 620,
        height : 820,
        lengthHeight: 800,
    }

    renderTree(div, null, true, false, dimensions);

    div.select('.tree-svg').classed('clade-view', true).append('g').classed('overlay-brush', true);

    console.log(div.selectAll('.tree-svg.clade-view'))


}

function cladeToolbar(div){

    let toolBar = div.append('div').classed('clade-toolbar', true);
    let textInput = toolBar.append('input')
    .classed('group-name', true)
    .attr('type', 'text')
    .attr('value', 'Name Your Group');
  
    let addCladeGroupButton = toolBar.append('button').text('Add Clade Group');
    addCladeGroupButton.on('click', ()=> {
        let cladeNames = []
        d3.selectAll('.clade-name').each((e, i, n)=> {
           cladeNames.push(n[i].value);
        });
        d3.select('.group-name').attr('value')
        let groupName = d3.select('.group-name').node().value;
        addCladeGroup(groupName, cladeNames);
        updateDropdown(cladesGroupKeeper, 'change-clade');
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
        for(let ind = 0; ind < index; ind = ind + 1){
            nameWrap.append('input')
            .classed('clade-name', true)
            .attr('value', `Group ${ind+1}`)
            .attr('type', 'text');
            let rects = d3.selectAll('.overlay-brush')
            .append('rect')
            .classed(`${ind + 1}-rect`, true)
            .attr('height', 100)
            .attr('width', 500)
            .attr('transform',  (d, i, n)=> `translate(${0},${((800 / index) * ind)})`)
            console.log(rects, d3.select('.overlay-brush'))
        }
    }
}

export async function createCladeView(div){
    
    drawTreeForGroups(div);
    cladeToolbar(div);
    console.log(div.selectAll('.tree-svg.clade-view'))

}