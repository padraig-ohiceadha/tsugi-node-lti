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
      this.set_callback = bind(this.set_callback, this);
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

    OutcomesConsumer.prototype.handle = function(request, h) {
        var authentication = new Authentication(this.outcomes_url);
        authentication.credentials_callback = this.credentials_callback;
        var payload = request.payload.toString();
        var testSession = request.params.session;
        var resource = request.params.resource;
        var auth_header = request.headers.authorization;

        var outcomes_request = new OutcomesRequest();
        const response = new Promise(function(resolve, reject){
            if (authentication.validate_authorization(auth_header, payload)) {
                outcomes_request.process(payload).then(function(rq) {
                    var message = new POXMessage();
                    var request_header = rq.header;
                    var rs_hdr = {
                        messageId: uuid.v4(),
                        codeMajor: "success",
                        severity: "status",
                        description: "score"
                    };
                    var operation = rq.get_method();
                    var record = rq.get_record();
                    var sourced_id = record.sourcedGUID[0].sourcedId[0];
                    var result = record.result[0];
                    var resultData = result.resultData[0];
                    var resultScore = result.resultScore[0];
                    var score = resultScore.textString[0];
                    console.log(JSON.stringify(record));
                    var responseHeader = message.create_response_header(request_header, rs_hdr, operation);
                    var responseBody = {
                        responseType: operation + "Response"
                    };

                    resolve(message.create_response_xml(responseHeader, responseBody));
                }).catch(function(err){
                    reject(err);
                });
            } else {
                reject(Boom.unauthorized("Invalid signature"));
            }
        });
        
        return response;
    };
    
    OutcomesConsumer.prototype.set_callback = function(outcome_request) {
        var score = outcome_request.score;
        var sourcedId = outcome_request.sourcedId;
        //this.res.response(this.outcomes_request.create_response());
    };

    return OutcomesConsumer;

  })();

  exports = module.exports = OutcomesConsumer;

}).call(this);