//Return the user hash

async function getToken(userName,password) {
    /** Parameters **/
    let region = "E";
    let requestOptions = { method: "POST", redirect: "follow" };
    let token = "";
    let ver = "3.10.2"
    //console.log(gameVersion);
    //make a random guid
    let guid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        let r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

    /** First we need the token of the user  **/
    userName = encodeURIComponent(userName);
    password = encodeURIComponent(password);
    // url to get token value
    var result = await fetch(`https://m-xmjen.hkpctimes.com/api/index.php?phone_brand=oneplus&device_no=${guid}&user_name=${userName}&password=${password}&action=user.login&lang=en-US&promote=17&game_id=1704`, requestOptions);
    if (result.status != 200) {
        return;
    }
    console.log("----------------result -------------");
    console.log(result);

    //response body
    var body = await result.json();
    if (!body["status"]) {
        return;
    }

    //token value
    token = body["token"];



    var urlrequestOptions = {
        method: "GET",
        redirect: "follow",
    };
    


    /** Here we will get the tokenAccess thanks to the previous token **/
    var urlresult = await fetch(
    `https://m-xmjen.hkpctimes.com/api/index.php?phone_brand=oneplus&device_no=${guid}&token=${token}&action=game.info&lang=en-US&promote=17&id=1704`,
    urlrequestOptions
    );
    if (urlresult.status != 200) {
        return;
    }
    var urlrequestbody = await urlresult.json();
    //console.log(urlrequestbody);
    if (!urlrequestbody["status"]) {
        return;
    }

    //we get the down url which contains the accessToken
    var urlString  = urlrequestbody["down_url"];
    var url = new URL(urlString);
    var accessToken = url.searchParams.get("accessToken");
    console.log("----------------accessToken--------------");


    //now that we have the accessToken we can get the hash of the accounts
    if(accessToken){
        var urlrequestOptions = {
            method: "GET",
            redirect: "follow",
        };
        //&ver=${ver}

        var url = await fetch(`https://xztwgame.hkpctimes.com/web/centerLogin.php?language=en&accessToken=${accessToken}&loginType=gcathkIos1&gcatId=1704&timeZone=-5`);
        // var url = await fetch(`https://xzengame.hkpctimes.com/web/centerLogin.php?language=en&accessToken=${accessToken}&loginType=gcatenCrazyH5&gcatId=1704&timeZone=-5`);
        var body = await url.json();
        console.log("result");
        console.log(body);
        serversListE = body['ul'];
        var h = body['h'];

        var urlw = await fetch(`https://xzengame.hkpctimes.com/web/centerLogin.php?language=fan&accessToken=${accessToken}&gcatId=1704&loginType=gcatenAnd&ver=2.0.2&time=undefined&qTime=undefined`)
        var bodyw = await urlw.json();

        console.log("result2");
        console.log(bodyw);        
        serversListW = bodyw['ul'];

    }  
    console.log("---------------h-------------------");
    console.log(h);
    //we can return the hash
    return h;
};