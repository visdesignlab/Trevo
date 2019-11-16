import {dataMaster, nestedData} from './index';
import { renderTree } from './sidebarComponent';

export const cladesGroupKeeper = []
export const chosenCladesGroup = []



export function useCladeGroup(){

}

export function addCladeGroup(clades){
    cladeKeeper.push(clades);
}

export function removeCladeGroup(clades){
    cladeKeeper = cladeKeeper.filter(f=> f.groupKey != clades.groupKey);
}

export function groupDataByClade(){



    let groupKeys = scales.filter(f=> f.field === groupAttr)[0].scales.map(s=> s.scaleName);

    console.log('grouppp',groupKeys)
  
    let branchBinCount = d3.median(pathData.map(m=> m.length)) - d3.min(pathData.map(m=> m.length))
   
    let pathGroups = groupKeys.map(group => {
        let paths = pathData.filter(path => {
            return group.includes(path[path.length - 1].attributes[groupAttr].values[groupAttr]);
        });

        let groupBins = binGroups(paths, group, scales, branchBinCount);
        return {'label': group, 'paths': paths, 'groupBins': groupBins}
    });
}

export function drawTreeForGroups(div){

    const dimensions =  {
        margin : {top: 10, right: 90, bottom: 50, left: 20},
        width : 620,
        height : 820
    }

    renderTree(div, null, true, false, dimensions);


}