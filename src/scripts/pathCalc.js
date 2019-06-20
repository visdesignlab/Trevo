/**
 * 
 * @param {array of all graph edges} edgeArray 
 * @param {array of leaf nodes in graph} leafArray 
 */
export function allPaths(edgeArray, leafArray){
    return leafArray.map(le=> getPath(edgeArray, le, []));
}
/**
 * 
 * @param {array of all graph edges} edgeArray 
 * @param {one row of the leaf array} leaf 
 * @param {array that holds the constructed path} pathKeeper 
 */
export function getPath(edgeArray, leaf, pathKeeper){
    let path = edgeArray.filter(ed=> ed.target == leaf.source);
    if(path.length > 0){
        pathKeeper.push(path[0]);
        return getPath(edgeArray, path[0], pathKeeper);
    }else{
        return pathKeeper;
    }
}
