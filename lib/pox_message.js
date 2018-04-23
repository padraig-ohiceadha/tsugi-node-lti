(function() {
  var POXMessage, exports, xml2js, errors, exports, url,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    url = require('url');
    xml2js = require('xml2js-es6-promise');
    xml = require('xml2js');
    
    
    POXMessage = (function() {
    function POXMessage() {
      this.get_request_info = bind(this.get_request_info, this);
      this.create_response_header = bind(this.create_response_header, this);
    }

    POXMessage.prototype.get_request_info = function(requestHeader) {
        var hdrInfo = requestHeader.imsx_POXRequestHeaderInfo[0];
        return {
            version: hdrInfo.imsx_version[0],
            messageIdentifier: hdrInfo.imsx_messageIdentifier[0]
        };
    };
    
    POXMessage.prototype.create_response_header = function(requestHeader, responseHeader, operation) {
        var request = this.get_request_info(requestHeader);
  
        return {
            imsx_POXHeader: [ {
                imsx_POXResponseHeaderInfo: [ {
                    imsx_version: request.version,
                    imsx_messageIdentifier: responseHeader.messageId,
                    imsx_statusInfo: [ {
                        imsx_codeMajor: [ responseHeader.codeMajor ],
                        imsx_severity: [ responseHeader.severity ],
                        imsx_description: [ responseHeader.description ],
                        imsx_messageRefIdentifier: [ request.messageIdentifier ],
                        imsx_operationRefIdentifier: [ operation ]
                    } ]
                } ] 
            } ]
        };
    };

    POXMessage.prototype.create_response_xml = function(responseHeader, responseBody) {
        var response = {
            imsx_POXEnvelopeResponse: {
                "$": {
                    xmlns: "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0"
                },
                imsx_POXHeader: responseHeader.imsx_POXHeader,
                imsx_POXBody: [ {
                } ]
            }
        };
        response.imsx_POXEnvelopeResponse.imsx_POXBody[0][responseBody.responseType] = [{}];
        var builder = new xml.Builder();
        return builder.buildObject(response);
    };

    return POXMessage;

  })();

  exports = module.exports = POXMessage;

}).call(this);
