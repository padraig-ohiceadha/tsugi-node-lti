/*
 * Usual usage sequence would be
 * var consumer = new lti.Consumer (consumer_key, consumer_secret, tool_provider_url);
 * params.resource_link_id = "<the tool consumer id for the LTI launch link placement>";
 * params.launch_presentation_return_url. = '<url to for the Tool Provider to return to the tool consumer>';
 * etc.
 * consumer.sign_request (params, callback);
 * var html = consumer.build_form(params);
 * The HTML returned can be sent to a browser to auto-submit a form to perform the launch.
 */
(function() {
  var OutcomesConsumer, xml2js, Authentication, OutcomesRequest, POXMessage, errors, Boom, exports, url, uuid,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    Boom = require('boom');
    url = require('url');
    OutcomesRequest = require('./outcome_request');
    uuid = require('uuid');
    errors = require('./errors');
    xml2js = require('xml2js');
    Authentication = require('./authentication');
    POXMessage = require('./pox_message');
  
    OutcomesConsumer = (function() {
    function OutcomesConsumer(outcomes_url, signature_method) {
      this.handle = bind(this.handle, this);
      this._valid_parameters = bind(this._valid_parameters, this);
      this.credentials_callback = bind(this.resolve_secret, this);
      if (typeof outcomes_url === 'undefined' || outcomes_url === null) {
        throw new errors.ConsumerError('Must specify outcomes service endpoint url');
      }
      this.outcomes_url = outcomes_url;
      this.signer = signature_method;
    }

    OutcomesConsumer.prototype.resolve_secret = function(key) {
        return this.consumer_secret;
    };

    OutcomesConsumer.prototype.handle = function(request, h, callback) {
        var authentication = new Authentication(this.outcomes_url);
        authentication.credentials_callback = this.credentials_callback;
        var payload = request.payload.toString();
        var auth_header = request.headers.authorization;

        var outcomes_request = new OutcomesRequest();
        var self = this;
        const response = new Promise(function(resolve, reject){
            if (authentication.validate_authorization(auth_header, payload)) {
                outcomes_request.process(payload).then(function(rq) {
                    var responseHeader = null;
                    var message = new POXMessage();
                    var request_header = rq.header;
                    var operation = rq.get_method();  //replaceResult|readResult|deleteResult
                    var record = rq.get_record();
                    var result = self.dereference(record, "result");
                    var result_score = self.dereference(result, "resultScore");
                    var score = self.dereference(result_score, "textString");
                    if (operation === "replaceResult") {
                        var scoreFloat = parseFloat(score);
                        if (scoreFloat === NaN || score.length !== (scoreFloat.toString().length) ||
                            score < 0 || score > 1.0  ) {
                            responseHeader = message.create_error_header( {
                                codeMajor: "failure",
                                severity: "error",
                                description: "Score outside the range 0.0-1.0",
                                messageId: uuid.v4()
                            }, request_header, operation);
                            resolve(message.create_response_xml(responseHeader, null));
                            return;
                        }
                    }
                    var req = {
                        operation: operation,
                        record: record,
                        result: result,
                        result_score: result_score,
                        score: score,
                        result_data: self.dereference(result, "resultData"),
                        sourced_id: record.sourcedGUID[0].sourcedId[0],
                        request_header: request_header
                    };
                    callback(operation, req, self.oncomplete.bind( {
                        self: self,
                        resolve: resolve,
                        reject: reject
                    }));
                }).catch(function(err){
                    reject(err);
                });
            } else {
                reject(Boom.unauthorized("Invalid signature"));
            }
        });
        
        return response;
    };
    
    OutcomesConsumer.prototype.oncomplete = function(err, req) {
        var operation = req.operation;
        var rs_hdr = {
            messageId: uuid.v4(),
            codeMajor: "success",
            severity: "status",
            description: "score"
        };
        var message = new POXMessage();
        var responseHeader = message.create_response_header(req.request_header, rs_hdr, operation);
        var responseBody = {
            responseType: operation + "Response"
        };
        var response = message.create_response_xml(responseHeader, responseBody);
        this.resolve(response);
    };

    OutcomesConsumer.prototype.dereference = function(object, field) {
        if (!object) {
            return undefined;
        }
        var result = object[field];
        if (result) {
            result = result[0];
        }
        return result;
    };
    
    return OutcomesConsumer;

  })();

  exports = module.exports = OutcomesConsumer;

}).call(this);