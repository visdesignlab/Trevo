import {dataMaster, nestedData} from './index';
import { renderTree } from './sidebarComponent';
import { updateDropdown } from './buttonComponents';

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

export function drawTreeForGroups(div){

    const dimensions =  {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 620,
        height : 820,
        lengthHeight: 900,
    }

    renderTree(div, null, true, false, dimensions);


}

function cladeToolbar(div){

    let toolBar = div.append('div').classed('clade-toolbar', true);
    let textInput = toolBar.append('input').attr('type', 'text').attr('placeholder', 'Name your Group')
    //<input type="text" class="form-control" placeholder="Username" aria-label="Username" aria-describedby="basic-addon1">
   // </div>
    let addCladeGroupButton = toolBar.append('button').text('Add Clade Group');
    addCladeGroupButton.on('click', ()=> {
        addCladeGroup('Test', []);
        console.log(cladesGroupKeeper);
        updateDropdown(cladesGroupKeeper, 'change-clade');
    
    });

    let inputGroup = toolBar.append('div').classed('input-group input-number-group', true);
    let minusButton = inputGroup.append('button').text('-');
    let numberText = inputGroup.append('input').attr('type', 'number').classed('input-number', true);
    let plusButton = inputGroup.append('button').text('+');

//     <h6 class="text-center">Unit(s)</h6>
// <div class="input-group input-number-group">
//   <div class="input-group-button">
//     <span class="input-number-decrement">-</span>
//   </div>
//   <input class="input-number" type="number" value="1" min="0" max="1000">
//   <div class="input-group-button">
//     <span class="input-number-increment">+</span>
//   </div>
// </div>
    

}

export function createCladeView(div){
    cladeToolbar(div);
    drawTreeForGroups(div);

}