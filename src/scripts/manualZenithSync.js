// const axios = require("axios");

// var uuid = require("uuid");
// var myUUID = uuid.v4();
// console.log(myUUID);
// pm.environment.set("traceId", myUUID);
// var apiSecret =
//   "2981bb3859732a61cc18c3da21b0b380a8ed88ed02607fd1fff4405e217677c3";
// var signature = generateSignature(pm.request.body.raw, apiSecret, myUUID);
// pm.environment.set("x-signature", signature);

// function generateSignature(requestBody, apiSecret, traceId) {
//   var json = requestBody;
//   json = json.replace("{{traceId}}", traceId);

//   return CryptoJS.HmacSHA256(json, apiSecret).toString();
// }

// const apiKey = b4b517b8ae043835f67f8a0fc6c251a10d983345a3539b3fb736c80399a9502e;
