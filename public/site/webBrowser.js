async function webBrowser(user,passwordAuth,zone) {
  let userName = user;
  let password = passwordAuth;
  let region = zone ?? "E";
  console.log(userName);
  console.log(password);

  var requestOptions = {
    method: "POST",
    redirect: "follow",
  };

  let accessToken = "";
  let guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  userName = encodeURIComponent(userName);
  password = encodeURIComponent(password);
  var result = await fetch(
    `https://m-xmjen.hkpctimes.com/api/index.php?phone_brand=oneplus&device_no=${guid}&user_name=${userName}&password=${password}&action=user.login&lang=en-US&promote=17&game_id=1704`,
    requestOptions
  );
  console.log(result.status)
  if (result.status != 200) {
    return;
  }
  console.log(2);

  var body = await result.json();
  console.log(body)
  if (!body["status"]) {
    return;
  }
  console.log("BODY");
  console.log(body);
  accessToken = body["token"];
  console.log(3);

  var urlrequestOptions = {
    method: "GET",
    redirect: "follow",
  };
  console.log(4);

  var urlresult = await fetch(
    `https://m-xmjen.hkpctimes.com/api/index.php?phone_brand=oneplus&device_no=${guid}&token=${accessToken}&action=game.info&lang=en-US&promote=17&id=1704`,
    urlrequestOptions
  );
  if (urlresult.status != 200) {
    return;
  }
  console.log(5);

  var urlresultServer = await fetch(
    `https://m-xmjen.hkpctimes.com/api/index.php?phone_brand=oneplus&device_no=${guid}&token=${accessToken}&action=server.tap&lang=en-US&promote=17&id=1704`,
    urlrequestOptions
  );
  if (urlresultServer.status != 200) {
    return;
  }
  console.log(5);

  var urlrequestbody = await urlresult.json();
  var urlrequestbodyServer = await urlresultServer.json();
  console.log("-----urlrequestbody-----");
  console.log(urlrequestbody);
  console.log("-----urlrequestbodyServer-----");
  console.log(urlrequestbodyServer);

  https://xzengame.hkpctimes.com/web/andIndex.php?accessToken=de864db067009ac2d06150158285d395&timeZone=+5
  if (!urlrequestbody["status"]) {
    return;
  }
  let gameurl = urlrequestbody["down_url"];
  const params = new URL(gameurl).searchParams;
  const accessTokenFinal = params.get("accessToken");
  gameurl = `https://xztwcdn.hkpctimes.com/staticOne/global.html?locate=en_us&pf=gcathkh5&gv=release&accessToken=${accessTokenFinal}`
  // gameurl = `https://xzencdn.hkpctimes.com/staticOne/global.html?locate=en_us&accessToken=${accessTokenFinal}&timeZone=+5`
  if (region == "E"){
    gameurl = gameurl + "&timeZone=+5";
  } else if (region =="W") {
    gameurl = gameurl + "&timeZone=-5";
  }
  console.log(gameurl)
  window.open(gameurl, "_blank", "width=500,height=960");
  // location.href = gameurl;
}