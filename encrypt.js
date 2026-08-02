function encrypt(st){
    var text = st;
    var key = 'qjf87KbsvQoh7Pfb'; 
    key = CryptoJS.enc.Utf8.parse(key);
    return JSON.stringify(CryptoJS.AES.encrypt(text, key , {mode: CryptoJS.mode.ECB,padding: CryptoJS.pad.Pkcs7}).toString());
}

function prepareRequest(jsonobject) {
    const toEncrypt = JSON.stringify(jsonobject, (key, value) => {
      // Si la valeur est null, renvoyer undefined pour l'ignorer
      return value === null ? undefined : value;
    });
    var crypto = encrypt(toEncrypt);
    // console.log("preparePayload");
    // console.log(crypto);
    crypto = crypto.replace(/\"/g, '')
    // console.log(crypto);
    return preparePayload(JSON.stringify({ crypto }));
}

function preparePayload(encrypteaddata) {
    const uencoded = uencode(strencode(encrypteaddata));
    const cencoded = cencode(uencoded);
    return cencoded;
}

function strencode(e) {
    const encoder = new TextEncoder();
    return encoder.encode(e);
}

function cencode(input) {
    const header = new Uint8Array(4);
    header[0] = 4;
    header[1] = (input.length >> 16) & 0xff;
    header[2] = (input.length >> 8) & 0xff;
    header[3] = input.length & 0xff;
    const result = new Uint8Array(header.length + input.length);
    result.set(header);
    result.set(input, header.length);
    return result;
}

function uencode(input) {
    const result = new Uint8Array(input.length + 1);
    result.set(input);
    return result;
}



function onMessageRecieve(message) {

    var buffer = event.data;
    var uint8View = new Uint8Array(buffer);
    //console.log("uint8View[0]");
    //console.log(uint8View[0]);
    if (uint8View[0] === 0) {
        var decoder = new TextDecoder('utf-8');
        var decodedString = decoder.decode(uint8View);

        try {
            let index = decodedString.indexOf('{'); // Trouver l'index du premier "{"
            let result = decodedString.substring(index); // Extraire la partie de la chaîne à partir de l'index trouvé
            decodedString = JSON.parse(result);
        } catch (error) {
          //console.log("onMessageRecieve index");
            try {
                decodedString = JSON.parse(decodedString); // Convertir la chaîne de caractères JSON en objet JavaScript
            } catch (error) {
                let startIndex = decodedString.indexOf('{'); // Trouver l'indice du premier caractère '{'
                let secondIndex = decodedString.indexOf('{', startIndex + 1); // Trouver l'index de la deuxième "{"

                let result = decodedString.substring(secondIndex); // Obtenir la sous-chaîne à partir de l'indice trouvé
                console.log(result);
                decodedString = JSON.parse(result);
            }
        }
        
    } else if (uint8View[0] === 1) {
      //console.log("Le premier octet est égal à 1");
        uint8View = uint8View.slice(5);
        var decompressedData = pako.inflate(uint8View);
        var textDecoder = new TextDecoder();
        var jsonString = textDecoder.decode(decompressedData);
        var decodedString = JSON.parse(jsonString);

    }
    //console.log("end of onMessageRecieve");
    //console.log(decodedString);
    return decodedString;
}

