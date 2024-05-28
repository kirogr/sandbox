var wmks = null; // global env 

function createWMKS() {
    var options = {
        rescale: true,
        changeResolution: false,
        position: 0
    }

    wmks = WMKS.createWMKS("wmksContainer", options);
    console.log("WMKS created successfully");
}

function connect() {
    if(!wmks) {
        alert("Please create WMKS first!");
        return;
    }

    var host = "192.168.1.195";
    var port = "443";
    var ticket = "903a273144894a69";
    var url = "wss://" + host + ":" + port + "/ticket/" + ticket ;
    try {
        wmks.connect(url);
        log('connect succeeded');
    } catch (err) {
        log('connect failed: ' + err);
    }
}

$(document).ready(function(){
    createWMKS();
    connect();
});