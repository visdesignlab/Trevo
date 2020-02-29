import '../styles/index.scss';
import * as d3 from "d3";
import {drawPathsAndAttributes, drawDiscreteAtt, drawGroups} from './renderPathView';
import {toggleFilters, getLatestData} from './filterComponent';
import { updateMainView, updateViews } from './viewControl';
import { collapsed, calculatedScalesKeeper, workspace, loadApp } from '.';
import { dropDown } from './buttonComponents';
import { cladesGroupKeeper, chosenCladesGroup, cladeKeeper } from './cladeMaker';
import { binGroups, renderDistStructure } from './distributionView';

export let valueParam = d3.select('#toolbar').select('input').node().checked ? 'logVal' : 'realVal';

export function logScaleToggle(){

    
    d3.select('#toolbar').select('input')
    .on('change', (d, i, n)=> {
        
        valueParam = n[i].checked === true ? 'logVal' : 'realVal';
        
    //     let test = d3.select('#clade-show').selectAll('li').selectAll('input').filter((f, j, li)=> {
    //         return li[j].checked === true});
        
    //     let groups = test.data().map((m=> {
    //         let names = m.nodes.map(path => path[path.length - 1].node);
    //         let data = getLatestData().filter(path => names.indexOf(path[path.length - 1].node) > -1);
            
    //         let group = binGroups(data, m.field, calculatedScalesKeeper[0], 8);
    //         return {'label': m.field, 'paths': data, 'groupBins': group};
    //    }));
    //    console.log('groups', chosenCladesGroup[chosenCladesGroup.length - 1], groups)
    //    let loader = clearMain();
    //    updateMainView(d3.select('.dropdown.change-view').select('button').node().value, groups);
    //    loader.style.display = "none";
    updateViews(d3.select('.dropdown.change-view').select('button').node().value);
    })
}

export function findBrushedNodes(){
    let brushes = d3.select('#toolbar').selectAll('.brush-span');
    let brushData =  [];
    brushes.each(e => brushData.push(e));
    let nodes = brushData.flatMap(m=> m.nodes);
    return nodes;
}
export function toolbarDataControl(toolbar, graphList, chosenGraph){

    let dataDrop = dropDown(toolbar, graphList, chosenGraph.text, 'change-data');
    d3.select('.dropdown.change-data').select('button').node().value = chosenGraph.field;
    dataDrop.on('click', (d, i, n)=> {
        d3.select('.dropdown.change-data').select('button').node().value = d.field;
        d3.select('.dropdown.change-data').select('button').text(d.text);
        d3.select('#change-data').classed('show', false);
        let main = d3.select('#main');
        let sidebar = d3.select('#sidebar');
        let toolbarDiv = d3.select('#toolbar');
        let toolbarButtonWrap = toolbarDiv.select('.toolbar-button-wrap');
        main.selectAll('*').remove();
        sidebar.selectAll('*').remove();
        toolbarButtonWrap.selectAll('*').remove();
        cladeKeeper.push([]);
        loadApp(workspace, d.field);
    });

}
async function dropUpdated(d, button){
    let loader = await clearMain();
    await changeDropValue(d, button);
    await updateMainView(d.field, chosenCladesGroup[chosenCladesGroup.length - 1].groups);
    loader.style.display = "none";
}
export function changeDropValue(d, button){
    button.node().value = d.field;
    button.text(d.field);
    return d;
}
export function clearMain(){
    d3.select('#main').selectAll('*').remove();
    d3.select('#change-view').classed('show', false);
    document.getElementById("loader").style.display = "block";
    return document.getElementById("loader");
}
export function toolbarControl(toolbar, main, calculatedScales){

    let viewArray = [{'field':'Summary View'},{'field':'Path View'},{'field':'Pair View'}];
    let viewDrop = dropDown(toolbar, viewArray, viewArray[0].field, 'change-view');

    viewDrop.on('click', (d)=> dropUpdated(d, d3.select('.dropdown.change-view').select('button')));
    
    let filterButton = toolbar.append('button').attr('id', 'view-filter');
    filterButton.attr('class', 'btn btn-outline-secondary').text('Show Filters');
    filterButton.on('click', ()=> toggleFilters(filterButton, main, calculatedScales));
    filterButton.classed('hidden', true);
    ///LENGTH BUTTON CODE

    let scrunchButton = toolbar.append('button').attr('id', 'scrunch');
    scrunchButton.attr('class', 'btn btn-outline-secondary').text('Collapse Attributes');
    scrunchButton.attr('value', false);
    scrunchButton.on('click', ()=> toggleScrunch(scrunchButton, main, calculatedScales));

    let discreteViewButton = toolbar.append('button').attr('id', 'discrete-view');
    discreteViewButton.attr('class', 'btn btn-outline-secondary').text('Switch to Discrete Bars');
    discreteViewButton.attr('value', false);
    
    discreteViewButton.on('click', ()=> {
        let discretePredictedGroups = d3.selectAll('.predicated-attr-groups');
        if(discreteViewButton.text() === 'Switch to Discrete Bars'){
            discreteViewButton.text('Switch to Discrete Dots');
            drawDiscreteAtt(discretePredictedGroups, collapsed, true);
        }else{
            discreteViewButton.text('Switch to Discrete Bars');
            drawDiscreteAtt(discretePredictedGroups, collapsed, false);
        }
    });

    let optionArray = [{'field':'None'}];

    calculatedScales.map(m=> {
        if(m.type === 'discrete'){
            optionArray.push(m);
        }
    });

    let dropOptions = dropDown(toolbar, optionArray, 'Group By', 'show-drop-div-group');
    toolbar.select('#show-drop-div-group').attr('value', 'ungrouped');

    d3.select('.dropdown.show-drop-div-group').select('button').style('display', 'none')

    dropOptions.on('click', (d, i, n)=> {
        if(d.type === 'discrete'){
            let data = getLatestData();
            let stateBins = d.scales.map(m=> {
                return {'field': m.field, 'state': m.scaleName, 'data': [] };
            });
           
            stateBins.map(state=> {
               state.data = data.filter(paths=> {
                    let node = paths.filter(no=> no.leaf === true);
                        return node[0].attributes[state.field].winState === state.state;
                });
            });
           d3.select('#main').selectAll('*').remove();
           drawGroups(stateBins, calculatedScales);
        }else{
            console.error('THIS HAS TO BE DISCRETE');
        }
        toolbar.select('#show-drop-div-group').classed('show', false);
    });

    /////ATTRIBUTE DROP DOWN
    let attributeOptions = calculatedScales.map(m=> m.field).filter(f=> f != "Clade");
    let checkedAttributes = attributeOptions.length > 11 ? attributeOptions.slice(0, 8) : attributeOptions;

    let dropdiv = toolbar.append('div').classed(`dropdown attribute-show`, true);
    dropdiv.style('display', 'inline-block');
    let button = dropdiv.append('button').classed('btn dropbtn dropdown-toggle', true).text('Shown Attributes');
    let dropContent = dropdiv.append('div').attr('id', 'attribute-show').classed('dropdown-content', true);
    let dropUl = dropContent.append('ul');
    
    let attoptions = dropUl.selectAll('li').data(attributeOptions).join('li')
    let checkBox = attoptions.append('input').attr('type', 'checkbox');
    attoptions.append('text').text(d=> ` ${d}`);

    let checkedDefault = attoptions.filter(f=> checkedAttributes.indexOf(f) > -1).select('input');
    checkedDefault.each((d, i, n) => n[i].checked = true);

    button.on('click', async(d, i, n)=> {
        if(dropContent.classed('show')){

            let loader = await clearMain();
            dropContent.classed('show', false);
            await updateMainView(d3.select('.dropdown.change-view').select('button').node().value, chosenCladesGroup[chosenCladesGroup.length - 1].groups);
            loader.style.display = "none";

        }else{
            dropContent.classed('show', true);
        }
    });

    /////ATTRIBUTE DROP DOWN
    let cladeOptions = cladeKeeper[cladeKeeper.length - 1];

    let dropdivClade = toolbar.append('div').classed(`dropdown clade-show`, true);
    dropdivClade.style('display', 'inline-block')
    let buttonClade = dropdivClade.append('button').classed('btn dropbtn dropdown-toggle', true).text('Shown Subtrees');

    let dropContentClade = dropdivClade.append('div').attr('id', 'clade-show').classed('dropdown-content', true);
    let dropUlClade = dropContentClade.append('ul');

    let options = updateCladeDrop(dropUlClade, cladeOptions);

    buttonClade.on('click', (d, i, n)=> {
        if(dropContentClade.classed('show')){

            dropContentClade.classed('show', false);
           
            let test = d3.select('#clade-show').selectAll('li').selectAll('input').filter((f, j, li)=> {
                return li[j].checked === true});

            console.log('test', test, d3.select('.dropdown.change-view').select('button').node().value);
            
            let groups = test.data().map((m=> {
                let names = m.nodes.map(path => path[path.length - 1].node);
                let data = getLatestData().filter(path => names.indexOf(path[path.length - 1].node) > -1);
                
                let group = binGroups(data, m.field, calculatedScalesKeeper[0], 8);
                return {'label': m.field, 'paths': data, 'groupBins': group};
           }));

           let loader = clearMain();
           updateMainView(d3.select('.dropdown.change-view').select('button').node().value, groups);
           loader.style.display = "none";


        }else{
            dropContentClade.classed('show', true);
        }
    });
}
export function updateCladeDrop(dropUl, cladeOptions){

    let options = dropUl.selectAll('li').data(cladeOptions).join('li');
    let checkBox = options.selectAll('input').data(d=> [d]).join('input').attr('type', 'checkbox');
    options.selectAll('text').data(d=> [d]).join('text').text(d=> ` ${d.field}`);
    
    if(cladeOptions.length < 1){
        d3.select('.dropdown.clade-show').select('button').classed('hidden', true);
    }else{
        d3.select('.dropdown.clade-show').select('button').classed('hidden', false);
    }

    return options;
    
    // let checkedDefault = options.filter(f=> checkedAttributes.indexOf(f) > -1).select('input');
}
////COLLAPSES THE NODES DOWN
function toggleScrunch(button, main, calculatedScales){

    let data = getLatestData();
   
    if(button.text() === 'Collapse Attributes'){
        button.text('Expand Attributes');
        main.selectAll('*').remove();
        button.attr('value', true);
        drawPathsAndAttributes(data, main, calculatedScales);
    }else{
        button.text('Collapse Attributes');
        main.selectAll('*').remove();
        button.attr('value', false);
        drawPathsAndAttributes(data, main, calculatedScales);
    }
}