// Written by Ibrahim Aderinto

const mysql = require('mysql');
const assert = require('assert');
const playwright = require('playwright-aws-lambda');

const connection = mysql.createConnection({
    host : "distrosheet-gate.casod9ogtrtm.us-east-1.rds.amazonaws.com",
    user : "admin",
    password : "CnOvikjvvlmGmEqNQLxp",
    database: "Gate"
    });


exports.handler = async (event) => {
    
    var headers = event.headers;
    var appKey = headers['app_key'];
    var appSecret = headers['app_secret'];
    var sqlFetchQuery = `SELECT * FROM AppKeys WHERE AppKey='${appKey}'`;

    try {
        connection.connect(function(err) {
            if (err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify('An error occured!'),
                };
            };
            
            var data = connection.query(sqlFetchQuery, function (err, result, fields) {
                if (err){
                    return {
                        statusCode: 500,
                        body: JSON.stringify('An error occured'),
                    };
                }
                console.log(result[0])
                return result[0]
            });

            // console.log(data);
            assert (appSecret==data['AppSecret'] && (data['Limit']>0 || data['Email']=='master'));
        });
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify('Limit exceeded or incorrect app keys'),
        };
    }
    
        
    var params = event.rawQueryString;
    var query = '';
    var limit = '';
    
    try{
        params = params.split('&');
        for (let i=0; i<params.length; i++){
            let item = params[i].split('=');
            if (item[0]=='q'){
                query = item[1];
            }
            else if (item[0]=='limit'){
                limit = parseInt(item[1]);
            }
        }
        assert(query!='' && limit!='', "Parameters parsing failed");
    }
    catch (error){
        return {
            statusCode: 400,
            body: JSON.stringify('Incorrect Parameters!'),
        };
    };
    
    let browser = await playwright.launchChromium({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`https://www.quora.com/search?q=${query}`);
    // /html/body/div[2]/div/div[2]/div/div[3]/div/div/div[2]/div/div/div[2]/div[97]
    var blocks = await page.locator('xpath=//body/div[2]/div/div[2]/div/div[3]/div/div/div[2]/div/div/div[2]/div >> //span/a');
    var blockCount = await blocks.count();
    
    let x = 0;
    while (true){
        // console.log(blocks.length);  // this returns undefined
        await page.mouse.wheel(0, 15000);
        // await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        blocks = await page.locator('xpath=//body/div[2]/div/div[2]/div[1]/div[3]/div/div/div[2]/div/div/div[2]/div >> //span/a');
        blockCount = await blocks.count();
        if (parseInt(blockCount) >= limit){
            break;
        }
        
        x += 1;
        if (x==50){
            break;
        }
    }
    
    var links = [];
    for (var index= 0; index < blockCount ; index++) {
        if (index==limit){
            break;
        }
        const element = await blocks.nth(index);
        const link = await element.getAttribute('href');
        links.push(link);
    }
    
    const response = {
        statusCode: 200,
        body: JSON.stringify(links),
    };
    
    return response;
    
};
