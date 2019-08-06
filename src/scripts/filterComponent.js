import '../styles/index.scss';
import {formatAttributeData, calculateScales} from './dataFormat';
import {renderAttributes,  drawContAtt, drawDiscreteAtt, renderPaths, drawPathsAndAttributes, sizeAndMove} from './renderPathView';
import * as d3 from "d3";
import {dataMaster} from './index';
import { updateMainView } from './viewControl';

export let filterMaster = [];

export function removeFilter(filterId){

    let newFilterMaster = filterMaster.filter(f=> f.filterId != filterId);
    filterMaster = newFilterMaster;
}

export function addFilter(filterType, attType, filterId, filFunction, oldData, newData, extra){
    let filterOb = {'filterType': filterType, 'attributeType': attType, 'filterId': filterId, 'filterFunction':filFunction, 'before-data': oldData, 'data': newData}
    if(extra != null){
        extra.forEach(ex=> {
            filterOb[ex[0]] = ex[1];
        });
    }
    filterMaster.push(filterOb);
    return filterOb;
}


///NEED TO BREAK THESE OUT INTO SEPARATE FILTERS
export function toggleFilters(filterButton, normedPaths, main, moveMetric, scales){
    let filterDiv = d3.select('#filter-tab');

    if(filterDiv.classed('hidden')){
        filterButton.text('Hide Filters');
        filterDiv.classed('hidden', false);
        main.style('padding-top', '200px');

        renderAttToggles(filterDiv, normedPaths, main, scales, 'edgeLength');
        stateFilter(filterDiv, filterButton, normedPaths, main, moveMetric, scales);
        queryFilter(filterDiv, filterButton, normedPaths, main, moveMetric, scales);

    }else{
        filterButton.text('Show Filters');
        filterDiv.selectAll('*').remove();
        filterDiv.classed('hidden', true);
        main.style('padding-top', '0px');
    }
}

function stateFilter(filterDiv, filterButton, normedPaths, main, moveMetric, scales){
    let keys = ['Select a Trait'].concat(Object.keys(normedPaths[0][0].attributes));
        let selectWrapper = filterDiv.append('div').classed('filter-wrap', true);
        selectWrapper.style('width', '200px');
        selectWrapper.append('h6').text('State Transition:');
        let attButton = stateChange(selectWrapper, keys, 'attr-select', '');

        let attProps = selectWrapper.append('div').classed('attribute-properties', true);

        attButton.on("change", function(d) {
            var selectedOption = d3.select(this).property("value");
            let options = scales.filter(f=> f.field === selectedOption)[0];
            attProps.selectAll('*').remove();

            if(options.type === "discrete"){
                let optionArray = ['Any'];
                let optKeys = options.scales.map(s=> s.scaleName);
                optionArray = optionArray.concat(optKeys);
                let button1 = stateChange(attProps, optionArray, 'predicted-state', 'From');
                let button2 = stateChange(attProps, optionArray, 'observed-state', 'To');
                let submit = attProps.append('button').classed('btn btn-outline-success', true);
                submit.text('Filter');

                submit.on('click', ()=> {
                    let fromState = button1.node().classList[0];
                    let toState = button2.node().classList[0];

                      ////GOING TO ADD FILTERING HERE//// NEED TO BREAK INTO ITS OWN THING/////
                      
                    let lastFilter = filterMaster.filter(f=> f['filterType'] === 'data-filter');
              
                    let data = lastFilter.length > 0 ? lastFilter[lastFilter.length - 1].data : dataMaster[0];
              
                    let test = discreteFilter(data, selectedOption, fromState, toState);

                    let filId = 'd-'+filterMaster.filter(f=> f.attributeType === 'discrete').length;
                    let filterOb = addFilter('data-filter', 'discrete', filId, discreteFilter, [...data], [...test], ['state', [fromState, toState]]);

                    ////DRAW THE PATHS
                    drawPathsAndAttributes(test, main, scales, moveMetric);

                    ////Class Tree Links////
                    let treeLinks  = d3.select('#sidebar').selectAll('.link');
                    let treeNode  = d3.select('#sidebar').selectAll('.node');

                    let nodeList = test.flatMap(path=> path.map(node => node.node));

                    d3.selectAll('.link-not-there').classed('link-not-there', false);
                    d3.selectAll('.node-not-there').classed('node-not-there', false);

                    let missingLinks = treeLinks.filter(f=> nodeList.indexOf(f.data.node) === -1);
                    missingLinks.classed('link-not-there', true);

                    let missingNodes = treeNode.filter(f=> nodeList.indexOf(f.data.node) === -1);
                    missingNodes.classed('node-not-there', true);

                    ///END NODE DIMMING///////

                    /////ADD THE FILTER TO THE TOOLBAR/////
                    let filterToolbar = d3.select("#toolbar");

                    let button = filterToolbar.append('button').classed('btn btn-info', true);
                    let span = button.append('span').classed('badge badge-light', true);
                    span.text(test.length);
                    button.append('h6').text(fromState);
                    button.append('i').classed('fas fa-arrow-right', true);
                    button.append('h6').text(toState + '  ');
                   
                    let xSpan = button.append('i').classed('close fas fa-times', true);
                    xSpan.on('click', ()=> {
                        removeFilter(filId);
                        updateMainView(data, scales, 'edgeLength')
                        d3.selectAll('.link-not-there').classed('link-not-there', false);
                        d3.selectAll('.node-not-there').classed('node-not-there', false);
                        button.remove();
                    });

                    ////HIDE THE FILTER BAR/////
                    filterButton.text('Show Filters');
                    filterDiv.selectAll('*').remove();
                    filterDiv.classed('hidden', true);
                    main.style('padding-top', '0px');
                });
            }else{
                
                let yScale = d3.scaleLinear().domain([options.min, options.max]).range([60, 0]);
               
                let continRanges = attProps.append('svg');
                continRanges.attr('width', 200).attr('height', 100);
                let data = [{'label':'Ancestors', 'type': 'predicted'}, {'label':'Leaves', 'type': 'observed'}];
                let ranges = continRanges.selectAll('.range').data(data).join('g').classed('range', true);

                ranges.attr('transform', (d, i)=> 'translate('+((i*125)+',20)'));

                let brushBars = ranges.append('g');
                brushBars.attr('transform', 'translate(10, 10)');

                let labels = ranges.append('text').text((d)=> d.label+ ': ');
                labels.attr('x', 0).attr('y', 0);
                let wrapperRect = brushBars.append('rect').attr('width', 20).attr('height', 50);
                wrapperRect.attr('x', 10);

                brushBars.append("g")
                .attr("class", "axis axis--y")
                .attr("transform", "translate(10,0)")
                .call(d3.axisLeft(yScale).ticks(3));
                
                let brushMoved = function(){
                    var s = d3.event.selection;
                    if (s == null) {
                      handle.attr("display", "none");
                    
                    } else {
                      var sx = s.map(yScale.invert);
                    }
                };
                let xBrush = d3.brushY().extent([[10,0], [30, 60]]).on("end", brushMoved);
                let brushGroup = brushBars.append('g').call(xBrush);
                brushGroup.call(xBrush.move, [0, 60]);

                let submit = attProps.append('button').classed('btn btn-outline-success', true);
                submit.text('Filter');

                submit.on('click', ()=> {

                    let selections = brushGroup._groups[0].map(m=> m.__brush.selection.map(s=> s[1]));
                    let predictedFilter = selections[0].map(yScale.invert).sort();
                    let observedFilter = selections[1].map(yScale.invert).sort();
                    let lastFilter = filterMaster.filter(f=> f['filterType'] === 'data-filter');

                    let data = lastFilter.length > 0 ? lastFilter[lastFilter.length - 1].data : dataMaster[0];

                    let test = continuousFilter(data, selectedOption, predictedFilter, observedFilter);

                    let filId = 'c-'+filterMaster.filter(f=> f.attributeType === 'continuous').length;
                    let filterOb = addFilter('data-filter', 'continuous', filId, continuousFilter, [...data], [...test], [['ranges', [predictedFilter, observedFilter]], 'attribute', selectedOption]);

                    console.log('fm', filterMaster)

                    ////DRAW THE PATHS
                   // drawPathsAndAttributes(test, main, scales, moveMetric);
                   updateMainView(test, scales, moveMetric)

                    ///DIMMING THE FILTERED OUT NODES//////

                    ////Class Tree Links////
                    let treeLinks  = d3.select('#sidebar').selectAll('.link');
                    let treeNode  = d3.select('#sidebar').selectAll('.node');

                    let nodeList = test.flatMap(path=> path.map(node => node.node));

                    d3.selectAll('.link-not-there').classed('link-not-there', false);
                    d3.selectAll('.node-not-there').classed('node-not-there', false);

                    let missingLinks = treeLinks.filter(f=> nodeList.indexOf(f.data.node) === -1);
                    missingLinks.classed('link-not-there', true);

                    let missingNodes = treeNode.filter(f=> nodeList.indexOf(f.data.node) === -1);
                    missingNodes.classed('node-not-there', true);

                    ///END NODE DIMMING///////

                    /////ADD THE FILTER TO THE TOOLBAR/////
                    let filterToolbar = d3.select("#toolbar");

                    let formater = d3.format(".2s");

                    let button = filterToolbar.append('button').classed('btn btn-info', true);
                    d3.select(button).datum(filterOb);
                    let span = button.append('span').classed('badge badge-light', true);
                    span.text(test.length);
                    let label = button.append('h6').text(selectedOption + "  Predicted: "+ formater(predictedFilter[0]) + "-" + formater(predictedFilter[1]) + " Observed: " + formater(observedFilter[0]) + "-" + formater(observedFilter[1]));
                    let xSpan = label.append('i').classed('close fas fa-times', true);
                    xSpan.on('click', ()=> {
                       
                        let filterLine = filterMaster.filter(f=> f.filterType === 'data-filter').filter(f=> filterOb.attribute != f.attribute);
                      
                        let thisData = dataMaster[0];
                        filterLine.forEach(fil=> {
                            console.log(fil);
                        });

                        drawPathsAndAttributes(normedPaths, main, scales, moveMetric);
                        ////removeing the dimmed class to the unfilterd paths////
                        d3.selectAll('.link-not-there').classed('link-not-there', false);
                        d3.selectAll('.node-not-there').classed('node-not-there', false);
                        button.remove();
                    });

                    ////HIDE THE FILTER BAR/////
                    filterButton.text('Show Filters');
                    filterDiv.selectAll('*').remove();
                    filterDiv.classed('hidden', true);
                    main.style('padding-top', '0px');
                });
            }
         });
}

function continuousFilter(data, selectedOption, predicted, observed){

    return data.filter(path=> {
        let filterArray = path.map(node=> {
            let numb = node.attributes[selectedOption].realVal;
            if(node.leaf == true){
                return numb > observed[0] && numb < observed[1];
            }else{
                return numb > predicted[0] && numb < predicted[1];
            }
        });
        return filterArray.indexOf(false) === -1;
    });
    
}

function discreteFilter(data, selectedOption, fromState, toState){

    return data.filter(path=> {
        let filterPred = path.filter(f=> f.leaf != true).map(node=> {
            let states = node.attributes[selectedOption].states;
            if(fromState === 'Any'){
                return true;
            }else{
                return states.filter(st=> st.state === fromState)[0].realVal > 0.75;
            }
        });
        let filterObs = path.filter(f=> f.leaf === true).map(node=> {
          let win = node.attributes[selectedOption].winState;
          if(toState === 'Any'){
              return true;
          }else{
              return win === toState;
          }
        });
        return filterPred.indexOf(true) > -1 && filterObs.indexOf(true) > -1;
    });

}

function queryFilter(filterDiv, filterButton, normedPaths, main, moveMetric, scales){

    let searchDiv = filterDiv.append('div').classed('search-bar-div', true);
        searchDiv.append('h6').text('Query Filter:');
        let form = searchDiv.append('form').classed('form-inline', true);
        let input = form.append('input').classed('form-control mr-sm-2', true);
        input.attr('type', 'search').attr('placeholder', 'Search by Species').attr('aria-label', 'Search');
        let searchButton = form.append('button').classed('btn btn-outline-success my-2 my-sm-0', true).attr('type', 'button').append('i').classed("fas fa-search", true);
        searchButton.on('click', ()=> {

            let queryArray = input.node().value.split(' ').map(m=> m.toLowerCase());

            let test = normedPaths.filter(path=> {
                let species = path.filter(node=> node.leaf === true)[0].label;
                return queryArray.indexOf(species) > -1;
            });

             ////DRAW THE PATHS
            drawPathsAndAttributes(test, main, scales, moveMetric);
            let filterToolbar = d3.select("#toolbar");
            let button = filterToolbar.append('button').classed('btn btn-info', true);
            let span = button.append('span').classed('badge badge-light', true);
            span.text(test.length);
            button.append('h6').text('Query Filter');
            let xSpan = button.append('i').classed('close fas fa-times', true);
            xSpan.on('click', ()=> {
                drawPathsAndAttributes(normedPaths, main, scales, moveMetric);
                button.remove();
            });
            d3.select('#main-path-view').style('height', ()=>{
                return ((test.length * 60) + (Object.keys(test[0][0].attributes).length * 100) + 'px');
            });

            ////HIDE THE FILTER BAR/////
            filterButton.text('Show Filters');
            filterDiv.selectAll('*').remove();
            filterDiv.classed('hidden', true);
            main.style('padding-top', '0px');
        });

}
function renderAttToggles(filterDiv, normedPaths, main, scales, moveMetric){

    ////NEED TO GET RID OF TOGGLE SVG
    let keys = Object.keys(normedPaths[0][0].attributes);
    let presentFilters = filterMaster.filter(f=> f.type === 'hide-attribute');
    let noShow = presentFilters.length > 0 ? presentFilters.map(m=> m.attribute) : [];

    let wrapper = filterDiv.append('div').classed('filter-wrap', true);
    wrapper.style('width', '150px');
   
    let svg = wrapper.append('svg').classed('attr-toggle-svg', true);

   let title = svg.append('text').text('Attributes: ');
    title.attr('x', 20).attr('y', 10);
    
    let labelWrap = svg.append('g').attr('transform', 'translate(20, 25)');
    let labelGroups = labelWrap.selectAll('g').data(keys).join('g'); 
    
    labelGroups.attr('transform', (d, i)=> 'translate(0,'+(i* 25)+')');

    let toggle = labelGroups.append('circle').attr('cx', 0).attr('cy', 0);
    toggle.classed('toggle', true);
    let shownToggs = toggle.filter(t=> noShow.indexOf(t) === -1);
   
    shownToggs.classed('shown', true);
    shownToggs.style('fill', (d, i)=>{
        return scales.filter(f=> f.field === d)[0].catColor;
    });

    toggle.on('click', function(d, i){
        let togg = d3.select(this);
        toggleCircle(togg, scales);
   
        filterMaster.push({'type':'hide-attribute', 'attribute':d, 'before-data': [...normedPaths]});

        let newKeys = d3.selectAll('.shown');
        let hideKeys = scales.filter(sc=> newKeys.data().indexOf(sc.field) === -1);
        let newFilMaster = filterMaster.filter(f=> f.type != 'hide-attribute');
        hideKeys.forEach(key=> {
            newFilMaster.push({'type':'hide-attribute', 'attribute':key.field, 'before-data': [...normedPaths]});
        });
        filterMaster = newFilMaster;

        console.log('filtermaster in render att toggles', filterMaster)


        ////DRAW THE PATHS
        drawPathsAndAttributes(normedPaths, main, scales, moveMetric);
    });
    let labelText = labelGroups.append('text').text(d=> d).style('font-size', 10);
    labelText.attr('transform', 'translate(10, 4)');  
    
}
function stateChange(selectorDiv, keys, selectId, label){

    let dropDownWrapper = selectorDiv.append('div').classed('selector', true);
    let header = dropDownWrapper.append('h6').text(label);
    	// create the drop down menu of cities
	let selectOp = dropDownWrapper
    .append("select")
    .attr("id", selectId).attr('class', 'Any');
    
    let options = selectOp.selectAll("option")
    .data(keys).join("option");

    options.text(d=> d).attr("value", d=> d);

    d3.select("#"+selectId).on("change", function(d) {
       var selectedOption = d3.select(this).property("value");
       d3.select(this).attr('class', selectedOption);
    });

    return d3.select('#'+ selectId);
}
function toggleCircle(circle, scales){
    if(circle.classed('shown')){
        circle.classed('shown', false);
        circle.style('fill', '#fff');
    }else{
        circle.classed('shown', true);
        circle.style('fill', (d, i)=> scales.filter(f=> f.field === d)[0].catColor);
    }
}