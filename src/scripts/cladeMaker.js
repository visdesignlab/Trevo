import {dataMaster, nestedData} from './index';
import { renderTree } from './sidebarComponent';

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
    let addCladeGroupButton = toolBar.append('button').text('Add Clade Group');

}

export function createCladeView(div){
    cladeToolbar(div);
    drawTreeForGroups(div);

}