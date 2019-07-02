/**
 * 
 * @param {array of all graph edges} edgeArray 
 * @param {array of leaf nodes in graph} leafArray 
 * @param {string for property} source
 * @param {string for property} target  
 */
export function allPaths(edgeArray, leafArray, source, target){
    return leafArray.map(le=> getPath(edgeArray, le, [le], source, target));
}
/**
 * 
 * @param {array of all graph edges} edgeArray 
 * @param {one row of the leaf array} leaf 
 * @param {array that holds the constructed path} pathKeeper 
 * @param {string for source header} source (V1)
 * @param {string for target header} target (V2)
 */
export function getPath(edgeArray, leaf, pathKeeper, source, target){
    let path = edgeArray.filter(ed=> {
        return ed[target] === leaf[source]
    });
    if(path.length > 0){
        pathKeeper.push(path[0]);
        return getPath(edgeArray, path[0], pathKeeper, source, target);
    }else{
        pathKeeper.push({'root': true, 'node': leaf[source]})
        return pathKeeper.reverse();
    }
}

export function pullPath(pathArray, nodes, arrayOfArray, nameArray, depth){
    nodes.forEach((node, i)=> {
        node.depth = depth;
        node.id = depth + '.' + i;
        if(notEmpty(node.children)){
            pathArray.push(node);
            pullPath([...pathArray], node.children, arrayOfArray, nameArray, depth+1);
        }else{
            nameArray.push(node.node_data['node name']);
            node.flag = true
            arrayOfArray.push([...pathArray, node]);
        }
    })
    return arrayOfArray
}

function notEmpty(childArray){
    if(childArray == undefined){
        return false;
    }else if(childArray.length == 0){
        return false;
    }else{
        return true;
    }
}
