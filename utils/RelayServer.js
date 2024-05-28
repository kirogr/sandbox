const net = require('net');

module.exports.getNumClients = () => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const identifier = process.env.RELAY_SERVER_TOKEN_IDENTIFIER;
        let numClients;

        client.connect(54000, '127.0.0.1', () => {
            console.log('Connected to Python server');
            client.write(identifier);
        });

        client.on('data', data => {        
            if (data.toString() === "SUCCESS") {
                client.write("GET_NUM_CLIENTS");
            } else {
                numClients = data.toString();
                client.end();
            }
        });

        client.on('close', () => {
            console.log('Connection to server closed');
            resolve(numClients);
        });

        // Handle errors
        client.on('error', error => {
            console.error('Error:', error);
            reject(error);
        });
    });
};

module.exports.listAllClients = () => {
    const client = new net.Socket();
    const identifier = process.env.RELAY_SERVER_TOKEN_IDENTIFIER;

    client.connect(54000, '127.0.0.1', () => {
        console.log('Connected to Python server');
        client.write(identifier);
    });

    client.on('data', data => {        
        if (data.toString() === "WELCOME") {
            client.write("LIST_ALL_CLIENTS");
        } else {
            console.log("List of clients connected:\n", data.toString());
            client.end();
        }
    });

    // Handle connection closed
    client.on('close', () => {
        console.log('Connection to server closed');
    });

    client.on('error', error => {
        console.error('Error:', error);
    });
};

module.exports.terminateAgent = (identifierToken) => {
    const client = new net.Socket();
    const identifier = process.env.RELAY_SERVER_TOKEN_IDENTIFIER;

    client.connect(54000, '127.0.0.1', () => {
        client.write(identifier);
    });

    client.on('data', data => {        
        if (data.toString() === "WELCOME") {
            client.write("TERMINATE_AGENT");
            client.write(identifierToken);
        } else {
            return data.toString();
            client.end();
        }
    });

    client.on('close', () => {
        console.log('Connection to server closed');
    });

    client.on('error', error => {
        console.error('Error:', error);
    });
};

