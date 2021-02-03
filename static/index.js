var option
var stackedBar = {}
var myChart

function loadChart() {
    let ctx = document.getElementById('myChart').getContext('2d');
    if(myChart){
        myChart = null
    }
    myChart = new Chart(ctx, {
        type: 'bar',
        data: stackedBar,
        options: {
          scales: {
            xAxes: [{ stacked: true }],
            yAxes: [{ stacked: true }]
          }
        }
    });
}

function addData(chart, label, data) {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data);
    });
    chart.update();
}

function removeData(chart) {
    chart.data.labels.pop();
    chart.data.datasets.forEach((dataset) => {
        dataset.data.pop();
    });
    chart.update();
    console.log(chart)
}

$(function () {

    $("#options :input").change(function() {
        option = this.id;
        console.log(option)
        $("#search-data").prop('disabled', false);
    });

    $('#search-data').click(async function () {
        let from = new Date($("#from-option").val())
        let to = new Date($("#to-input-option").val())

        if(from.getTime() < to.getTime()){
            removeData(myChart)
            removeData(myChart)
            removeData(myChart)
            removeData(myChart)
            removeData(myChart)
            removeData(myChart)
            removeData(myChart)
            await prepareData(option, $("#from-option").val().replace('-','').replace('-',''), $("#to-input-option").val().replace('-','').replace('-',''))
        }
        else {
            alert('Enter a valid date range')
        }
    })

    $('#search-bar').on('input', function () {
        let search = this.value
        $.ajax('/poi', {
            type: 'POST',
            data: JSON.stringify({ query: search }),
            contentType: "application/json; charset=utf-8",
            success: function (data, status, xhr) {
                var table = document.getElementById("search-results");
                table.innerHTML = ""
                data.forEach((element)=>{
                    var row = table.insertRow(0);
                    row.innerHTML = element.item.name;
                })
            },
            error: function (jqXhr, textStatus, errorMessage) {

            }
        });
    })

    function prepareData(option, from, to) {
        console.log(from, to)
        if(option == 'events'){
            $.ajax('/events/'+from+'/'+to, {
                type: 'GET',
                success: function (data, status, xhr) {
                    if(data.length > 0){
                        let labels = []
                        let event_data = []
                        let dataset = []
                        let morning_data = []
                        let afternoon_data = []
                        let evening_data = []
                        let night_data = []
                        let night_events = 0
                        let morning_events = 0
                        let afternoon_events = 0
                        let evening_events = 0
                        for(let i = 0; i < data.length; i++){
                            labels.push(data[i].date.replace('T05:00:00.000Z', ''))
                            if(data.indexOf(data[i])+1 != data.length && data[i].date == data[i+1].date){
                                if(data[i].hour < 6){
                                    night_events += data[i].events
                                }
                                else if(data[i].hour < 12){
                                    morning_events += data[i].events
                                }
                                else if(data[i].hour < 18){
                                    afternoon_events += data[i].events
                                }
                                else{
                                    evening_events += data[i].events
                                }
                            }
                            else {
                                if(data[i].hour < 6){
                                    night_events += data[i].events
                                }
                                else if(data[i].hour < 12){
                                    morning_events += data[i].events
                                }
                                else if(data[i].hour < 18){
                                    afternoon_events += data[i].events
                                }
                                else{
                                    evening_events += data[i].events
                                }
                                night_data.push(night_events)
                                morning_data.push(morning_events)
                                afternoon_data.push(afternoon_events)
                                evening_data.push(evening_events)
                                night_events = 0
                                morning_events = 0
                                afternoon_events = 0
                                evening_events = 0
                            }
                        }
                        labels = [...new Set(labels)];
                        stackedBar = {
                            labels : labels,
                            datasets: [
                                {
                                    label: 'night (12am - 6am)',
                                    data: night_data,
                                    backgroundColor: 'rgb(75, 192, 192)' // red
                                },
                                {
                                    label: 'morning (6am - 12pm)',
                                    data: morning_data,
                                    backgroundColor: 'rgb(255, 205, 86)' // green
                                },
                                {
                                    label: 'afternoon (12pm - 6pm)',
                                    data: afternoon_data,
                                    backgroundColor: 'rgb(255, 99, 132)' // yellow
                                },
                                {
                                    label: 'evening (6pm - 12am)' ,
                                    data: evening_data,
                                    backgroundColor: 'rgb(54, 162, 235)'
                                }
                            ]
                        }
                        console.log(stackedBar)
                        loadChart()
                    }
                    else{
                        alert('no data present')
                    }
                },
                error: function (jqXhr, textStatus, errorMessage) {
                        alert('issue with system') 
                }
            });
        }
        else{
            console.log(from, to)
            $.ajax('/stats/'+from+'/'+to, {
                type: 'GET',
                success: function (data, status, xhr) {
                    console.log(data)
                    if(data.length > 0){
                        let labels = []
                        let impressions = []
                        let clicks = []
                        let revenue = []
                        for(let i = 0; i < data.length; i++){
                            labels.push(data[i].date.replace('T05:00:00.000Z', ''))
                            impressions.push(data[i].impressions)
                            clicks.push(data[i].clicks)
                            revenue.push(data[i].revenue)
                        }
                        labels = [...new Set(labels)];
                        stackedBar = {}
                        stackedBar = {
                            labels : labels,
                            datasets: [
                                {
                                    label: 'impressions',
                                    data: impressions,
                                    backgroundColor: 'rgb(54, 162, 235)'
                                },
                                {
                                    label: 'clicks',
                                    data: clicks,
                                    backgroundColor: 'rgb(255, 205, 86)'
                                },
                                {
                                    label: 'revenue',
                                    data: revenue,
                                    backgroundColor: 'rgb(255, 99, 132)'
                                }
                            ]
                        }
                        loadChart()
                    }
                    else{
                        alert('no data present')
                    }
                },
                error: function (jqXhr, textStatus, errorMessage) {
                        alert('issue with system') 
                }
            });
        }
    }
})