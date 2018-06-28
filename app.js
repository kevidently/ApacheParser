var http = require('http');
var fs = require('fs');
var readline = require('readline');

console.log("Fetching log file...");
http.get("http://dev.inspiringapps.com/Files/IAChallenge/30E02AAA-B947-4D4B-8FB6-9C57C43872A9/Apache.log", function (response) {
    let fileContent = "";
    const filePath = "downloads/downloaded.log";
    const regEx = new RegExp('([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+).*GET\\s*([\\w/]+).*');
    let userActivityMap = {};
    let sequenceTotals = {};
    response.on('data', (chunk) => { fileContent += chunk } )
    response.on('end', function () {
        if ( !fs.existsSync("downloads") ) { fs.mkdirSync("downloads"); }
        fs.writeFile(filePath, fileContent, function () {
            let lineReaderInterface = readline.createInterface({
                input: fs.createReadStream(filePath)
            });
            
            console.log("Analyzing log file...");

            // Iterate file line-by-line, build a map of IP addresses (users) and all the resource paths they ever requested
            lineReaderInterface.on("line", function (line) {
                let result = regEx.exec(line);
                let userIpAddress = result[1];
                let resourcePath = result[2];
                if ( !userActivityMap[userIpAddress] ) {
                    userActivityMap[userIpAddress] = { rawPathList: [] };
                }
                userActivityMap[userIpAddress].rawPathList.push(resourcePath);
            });

            // Done iterating lines in file, now iterate through raw lists of path requests for each user
            lineReaderInterface.on("close", function () {
                for (let i in userActivityMap ) {
                    let tmpRawPathList = userActivityMap[i].rawPathList;
                    // We are at the list of paths for this user, now build sequences of 3
                    for ( let j=0; j<tmpRawPathList.length; j++ ) {
                        let nextIndex = j+1;
                        let thirdIndex = j+2;                        
                        // Ensure we are not creating a sequence that will go off the end of the array
                        if ( tmpRawPathList[nextIndex] && tmpRawPathList[thirdIndex] ) {
                            // Store the path sequence and increment the count for it
                            let pathSequence = tmpRawPathList[j]+","+tmpRawPathList[nextIndex]+","+tmpRawPathList[thirdIndex];
                            if ( !sequenceTotals[pathSequence] ) {
                                sequenceTotals[pathSequence] = 0;
                            }
                            sequenceTotals[pathSequence]++
                        }
                        else {
                            // No more 3-page sequences are possible.
                            break;
                        }
                    }
                }

                // Sort sequence totals based on counts
                let sortableTotals = [];
                for ( let sequence in sequenceTotals ) {
                    sortableTotals.push(
                        { "sequence": sequence, "count": sequenceTotals[sequence] }
                    )
                }

                sortableTotals.sort( (a, b) => b.count - a.count );

                // Output results
                console.log("\nCOUNT\t3-PAGE SEQUENCE");
                sortableTotals.forEach( (sequenceTotal) => console.log(sequenceTotal.count+"\t"+sequenceTotal.sequence) );
            })
        });
    })     
})
.on('error', function(e) {
    console.log("Error during download of log file: " + e.message);
});