import * as d3 from "d3";

export function dropDown(div, optionArray, dropText, dropId){
    let dropdiv = div.append('div').classed(`dropdown ${dropId}`, true);
    dropdiv.style('display', 'inline-block')
    let button = dropdiv.append('button').classed('btn dropbtn btn-secondary dropdown-toggle', true).text(dropText);
    let dropContent = dropdiv.append('div').attr('id', dropId).classed('dropdown-content', true);
    dropContent.append('a').text('text').attr('font-size', 11);
    let options = dropContent.selectAll('a').data(optionArray).join('a').text(d=> d.field);

    options.on('click', (d, i, n)=> dropContent.classed('show', false));

    button.on('click', (d, i, n)=> {
        if(dropContent.classed('show')){
            dropContent.classed('show', false);
        }else{
            dropContent.classed('show', true);
        }
    });
    options.raise()
    return options;
}

export function updateDropdown(optionArray, dropId){
    d3.select(`#${dropId}`).selectAll('a').data(optionArray).join('a').text(d=> d.field);
}