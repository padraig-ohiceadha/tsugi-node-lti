(function() {
  var OutcomesRequest, exports, xml2js, errors, exports, url,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    url = require('url');
    xml2js = require('xml2js-es6-promise');

    OutcomesRequest = (function() {
    function OutcomesRequest() {
      this.process = bind(this.process, this);
      this.get_method = bind(this.get_method, this);
      this.get_record = bind(this.get_record, this);
    }
    
    OutcomesRequest.prototype.process = function(xml) {
        var outcomes_request = this;
        return new Promise(function(resolve, reject) {
            return xml2js(xml).then(function(request)
            {
                var envelope = request.imsx_POXEnvelopeRequest;
                outcomes_request.header = envelope.imsx_POXHeader[0];
                outcomes_request.body = envelope.imsx_POXBody[0];
                resolve(outcomes_request);
            }).catch(function(err) {
                reject(err);
            });
        });
    };
    
    OutcomesRequest.prototype.get_method = function() {
        for (var requestType in this.body) {
            return requestType.replace(/Request$/, "");
        }
    };

    OutcomesRequest.prototype.get_record = function() {
        var requestType = this.get_method() + "Request";
        var rq = this.body[requestType];
        var record = rq[0].resultRecord[0];
        return record;
    };

    return OutcomesRequest;

  })();

  exports = module.exports = OutcomesRequest;

}).call(this);
