export function formatAttributeData(normedPaths, scales, filterArray){
    let keys = (filterArray == null)? Object.keys(normedPaths[0][0].attributes): filterArray;
   
    let newData = normedPaths.map(path=> {
        return keys.map((key)=> {
            return path.map((m)=> {
                if(m.attributes[key].type === 'continuous'){
                  
                    m.attributes[key].color = scales.filter(f=> f.field === key)[0].catColor;
                    m.attributes[key].move = m.move;
                    m.attributes[key].edgeMove = m.edgeMove;
                    m.attributes[key].label = key;
                    m.attributes[key].yScale = scales.filter(s=> s.field === key)[0].yScale;
                    return m.attributes[key];
                }else if(m.attributes[key].type === 'discrete'){
                    if(m.leaf){
                        let state = m.attributes[key];
                       
                        state.winState = m.attributes[key].states.filter(f=> f.realVal === 1)[0].state;
                        state.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === state.winState)[0].color
                        state.move = m.move;
                        state.edgeMove = m.edgeMove;
                        state.attrLabel = key;
                        return state;
                    }else{
                        let states = m.attributes[key].states ? m.attributes[key].states : m.attributes[key];//.filter(f => f.state != undefined);
                       
                        return states.map((st, j)=> {
                            st.color = scales.filter(f=> f.field === key)[0].stateColors.filter(f=> f.state === st.state)[0].color;
                            st.move = m.move;
                            st.edgeMove = m.edgeMove;
                            st.attrLabel = key;
                            return st;
                        });
                    }
             
                }else{
                    console.error('attribute type not found');
                }
            });
        });
    });
    return newData;
}